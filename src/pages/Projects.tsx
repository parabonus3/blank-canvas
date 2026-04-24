import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProjects, useCategories, useCreateProject, useCreateCategory, useDeleteProject, useDeleteCategory, useUpdateProject, useUpdateCategory } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, Pencil, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Link } from "react-router-dom";

export default function Projects() {
  const { t } = useTranslation();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createProject = useCreateProject();
  const createCategory = useCreateCategory();
  const deleteProject = useDeleteProject();
  const deleteCategory = useDeleteCategory();
  const updateProject = useUpdateProject();
  const updateCategory = useUpdateCategory();

  // Create states
  const [projectName, setProjectName] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [projectColor, setProjectColor] = useState("#6366f1");
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#6366f1");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  // Edit states
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; color: string; category_id: string | null } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; color: string } | null>(null);

  const { tier } = useSubscription();
  const hasCategories = categories && categories.length > 0;
  const projectLimitReached = tier === "free" && (projects?.length ?? 0) >= 3;

  const handleCreateProject = () => {
    if (projectName.trim()) {
      createProject.mutate({ 
        name: projectName, 
        category_id: projectCategory || undefined,
        color: projectColor,
      });
      setProjectName("");
      setProjectCategory("");
      setProjectColor("#6366f1");
      setProjectDialogOpen(false);
    }
  };

  const handleCreateCategory = () => {
    if (categoryName.trim()) {
      createCategory.mutate({ name: categoryName, color: categoryColor });
      setCategoryName("");
      setCategoryColor("#6366f1");
      setCategoryDialogOpen(false);
    }
  };

  const handleEditProject = () => {
    if (editingProject && editingProject.name.trim()) {
      updateProject.mutate({
        id: editingProject.id,
        name: editingProject.name,
        color: editingProject.color,
        category_id: editingProject.category_id || undefined,
      });
      setEditingProject(null);
      setEditProjectDialogOpen(false);
    }
  };

  const handleEditCategory = () => {
    if (editingCategory && editingCategory.name.trim()) {
      updateCategory.mutate({
        id: editingCategory.id,
        name: editingCategory.name,
        color: editingCategory.color,
      });
      setEditingCategory(null);
      setEditCategoryDialogOpen(false);
    }
  };

  const openEditProject = (project: NonNullable<typeof projects>[number]) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      color: project.color || '#6366f1',
      category_id: project.category_id,
    });
    setEditProjectDialogOpen(true);
  };

  const openEditCategory = (category: NonNullable<typeof categories>[number]) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      color: category.color,
    });
    setEditCategoryDialogOpen(true);
  };

  // Obter cor do projeto (prioridade: cor própria > cor da categoria > padrão)
  const getProjectColor = (project: NonNullable<typeof projects>[number]) => {
    return project.color || project.category?.color || '#6366f1';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('projects.title')}</h1>
            <p className="text-muted-foreground">{t('projects.subtitle')}</p>
          </div>
        </div>

        {/* Categorias primeiro para facilitar o fluxo */}
        <Tabs defaultValue="categories">
          <div className="grid grid-cols-2 gap-3">
            <TabsList className="bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="categories" 
                className="flex flex-col items-center gap-2 p-4 sm:p-6 rounded-xl border-2 transition-all w-full data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm data-[state=inactive]:border-border data-[state=inactive]:hover:border-primary/40 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground"
              >
                <span className="text-xl sm:text-2xl">📁</span>
                <span className="text-sm font-medium">{t('projects.categories')}</span>
              </TabsTrigger>
            </TabsList>
            <TabsList className="bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="projects" 
                className="flex flex-col items-center gap-2 p-4 sm:p-6 rounded-xl border-2 transition-all w-full data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm data-[state=inactive]:border-border data-[state=inactive]:hover:border-primary/40 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground"
              >
                <span className="text-xl sm:text-2xl">📋</span>
                <span className="text-sm font-medium">{t('projects.projects')}</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* === ABA CATEGORIAS === */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t('projects.category_hint')}
              </p>
              
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('projects.new_category')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('projects.create_category')}</DialogTitle>
                    <DialogDescription>
                      {t('projects.category_create_desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('projects.category_name')}</Label>
                      <Input 
                        value={categoryName} 
                        onChange={e => setCategoryName(e.target.value)} 
                        placeholder="Ex: Estudos, Trabalho, Pessoal..." 
                      />
                    </div>
                    <div>
                      <Label>{t('projects.category_color')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type="color" 
                          value={categoryColor} 
                          onChange={e => setCategoryColor(e.target.value)} 
                          className="h-10 w-20 cursor-pointer" 
                        />
                        <span className="text-sm text-muted-foreground">
                          {t('projects.category_default_color')}
                        </span>
                      </div>
                    </div>
                    <Button onClick={handleCreateCategory} disabled={!categoryName.trim()}>
                      {t('projects.create_category')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
              {categories?.map(category => (
                <Card key={category.id} className="text-center relative group">
                  <CardContent className="pt-6 pb-4">
                    <span 
                      className="w-8 h-8 rounded-full inline-block mb-3 border-2 border-background shadow-sm" 
                      style={{ backgroundColor: category.color }} 
                    />
                    <p className="text-sm font-semibold">{category.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {projects?.filter(p => p.category_id === category.id).length || 0} {t('projects.projects').toLowerCase()}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditCategory(category)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteCategory.mutate(category.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categories?.length === 0 && !categoriesLoading && (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground mb-4">{t('projects.no_categories')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('projects.category_examples')}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === ABA PROJETOS === */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {t('projects.project_hint')}
              </p>
              
              {!hasCategories && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('projects.create_category_first')}</AlertTitle>
                  <AlertDescription>
                    {t('projects.create_category_first_desc')}
                  </AlertDescription>
                </Alert>
              )}
              
              {projectLimitReached && (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertTitle>{t('projects.limit_reached_title')}</AlertTitle>
                  <AlertDescription>
                    {t('projects.limit_reached_desc')}{" "}
                    <Link to="/pricing" className="text-primary underline">{t('rooms.upgrade_for_more')}</Link>
                  </AlertDescription>
                </Alert>
              )}

              <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={projectLimitReached}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('projects.new_project')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('projects.create_project')}</DialogTitle>
                    <DialogDescription>
                      {t('projects.project_create_desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('projects.project_name')}</Label>
                      <Input 
                        value={projectName} 
                        onChange={e => setProjectName(e.target.value)} 
                        placeholder="Ex: Matemática, Relatório, Leitura..." 
                      />
                    </div>
                    <div>
                      <Label>{t('projects.category_optional')}</Label>
                      <Select value={projectCategory} onValueChange={setProjectCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('projects.select_category')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: c.color }} 
                                />
                                {c.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('projects.project_color')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input 
                          type="color" 
                          value={projectColor} 
                          onChange={e => setProjectColor(e.target.value)} 
                          className="h-10 w-20 cursor-pointer" 
                        />
                        <span className="text-sm text-muted-foreground">
                          {t('projects.project_individual_color')}
                        </span>
                      </div>
                    </div>
                    <Button onClick={handleCreateProject} disabled={!projectName.trim()}>
                      {t('projects.create_project')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
              {projects?.map(project => (
                <Card key={project.id} className="text-center relative group">
                  <CardContent className="pt-6 pb-4">
                    <span 
                      className="w-8 h-8 rounded-full inline-block mb-3 border-2 border-background shadow-sm" 
                      style={{ backgroundColor: getProjectColor(project) }} 
                    />
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.category?.name || t('projects.no_category')}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditProject(project)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteProject.mutate(project.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {projects?.length === 0 && !projectsLoading && (
                <p className="text-muted-foreground col-span-full text-center py-8">
                  {t('projects.no_projects')}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Category Dialog */}
        <Dialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('projects.edit_category')}</DialogTitle>
              <DialogDescription>
                {t('projects.edit_category_desc')}
              </DialogDescription>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4">
                <div>
                  <Label>{t('projects.category_name')}</Label>
                  <Input 
                    value={editingCategory.name} 
                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>{t('projects.category_color')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      type="color" 
                      value={editingCategory.color} 
                      onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })} 
                      className="h-10 w-20 cursor-pointer" 
                    />
                  </div>
                </div>
                <Button onClick={handleEditCategory} disabled={!editingCategory.name.trim()}>
                  {t('projects.save_changes')}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('projects.edit_project')}</DialogTitle>
              <DialogDescription>
                {t('projects.edit_project_desc')}
              </DialogDescription>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-4">
                <div>
                  <Label>{t('projects.project_name')}</Label>
                  <Input 
                    value={editingProject.name} 
                    onChange={e => setEditingProject({ ...editingProject, name: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>{t('projects.category_optional')}</Label>
                  <Select 
                    value={editingProject.category_id || ""} 
                    onValueChange={(v) => setEditingProject({ ...editingProject, category_id: v || null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('projects.select_category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: c.color }} 
                            />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('projects.project_color')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      type="color" 
                      value={editingProject.color} 
                      onChange={e => setEditingProject({ ...editingProject, color: e.target.value })} 
                      className="h-10 w-20 cursor-pointer" 
                    />
                  </div>
                </div>
                <Button onClick={handleEditProject} disabled={!editingProject.name.trim()}>
                  {t('projects.save_changes')}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
