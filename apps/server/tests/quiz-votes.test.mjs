import test from "node:test";
import assert from "node:assert/strict";
import { createAulasServer } from "../src/server.mjs";
import { serializeRoom, reviveRoom } from "../src/firestore-store.mjs";

async function boot(store = null) {
  const server = createAulasServer({ allowedOrigins: ["http://localhost:5173"], store });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
async function req(base, method, path, data, token) {
  const result = await fetch(base + path, {
    method,
    headers: {
      Origin: "http://localhost:5173",
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
  return { status: result.status, body: await result.json() };
}

const sample = {
  prompt: "Qual destes conceitos pertence à teoria de Freud?",
  options: ["Condensação", "Fotossíntese", "Genética mendeliana", "Teoria das cordas"],
  correctOptionId: "A"
};

test("Sprint 5: votar, impedir duplicação, apurar e revelar só ao comando do professor", async t => {
  const { server, base } = await boot();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const created = await req(base, "POST", "/api/rooms", { name: "Professor" });
  const root = `/api/rooms/${created.body.roomId}`;
  const teacher = created.body.teacherSecret;
  const alice = (await req(base, "POST", root + "/join", { name: "Alice" })).body.participantToken;
  const bruno = (await req(base, "POST", root + "/join", { name: "Bruno" })).body.participantToken;
  const otherRoom = await req(base, "POST", "/api/rooms", { name: "Outra professora" });
  const wrongTeacher = otherRoom.body.teacherSecret;
  const draft = await req(base, "POST", root + "/quiz", sample, teacher);
  const quizId = draft.body.quiz.id;
  assert.equal(draft.status, 201);
  assert.deepEqual(draft.body.quiz.results.counts, { A: 0, B: 0, C: 0, D: 0 });
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "A" }, alice)).status, 409, "rascunho não aceita votos");
  assert.equal((await req(base, "POST", root + "/quiz-reveal", {}, teacher)).status, 409, "não pode revelar antes de encerrar");

  const opened = await req(base, "POST", root + "/quiz-open", {}, teacher);
  assert.equal(opened.status, 200);
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "B" }, teacher)).status, 403);
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "A" }, wrongTeacher)).status, 403);
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "Q" }, alice)).status, 422);
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId: "outro-quiz", optionId: "A" }, alice)).status, 409);
  const first = await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "B" }, alice);
  assert.equal(first.status, 200);
  assert.equal(first.body.quiz.myAnswer, "B");
  assert.equal(first.body.quiz.results, undefined, "aluno não vê contagem antes da revelação");
  assert.equal(first.body.quiz.correctOptionId, undefined);
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "B" }, alice)).status, 200, "mesma resposta é idempotente");
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "A" }, alice)).status, 409, "não pode trocar o voto");
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "A" }, bruno)).status, 200);

  const teacherState = await req(base, "GET", root + "/state", undefined, teacher);
  assert.equal(teacherState.body.room.quiz.results.total, 2);
  assert.deepEqual(teacherState.body.room.quiz.results.counts, { A: 1, B: 1, C: 0, D: 0 });
  const studentState = await req(base, "GET", root + "/state", undefined, alice);
  assert.equal(studentState.body.room.quiz.myAnswer, "B");
  assert.equal(studentState.body.room.quiz.results, undefined);
  assert.equal(studentState.body.room.quiz.correctOptionId, undefined);
  assert.equal(JSON.stringify(studentState.body).includes('"votes"'), false);
  assert.equal(JSON.stringify(studentState.body).includes('"correctOptionId"'), false);
  assert.equal((await req(base, "POST", root + "/quiz-reveal", {}, alice)).status, 403);

  await req(base, "POST", root + "/quiz-close", {}, teacher);
  assert.equal((await req(base, "POST", root + "/quiz-answer", { quizId, optionId: "C" }, bruno)).status, 409);
  const beforeReveal = await req(base, "GET", root + "/state", undefined, alice);
  assert.equal(beforeReveal.body.room.quiz.results, undefined);
  const revealed = await req(base, "POST", root + "/quiz-reveal", {}, teacher);
  assert.equal(revealed.status, 200);
  assert.equal(revealed.body.quiz.revealed, true);
  const afterReveal = await req(base, "GET", root + "/state", undefined, alice);
  assert.equal(afterReveal.body.room.quiz.correctOptionId, "A");
  assert.deepEqual(afterReveal.body.room.quiz.results.counts, { A: 1, B: 1, C: 0, D: 0 });
  assert.equal(afterReveal.body.room.quiz.myAnswer, "B");
  assert.equal((await req(base, "POST", root + "/quiz-reveal", {}, teacher)).status, 200, "revelação repetida idempotente");

  const nextDraft = await req(base, "POST", root + "/quiz", { ...sample, prompt: "Qual conceito descreve os sonhos?" }, teacher);
  assert.equal(nextDraft.status, 201);
  assert.notEqual(nextDraft.body.quiz.id, quizId);
  assert.equal(nextDraft.body.quiz.results.total, 0, "nova questão não herda votos");
  assert.equal((await req(base, "GET", root + "/state", undefined, alice)).body.room.quiz, null, "aluno não vê novo rascunho");
});

test("Sprint 5: votos persistem após reinício do servidor e token antigo conserva apenas um voto", async () => {
  const documents = new Map();
  const store = {
    async get(id) { const raw = documents.get(id); return raw ? reviveRoom(structuredClone(raw)) : null; },
    async save(room) { documents.set(room.id, structuredClone(serializeRoom(room))); },
    async delete(id) { documents.delete(id); },
    async cleanupExpired() {}
  };
  const first = await boot(store);
  const created = await req(first.base, "POST", "/api/rooms", { name: "Docente" });
  const roomId = created.body.roomId;
  const root = `/api/rooms/${roomId}`;
  const teacher = created.body.teacherSecret;
  const student = (await req(first.base, "POST", root + "/join", { name: "Estudante" })).body.participantToken;
  const draft = await req(first.base, "POST", root + "/quiz", sample, teacher);
  const quizId = draft.body.quiz.id;
  await req(first.base, "POST", root + "/quiz-open", {}, teacher);
  const submitted = await req(first.base, "POST", root + "/quiz-answer", { quizId, optionId: "C" }, student);
  assert.equal(submitted.status, 200);
  const record = documents.get(roomId);
  assert.equal(Object.keys(record.quiz.votes).length, 1);
  assert.equal(JSON.stringify(record).includes(student), false, "somente hash do token fica salvo");
  await new Promise(resolve => first.server.close(resolve));

  const second = await boot(store);
  try {
    const studentState = await req(second.base, "GET", root + "/state", undefined, student);
    assert.equal(studentState.status, 200);
    assert.equal(studentState.body.room.quiz.myAnswer, "C");
    assert.equal((await req(second.base, "POST", root + "/quiz-answer", { quizId, optionId: "B" }, student)).status, 409);
    const professor = await req(second.base, "GET", root + "/state", undefined, teacher);
    assert.equal(professor.body.room.quiz.results.total, 1);
  } finally {
    await new Promise(resolve => second.server.close(resolve));
  }
});
