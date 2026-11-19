import { createAulasServer } from "./server.mjs";
import { createFirestoreStore } from "./firestore-store.mjs";

const port = Number(process.env.PORT || 8787);
const allowedOrigins = (process.env.AULAS_ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",").map(v => v.trim()).filter(Boolean);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT inválida.");
}
const store = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? await createFirestoreStore(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : null;
if (store) console.log("Firestore ativado para persistência de salas.");
else console.log("Aulas em modo temporário: FIREBASE_SERVICE_ACCOUNT_JSON não configurada.");
const server = createAulasServer({ allowedOrigins, store });
server.listen(port, "0.0.0.0", () => {
  console.log(`Aulas API ouvindo na porta ${port}. Origens permitidas: ${allowedOrigins.join(", ")}`);
});
