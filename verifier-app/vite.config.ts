import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/vrc-distributed-system-talk-20260404/",
  server: { host: "0.0.0.0" },
});
