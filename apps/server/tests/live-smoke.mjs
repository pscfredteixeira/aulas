/** Teste de ponta a ponta contra a API do Render. Usa somente nomes fictícios. */
const base = (process.env.AULAS_API_URL || "").replace(/\/+$/, "");
const origin = process.env.AULAS_ORIGIN || "https://pscfredteixeira.github.io";
if (!/^https:\/\/[^/]+$/.test(base)) {
  console.error("Defina AULAS_API_URL como uma origem HTTPS, sem caminho.");
  process.exit(1);
}
async function request(path, method, body, token, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(70_000)
  });
  const data = await response.json().catch(() => null);
  if (response.status !== expected) {
    throw new Error(`Esperado HTTP ${expected}, recebido ${response.status} no endpoint ${path.replace(/aulas-[0-9a-f]{24}/g, ":room")}: ${String(data?.error || "sem detalhe")}`);
  }
  return data;
}
function ensure(condition, message) { if (!condition) throw new Error(message); }

try {
  const health = await request("/api/health", "GET");
  ensure(health.ok, "A API não está saudável.");
  ensure(health.persistent === true, "Firestore não está ativo na API pública.");

  const created = await request("/api/rooms", "POST", { name: "Professor automático" }, undefined, 201);
  const { roomId, teacherSecret } = created;
  ensure(/^aulas-[0-9a-f]{24}$/.test(roomId) && !!teacherSecret, "Criação de sala inválida.");
  const root = `/api/rooms/${roomId}`;
  const alice = await request(root + "/join", "POST", { name: "Aluna de teste A" }, undefined, 201);
  const bruno = await request(root + "/join", "POST", { name: "Aluno de teste B" }, undefined, 201);

  const studentState = await request(root + "/state", "GET", undefined, alice.participantToken);
  ensure(studentState.role === "student" && studentState.room.roomId === roomId, "O aluno não entrou na sala.");

  const draft = await request(root + "/quiz", "POST", {
    prompt: "Qual opção demonstra um quiz interativo funcional?",
    options: ["Pergunta com votos", "Apenas vídeo", "Só texto", "Nada"],
    correctOptionId: "A"
  }, teacherSecret, 201);
  ensure(draft.quiz.phase === "draft", "Não salvou o rascunho.");
  ensure((await request(root + "/state", "GET", undefined, alice.participantToken)).room.quiz === null,
    "Rascunho vazou para um aluno.");

  await request(root + "/quiz-open", "POST", {}, teacherSecret);
  const quizId = draft.quiz.id;
  const aliceVote = await request(root + "/quiz-answer", "POST",
    { quizId, optionId: "A" }, alice.participantToken);
  ensure(aliceVote.quiz.myAnswer === "A", "Primeiro voto não foi aceito.");
  await request(root + "/quiz-answer", "POST", { quizId, optionId: "B" }, bruno.participantToken);
  await request(root + "/quiz-answer", "POST", { quizId, optionId: "B" }, alice.participantToken, 409);
  const teacherView = await request(root + "/state", "GET", undefined, teacherSecret);
  ensure(teacherView.room.quiz.results.total === 2, "Professor não recebeu contagem de dois alunos.");
  const beforeReveal = await request(root + "/state", "GET", undefined, bruno.participantToken);
  ensure(!("results" in beforeReveal.room.quiz) && !("correctOptionId" in beforeReveal.room.quiz),
    "Resultados ou gabarito vazaram antes da revelação.");
  await request(root + "/quiz-close", "POST", {}, teacherSecret);
  await request(root + "/quiz-reveal", "POST", {}, teacherSecret);
  const revealed = await request(root + "/state", "GET", undefined, bruno.participantToken);
  ensure(revealed.room.quiz.correctOptionId === "A" && revealed.room.quiz.results.total === 2,
    "Aluno não recebeu o resultado após autorização do professor.");
  // Sprint 6: enquete sem gabarito.
  const poll = await request(root + "/activity", "POST", {
    type: "poll",
    prompt: "Que assunto a turma prefere discutir?",
    options: ["Desejo e cultura", "Sonhos e símbolos", "Conceito de transferência"]
  }, teacherSecret, 201);
  ensure(poll.activity.phase === "draft", "Rascunho de enquete inválido.");
  ensure((await request(root + "/state", "GET", undefined, alice.participantToken)).room.activity === null,
    "Enquete em rascunho ficou visível para alunos.");
  await request(root + "/activity-open", "POST", {}, teacherSecret);
  await request(root + "/activity-answer", "POST",
    { activityId: poll.activity.id, optionId: "A" }, alice.participantToken);
  await request(root + "/activity-answer", "POST",
    { activityId: poll.activity.id, optionId: "B" }, bruno.participantToken);
  await request(root + "/activity-answer", "POST",
    { activityId: poll.activity.id, optionId: "B" }, alice.participantToken, 409);
  const pollState = await request(root + "/state", "GET", undefined, teacherSecret);
  ensure(pollState.room.focus === "activity" && pollState.room.activity.results.total === 2,
    "Enquete não apurou dois votos ou não foi exibida na turma.");
  ensure(!("results" in (await request(root + "/state", "GET", undefined, alice.participantToken)).room.activity),
    "Resultado vazou antes de divulgação.");
  await request(root + "/activity-close", "POST", {}, teacherSecret);
  await request(root + "/activity-reveal", "POST", {}, teacherSecret);
  const finalPoll = (await request(root + "/state", "GET", undefined, alice.participantToken)).room.activity;
  ensure(finalPoll.results.total === 2 && !("correctOptionId" in finalPoll),
    "Resultado de enquete não chegou ou ganhou gabarito indevido.");

  // Sprint 6: pergunta aberta com moderação (sem revelar o nome do autor ao aluno).
  const openQuestion = await request(root + "/activity", "POST", {
    type: "open_question",
    prompt: "Como a expectativa social influencia nossas escolhas?"
  }, teacherSecret, 201);
  await request(root + "/activity-open", "POST", {}, teacherSecret);
  await request(root + "/activity-answer", "POST", {
    activityId: openQuestion.activity.id, text: "Podemos investigar a relação entre desejo e cultura."
  }, alice.participantToken);
  const teacherContributions = (await request(root + "/state", "GET", undefined, teacherSecret)).room.activity.responses;
  ensure(teacherContributions.length === 1, "Professor não viu contribuição para moderar.");
  const hiddenContributions = (await request(root + "/state", "GET", undefined, bruno.participantToken)).room.activity;
  ensure(hiddenContributions.approvedResponses.length === 0, "Texto foi divulgado sem aprovação.");
  await request(root + "/activity-moderate", "POST", {
    activityId: openQuestion.activity.id, responseId: teacherContributions[0].id, approved: true
  }, teacherSecret);
  const approved = (await request(root + "/state", "GET", undefined, bruno.participantToken)).room.activity;
  ensure(approved.approvedResponses.length === 1 &&
    !JSON.stringify(approved).includes("Aluna de teste A"), "Moderação falhou ou expôs o nome do autor.");
  await request(root + "/activity-close", "POST", {}, teacherSecret);

  const study = await request(root + "/activity", "POST", {
    type: "case",
    context: "Uma pessoa está dividida entre expectativas familiares e a escolha de uma trajetória profissional.",
    prompt: "Que perguntas podem orientar uma discussão sobre esse caso fictício?"
  }, teacherSecret, 201);
  await request(root + "/activity-open", "POST", {}, teacherSecret);
  const caseState = (await request(root + "/state", "GET", undefined, bruno.participantToken)).room.activity;
  ensure(caseState.type === "case" && caseState.context.includes("trajetória profissional"),
    "Estudo de caso não chegou à turma.");
  await request(root + "/activity-close", "POST", {}, teacherSecret);

  // Controle da visualização compartilhada (sem terminar a sala VDO.Ninja).
  await request(root + "/presentation-hide", "POST", {}, alice.participantToken, 403);
  const hiddenPresentation = await request(root + "/presentation-hide", "POST", {}, teacherSecret);
  ensure(hiddenPresentation.room.focus === "none", "Professor não conseguiu recolher a atividade.");
  const hiddenFromStudent = (await request(root + "/state", "GET", undefined, alice.participantToken)).room;
  ensure(hiddenFromStudent.focus === "none" && hiddenFromStudent.status === "open",
    "Recolher atividade encerrou a sala ou não sincronizou com aluno.");
  await request(root + "/presentation-show", "POST", { focus: "activity" }, bruno.participantToken, 403);
  await request(root + "/presentation-show", "POST", { focus: "none" }, teacherSecret, 422);
  const restored = await request(root + "/presentation-show", "POST", { focus: "activity" }, teacherSecret);
  ensure(restored.room.focus === "activity" && restored.room.activity.phase === "closed",
    "A atividade não reapareceu ou a votação foi indevidamente reaberta.");

  await request(root + "/close", "POST", {}, teacherSecret);
  console.log("OK: Firestore ativo; quiz, enquete, moderação, caso e exibição recolhível validados na API pública.");
} catch (error) {
  console.error("FALHA no teste público de atividades:", error instanceof Error ? error.message : "erro desconhecido");
  process.exitCode = 1;
}
