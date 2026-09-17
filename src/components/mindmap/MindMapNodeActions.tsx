import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, ExternalLink, FileText, KanbanSquare, Play, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBoards } from '@/hooks/useBoards';
import { useCreateTask } from '@/hooks/useTasks';
import { useCreateNote } from '@/hooks/useNotes';
import { useCreateGoal } from '@/hooks/useGoals';
import { useActiveTimeEntry, useStartTimer } from '@/hooks/useTimeEntries';
import { supabase } from '@/integrations/supabase/client';

export interface MindMapNodeLinks {
  linkedTaskId?: string;
  linkedTaskBoardId?: string;
  linkedGoalId?: string;
  linkedNoteId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  projectId: string | null;
  links: MindMapNodeLinks;
  onLinked: (links: Partial<MindMapNodeLinks>) => void;
}

export function MindMapNodeActions({ open, onOpenChange, label, projectId, links, onLinked }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: boards = [] } = useBoards();
  const { data: activeEntry } = useActiveTimeEntry();
  const createTask = useCreateTask();
  const createNote = useCreateNote();
  const createGoal = useCreateGoal();
  const startTimer = useStartTimer();
  const eligibleBoards = useMemo(
    () => boards.filter(board => !projectId || !board.project_id || board.project_id === projectId),
    [boards, projectId],
  );
  const [boardId, setBoardId] = useState('');
  const [goalMinutes, setGoalMinutes] = useState('30');
  const [goalType, setGoalType] = useState<'daily' | 'weekly'>('daily');

  const openLinked = (kind: 'task' | 'goal' | 'note') => {
    if (kind === 'task' && links.linkedTaskBoardId) navigate(`/tasks/board/${links.linkedTaskBoardId}`);
    if (kind === 'goal') navigate('/goals');
    if (kind === 'note') navigate('/notes');
    onOpenChange(false);
  };

  const handleCreateTask = async () => {
    if (links.linkedTaskId) return openLinked('task');
    const selectedBoard = eligibleBoards.find(board => board.id === boardId);
    if (!selectedBoard) return;
    const { data: columns, error } = await supabase
      .from('board_columns')
      .select('id')
      .eq('board_id', selectedBoard.id)
      .order('position')
      .limit(1);
    if (error) throw error;
    const columnId = columns?.[0]?.id;
    const task = await createTask.mutateAsync({
      board_id: selectedBoard.id,
      column_id: columnId || null,
      project_id: projectId,
      title: label,
      priority: 'medium',
    });
    onLinked({ linkedTaskId: task.id, linkedTaskBoardId: selectedBoard.id });
  };

  const handleCreateNote = async () => {
    if (links.linkedNoteId) return openLinked('note');
    if (!projectId) return;
    const note = await createNote.mutateAsync({ project_id: projectId, title: label, content: '' });
    const createdNote = note as unknown as { id?: string };
    if (createdNote.id) onLinked({ linkedNoteId: createdNote.id });
  };

  const handleCreateGoal = async () => {
    if (links.linkedGoalId) return openLinked('goal');
    if (!projectId) return;
    const now = new Date();
    const start = now.toISOString().slice(0, 10);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (goalType === 'weekly' ? 6 : 0));
    const goal = await createGoal.mutateAsync({
      project_id: projectId,
      target_minutes: Number(goalMinutes),
      goal_type: goalType,
      start_date: start,
      end_date: endDate.toISOString().slice(0, 10),
    });
    const createdGoal = goal as unknown as { id?: string };
    if (createdGoal.id) onLinked({ linkedGoalId: createdGoal.id });
  };

  const handleStartFocus = async () => {
    if (!projectId || activeEntry) return;
    await startTimer.mutateAsync({ projectId, taskId: links.linkedTaskId });
    onOpenChange(false);
    navigate('/timer');
  };

  const needsProject = !projectId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:start-auto sm:end-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[380px] sm:rounded-none">
        <SheetHeader className="text-start">
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>{t('mindmaps.actions.description')}</SheetDescription>
        </SheetHeader>

        {needsProject && (
          <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {t('mindmaps.actions.project_required')}
          </p>
        )}

        <div className="mt-5 space-y-5">
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Play className="h-4 w-4 text-primary" />{t('mindmaps.actions.focus')}</h3>
            <Button className="w-full" disabled={needsProject || !!activeEntry || startTimer.isPending} onClick={handleStartFocus}>
              {activeEntry ? t('mindmaps.actions.timer_active') : t('mindmaps.actions.start_focus')}
            </Button>
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><KanbanSquare className="h-4 w-4 text-primary" />{t('mindmaps.actions.task')}</h3>
            {!links.linkedTaskId && (
              <Select value={boardId} onValueChange={setBoardId}>
                <SelectTrigger><SelectValue placeholder={t('mindmaps.actions.choose_board')} /></SelectTrigger>
                <SelectContent>{eligibleBoards.map(board => <SelectItem key={board.id} value={board.id}>{board.title}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button variant="outline" className="w-full" disabled={!links.linkedTaskId && (!boardId || createTask.isPending)} onClick={handleCreateTask}>
              {links.linkedTaskId ? <><ExternalLink className="me-2 h-4 w-4" />{t('mindmaps.actions.open_task')}</> : t('mindmaps.actions.create_task')}
            </Button>
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-primary" />{t('mindmaps.actions.goal')}</h3>
            {!links.linkedGoalId && <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>{t('mindmaps.actions.period')}</Label><Select value={goalType} onValueChange={value => setGoalType(value as 'daily' | 'weekly')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">{t('goals.daily')}</SelectItem><SelectItem value="weekly">{t('goals.weekly')}</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>{t('mindmaps.actions.minutes')}</Label><Select value={goalMinutes} onValueChange={setGoalMinutes}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['15','30','45','60','90','120'].map(value => <SelectItem key={value} value={value}>{value} min</SelectItem>)}</SelectContent></Select></div>
            </div>}
            <Button variant="outline" className="w-full" disabled={needsProject || createGoal.isPending} onClick={handleCreateGoal}>
              {links.linkedGoalId ? <><ExternalLink className="me-2 h-4 w-4" />{t('mindmaps.actions.open_goal')}</> : <><CalendarCheck className="me-2 h-4 w-4" />{t('mindmaps.actions.create_goal')}</>}
            </Button>
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" />{t('mindmaps.actions.note')}</h3>
            <Button variant="outline" className="w-full" disabled={needsProject || createNote.isPending} onClick={handleCreateNote}>
              {links.linkedNoteId ? <><ExternalLink className="me-2 h-4 w-4" />{t('mindmaps.actions.open_note')}</> : t('mindmaps.actions.create_note')}
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}