import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useCategories() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["categories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: user.id, name, color })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Categoria criada com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar categoria", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .update({ name, color })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Categoria atualizada!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar categoria", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Categoria excluída!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir categoria", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useProjects() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          category:categories(*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });
}

export function useCreateProject() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      category_id,
      color,
    }: { 
      name: string; 
      description?: string; 
      category_id?: string;
      color?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("projects")
        .insert({ 
          user_id: user.id, 
          name, 
          description: description || null,
          category_id: category_id || null,
          color: color || '#6366f1',
        })
        .select(`*, category:categories(*)`)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto criado com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar projeto", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      description, 
      category_id,
      color,
      is_active,
    }: { 
      id: string;
      name?: string; 
      description?: string; 
      category_id?: string | null;
      color?: string;
      is_active?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category_id !== undefined) updateData.category_id = category_id;
      if (color !== undefined) updateData.color = color;
      if (is_active !== undefined) updateData.is_active = is_active;
      
      const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .select(`*, category:categories(*)`)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto atualizado!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar projeto", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      toast({ title: "Projeto excluído!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir projeto", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
