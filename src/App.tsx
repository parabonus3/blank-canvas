import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDMNotifications } from "@/hooks/useDirectMessages";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { TimerProvider } from "@/contexts/TimerContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AmbientSoundProvider } from "@/contexts/AmbientSoundContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Goals from "./pages/Goals";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Achievements from "./pages/Achievements";
import Notes from "./pages/Notes";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import RoomPreview from "./pages/RoomPreview";
import Explore from "./pages/Explore";
import MindMaps from "./pages/MindMaps";
import MindMapEditor from "./pages/MindMapEditor";
import Friends from "./pages/Friends";
import SacIndex from "./pages/sac/SacIndex";
import NewTicket from "./pages/sac/NewTicket";
import MyTickets from "./pages/sac/MyTickets";
import SacDashboard from "./pages/sac/SacDashboard";
import TicketDetail from "./pages/sac/TicketDetail";
import AgentManager from "./pages/sac/AgentManager";

const queryClient = new QueryClient();

function DirectionHandler() {
  const { i18n } = useTranslation();
  useDMNotifications();
  useEffect(() => {
    const dir = i18n.language.startsWith("ar") ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <ThemeProvider>
          <PomodoroProvider>
            <TimerProvider>
            <AmbientSoundProvider>
            <TooltipProvider>
              <DirectionHandler />
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/room-preview/:code" element={<RoomPreview />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/timer" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                  <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
                  <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                  <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
                  <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
                  <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                  <Route path="/rooms/:id" element={<ProtectedRoute><RoomDetail /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                  <Route path="/mindmaps" element={<ProtectedRoute><MindMaps /></ProtectedRoute>} />
                  <Route path="/mindmaps/:id" element={<ProtectedRoute><MindMapEditor /></ProtectedRoute>} />
                  <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
                  <Route path="/sac" element={<SacIndex />} />
                  <Route path="/sac/new" element={<NewTicket />} />
                  <Route path="/sac/tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
                  <Route path="/sac/dashboard" element={<ProtectedRoute><SacDashboard /></ProtectedRoute>} />
                  <Route path="/sac/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
                  <Route path="/sac/agents" element={<ProtectedRoute><AgentManager /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
            </AmbientSoundProvider>
            </TimerProvider>
          </PomodoroProvider>
        </ThemeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
