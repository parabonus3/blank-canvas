import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Target, 
  History, 
  Settings,
  LogOut,
  Timer,
  Menu,
  Trophy,
  StickyNote,
  CreditCard,
  Shield,
  Users,
  Globe,
  Brain,
  UserPlus,
  Headset,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsSupportAgent } from "@/hooks/useSupportAgents";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingInvitations } from "@/hooks/useRoomInvitations";
import { useFriendships } from "@/hooks/useFriendships";
import { useUnreadDMCount } from "@/hooks/useDirectMessages";
import { useUnreadTicketCount } from "@/hooks/useSupportTickets";
import { Button } from "@/components/ui/button";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo.png";
import { SidebarMiniTimer } from "@/components/SidebarMiniTimer";
import { SidebarStreakWidget } from "@/components/SidebarStreakWidget";
import { SidebarMiniPlayer } from "@/components/SidebarMiniPlayer";

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { isAdmin } = useIsAdmin();
  const { isAgent: isSacAgent } = useIsSupportAgent();
  const { data: pendingInvitations } = usePendingInvitations();
  const { pendingReceived } = useFriendships();
  const { data: unreadDMs = 0 } = useUnreadDMCount();
  const { data: unreadTickets = 0 } = useUnreadTicketCount();
  const pendingCount = pendingInvitations?.length || 0;
  const friendRequestCount = pendingReceived?.length || 0;
  const friendsBadge = friendRequestCount + (unreadDMs as number);

  const navItems = [
    { title: t('sidebar.timer'), url: "/timer", icon: Timer },
    { title: t('sidebar.dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('sidebar.projects'), url: "/projects", icon: FolderOpen },
    { title: t('sidebar.goals'), url: "/goals", icon: Target },
    { title: t('sidebar.history'), url: "/history", icon: History },
    { title: t('sidebar.notes'), url: "/notes", icon: StickyNote },
    { title: t('sidebar.mindmaps'), url: "/mindmaps", icon: Brain },
    { title: t('sidebar.rooms'), url: "/rooms", icon: Users },
    { title: t('sidebar.explore'), url: "/explore", icon: Globe },
    { title: t('sidebar.achievements'), url: "/achievements", icon: Trophy },
    { title: t('sidebar.friends'), url: "/friends", icon: UserPlus },
    { title: t('sidebar.settings'), url: "/settings", icon: Settings },
    { title: t('sidebar.support'), url: "/sac", icon: Headset },
    { title: t('sidebar.pricing'), url: "/pricing", icon: CreditCard },
    ...(isAdmin ? [{ title: t('sidebar.admin'), url: "/admin", icon: Shield }] : []),
    ...(isSacAgent ? [{ title: "SAC", url: "/sac/dashboard", icon: Headset }] : []),
  ];

  return (
    <ShadcnSidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className={cn(isCollapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <img
            src={logo}
            alt="TimeZoni"
            className={cn(
              "shrink-0 object-contain",
              isCollapsed ? "h-8 w-8" : "h-10 w-10"
            )}
          />
          {!isCollapsed && (
            <span className="font-bold text-lg tracking-tight">TimeZoni</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMiniTimer />
        <SidebarStreakWidget />
        <SidebarMiniPlayer />
        <SidebarGroup>
          <SidebarGroupLabel className={cn(isCollapsed && "sr-only")}>
            {t('sidebar.navigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="relative">
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.url === "/rooms" && pendingCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                              {pendingCount > 9 ? "9+" : pendingCount}
                            </span>
                          )}
                          {item.url === "/friends" && friendsBadge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                              {friendsBadge > 9 ? "9+" : friendsBadge}
                            </span>
                          )}
                          {item.url === "/sac" && (unreadTickets as number) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                              {(unreadTickets as number) > 9 ? "9+" : unreadTickets}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          onClick={signOut}
          className={cn(
            "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
            !isCollapsed && "justify-start gap-3"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && t('sidebar.logout')}
        </Button>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}

export function SidebarToggle() {
  return (
    <SidebarTrigger className="h-9 w-9">
      <Menu className="h-5 w-5" />
    </SidebarTrigger>
  );
}
