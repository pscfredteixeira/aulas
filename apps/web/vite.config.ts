import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages publica projetos em /<repositorio>/.
  // Em desenvolvimento local, o site continua na raiz (/).
  base: command === "build" ? "/aulas/" : "/",
}));
