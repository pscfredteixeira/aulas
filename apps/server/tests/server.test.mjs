import test from "node:test";
import assert from "node:assert/strict";
import { createAulasServer } from "../src/server.mjs";
import { serializeRoom, reviveRoom } from "../src/firestore-store.mjs";

async function start() {
  const server = createAulasServer({ allowedOrigins: ["http://localhost:5173"] });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
async function request(base, method, path, body, token, origin = "http://localhost:5173") {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { code: response.status, data: await response.json().catch(() => null) };
}

test("permissões, revogação e fechamento de sala sem login", async t => {
  const { server, base } = await start();
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

  const created = await request(base, "POST", "/api/rooms", { name: "Professora" });
  assert.equal(created.code, 201);
  const { roomId, teacherSecret } = created.data;
  assert.match(roomId, /^aulas-[0-9a-f]{24}$/);
  assert.match(teacherSecret, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(created.data.room.teacher, "Professora");

  const unauthenticated = await request(base, "GET", `/api/rooms/${roomId}/state`);
  assert.equal(unauthenticated.code, 403);
  const forgedStudent = await request(base, "POST", `/api/rooms/${roomId}/close`, {}, "token-falso");
  assert.equal(forgedStudent.code, 403);

  const student = await request(base, "POST", `/api/rooms/${roomId}/join`, { name: "Aluna" });
  assert.equal(student.code, 201);
  assert.match(student.data.participantToken, /^[A-Za-z0-9_-]{43}$/);
  const studentView = await request(base, "GET", `/api/rooms/${roomId}/state`, undefined, student.data.participantToken);
  assert.equal(studentView.code, 200);
  assert.equal(studentView.data.role, "student");
  assert.equal(studentView.data.room.participants.length, 1);

  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/rotate`, {}, student.data.participantToken)).code, 403);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/close`, {}, student.data.participantToken)).code, 403);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/teacher`, { secret: "sem-permissao" })).code, 403);

  const teacher = await request(base, "POST", `/api/rooms/${roomId}/teacher`, { secret: teacherSecret });
  assert.equal(teacher.code, 200);
  assert.equal(teacher.data.role, "teacher");

  const rotated = await request(base, "POST", `/api/rooms/${roomId}/rotate`, {}, teacherSecret);
  assert.equal(rotated.code, 200);
  assert.notEqual(rotated.data.teacherSecret, teacherSecret);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/close`, {}, teacherSecret)).code, 403);
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/teacher`, { secret: teacherSecret })).code, 403);

  const closed = await request(base, "POST", `/api/rooms/${roomId}/close`, {}, rotated.data.teacherSecret);
  assert.equal(closed.code, 200);
  assert.equal(closed.data.room.status, "closed");
  assert.equal((await request(base, "POST", `/api/rooms/${roomId}/join`, { name: "Outra" })).code, 410);
});

test("salas são independentes, origem indevida é rejeitada e entrada valida nome", async t => {
  const { server, base } = await start();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const a = await request(base, "POST", "/api/rooms", { name: "Professor A" });
  const b = await request(base, "POST", "/api/rooms", { name: "Professor B" });
  assert.equal(a.code, 201); assert.equal(b.code, 201);
  assert.notEqual(a.data.roomId, b.data.roomId);

  const illegal = await request(base, "POST", "/api/rooms", { name: "Evil" }, undefined, "https://fora.example");
  assert.equal(illegal.code, 403);

  const invalidName = await request(base, "POST", `/api/rooms/${a.data.roomId}/join`, { name: "<script>" });
  assert.equal(invalidName.code, 400);

  assert.equal((await request(base, "POST", `/api/rooms/${b.data.roomId}/close`, {}, a.data.teacherSecret)).code, 403);
  assert.equal((await request(base, "GET", "/api/health")).data.persistent, false);
});

test("uma sala expirada deixa de aceitar ingresso e segredos", async t => {
  let timestamp = Date.now();
  const server = createAulasServer({ allowedOrigins: ["http://localhost:5173"], now: () => timestamp });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const created = await request(base, "POST", "/api/rooms", { name: "Prof" });
  timestamp += 12 * 60 * 60 * 1000 + 1;
  const state = await request(base, "GET", `/api/rooms/${created.data.roomId}/state`, undefined, created.data.teacherSecret);
  assert.equal(state.code, 404);
});

test("Sprint 4: somente professor cria, abre e encerra uma pergunta", async t => {
  const { server, base } = await start();
  t.after(() => new Promise(resolve => server.close(resolve)));

  const created = await request(base, "POST", "/api/rooms", { name: "Professora" });
  const { roomId, teacherSecret } = created.data;
  const student = await request(base, "POST", `/api/rooms/${roomId}/join`, { name: "Estudante" });
  const studentToken = student.data.participantToken;
  const path = `/api/rooms/${roomId}`;
  const draft = {
    prompt: "Qual alternativa melhor descreve uma hipótese científica?",
    options: ["Afirmação testável", "Opinião popular", "Palpite absoluto", "Certeza pessoal"],
    correctOptionId: "A"
  };
  const studentAttempt = await request(base, "POST", path + "/quiz", draft, studentToken);
  assert.equal(studentAttempt.code, 403);
  assert.equal((await request(base, "POST", path + "/quiz-open", {}, studentToken)).code, 403);
  assert.equal((await request(base, "POST", path + "/quiz-close", {}, studentToken)).code, 403);

  const invalid = await request(base, "POST", path + "/quiz", { ...draft, options: ["A", "A", "B", "C"] }, teacherSecret);
  assert.equal(invalid.code, 422);
  const input = await request(base, "POST", path + "/quiz", draft, teacherSecret);
  assert.equal(input.code, 201);
  assert.equal(input.data.quiz.phase, "draft");
  assert.equal(input.data.quiz.correctOptionId, "A");

  const before = await request(base, "GET", path + "/state", undefined, studentToken);
  assert.equal(before.data.room.quiz, null, "aluno não vê rascunho");
  assert.equal((await request(base, "POST", path + "/quiz-close", {}, teacherSecret)).code, 409);

  const opened = await request(base, "POST", path + "/quiz-open", {}, teacherSecret);
  assert.equal(opened.code, 200);
  assert.equal(opened.data.quiz.phase, "open");
  const studentState = await request(base, "GET", path + "/state", undefined, studentToken);
  assert.equal(studentState.code, 200);
  assert.equal(studentState.data.room.quiz.prompt, draft.prompt);
  assert.equal(studentState.data.room.quiz.options.length, 4);
  assert.equal("correctOptionId" in studentState.data.room.quiz, false, "não vazar gabarito ao aluno");
  assert.equal(JSON.stringify(studentState.data).includes("correctOptionId"), false);
  assert.equal((await request(base, "POST", path + "/quiz", draft, teacherSecret)).code, 409);
  assert.equal((await request(base, "POST", path + "/quiz-open", {}, teacherSecret)).code, 409);

  const teacherState = await request(base, "GET", path + "/state", undefined, teacherSecret);
  assert.equal(teacherState.data.room.quiz.correctOptionId, "A");

  const closed = await request(base, "POST", path + "/quiz-close", {}, teacherSecret);
  assert.equal(closed.code, 200);
  assert.equal(closed.data.quiz.phase, "closed");
  const after = await request(base, "GET", path + "/state", undefined, studentToken);
  assert.equal(after.data.room.quiz.phase, "closed");
  assert.equal("correctOptionId" in after.data.room.quiz, false, "encerramento não revela gabarito");

  const next = await request(base, "POST", path + "/quiz", { ...draft, prompt: "Qual é a definição de variável independente?" }, teacherSecret);
  assert.equal(next.code, 201);
  assert.notEqual(next.data.quiz.id, input.data.quiz.id);
  assert.equal((await request(base, "GET", path + "/state", undefined, studentToken)).data.room.quiz, null);

  const otherRoom = await request(base, "POST", "/api/rooms", { name: "Outro" });
  assert.equal((await request(base, "GET", `/api/rooms/${otherRoom.data.roomId}/state`, undefined, otherRoom.data.teacherSecret)).data.room.quiz, null);
  assert.equal((await request(base, "POST", path + "/quiz-open", {}, otherRoom.data.teacherSecret)).code, 403);

  await request(base, "POST", path + "/close", {}, teacherSecret);
  assert.equal((await request(base, "POST", path + "/quiz-open", {}, teacherSecret)).code, 409);
});

test("Sprint 4: rascunho exige quatro opções, gabarito válido e limites de texto", async t => {
  const { server, base } = await start();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const created = await request(base, "POST", "/api/rooms", { name: "Docente" });
  const path = `/api/rooms/${created.data.roomId}/quiz`;
  const good = {
    prompt: "Uma pergunta válida de demonstração?",
    options: ["Uma", "Duas", "Três", "Quatro"],
    correctOptionId: "C"
  };
  assert.equal((await request(base, "POST", path, { ...good, options: ["Uma", "Duas", "Três"] }, created.data.teacherSecret)).code, 422);
  assert.equal((await request(base, "POST", path, { ...good, correctOptionId: "E" }, created.data.teacherSecret)).code, 422);
  assert.equal((await request(base, "POST", path, { ...good, prompt: "<script>alert(1)</script>" }, created.data.teacherSecret)).code, 422);
  assert.equal((await request(base, "POST", path, { ...good, options: ["Uma", "Duas", "<b>Teste</b>", "Quatro"] }, created.data.teacherSecret)).code, 422);
  assert.equal((await request(base, "POST", path, good, created.data.teacherSecret)).code, 201);
});

test("Firebase: sala, credenciais e pergunta sobrevivem ao reinício do servidor", async () => {
  // Fake de armazenamento para testar recuperação sem usar credenciais reais.
  const documents = new Map();
  const store = {
    async get(id) {
      const raw = documents.get(id);
      return raw ? reviveRoom(structuredClone(raw)) : null;
    },
    async save(room) {
      documents.set(room.id, structuredClone(serializeRoom(room)));
    },
    async delete(id) { documents.delete(id); },
    async cleanupExpired() {}
  };
  const launch = async () => {
    const server = createAulasServer({ allowedOrigins: ["http://localhost:5173"], store });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    return { server, base: `http://127.0.0.1:${server.address().port}` };
  };

  const first = await launch();
  const created = await request(first.base, "POST", "/api/rooms", { name: "Professora" });
  assert.equal(created.code, 201);
  assert.equal((await request(first.base, "GET", "/api/health")).data.persistent, true);
  const { roomId, teacherSecret } = created.data;
  const joined = await request(first.base, "POST", `/api/rooms/${roomId}/join`, { name: "Aluna" });
  assert.equal(joined.code, 201);
  const token = joined.data.participantToken;

  const quiz = {
    prompt: "Qual conceito Freud associou ao trabalho dos sonhos?",
    options: ["Condensação", "Fotossíntese", "Fermentação", "Homeostase"],
    correctOptionId: "A"
  };
  assert.equal((await request(first.base, "POST", `/api/rooms/${roomId}/quiz`, quiz, teacherSecret)).code, 201);
  assert.equal((await request(first.base, "POST", `/api/rooms/${roomId}/quiz-open`, {}, teacherSecret)).code, 200);
  const stored = documents.get(roomId);
  assert.match(stored.teacherHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(stored).includes(teacherSecret), false);
  assert.equal(JSON.stringify(stored).includes(token), false);
  await new Promise(resolve => first.server.close(resolve));

  const second = await launch();
  try {
    const teacher = await request(second.base, "POST", `/api/rooms/${roomId}/teacher`, { secret: teacherSecret });
    assert.equal(teacher.code, 200, "link privado do professor deve continuar válido");
    const student = await request(second.base, "GET", `/api/rooms/${roomId}/state`, undefined, token);
    assert.equal(student.code, 200, "token do aluno deve funcionar depois do reinício");
    assert.equal(student.data.role, "student");
    assert.equal(student.data.room.quiz.prompt, quiz.prompt);
    assert.equal("correctOptionId" in student.data.room.quiz, false);
    assert.equal((await request(second.base, "POST", `/api/rooms/${roomId}/quiz-close`, {}, teacherSecret)).code, 200);
    assert.equal(documents.get(roomId).quiz.phase, "closed");
    const rotated = await request(second.base, "POST", `/api/rooms/${roomId}/rotate`, {}, teacherSecret);
    assert.equal(rotated.code, 200);
    assert.equal((await request(second.base, "POST", `/api/rooms/${roomId}/teacher`, { secret: teacherSecret })).code, 403);
    assert.equal((await request(second.base, "POST", `/api/rooms/${roomId}/close`, {}, rotated.data.teacherSecret)).code, 200);
    assert.equal(documents.get(roomId).status, "closed");
  } finally {
    await new Promise(resolve => second.server.close(resolve));
  }
});
