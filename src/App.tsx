import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import EmpresasPage from "./pages/EmpresasPage";
import FiliaisPage from "./pages/FiliaisPage";
import UsuariosPage from "./pages/UsuariosPage";
import RankingPage from "./pages/RankingPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/empresas" element={<EmpresasPage />} />
              <Route path="/filiais" element={<FiliaisPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/contatos" element={<DashboardPage />} />
              <Route path="/visitas" element={<DashboardPage />} />
              <Route path="/vendedores" element={<RankingPage />} />
              <Route path="/auditoria" element={<DashboardPage />} />
              <Route path="/relatorios" element={<DashboardPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
