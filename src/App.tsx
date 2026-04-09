import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
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
import Seguimiento from "./pages/Seguimiento.tsx";
import ProtectedRoute from "./components/admin/ProtectedRoute.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import AdminObituarios from "./pages/admin/AdminObituarios.tsx";
import AdminMemoriales from "./pages/admin/AdminMemoriales.tsx";
import AdminTracking from "./pages/admin/AdminTracking.tsx";
import AdminBlog from "./pages/admin/AdminBlog.tsx";
import AdminLeads from "./pages/admin/AdminLeads.tsx";
import PreguntasFrecuentes from "./pages/PreguntasFrecuentes.tsx";
import Pagos from "./pages/Pagos.tsx";
import NotFound from "./pages/NotFound.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";

const queryClient = new QueryClient();

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
            <Route path="/memoriales" element={<Memoriales />} />
            <Route path="/memoriales/:slug" element={<MemorialDetail />} />
            <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
            <Route path="/seguimiento" element={<Seguimiento />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="obituarios" element={<AdminObituarios />} />
              <Route path="memoriales" element={<AdminMemoriales />} />
              <Route path="tracking" element={<AdminTracking />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="leads" element={<AdminLeads />} />
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
