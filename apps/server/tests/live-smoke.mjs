/** Teste de integração contra a API pública; só dados fictícios, sem expor tokens em logs. */
const base = (process.env.AULAS_API_URL || "").replace(/\/+$/, "");
const origin = process.env.AULAS_ORIGIN || "https://pscfredteixeira.github.io";
if (!/^https:\/\/[^/]+$/.test(base)) {
  console.error("Defina AULAS_API_URL como origem HTTPS, sem caminho.");
  process.exit(1);
}
async function request(path, method, body, token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60_000)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} no endpoint ${path.replace(/aulas-[0-9a-f]{24}/g, ":room")}: ${String(data?.error || "sem detalhe")}`);
  }
  return data;
}
try {
  const health = await request("/api/health", "GET");
  if (!health.ok) throw new Error("Serviço não está saudável.");
  const created = await request("/api/rooms", "POST", { name: "Professor teste" });
  const roomId = created.roomId;
  if (!/^aulas-[0-9a-f]{24}$/.test(roomId) || !created.teacherSecret) {
    throw new Error("Resposta de criação de sala inválida.");
  }
  const student = await request(`/api/rooms/${roomId}/join`, "POST", { name: "Aluno teste" });
  if (!student.participantToken) throw new Error("O aluno não recebeu token.");
  const studentView = await request(`/api/rooms/${roomId}/state`, "GET", undefined, student.participantToken);
  if (studentView.role !== "student" || studentView.room.roomId !== roomId) {
    throw new Error("A entrada do aluno não foi reconhecida.");
  }
  // Encerra a sala de teste imediatamente, sem guardar usuários ou segredos.
  await request(`/api/rooms/${roomId}/close`, "POST", {}, created.teacherSecret);
  console.log("OK: API pública criou sala, aceitou aluno e retornou status de aluno sem login.");
} catch (error) {
  console.error("FALHA no teste real de ingresso por convite:", error instanceof Error ? error.message : "erro desconhecido");
  process.exitCode = 1;
}
