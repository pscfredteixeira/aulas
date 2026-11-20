import { createServer } from "node:http";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createQuizDraft, quizForRole, OPTION_IDS } from "./quiz.mjs";

const ROOM_RE = /^aulas-[0-9a-f]{24}$/;
const MAX_PARTICIPANTS = 30;
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
const ACTIVE_MS = 35_000;
const MAX_BODY_BYTES = 8192;
const CLEANUP_INTERVAL_MS = 60_000;

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
function randomRoomId() {
  return "aulas-" + randomBytes(12).toString("hex");
}
function digest(value) {
  return createHash("sha256").update(value).digest();
}
function safeTokenMatch(value, hash) {
  if (!value || !hash || typeof value !== "string") return false;
  const candidate = digest(value);
  return timingSafeEqual(candidate, hash);
}
function cleanName(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length >= 1 && cleaned.length <= 40 && !/[<>\u0000-\u001f]/u.test(cleaned)
    ? cleaned : "";
}
function send(res, code, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store", ...headers });
  res.end(body);
}
function readJSON(req) {
  return new Promise((resolve, reject) => {
    if (!(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      reject(Object.assign(new Error("Envie JSON."), { statusCode: 415 })); return;
    }
    let size = 0; const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Pedido muito grande."), { statusCode: 413 }));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw Error();
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error("JSON inválido."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}
function publicRoom(room, now, role = "student", participantId = null) {
  return {
    roomId: room.id,
    status: room.status,
    expiresAt: new Date(room.expiresAt).toISOString(),
    teacher: room.teacherName,
    quiz: quizForRole(room.quiz, role, participantId),
    participants: [...room.participants.values()]
      .filter(p => now - p.lastSeen < ACTIVE_MS)
      .map(p => ({ id: p.id, name: p.name }))
  };
}
function bearer(req) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

/** Servidor HTTP sem dependências externas. Em produção, colocar atrás de HTTPS. */
export function createAulasServer({ allowedOrigins = ["http://localhost:5173"], now = () => Date.now(), store = null } = {}) {
  const rooms = new Map();
  const rate = new Map();
  const origins = new Set(allowedOrigins);
  // Serialize writes per room; avoid an older async write overwriting a newer state.
  const writes = new Map();
  const votesInFlight = new Set();
  async function persist(room) {
    if (!store) return;
    const previous = writes.get(room.id) ?? Promise.resolve();
    const write = previous.catch(() => {}).then(() => store.save(room));
    writes.set(room.id, write);
    try { await write; }
    finally { if (writes.get(room.id) === write) writes.delete(room.id); }
  }
  function limit(req, kind, max, windowMs) {
    const address = req.socket.remoteAddress || "unknown";
    const key = `${address}:${kind}`;
    const timestamp = now();
    const old = rate.get(key);
    if (!old || timestamp - old.begin >= windowMs) {
      rate.set(key, { begin: timestamp, count: 1 }); return false;
    }
    old.count++;
    return old.count > max;
  }
  function authorize(room, token) {
    if (safeTokenMatch(token, room.teacherHash)) return { role: "teacher" };
    for (const p of room.participants.values()) {
      if (safeTokenMatch(token, p.hash)) return { role: "student", participant: p };
    }
    return null;
  }
  const server = createServer((req, res) => {
    void (async () => {
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) {
      send(res, 403, { error: "Origem não autorizada." }); return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    if (req.method === "OPTIONS") { res.writeHead(204, { "Cache-Control": "no-store" }); res.end(); return; }
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/api/health") {
      send(res, 200, { ok: true, service: "aulas-server", persistent: Boolean(store) }); return;
    }
    if (req.method === "POST" && url.pathname === "/api/rooms") {
      if (limit(req, "create", 20, 10 * 60_000)) { send(res, 429, { error: "Muitas salas criadas. Tente mais tarde." }); return; }
      try {
        const input = await readJSON(req);
        const teacherName = cleanName(input.name);
        if (!teacherName) { send(res, 400, { error: "Informe um nome de até 40 caracteres." }); return; }
        const roomId = randomRoomId();
        const teacherSecret = randomToken();
        const room = {
          id: roomId, teacherName, teacherHash: digest(teacherSecret),
          expiresAt: now() + ROOM_TTL_MS,
          status: "open", participants: new Map(), quiz: null
        };
        rooms.set(roomId, room);
        try { await persist(room); }
        catch { rooms.delete(roomId); send(res, 503, { error: "Não foi possível salvar a sala. Tente novamente." }); return; }
        send(res, 201, { roomId, teacherSecret, room: publicRoom(room, now(), "teacher") }); return;
      } catch (error) {
        if (!res.writableEnded && !res.destroyed) send(res, error.statusCode || 400, { error: error.message || "Pedido inválido." });
        return;
      }
    }
    const matched = url.pathname.match(/^\/api\/rooms\/(aulas-[0-9a-f]{24})(?:\/(join|teacher|state|leave|close|rotate|quiz|quiz-open|quiz-close|quiz-answer|quiz-reveal))?$/);
    if (!matched) { send(res, 404, { error: "Endereço não encontrado." }); return; }
    const [, roomId, op] = matched;
    let room = rooms.get(roomId);
    if (!room && store) {
      // Recover a classroom (including hashes and quiz) after a Render restart.
      room = await store.get(roomId);
      if (room) rooms.set(roomId, room);
    }
    if (!room || now() >= room.expiresAt) {
      if (room) {
        rooms.delete(roomId);
        if (store) await store.delete(roomId);
      }
      send(res, 404, { error: "Sala não encontrada ou expirada." }); return;
    }

    if (req.method === "POST" && op === "join") {
      if (room.status !== "open") { send(res, 410, { error: "Esta sala foi encerrada." }); return; }
      if (limit(req, "join", 60, 60_000)) { send(res, 429, { error: "Muitas tentativas. Aguarde." }); return; }
      try {
        const input = await readJSON(req);
        const name = cleanName(input.name);
        if (!name) { send(res, 400, { error: "Informe seu nome (até 40 caracteres)." }); return; }
        if (room.participants.size >= MAX_PARTICIPANTS) { send(res, 409, { error: "Limite da sala atingido." }); return; }
        const participantId = randomToken(12);
        const participantToken = randomToken();
        room.participants.set(participantId, { id: participantId, name, hash: digest(participantToken), lastSeen: now() });
        await persist(room);
        send(res, 201, { participantId, participantToken, room: publicRoom(room, now(), "student", participantId) }); return;
      } catch (error) {
        if (!res.writableEnded && !res.destroyed) send(res, error.statusCode || 400, { error: error.message || "Pedido inválido." });
        return;
      }
    }
    if (req.method === "POST" && op === "teacher") {
      try {
        const input = await readJSON(req);
        if (!safeTokenMatch(input.secret, room.teacherHash)) {
          send(res, 403, { error: "Link de professor inválido ou revogado." }); return;
        }
        send(res, 200, { role: "teacher", room: publicRoom(room, now(), "teacher") }); return;
      } catch (error) {
        if (!res.writableEnded && !res.destroyed) send(res, error.statusCode || 400, { error: error.message || "Pedido inválido." });
        return;
      }
    }
    const access = authorize(room, bearer(req));
    if (!access) { send(res, 403, { error: "Acesso não autorizado." }); return; }
    if (req.method === "GET" && op === "state") {
      if (access.participant) access.participant.lastSeen = now();
      send(res, 200, { role: access.role, room: publicRoom(room, now(), access.role, access.participant?.id) }); return;
    }
    if (req.method === "POST" && op === "quiz-answer") {
      if (access.role !== "student") {
        send(res, 403, { error: "Somente alunos podem responder." }); return;
      }
      if (room.status !== "open" || room.quiz?.phase !== "open") {
        send(res, 409, { error: "Não há uma pergunta aberta para responder." }); return;
      }
      let input;
      try { input = await readJSON(req); }
      catch (error) {
        if (!res.writableEnded && !res.destroyed) send(res, error.statusCode || 400, { error: error.message || "Voto inválido." });
        return;
      }
      if (input.quizId !== room.quiz.id) {
        send(res, 409, { error: "Esta pergunta não está mais aberta." }); return;
      }
      if (!OPTION_IDS.includes(input.optionId)) {
        send(res, 422, { error: "Escolha uma alternativa válida." }); return;
      }
      const voteKey = `${roomId}:${room.quiz.id}:${access.participant.id}`;
      if (votesInFlight.has(voteKey)) {
        send(res, 409, { error: "Sua resposta já está sendo registrada." }); return;
      }
      if (room.quiz.votes?.[access.participant.id]) {
        const previous = room.quiz.votes[access.participant.id];
        if (previous !== input.optionId) {
          send(res, 409, { error: "Você já respondeu a esta pergunta. A resposta não pode ser alterada." }); return;
        }
        send(res, 200, { quiz: quizForRole(room.quiz, "student", access.participant.id) }); return;
      }
      votesInFlight.add(voteKey);
      const currentQuiz = room.quiz;
      const version = currentQuiz.version;
      try {
        // Only one vote per participant token and quiz; no identity registration required.
        // Check the phase again after reading request data, before the first await.
        if (room.quiz !== currentQuiz || currentQuiz.phase !== "open" || room.status !== "open") {
          send(res, 409, { error: "A pergunta foi encerrada." }); return;
        }
        currentQuiz.votes ??= {};
        currentQuiz.votes[access.participant.id] = input.optionId;
        currentQuiz.version++;
        await persist(room);
        send(res, 200, { quiz: quizForRole(currentQuiz, "student", access.participant.id) }); return;
      } catch {
        delete currentQuiz.votes?.[access.participant.id];
        currentQuiz.version = Math.max(currentQuiz.version, version);
        if (!res.headersSent && !res.destroyed) send(res, 503, { error: "Não foi possível salvar sua resposta. Tente novamente." });
        return;
      } finally {
        votesInFlight.delete(voteKey);
      }
    }
    if (req.method === "POST" && op === "quiz-reveal") {
      if (access.role !== "teacher") {
        send(res, 403, { error: "Somente o professor pode revelar resultados." }); return;
      }
      if (!room.quiz || room.quiz.phase !== "closed") {
        send(res, 409, { error: "Encerre a pergunta antes de revelar os resultados." }); return;
      }
      if (!room.quiz.revealed) {
        room.quiz.revealed = true;
        room.quiz.version++;
        await persist(room);
      }
      send(res, 200, { quiz: quizForRole(room.quiz, "teacher") }); return;
    }
    if (req.method === "POST" && ["quiz", "quiz-open", "quiz-close"].includes(op)) {
      if (access.role !== "teacher") {
        send(res, 403, { error: "Somente o professor pode controlar perguntas." }); return;
      }
      if (room.status !== "open") {
        send(res, 409, { error: "A sala foi encerrada." }); return;
      }
      if (op === "quiz") {
        if (room.quiz?.phase === "open") {
          send(res, 409, { error: "Encerre a pergunta atual antes de criar outra." }); return;
        }
        try {
          const input = await readJSON(req);
          const draft = createQuizDraft(input);
          if (draft.error) { send(res, 422, { error: draft.error }); return; }
          room.quiz = draft.quiz;
          await persist(room);
          send(res, 201, { quiz: quizForRole(room.quiz, "teacher") }); return;
        } catch (error) {
          if (!res.writableEnded && !res.destroyed) send(res, error.statusCode || 400, { error: error.message || "Pergunta inválida." });
          return;
        }
      }
      if (op === "quiz-open") {
        if (!room.quiz || room.quiz.phase !== "draft") {
          send(res, 409, { error: "Crie um rascunho antes de abrir a pergunta." }); return;
        }
        room.quiz.phase = "open";
        room.quiz.version++;
        await persist(room);
        send(res, 200, { quiz: quizForRole(room.quiz, "teacher") }); return;
      }
      if (!room.quiz || room.quiz.phase !== "open") {
        send(res, 409, { error: "Não há uma pergunta aberta para encerrar." }); return;
      }
      room.quiz.phase = "closed";
      room.quiz.version++;
      await persist(room);
      send(res, 200, { quiz: quizForRole(room.quiz, "teacher") }); return;
    }
    if (req.method === "POST" && op === "leave") {
      if (access.role !== "student") { send(res, 403, { error: "Apenas alunos podem sair por este endpoint." }); return; }
      room.participants.delete(access.participant.id);
      await persist(room);
      send(res, 200, { ok: true }); return;
    }
    if (req.method === "POST" && op === "close") {
      if (access.role !== "teacher") { send(res, 403, { error: "Apenas o professor pode encerrar a sala." }); return; }
      room.status = "closed";
      if (room.quiz?.phase === "open") room.quiz.phase = "closed";
      await persist(room);
      send(res, 200, { room: publicRoom(room, now(), "teacher") }); return;
    }
    if (req.method === "POST" && op === "rotate") {
      if (access.role !== "teacher") { send(res, 403, { error: "Apenas o professor pode renovar o link." }); return; }
      const teacherSecret = randomToken();
      room.teacherHash = digest(teacherSecret);
      await persist(room);
      send(res, 200, { teacherSecret }); return;
    }
    send(res, 405, { error: "Operação não permitida." });
    })().catch(() => {
      // Do not log or expose secrets from failed requests.
      if (!res.headersSent && !res.destroyed) {
        send(res, 503, { error: "Falha ao acessar os dados da aula. Tente novamente." });
      }
    });
  });
  const interval = setInterval(() => {
    const timestamp = now();
    for (const [id, room] of rooms) {
      if (timestamp >= room.expiresAt) { rooms.delete(id); continue; }
      for (const [id, participant] of room.participants) {
        if (timestamp - participant.lastSeen > ACTIVE_MS * 6) room.participants.delete(id);
      }
    }
    for (const [key, info] of rate) {
      if (timestamp - info.begin > 10 * 60_000) rate.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  interval.unref();
  const expiredCleanup = store ? setInterval(() => {
    void store.cleanupExpired(now()).catch(() => { /* keep API available during temporary outage */ });
  }, 60 * 60_000) : null;
  expiredCleanup?.unref();
  server.on("close", () => {
    clearInterval(interval);
    if (expiredCleanup) clearInterval(expiredCleanup);
  });
  return server;
}
