import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  tooltip?: string;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export function FieldLabel({ label, tooltip, htmlFor, className, required }: Props) {
  const isMobile = useIsMobile();

  return (
    <div className={cn("flex items-center gap-1.5 mb-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {tooltip && (
        isMobile ? (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Info" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="text-xs max-w-[260px]">{tooltip}</PopoverContent>
          </Popover>
        ) : (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Info" className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      )}
    </div>
  );
}
