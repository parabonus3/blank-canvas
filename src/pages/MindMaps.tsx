import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Brain, Trash2, Clock, FolderOpen } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMindMaps, useCreateMindMap, useDeleteMindMap } from '@/hooks/useMindMaps';
import { NewMindMapDialog } from '@/components/mindmap/NewMindMapDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/hooks/useProjects';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MindMaps() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: maps, isLoading } = useMindMaps();
  const createMap = useCreateMindMap();
  const deleteMap = useDeleteMindMap();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mapToDelete, setMapToDelete] = useState<{ id: string; title: string } | null>(null);
  const { data: projects = [] } = useProjects();
  const projectsById = new Map(projects.map(project => [project.id, project]));

  const handleCreate = async (title: string, templateId: string, projectId?: string) => {
    const result = await createMap.mutateAsync({ title, templateId, projectId });
    setDialogOpen(false);
    navigate(`/mindmaps/${result.id}`);
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary shrink-0" />
              {t('mindmaps.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('mindmaps.subtitle')}</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            {t('mindmaps.new')}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : maps && maps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map(map => (
              <Card
                key={map.id}
                className="cursor-pointer hover:shadow-md transition-shadow group relative"
                onClick={() => navigate(`/mindmaps/${map.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold truncate min-w-0">{map.title}</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 h-9 w-9 text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        setMapToDelete({ id: map.id, title: map.title });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(map.updated_at))}
                    </span>
                    <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase">
                      {map.template}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {(map.nodes?.length || 0)} {t('mindmaps.nodes')} · {(map.edges?.length || 0)} {t('mindmaps.connections')}
                  </p>
                  {map.project_id && projectsById.get(map.project_id) && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FolderOpen className="h-3 w-3" />
                      <span className="truncate">{projectsById.get(map.project_id)?.name}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">{t('mindmaps.empty')}</p>
            <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('mindmaps.create_first')}
            </Button>
          </div>
        )}
      </div>

      <NewMindMapDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
        loading={createMap.isPending}
      />

      <AlertDialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mindmaps.delete_map_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('mindmaps.delete_map_desc', { title: mapToDelete?.title })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (mapToDelete) deleteMap.mutate(mapToDelete.id);
                setMapToDelete(null);
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
