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

          // Radix UI primitives — split by where they're used.
          // Public pages only need: accordion, slot, label, checkbox, select,
          // tabs, toast, tooltip, react-compose-refs, react-primitive (shared).
          // Admin-only primitives (dialog, dropdown-menu, popover, separator,
          // switch, etc.) go into a separate chunk that only loads with admin routes.
          if (id.includes("@radix-ui")) {
            const adminOnlyPrimitives = [
              "react-dialog",       // also used by sheet (admin-only)
              "react-dropdown-menu",
              "react-popover",
              "react-separator",
              "react-switch",
              "react-alert-dialog",
              "react-context-menu",
              "react-hover-card",
              "react-menubar",
              "react-navigation-menu",
              "react-radio-group",
              "react-scroll-area",
              "react-slider",
              "react-toggle",
              "react-toggle-group",
              "react-collapsible",
              "react-avatar",
              "react-aspect-ratio",
              "react-progress",
            ];
            const isAdminOnly = adminOnlyPrimitives.some((p) =>
              id.includes(`@radix-ui/${p}/`)
            );
            return isAdminOnly ? "vendor-radix-admin" : "vendor-radix-public";
          }

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
