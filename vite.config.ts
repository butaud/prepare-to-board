import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    allowedHosts: ["butaud-hp-spectre-silver.tail8f308b.ts.net"],
  },
});
