import test from "node:test";
import assert from "node:assert/strict";
import { createAulasServer } from "../src/server.mjs";
import { serializeRoom, reviveRoom } from "../src/firestore-store.mjs";

async function start(store = null) {
  const server = createAulasServer({ allowedOrigins: ["http://localhost:5173"], store });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}
async function request(base, method, path, body, token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: "http://localhost:5173",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
}
const poll = {
  type: "poll",
  prompt: "Qual dos temas você prefere aprofundar hoje?",
  options: ["A teoria do sonho", "O narcisismo", "A transferência"]
};
const discussion = {
  type: "open_question",
  prompt: "Como você interpreta a relação entre desejo e cultura?"
};
const caseData = {
  type: "case",
  context: "Uma pessoa fica dividida entre uma expectativa familiar e uma decisão pessoal que quer tomar.",
  prompt: "Quais perguntas poderiam orientar uma discussão deste caso fictício?"
};

test("Sprint 6: enquete sem gabarito, votação individual e divulgação pelo professor", async t => {
  const { server, base } = await start();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { data: created } = await request(base, "POST", "/api/rooms", { name: "Docente" });
  const root = `/api/rooms/${created.roomId}`;
  const teacher = created.teacherSecret;
  const { data: a } = await request(base, "POST", root + "/join", { name: "Aluna A" });
  const { data: b } = await request(base, "POST", root + "/join", { name: "Aluna B" });
  assert.equal((await request(base, "POST", root + "/activity", poll, a.participantToken)).status, 403);
  const draft = await request(base, "POST", root + "/activity", poll, teacher);
  assert.equal(draft.status, 201);
  assert.equal(draft.data.activity.type, "poll");
  assert.equal("correctOptionId" in draft.data.activity, false);
  const id = draft.data.activity.id;
  assert.equal((await request(base, "GET", root + "/state", undefined, a.participantToken)).data.room.activity, null);
  assert.equal((await request(base, "POST", root + "/activity-open", {}, a.participantToken)).status, 403);
  assert.equal((await request(base, "POST", root + "/activity-reveal", {}, teacher)).status, 409);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: id, optionId: "A" }, a.participantToken)).status, 409);
  assert.equal((await request(base, "POST", root + "/activity-open", {}, teacher)).status, 200);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: id, optionId: "D" }, a.participantToken)).status, 422);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: "outro", optionId: "A" }, a.participantToken)).status, 409);
  const first = await request(base, "POST", root + "/activity-answer", { activityId: id, optionId: "A" }, a.participantToken);
  assert.equal(first.status, 200);
  assert.equal(first.data.activity.myAnswer, "A");
  assert.equal(first.data.activity.results, undefined);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: id, optionId: "A" }, a.participantToken)).status, 200);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: id, optionId: "B" }, a.participantToken)).status, 409);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: id, optionId: "C" }, b.participantToken)).status, 200);
  const counts = (await request(base, "GET", root + "/state", undefined, teacher)).data.room.activity.results;
  assert.equal(counts.total, 2);
  assert.deepEqual(counts.counts, { A: 1, B: 0, C: 1 });
  const before = (await request(base, "GET", root + "/state", undefined, b.participantToken)).data.room.activity;
  assert.equal(before.results, undefined);
  assert.equal(JSON.stringify(before).includes("votes"), false);
  assert.equal((await request(base, "POST", root + "/activity-reveal", {}, b.participantToken)).status, 403);
  assert.equal((await request(base, "POST", root + "/activity-close", {}, teacher)).status, 200);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: id, optionId: "B" }, b.participantToken)).status, 409);
  const hidden = (await request(base, "GET", root + "/state", undefined, a.participantToken)).data.room.activity;
  assert.equal(hidden.results, undefined);
  assert.equal((await request(base, "POST", root + "/activity-reveal", {}, teacher)).status, 200);
  const revealed = (await request(base, "GET", root + "/state", undefined, a.participantToken)).data.room.activity;
  assert.equal(revealed.results.total, 2);
  assert.equal(revealed.myAnswer, "A");
  assert.equal("correctOptionId" in revealed, false);
});

