import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// gui/vite.config.ts — renderer-only Vite config.
// Main/preload (Electron) are built separately by T2.
// strict TS applies because gui/** is in tsconfig.json include (R-T1.3).
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(here, "renderer"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // shadcn primitives import from "@/lib/utils" / "@/components/ui/...".
      "@": resolve(here, "renderer/src"),
    },
  },
  build: {
    outDir: resolve(here, "dist/renderer"),
    emptyOutDir: true,
  },
  server: {
    port: 5273,
    strictPort: true,
  },
});
