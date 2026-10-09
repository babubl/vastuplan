import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// BASE_PATH is "/vastuplan/" on GitHub Pages (project site) and "/" on a custom domain.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/vastuplan/",
  plugins: [react(), tailwindcss()],
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
