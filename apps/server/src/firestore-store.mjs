import { Buffer } from "node:buffer";

/** The backend alone sees these records. Never return internal hashes in API responses. */
export function serializeRoom(room) {
  return {
    id: room.id,
    teacherName: room.teacherName,
    teacherHash: room.teacherHash.toString("hex"),
    expiresAt: room.expiresAt,
    status: room.status,
    quiz: room.quiz ?? null,
    activity: room.activity ?? null,
    focus: room.focus && ["quiz", "activity", "none"].includes(room.focus) ? room.focus : "quiz",
    participants: [...room.participants.values()].map(participant => ({
      id: participant.id,
      name: participant.name,
      hash: participant.hash.toString("hex"),
      lastSeen: participant.lastSeen
    }))
  };
}

export function reviveRoom(raw) {
  if (!raw || typeof raw.id !== "string" || !/^aulas-[0-9a-f]{24}$/.test(raw.id) ||
      typeof raw.teacherHash !== "string" || !/^[0-9a-f]{64}$/.test(raw.teacherHash) ||
      !Number.isFinite(raw.expiresAt) || !["open", "closed"].includes(raw.status) ||
      !Array.isArray(raw.participants)) {
    throw new Error("Dados de sala inconsistentes no armazenamento.");
  }
  const participants = new Map();
  for (const entry of raw.participants) {
    if (!entry || typeof entry.id !== "string" || typeof entry.name !== "string" ||
        !/^[0-9a-f]{64}$/.test(entry.hash) || !Number.isFinite(entry.lastSeen)) {
      throw new Error("Dados de participante inconsistentes.");
    }
    participants.set(entry.id, {
      id: entry.id, name: entry.name, lastSeen: entry.lastSeen,
      hash: Buffer.from(entry.hash, "hex")
    });
  }
  return {
    id: raw.id,
    teacherName: raw.teacherName,
    teacherHash: Buffer.from(raw.teacherHash, "hex"),
    expiresAt: raw.expiresAt,
    status: raw.status,
    quiz: raw.quiz ?? null,
    activity: raw.activity ?? null,
    focus: raw.focus && ["quiz", "activity", "none"].includes(raw.focus) ? raw.focus : "quiz",
    participants
  };
}

/**
 * Durable Firestore adapter. This module only imports firebase-admin when
 * explicitly enabled with FIREBASE_SERVICE_ACCOUNT_JSON on the backend.
 * Never expose this JSON to Vite, frontend source or GitHub Actions.
 */
export async function createFirestoreStore(serviceAccountJSON, { collection = "aulas_rooms" } = {}) {
  if (!serviceAccountJSON || typeof serviceAccountJSON !== "string") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON é obrigatória para usar Firestore.");
  }
  let account;
  try {
    account = JSON.parse(serviceAccountJSON);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não é um JSON válido.");
  }
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error("Credencial Firebase incompleta (project_id, client_email, private_key).");
  }
  const [{ initializeApp, cert }, { getFirestore }] = await Promise.all([
    import("firebase-admin/app"), import("firebase-admin/firestore")
  ]);
  const app = initializeApp({ credential: cert(account) }, "aulas-server");
  const db = getFirestore(app);
  const rooms = db.collection(collection);
  return {
    async get(id) {
      const snapshot = await rooms.doc(id).get();
      if (!snapshot.exists) return null;
      return reviveRoom(snapshot.data());
    },
    async save(room) {
      const data = serializeRoom(room);
      await rooms.doc(room.id).set(data);
    },
    async delete(id) {
      await rooms.doc(id).delete();
    },
    async cleanupExpired(timestamp) {
      const expired = await rooms.where("expiresAt", "<=", timestamp).limit(100).get();
      if (expired.empty) return;
      const batch = db.batch();
      for (const doc of expired.docs) batch.delete(doc.ref);
      await batch.commit();
    }
  };
}
