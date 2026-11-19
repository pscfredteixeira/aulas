import { createAulasServer } from "./server.mjs";

const port = Number(process.env.PORT || 8787);
const allowedOrigins = (process.env.AULAS_ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",").map(v => v.trim()).filter(Boolean);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT inválida.");
}
const server = createAulasServer({ allowedOrigins });
server.listen(port, "0.0.0.0", () => {
  console.log(`Aulas API ouvindo na porta ${port}. Origens permitidas: ${allowedOrigins.join(", ")}`);
});
