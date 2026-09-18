import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Timer, CalendarDays, KanbanSquare, Users, Menu, FolderOpen, Target,
  Footprints, History, StickyNote, Brain, Globe, Trophy, UserPlus,
  Settings, CreditCard, Headset, LayoutDashboard, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsSupportAgent } from "@/hooks/useSupportAgents";
import { cn } from "@/lib/utils";

const primary = [
  { key: "timer", to: "/timer", icon: Timer },
  { key: "today", to: "/today", icon: CalendarDays },
  { key: "tasks", to: "/tasks", icon: KanbanSquare },
  { key: "rooms", to: "/rooms", icon: Users },
] as const;

export function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { isAgent } = useIsSupportAgent();

  const groups = [
    {
      key: "plan",
      items: [
        { label: t("sidebar.projects"), to: "/projects", icon: FolderOpen },
        { label: t("sidebar.goals"), to: "/goals", icon: Target },
        { label: t("sidebar.notes"), to: "/notes", icon: StickyNote },
        { label: t("sidebar.mindmaps"), to: "/mindmaps", icon: Brain },
      ],
    },
    {
      key: "record",
      items: [
        { label: t("sidebar.runs", "Corridas"), to: "/runs", icon: Footprints },
        { label: t("sidebar.history"), to: "/history", icon: History },
        { label: t("sidebar.dashboard"), to: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      key: "social",
      items: [
        { label: t("sidebar.explore"), to: "/explore", icon: Globe },
        { label: t("sidebar.friends"), to: "/friends", icon: UserPlus },
        { label: t("sidebar.achievements"), to: "/achievements", icon: Trophy },
      ],
    },
    {
      key: "account",
      items: [
        { label: t("sidebar.settings"), to: "/settings", icon: Settings },
        { label: t("sidebar.pricing"), to: "/pricing", icon: CreditCard },
        { label: t("sidebar.support"), to: "/sac", icon: Headset },
        ...(isAdmin ? [{ label: t("sidebar.admin"), to: "/admin", icon: Shield }] : []),
        ...(isAgent ? [{ label: "SAC", to: "/sac/dashboard", icon: Headset }] : []),
      ],
    },
  ];

  const moreActive = groups.some(group => group.items.some(item => location.pathname.startsWith(item.to)));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label={t("mobile_nav.label")}
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
          {primary.map(item => {
            const active = location.pathname === item.to || (item.to !== "/timer" && location.pathname.startsWith(`${item.to}/`));
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span className="max-w-full truncate px-0.5">{t(`mobile_nav.${item.key}`)}</span>
              </NavLink>
            );
          })}
          <Button
            variant="ghost"
            className={cn(
              "h-16 min-w-0 rounded-none px-0 text-muted-foreground hover:bg-transparent hover:text-primary",
              moreActive && "text-primary",
            )}
            onClick={() => setMoreOpen(true)}
            aria-label={t("mobile_nav.more")}
          >
            <span className="flex min-w-0 flex-col items-center gap-1 text-[10px] font-medium">
              <Menu className="h-5 w-5" />
              <span>{t("mobile_nav.more")}</span>
            </span>
          </Button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[82dvh] overflow-y-auto rounded-t-lg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 md:hidden">
          <SheetHeader className="text-start">
            <SheetTitle>{t("mobile_nav.more")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            {groups.map(group => (
              <section key={group.key}>
                <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {t(`mobile_nav.groups.${group.key}`)}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.to);
                    return (
                      <Button key={item.to} asChild variant={active ? "secondary" : "ghost"} className="h-12 justify-start gap-3 px-3">
                        <NavLink to={item.to} onClick={() => setMoreOpen(false)}>
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      </Button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
