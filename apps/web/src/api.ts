export class ApiRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export const API_BASE_URL = (import.meta.env.VITE_AULAS_API_URL || "").trim().replace(/\/+$/, "");

export type QuizPhase = "draft" | "open" | "closed";
export type QuizOptionId = "A" | "B" | "C" | "D";
export type QuizResults = {
  total: number;
  counts: Record<QuizOptionId, number>;
};

export type Quiz = {
  id: string;
  prompt: string;
  options: { id: QuizOptionId; text: string }[];
  phase: QuizPhase;
  version: number;
  revealed: boolean;
  // O servidor fornece resultados ao professor e aos alunos somente após a revelação.
  results?: QuizResults;
  // A resposta correta só chega ao aluno depois que o professor revela os resultados.
  correctOptionId?: QuizOptionId;
  // A resposta individual é visível somente para o próprio aluno.
  myAnswer?: QuizOptionId | null;
};

export type QuizDraftInput = {
  prompt: string;
  options: string[];
  correctOptionId: QuizOptionId;
};

export type ActivityType = "poll" | "open_question" | "case";
export type ActivityPhase = "draft" | "open" | "closed";
export type ActivityResponse = {
  id: string;
  text: string;
  approved: boolean;
  name?: string; // Retornado somente para professores.
};
export type Activity = {
  id: string;
  type: ActivityType;
  prompt: string;
  context?: string;
  options?: { id: QuizOptionId; text: string }[];
  phase: ActivityPhase;
  revealed: boolean;
  version: number;
  results?: { total: number; counts: Partial<Record<QuizOptionId, number>> };
  myAnswer?: QuizOptionId | null;
  myResponse?: ActivityResponse | null;
  responses?: ActivityResponse[]; // Professor.
  approvedResponses?: { id: string; text: string }[]; // Aluno, sem nomes.
};
export type ActivityDraftInput = {
  type: ActivityType;
  prompt: string;
  context?: string;
  options?: string[];
};

export type RoomSnapshot = {
  roomId: string;
  status: "open" | "closed";
  expiresAt: string;
  teacher: string;
  quiz: Quiz | null;
  activity: Activity | null;
  focus: "quiz" | "activity";
  participants: { id: string; name: string }[];
};
export type CreatedRoom = {
  roomId: string;
  teacherSecret: string;
  room: RoomSnapshot;
};
export type JoinedRoom = {
  participantId: string;
  participantToken: string;
  room: RoomSnapshot;
};

async function api<T>(path: string, method: "GET" | "POST", body?: object, token?: string): Promise<T> {
  if (!API_BASE_URL) throw new Error("Serviço de salas ainda não configurado.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  // O Render gratuito pode precisar acordar após um período sem uso.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70_000);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
      cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
      signal: controller.signal
    });
  } catch {
    throw new ApiRequestError("Não foi possível conectar ao serviço de salas. Se ele estiver hibernando, tente novamente em alguns instantes.");
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new ApiRequestError(typeof data?.error === "string" ? data.error : `Falha no serviço (${response.status}).`, response.status);
  }
  return data as T;
}

export function createProtectedRoom(name: string) {
  return api<CreatedRoom>("/api/rooms", "POST", { name });
}
export function authorizeTeacher(roomId: string, secret: string) {
  return api<{ role: "teacher"; room: RoomSnapshot }>(`/api/rooms/${roomId}/teacher`, "POST", { secret });
}
export function joinProtectedRoom(roomId: string, name: string) {
  return api<JoinedRoom>(`/api/rooms/${roomId}/join`, "POST", { name });
}
export function fetchRoomState(roomId: string, token: string) {
  return api<{ role: "teacher" | "student"; room: RoomSnapshot }>(
    `/api/rooms/${roomId}/state`, "GET", undefined, token
  );
}
export function leaveProtectedRoom(roomId: string, token: string) {
  return api<{ ok: boolean }>(`/api/rooms/${roomId}/leave`, "POST", {}, token);
}
export function closeProtectedRoom(roomId: string, token: string) {
  return api<{ room: RoomSnapshot }>(`/api/rooms/${roomId}/close`, "POST", {}, token);
}
export function rotateTeacherSecret(roomId: string, token: string) {
  return api<{ teacherSecret: string }>(`/api/rooms/${roomId}/rotate`, "POST", {}, token);
}

export function saveQuizDraft(roomId: string, token: string, draft: QuizDraftInput) {
  return api<{ quiz: Quiz }>(`/api/rooms/${roomId}/quiz`, "POST", draft, token);
}
export function openQuiz(roomId: string, token: string) {
  return api<{ quiz: Quiz }>(`/api/rooms/${roomId}/quiz-open`, "POST", {}, token);
}
export function closeQuiz(roomId: string, token: string) {
  return api<{ quiz: Quiz }>(`/api/rooms/${roomId}/quiz-close`, "POST", {}, token);
}

export function submitQuizAnswer(roomId: string, studentToken: string, quizId: string, optionId: QuizOptionId) {
  return api<{ quiz: Quiz }>(`/api/rooms/${roomId}/quiz-answer`, "POST", { quizId, optionId }, studentToken);
}
export function revealQuizResults(roomId: string, teacherToken: string) {
  return api<{ quiz: Quiz }>(`/api/rooms/${roomId}/quiz-reveal`, "POST", {}, teacherToken);
}

export function saveActivityDraft(roomId: string, teacherToken: string, draft: ActivityDraftInput) {
  return api<{ activity: Activity }>(`/api/rooms/${roomId}/activity`, "POST", draft, teacherToken);
}
export function openActivity(roomId: string, teacherToken: string) {
  return api<{ activity: Activity }>(`/api/rooms/${roomId}/activity-open`, "POST", {}, teacherToken);
}
export function closeActivity(roomId: string, teacherToken: string) {
  return api<{ activity: Activity }>(`/api/rooms/${roomId}/activity-close`, "POST", {}, teacherToken);
}
export function revealActivity(roomId: string, teacherToken: string) {
  return api<{ activity: Activity }>(`/api/rooms/${roomId}/activity-reveal`, "POST", {}, teacherToken);
}
export function submitActivityAnswer(
  roomId: string,
  studentToken: string,
  activityId: string,
  answer: { optionId: QuizOptionId } | { text: string }
) {
  return api<{ activity: Activity }>(`/api/rooms/${roomId}/activity-answer`, "POST", { activityId, ...answer }, studentToken);
}
export function moderateActivityResponse(
  roomId: string,
  teacherToken: string,
  activityId: string,
  responseId: string,
  approved: boolean
) {
  return api<{ activity: Activity }>(`/api/rooms/${roomId}/activity-moderate`, "POST",
    { activityId, responseId, approved }, teacherToken);
}
