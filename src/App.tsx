import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ScrollToTop from "./components/ScrollToTop.tsx";
import { installRlsMonitor } from "@/lib/rls-block-monitor";

// Activar monitor de RLS blocks (registra errores 42501 en audit_logs como módulo "rls_block")
installRlsMonitor();

// Public pages — eager (kept in main bundle for fast first paint on critical routes)
import Index from "./pages/Index.tsx";
import Contacto from "./pages/Contacto.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPostPage from "./pages/BlogPost.tsx";
import Obituarios from "./pages/Obituarios.tsx";
import ObituarioDetail from "./pages/ObituarioDetail.tsx";
import Memoriales from "./pages/Memoriales.tsx";
import MemorialDetail from "./pages/MemorialDetail.tsx";
import Planes from "./pages/Planes.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

// Secondary public pages — lazy-loaded (visited less often, no need in initial bundle)
const Seguimiento = lazy(() => import("./pages/Seguimiento.tsx"));
const PreguntasFrecuentes = lazy(() => import("./pages/PreguntasFrecuentes.tsx"));
const Pagos = lazy(() => import("./pages/Pagos.tsx"));
const FunerariaComuna = lazy(() => import("./pages/FunerariaComuna.tsx"));
const CoberturaRM = lazy(() => import("./pages/CoberturaRM.tsx"));
const Diag = lazy(() => import("./pages/Diag.tsx"));

// Admin shell + pages — lazy-loaded so the admin bundle never ships to public visitors
const ProtectedRoute = lazy(() => import("./components/admin/ProtectedRoute.tsx"));
const CeoOnlyRoute = lazy(() => import("./components/admin/CeoOnlyRoute.tsx"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.tsx"));
const AdminObituarios = lazy(() => import("./pages/admin/AdminObituarios.tsx"));
const AdminMemoriales = lazy(() => import("./pages/admin/AdminMemoriales.tsx"));
const AdminTracking = lazy(() => import("./pages/admin/AdminTracking.tsx"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog.tsx"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers.tsx"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads.tsx"));
const AdminCasos = lazy(() => import("./pages/admin/AdminCasos.tsx"));
const AdminPagos = lazy(() => import("./pages/admin/AdminPagos.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminAnalyticsComunas = lazy(() => import("./pages/admin/AdminAnalyticsComunas.tsx"));
const AdminRevenueComunas = lazy(() => import("./pages/admin/AdminRevenueComunas.tsx"));
const AdminAjustesIA = lazy(() => import("./pages/admin/AdminAjustesIA.tsx"));
const AdminAgenda = lazy(() => import("./pages/admin/AdminAgenda.tsx"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat.tsx"));

const queryClient = new QueryClient();

/** Lightweight fallback while admin chunks load — preserves layout, avoids CLS */
const AdminFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground tracking-wide">Cargando panel…</p>
    </div>
  </div>
);

/** Public-page fallback — minimal, full-height to prevent CLS while a lazy chunk loads */
const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" aria-label="Cargando" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/planes" element={<Planes />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/obituarios" element={<Obituarios />} />
            <Route path="/obituarios/:slug" element={<ObituarioDetail />} />
            <Route path="/legados-eternos" element={<Memoriales />} />
            <Route path="/legados-eternos/:slug" element={<MemorialDetail />} />
            <Route path="/memoriales" element={<Navigate to="/legados-eternos" replace />} />
            <Route path="/memoriales/:slug" element={<Navigate to="/legados-eternos" replace />} />
            <Route path="/preguntas-frecuentes" element={<Suspense fallback={<PageFallback />}><PreguntasFrecuentes /></Suspense>} />
            <Route path="/seguimiento" element={<Suspense fallback={<PageFallback />}><Seguimiento /></Suspense>} />
            <Route path="/pagos" element={<Suspense fallback={<PageFallback />}><Pagos /></Suspense>} />
            <Route path="/cobertura-region-metropolitana" element={<Suspense fallback={<PageFallback />}><CoberturaRM /></Suspense>} />
            <Route path="/funeraria/:comuna" element={<Suspense fallback={<PageFallback />}><FunerariaComuna /></Suspense>} />
            <Route path="/login" element={<Login />} />
            <Route path="/__diag" element={<Suspense fallback={<PageFallback />}><Diag /></Suspense>} />

            {/* Admin — wrapped in Suspense; chunks load on demand only when /admin is visited */}
            <Route
              path="/admin"
              element={
                <Suspense fallback={<AdminFallback />}>
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                </Suspense>
              }
            >
              <Route index element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
              <Route path="obituarios" element={<Suspense fallback={<AdminFallback />}><CeoOnlyRoute><AdminObituarios /></CeoOnlyRoute></Suspense>} />
              <Route path="memoriales" element={<Suspense fallback={<AdminFallback />}><CeoOnlyRoute><AdminMemoriales /></CeoOnlyRoute></Suspense>} />
              <Route path="tracking" element={<Suspense fallback={<AdminFallback />}><AdminTracking /></Suspense>} />
              <Route path="blog" element={<Suspense fallback={<AdminFallback />}><CeoOnlyRoute><AdminBlog /></CeoOnlyRoute></Suspense>} />
              <Route path="suscriptores" element={<Suspense fallback={<AdminFallback />}><CeoOnlyRoute><AdminSubscribers /></CeoOnlyRoute></Suspense>} />
              <Route path="leads" element={<Suspense fallback={<AdminFallback />}><AdminLeads /></Suspense>} />
              <Route path="casos" element={<Suspense fallback={<AdminFallback />}><AdminCasos /></Suspense>} />
              <Route path="pagos" element={<Suspense fallback={<AdminFallback />}><AdminPagos /></Suspense>} />
              <Route path="configuracion" element={<Suspense fallback={<AdminFallback />}><AdminSettings /></Suspense>} />
              <Route path="analytics-comunas" element={<Suspense fallback={<AdminFallback />}><AdminAnalyticsComunas /></Suspense>} />
              <Route path="roi-comunas" element={<Suspense fallback={<AdminFallback />}><AdminRevenueComunas /></Suspense>} />
              <Route path="ajustes/ia" element={<Suspense fallback={<AdminFallback />}><CeoOnlyRoute><AdminAjustesIA /></CeoOnlyRoute></Suspense>} />
              <Route path="agenda" element={<Suspense fallback={<AdminFallback />}><AdminAgenda /></Suspense>} />
              <Route path="chat" element={<Suspense fallback={<AdminFallback />}><AdminChat /></Suspense>} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
