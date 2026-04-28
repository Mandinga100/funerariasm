import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor deps into named chunks so they're only downloaded
        // when a route actually imports them (paired with React.lazy in App.tsx).
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          // Charts — only used by admin dashboard
          if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";

          // Supabase SDK — used by most pages but heavy enough to isolate for caching
          if (id.includes("@supabase")) return "vendor-supabase";

          // Radix UI — keep ALL primitives together in one chunk.
          // Splitting Radix by "admin vs public" is unsafe because shared internals
          // (react-primitive, react-compose-refs, react-context, react-portal, etc.)
          // can end up in only one chunk, leaving the other with broken imports
          // (manifests as `Xx is not a function` and a blank screen in production).
          if (id.includes("@radix-ui")) return "vendor-radix";

          // Form stack — react-hook-form + zod, mainly admin and contact forms
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("/zod/")
          ) {
            return "vendor-forms";
          }

          // Icons — large barrel, isolate so it caches separately
          if (id.includes("lucide-react")) return "vendor-icons";

          // Date utilities
          if (id.includes("date-fns") || id.includes("react-day-picker")) {
            return "vendor-date";
          }

          // React core stays in main vendor chunk (default behavior)
          return undefined;
        },
      },
    },
    // Slightly larger warning threshold since we intentionally keep React + router together
    chunkSizeWarningLimit: 600,
  },
}));
