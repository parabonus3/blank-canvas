import { useRef } from 'react';
import { NODE_COLORS, PASTEL_COLORS } from './MindMapTemplates';
import { cn } from '@/lib/utils';
import { Pipette } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALL_PRESETS = [...NODE_COLORS, ...PASTEL_COLORS];

interface MindMapColorPickerProps {
  currentColor: string;
  onChange: (color: string) => void;
}

export function MindMapColorPicker({ currentColor, onChange }: MindMapColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-1.5">
        {ALL_PRESETS.map(color => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
              currentColor === color ? 'border-foreground scale-110' : 'border-transparent'
            )}
            style={{ background: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <input
          ref={colorInputRef}
          type="color"
          value={currentColor?.startsWith('#') ? currentColor : '#3b82f6'}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
        />
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-xs"
          onClick={() => colorInputRef.current?.click()}
        >
          <Pipette className="h-3.5 w-3.5" />
          Custom
        </Button>
        {currentColor && (
          <div
            className="w-7 h-7 rounded-full border-2 border-foreground shrink-0"
            style={{ background: currentColor }}
          />
        )}
      </div>
    </div>
  );
}
