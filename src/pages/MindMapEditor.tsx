import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReactFlowProvider } from '@xyflow/react';
import { ArrowLeft, Check, CloudOff, Loader2, Pencil } from 'lucide-react';
import { useMindMap, useUpdateMindMap } from '@/hooks/useMindMaps';
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { Node, Edge } from '@xyflow/react';

export default function MindMapEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: map, isLoading } = useMindMap(id);
  const updateMap = useUpdateMindMap();
  const saveMap = updateMap.mutateAsync;
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[], viewport: { x: number; y: number; zoom: number }) => {
      if (!id) return;
      await saveMap({ id, nodes, edges, viewport });
    },
    [id, saveMap]
  );

  const commitTitle = () => {
    if (id && titleValue.trim()) {
      updateMap.mutate({ id, title: titleValue.trim() });
    }
    setEditingTitle(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!map) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">{t('mindmaps.not_found')}</p>
        <Button variant="outline" onClick={() => navigate('/mindmaps')}>{t('mindmaps.back')}</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 min-w-0">
        <Button size="icon" variant="ghost" onClick={() => navigate('/mindmaps')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {editingTitle ? (
          <Input
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
            className="h-8 max-w-xs text-sm"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setTitleValue(map.title); setEditingTitle(true); }}
            className="flex items-center gap-1.5 text-sm font-semibold truncate min-w-0 hover:text-primary transition-colors"
          >
            <span className="truncate">{map.title}</span>
            <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        )}

        <div className="ms-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {updateMap.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="hidden sm:inline">{t('mindmaps.saving')}</span></>
          ) : updateMap.isError ? (
            <><CloudOff className="h-3.5 w-3.5 text-destructive" /><span className="hidden sm:inline text-destructive">{t('mindmaps.save_error')}</span></>
          ) : (
            <><Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('mindmaps.saved')}</span></>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <MindMapCanvas
            initialNodes={map.nodes}
            initialEdges={map.edges}
            onSave={handleSave}
            mapTitle={map.title}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
