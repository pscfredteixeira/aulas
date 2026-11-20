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
  await request(root + "/close", "POST", {}, teacherSecret);
  console.log("OK: Firestore ativo; convites, votos individuais, contagem e revelação do quiz validados na API pública.");
} catch (error) {
  console.error("FALHA no teste de quiz:", error instanceof Error ? error.message : "erro desconhecido");
  process.exitCode = 1;
}
