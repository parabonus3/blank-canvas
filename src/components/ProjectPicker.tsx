import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, ChevronRight, FolderOpen, FolderClosed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Project } from '@/hooks/useProjects';

interface ProjectPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  projects: Project[];
  placeholder?: string;
  className?: string;
}

interface GroupedProjects {
  categoryName: string;
  categoryColor: string;
  projects: Project[];
}

function groupByCategory(projects: Project[]): GroupedProjects[] {
  const grouped = new Map<string, GroupedProjects>();

  for (const project of projects) {
    const key = project.category?.id ?? '__none__';
    if (!grouped.has(key)) {
      grouped.set(key, {
        categoryName: project.category?.name ?? '',
        categoryColor: project.category?.color ?? '#94a3b8',
        projects: [],
      });
    }
    grouped.get(key)!.projects.push(project);
  }

  // Sort: categories alphabetically, "no category" last
  const entries = Array.from(grouped.entries());
  entries.sort(([a], [b]) => {
    if (a === '__none__') return 1;
    if (b === '__none__') return -1;
    return grouped.get(a)!.categoryName.localeCompare(grouped.get(b)!.categoryName);
  });

  return entries.map(([, v]) => v);
}

export function ProjectPicker({
  value,
  onValueChange,
  projects,
  placeholder,
  className,
}: ProjectPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const selected = projects.find((p) => p.id === value);
  const groups = groupByCategory(projects);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    selected.color || selected.category?.color || '#6366f1',
                }}
              />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || t('timer.select_project')}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandList>
            {groups.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {t('timer.no_projects')}
              </div>
            )}
            {groups.map((group) => {
              const key = group.categoryName || '__none__';
              const isExpanded = expandedCategories.has(key);
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(key)}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )}
                      style={{ color: group.categoryColor }}
                    />
                    {isExpanded ? (
                      <FolderOpen className="h-3.5 w-3.5" style={{ color: group.categoryColor }} />
                    ) : (
                      <FolderClosed className="h-3.5 w-3.5" style={{ color: group.categoryColor }} />
                    )}
                    <span>{group.categoryName || t('projects.no_category')}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/60">
                      {group.projects.length}
                    </span>
                  </button>
                  {isExpanded &&
                    group.projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={`${project.name} ${group.categoryName}`}
                        onSelect={() => {
                          onValueChange(project.id);
                          setOpen(false);
                        }}
                        className="pl-8"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 mr-2"
                          style={{
                            backgroundColor:
                              project.color || project.category?.color || '#6366f1',
                          }}
                        />
                        <span className="truncate">{project.name}</span>
                        {value === project.id && (
                          <Check className="ml-auto h-4 w-4 shrink-0" />
                        )}
                      </CommandItem>
                    ))}
                </div>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
