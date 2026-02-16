import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nContext";
import Index from "./pages/Index";
import StaffView from "./pages/StaffView";
import ManagerDashboard from "./pages/ManagerDashboard";
import SupervisorView from "./pages/SupervisorView";
import PropertyManagerView from "./pages/PropertyManagerView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <I18nProvider defaultLocale="he">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/staff" element={<StaffView />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/supervisor" element={<SupervisorView />} />
            <Route path="/property-manager" element={<PropertyManagerView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </I18nProvider>
);

export default App;
