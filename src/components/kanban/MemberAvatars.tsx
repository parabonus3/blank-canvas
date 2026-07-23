import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MemberLike {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  members: MemberLike[];
  max?: number;
  size?: "xs" | "sm" | "md";
  activeUserIds?: string[];
  className?: string;
}

const SIZE_MAP = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
};

export function MemberAvatars({ members, max = 3, size = "sm", activeUserIds = [], className }: Props) {
  if (!members.length) return null;
  const visible = members.slice(0, max);
  const rest = members.length - visible.length;
  const activeSet = new Set(activeUserIds);
  const sz = SIZE_MAP[size];

  return (
    <div className={cn("flex -space-x-1.5", className)}>
      {visible.map((m) => {
        const initials = (m.display_name || "?").trim().slice(0, 2).toUpperCase();
        const isActive = activeSet.has(m.user_id);
        return (
          <div key={m.user_id} className="relative" title={m.display_name || ""}>
            <Avatar className={cn(sz, "border-2 border-background", isActive && "ring-2 ring-orange-500")}>
              {m.avatar_url && <AvatarImage src={m.avatar_url} />}
              <AvatarFallback className="bg-primary/20 text-primary font-medium">{initials}</AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-background animate-pulse" />
            )}
          </div>
        );
      })}
      {rest > 0 && (
        <div className={cn(sz, "rounded-full bg-muted border-2 border-background flex items-center justify-center font-semibold text-muted-foreground")}>
          +{rest}
        </div>
      )}
    </div>
  );
}