test("Sprint 6: pergunta aberta e caso exigem moderação e nunca divulgam autores aos alunos", async t => {
  const { server, base } = await start();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { data: created } = await request(base, "POST", "/api/rooms", { name: "Professora" });
  const root = `/api/rooms/${created.roomId}`;
  const teacher = created.teacherSecret;
  const { data: a } = await request(base, "POST", root + "/join", { name: "Pessoa A" });
  const { data: b } = await request(base, "POST", root + "/join", { name: "Pessoa B" });
  assert.equal((await request(base, "POST", root + "/activity", { ...discussion, prompt: "<script>teste</script>" }, teacher)).status, 422);
  assert.equal((await request(base, "POST", root + "/activity", { ...caseData, context: "Curto" }, teacher)).status, 422);
  const createdOpen = await request(base, "POST", root + "/activity", discussion, teacher);
  assert.equal(createdOpen.status, 201);
  const id = createdOpen.data.activity.id;
  await request(base, "POST", root + "/activity-open", {}, teacher);
  const bad = await request(base, "POST", root + "/activity-answer", { activityId: id, text: "<b>Olá</b>" }, a.participantToken);
  assert.equal(bad.status, 422);
  const replyA = await request(base, "POST", root + "/activity-answer", { activityId: id, text: "Reflexão sobre o tema." }, a.participantToken);
  assert.equal(replyA.status, 200);
  assert.equal(replyA.data.activity.myResponse.text, "Reflexão sobre o tema.");
  assert.equal(replyA.data.activity.approvedResponses.length, 0);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: id, text: "Outra coisa" }, a.participantToken)).status, 409);
  await request(base, "POST", root + "/activity-answer", { activityId: id, text: "Uma segunda reflexão." }, b.participantToken);
  const teacherState = (await request(base, "GET", root + "/state", undefined, teacher)).data.room.activity;
  assert.equal(teacherState.responses.length, 2);
  assert.equal(teacherState.responses.find(r => r.name === "Pessoa A").text, "Reflexão sobre o tema.");
  const bState = (await request(base, "GET", root + "/state", undefined, b.participantToken)).data.room.activity;
  assert.equal(bState.approvedResponses.length, 0);
  assert.equal(JSON.stringify(bState).includes("Reflexão sobre o tema"), false);
  assert.equal(JSON.stringify(bState).includes("Pessoa A"), false);
  const responseId = teacherState.responses.find(r => r.name === "Pessoa A").id;
  const unauthorized = await request(base, "POST", root + "/activity-moderate", { activityId: id, responseId, approved: true }, b.participantToken);
  assert.equal(unauthorized.status, 403);
  assert.equal((await request(base, "POST", root + "/activity-moderate", { activityId: id, responseId, approved: "yes" }, teacher)).status, 422);
  assert.equal((await request(base, "POST", root + "/activity-moderate", { activityId: id, responseId, approved: true }, teacher)).status, 200);
  const after = (await request(base, "GET", root + "/state", undefined, b.participantToken)).data.room.activity;
  assert.equal(after.approvedResponses.length, 1);
  assert.equal(after.approvedResponses[0].text, "Reflexão sobre o tema.");
  assert.equal(JSON.stringify(after).includes("Pessoa A"), false);
  assert.equal((await request(base, "POST", root + "/activity-moderate", { activityId: id, responseId, approved: false }, teacher)).status, 200);
  assert.equal((await request(base, "GET", root + "/state", undefined, b.participantToken)).data.room.activity.approvedResponses.length, 0);

  assert.equal((await request(base, "POST", root + "/activity", caseData, teacher)).status, 409, "não substituir atividade aberta");
  await request(base, "POST", root + "/activity-close", {}, teacher);
  const caseDraft = await request(base, "POST", root + "/activity", caseData, teacher);
  assert.equal(caseDraft.status, 201);
  await request(base, "POST", root + "/activity-open", {}, teacher);
  const caseState = (await request(base, "GET", root + "/state", undefined, a.participantToken)).data.room.activity;
  assert.equal(caseState.type, "case");
  assert.equal(caseState.context, caseData.context);
  assert.equal((await request(base, "POST", root + "/activity-answer", { activityId: caseDraft.data.activity.id, text: "Perguntaria sobre a escolha." }, a.participantToken)).status, 200);
});

test("Sprint 6: não abrir quiz e atividade simultaneamente; manter atividade e moderação no Firestore simulado", async () => {
  const docs = new Map();
  const store = {
    async get(id) { const raw = docs.get(id); return raw ? reviveRoom(structuredClone(raw)) : null; },
    async save(room) { docs.set(room.id, structuredClone(serializeRoom(room))); },
    async delete(id) { docs.delete(id); },
    async cleanupExpired() {}
  };
  const first = await start(store);
  const { data: created } = await request(first.base, "POST", "/api/rooms", { name: "Professor" });
  const root = `/api/rooms/${created.roomId}`;
  const teacher = created.teacherSecret;
  const { data: joined } = await request(first.base, "POST", root + "/join", { name: "Participante" });
  const student = joined.participantToken;
  const draft = await request(first.base, "POST", root + "/activity", discussion, teacher);
  await request(first.base, "POST", root + "/activity-open", {}, teacher);
  const quizDraft = await request(first.base, "POST", root + "/quiz", {
    prompt: "Uma pergunta válida para testar exclusividade?",
    options: ["Primeira", "Segunda", "Terceira", "Quarta"],
    correctOptionId: "A"
  }, teacher);
  assert.equal(quizDraft.status, 201);
  assert.equal((await request(first.base, "POST", root + "/quiz-open", {}, teacher)).status, 409);
  await request(first.base, "POST", root + "/activity-answer", { activityId: draft.data.activity.id, text: "Minha interpretação para a aula." }, student);
  const response = (await request(first.base, "GET", root + "/state", undefined, teacher)).data.room.activity.responses[0];
  await request(first.base, "POST", root + "/activity-moderate", {
    activityId: draft.data.activity.id, responseId: response.id, approved: true
  }, teacher);
  await new Promise(resolve => first.server.close(resolve));
  const second = await start(store);
  try {
    const state = await request(second.base, "GET", root + "/state", undefined, student);
    assert.equal(state.status, 200);
    assert.equal(state.data.room.activity.myResponse.text, "Minha interpretação para a aula.");
    assert.equal(state.data.room.activity.approvedResponses.length, 1);
    assert.equal((await request(second.base, "POST", root + "/activity-answer", {
      activityId: draft.data.activity.id, text: "Outra interpretação"
    }, student)).status, 409);
    await request(second.base, "POST", root + "/activity-close", {}, teacher);
    assert.equal((await request(second.base, "POST", root + "/quiz-open", {}, teacher)).status, 200);
    assert.equal((await request(second.base, "POST", root + "/activity-open", {}, teacher)).status, 409);
  } finally {
    await new Promise(resolve => second.server.close(resolve));
  }
});

