import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useStreakRescue } from "@/hooks/useStreakRescue";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, SidebarToggle } from "./Sidebar";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PendingPlanChangeBanner } from "@/components/PendingPlanChangeBanner";
import { ExpiredPlanBanner } from "@/components/ExpiredPlanBanner";
import { Sun, Moon } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  useSoundEffects(); // Sync global sound preferences from profile
  useStreakRescue(); // Check once per session for retroactive streak rescue
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-h-screen min-w-0">
            <ExpiredPlanBanner />
            <PendingPlanChangeBanner />
            <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <SidebarToggle />
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher variant="ghost" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                >
                  {theme === "light" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </header>
            <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto scrollbar-thin">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
  );
}
