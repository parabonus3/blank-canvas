import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSupportAgent } from "@/hooks/useSupportAgents";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Ticket, Users, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export function SacLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAgent, isAdmin } = useIsSupportAgent();

  const agentNav = [
    { label: t("support.dashboard"), icon: LayoutDashboard, href: "/sac/dashboard" },
    { label: t("support.tickets"), icon: Ticket, href: "/sac/tickets" },
    ...(isAdmin ? [{ label: t("support.agents"), icon: Users, href: "/sac/agents" }] : []),
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {isAgent && (
        <aside className="hidden md:flex w-56 flex-col border-r border-border/50 p-4">
          <div className="flex items-center gap-2 mb-6">
            <img src={logo} alt="TimeZoni" className="h-8 w-8" />
            <span className="font-bold text-sm">SAC</span>
          </div>

          <nav className="flex-1 space-y-1">
            {agentNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-2">
            <Link to="/timer">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                {t("support.back_to_app")}
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              {t("sidebar.logout")}
            </Button>
          </div>
        </aside>
      )}

      {/* Mobile header for agents */}
      {isAgent && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b p-2 flex items-center gap-2 overflow-x-auto">
          <img src={logo} alt="TimeZoni" className="h-6 w-6 shrink-0" />
          {agentNav.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap",
                location.pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-3 w-3" />
              {item.label}
            </Link>
          ))}
          <Link to="/timer" className="ml-auto text-xs text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Main content */}
      <main className={cn(
        "flex-1 overflow-y-auto",
        isAgent ? "md:p-6 p-4 pt-14 md:pt-6" : "p-4"
      )}>
        {/* Top bar for logged-in non-agent users */}
        {user && !isAgent && (
          <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between">
            <Link to="/timer">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                {t("support.back_to_app")}
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              {t("sidebar.logout")}
            </Button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
