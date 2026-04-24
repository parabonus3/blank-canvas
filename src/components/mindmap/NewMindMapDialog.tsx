import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { templates } from './MindMapTemplates';
import { cn } from '@/lib/utils';

interface NewMindMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string, templateId: string) => void;
  loading?: boolean;
}

export function NewMindMapDialog({ open, onOpenChange, onCreate, loading }: NewMindMapDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('classic');

  const handleCreate = () => {
    onCreate(title.trim() || t('mindmaps.new_map'), selectedTemplate);
    setTitle('');
    setSelectedTemplate('classic');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('mindmaps.create_title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('mindmaps.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={t('mindmaps.title_placeholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          />

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{t('mindmaps.choose_template')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all hover:bg-muted/50',
                    selectedTemplate === tmpl.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <span className="text-2xl">{tmpl.icon}</span>
                  <span className="text-xs font-medium">{t(tmpl.nameKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleCreate} disabled={loading}>{t('common.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
