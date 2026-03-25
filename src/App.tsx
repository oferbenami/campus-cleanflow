import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nContext";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import ResetPassword from "./pages/ResetPassword";
import StaffView from "./pages/StaffView";
import ManagerDashboard from "./pages/ManagerDashboard";
import SupervisorView from "./pages/SupervisorView";
import PropertyManagerView from "./pages/PropertyManagerView";
import NotFound from "./pages/NotFound";
import NotebookLMShare from "./pages/NotebookLMShare";

const queryClient = new QueryClient();

const App = () => (
  <I18nProvider defaultLocale="he">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={["cleaning_staff"]}>
                    <StaffView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager"
                element={
                  <ProtectedRoute allowedRoles={["campus_manager"]}>
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor"
                element={
                  <ProtectedRoute allowedRoles={["supervisor"]}>
                    <SupervisorView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/property-manager"
                element={
                  <ProtectedRoute allowedRoles={["property_manager"]}>
                    <PropertyManagerView />
                  </ProtectedRoute>
                }
              />
              <Route path="/notebooklm" element={<NotebookLMShare />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </I18nProvider>
);

export default App;
