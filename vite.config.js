import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api/* -> FastAPI (localhost:8000), CORS ka jhanjhat nahi
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": { target: "http://localhost:8000", rewrite: (p) => p.replace(/^\/api/, "") } } },
});
