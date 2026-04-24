import { useTranslation } from 'react-i18next';
import { Plus, GitBranch, Trash2, ZoomIn, ZoomOut, Maximize, Download, Palette, Square, FileImage, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MindMapColorPicker } from './MindMapColorPicker';
import { SHAPES, type NodeShape } from './MindMapTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const shapeIcons: Record<NodeShape, string> = {
  rounded: '▢',
  square: '■',
  pill: '⬭',
  circle: '●',
};

interface MindMapToolbarProps {
  onAddChild: () => void;
  onAddSibling: () => void;
  onDeleteSelected: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  selectedNodeColor: string | null;
  selectedNodeShape: NodeShape | null;
  onChangeColor: (color: string) => void;
  onChangeShape: (shape: NodeShape) => void;
  hasSelection: boolean;
}

export function MindMapToolbar({
  onAddChild,
  onAddSibling,
  onDeleteSelected,
  onZoomIn,
  onZoomOut,
  onFitView,
  onExportPng,
  onExportPdf,
  selectedNodeColor,
  selectedNodeShape,
  onChangeColor,
  onChangeShape,
  hasSelection,
}: MindMapToolbarProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const wrapperClass = isMobile
    ? 'absolute bottom-3 start-1/2 -translate-x-1/2 z-10 flex flex-row gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-1.5 shadow-lg'
    : 'absolute top-3 start-3 z-10 flex flex-col gap-1.5 bg-card/90 backdrop-blur-sm border border-border rounded-xl p-1.5 shadow-lg';

  const separatorClass = isMobile ? 'h-6 w-px bg-border' : 'w-full h-px bg-border';

  return (
    <TooltipProvider delayDuration={300}>
      <div className={wrapperClass}>
        {/* Add Child */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" onClick={onAddChild} title={t('mindmaps.toolbar.add_child')}>
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={isMobile ? 'top' : 'right'}>
            <p>{t('mindmaps.toolbar.add_child')} <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px]">Tab</kbd></p>
          </TooltipContent>
        </Tooltip>

        {/* Add Sibling (only when a non-root node is selected) */}
        {hasSelection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={onAddSibling} title={t('mindmaps.toolbar.add_sibling')}>
                <GitBranch className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isMobile ? 'top' : 'right'}>
              <p>{t('mindmaps.toolbar.add_sibling')} <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd></p>
            </TooltipContent>
          </Tooltip>
        )}

        {hasSelection && (
          <>
            <Button size="icon" variant="ghost" onClick={onDeleteSelected} title={t('mindmaps.toolbar.delete')}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" title={t('mindmaps.toolbar.color')}>
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side={isMobile ? 'top' : 'right'} className="w-auto p-3">
                <MindMapColorPicker currentColor={selectedNodeColor || ''} onChange={onChangeColor} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" title="Shape">
                  <Square className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side={isMobile ? 'top' : 'right'} className="w-auto p-2">
                <div className="flex gap-1">
                  {SHAPES.map(s => (
                    <button
                      key={s}
                      onClick={() => onChangeShape(s)}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center text-lg border-2 rounded-md transition-colors',
                        selectedNodeShape === s ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
                      )}
                      title={s}
                    >
                      {shapeIcons[s]}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        <div className={separatorClass} />

        <Button size="icon" variant="ghost" onClick={onZoomIn} title={t('mindmaps.toolbar.zoom_in')}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onZoomOut} title={t('mindmaps.toolbar.zoom_out')}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onFitView} title={t('mindmaps.toolbar.fit')}>
          <Maximize className="h-4 w-4" />
        </Button>

        <div className={separatorClass} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" title={t('mindmaps.toolbar.export')}>
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? 'top' : 'right'}>
            <DropdownMenuItem onClick={onExportPng}>
              <FileImage className="h-4 w-4 me-2" /> PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPdf}>
              <FileText className="h-4 w-4 me-2" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
