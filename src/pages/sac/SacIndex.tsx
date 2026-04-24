import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSupportAgent } from "@/hooks/useSupportAgents";

export default function SacIndex() {
  const { user, loading } = useAuth();
  const { isAgent, isLoading } = useIsSupportAgent();

  if (loading || isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAgent) return <Navigate to="/sac/dashboard" replace />;
  return <Navigate to="/sac/tickets" replace />;
}