test("Apresentação: professor recolhe e reabre quiz para a turma sem encerrar chamada", async t => {
  const { server, base } = await start();
  t.after(() => new Promise(resolve => server.close(resolve)));
  const created = await request(base, "POST", "/api/rooms", { name: "Docente" });
  const root = `/api/rooms/${created.data.roomId}`;
  const teacher = created.data.teacherSecret;
  const student = (await request(base, "POST", root + "/join", { name: "Estudante" })).data.participantToken;
  const draft = await request(base, "POST", root + "/quiz", {
    prompt: "Qual conceito aparece nos estudos do sonho?",
    options: ["Condensação", "Ambivalência", "Identificação", "Relação"],
    correctOptionId: "A"
  }, teacher);
  assert.equal(draft.status, 201);
  assert.equal((await request(base, "POST", root + "/presentation-show", { focus: "quiz" }, teacher)).status, 409,
    "rascunho não pode ser mostrado aos alunos");
  await request(base, "POST", root + "/quiz-open", {}, teacher);
  assert.equal((await request(base, "POST", root + "/presentation-hide", {}, student)).status, 403);
  assert.equal((await request(base, "POST", root + "/presentation-show", { focus: "quiz" }, student)).status, 403);
  const hidden = await request(base, "POST", root + "/presentation-hide", {}, teacher);
  assert.equal(hidden.status, 200);
  assert.equal(hidden.data.room.focus, "none");
  assert.equal(hidden.data.room.quiz.phase, "closed", "retirar também encerra a votação");
  const studentState = await request(base, "GET", root + "/state", undefined, student);
  assert.equal(studentState.data.room.status, "open", "a chamada e a sala continuam abertas");
  assert.equal(studentState.data.room.focus, "none");
  assert.equal((await request(base, "POST", root + "/quiz-answer", {
    quizId: draft.data.quiz.id, optionId: "A"
  }, student)).status, 409, "resposta após recolher é rejeitada");

  const restored = await request(base, "POST", root + "/presentation-show", { focus: "quiz" }, teacher);
  assert.equal(restored.status, 200);
  assert.equal(restored.data.room.focus, "quiz");
  assert.equal(restored.data.room.quiz.phase, "closed", "mostrar não reabre votação");
  assert.equal((await request(base, "POST", root + "/presentation-show", { focus: "none" }, teacher)).status, 422);
  assert.equal((await request(base, "POST", root + "/presentation-show", { focus: "activity" }, teacher)).status, 409);
});

test("Apresentação: recolhimento e retorno de estudo de caso persistem após reinício", async () => {
  const documents = new Map();
  const store = {
    async get(id) {
      const raw = documents.get(id);
      return raw ? reviveRoom(structuredClone(raw)) : null;
    },
    async save(room) { documents.set(room.id, structuredClone(serializeRoom(room))); },
    async delete(id) { documents.delete(id); },
    async cleanupExpired() {}
  };
  const first = await start(store);
  const created = await request(first.base, "POST", "/api/rooms", { name: "Docente" });
  const root = `/api/rooms/${created.data.roomId}`;
  const teacher = created.data.teacherSecret;
  const student = (await request(first.base, "POST", root + "/join", { name: "Estudante" })).data.participantToken;
  await request(first.base, "POST", root + "/activity", caseData, teacher);
  await request(first.base, "POST", root + "/activity-open", {}, teacher);
  const hidden = await request(first.base, "POST", root + "/presentation-hide", {}, teacher);
  assert.equal(hidden.data.room.focus, "none");
  assert.equal(hidden.data.room.activity.phase, "closed");
  await new Promise(resolve => first.server.close(resolve));

  const second = await start(store);
  try {
    const read = await request(second.base, "GET", root + "/state", undefined, student);
    assert.equal(read.status, 200);
    assert.equal(read.data.room.focus, "none");
    assert.equal(read.data.room.activity.phase, "closed");
    const shown = await request(second.base, "POST", root + "/presentation-show", { focus: "activity" }, teacher);
    assert.equal(shown.status, 200);
    assert.equal(shown.data.room.focus, "activity");
    const after = await request(second.base, "GET", root + "/state", undefined, student);
    assert.equal(after.data.room.activity.type, "case");
  } finally {
    await new Promise(resolve => second.server.close(resolve));
  }
});
