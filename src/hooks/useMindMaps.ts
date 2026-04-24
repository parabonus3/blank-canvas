import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Node, Edge, Viewport } from '@xyflow/react';
import { getTemplate } from '@/components/mindmap/MindMapTemplates';

export interface MindMap {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  template: string;
  theme: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function parseMindMap(raw: Record<string, unknown>): MindMap {
  return {
    ...raw,
    nodes: (raw.nodes as Node[]) || [],
    edges: (raw.edges as Edge[]) || [],
    viewport: (raw.viewport as Viewport) || { x: 0, y: 0, zoom: 1 },
    theme: (raw.theme as Record<string, unknown>) || {},
  } as MindMap;
}

export function useMindMaps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['mind_maps', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mind_maps' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return ((data as unknown) as Record<string, unknown>[]).map(parseMindMap);
    },
  });
}

export function useMindMap(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['mind_map', id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mind_maps' as any)
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return parseMindMap((data as unknown) as Record<string, unknown>);
    },
  });
}

export function useCreateMindMap() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, templateId, projectId }: { title: string; templateId: string; projectId?: string }) => {
      const tmpl = getTemplate(templateId);
      const { data, error } = await supabase
        .from('mind_maps' as any)
        .insert({
          user_id: user!.id,
          title,
          template: templateId,
          nodes: tmpl.nodes,
          edges: tmpl.edges,
          project_id: projectId || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return parseMindMap((data as unknown) as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mind_maps'] }),
  });
}

export function useUpdateMindMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; nodes?: Node[]; edges?: Edge[]; viewport?: Viewport; title?: string; description?: string }) => {
      const { error } = await supabase
        .from('mind_maps' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['mind_map', vars.id] });
      qc.invalidateQueries({ queryKey: ['mind_maps'] });
    },
  });
}

export function useDeleteMindMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mind_maps' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mind_maps'] }),
  });
}
