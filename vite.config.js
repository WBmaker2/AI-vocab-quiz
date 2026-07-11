import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (!normalizedId.includes("/node_modules/")) {
            return undefined;
          }

          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          if (
            normalizedId.includes("/node_modules/firebase/") ||
            normalizedId.includes("/node_modules/@firebase/")
          ) {
            return "vendor-firebase";
          }

          if (
            normalizedId.includes("/node_modules/read-excel-file/") ||
            normalizedId.includes("/node_modules/fflate/")
          ) {
            return "spreadsheet";
          }

          return "vendor";
        },
      },
    },
  },
});
