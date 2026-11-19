export const API_BASE_URL = (import.meta.env.VITE_AULAS_API_URL || "").trim().replace(/\/+$/, "");

export type QuizPhase = "draft" | "open" | "closed";

export type Quiz = {
  id: string;
  prompt: string;
  options: { id: "A" | "B" | "C" | "D"; text: string }[];
  phase: QuizPhase;
  version: number;
  // Somente professores recebem essa propriedade pela API.
  correctOptionId?: "A" | "B" | "C" | "D";
};

export type QuizDraftInput = {
  prompt: string;
  options: string[];
  correctOptionId: "A" | "B" | "C" | "D";
};

export type RoomSnapshot = {
  roomId: string;
  status: "open" | "closed";
  expiresAt: string;
  teacher: string;
  quiz: Quiz | null;
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
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
      cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer"
    });
  } catch {
    throw new Error("Não foi possível conectar ao serviço de salas. Tente novamente.");
  }
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : `Falha no serviço (${response.status}).`);
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
