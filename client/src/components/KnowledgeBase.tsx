import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, BookOpen, Tag, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { KnowledgeBase, AiModel } from "@shared/schema";

interface KnowledgeBaseProps {
  isOpen: boolean;
  onClose: () => void;
  aiModels: AiModel[];
}

export default function KnowledgeBase({ isOpen, onClose, aiModels }: KnowledgeBaseProps) {
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeBase | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: knowledgeBase = [], isLoading } = useQuery<KnowledgeBase[]>({
    queryKey: ['/api/knowledge'],
    enabled: isOpen,
  });

  const { data: modelKnowledge = [], isLoading: isLoadingModelKnowledge } = useQuery<KnowledgeBase[]>({
    queryKey: ['/api/models', selectedModel, 'knowledge'],
    enabled: selectedModel !== null,
  });

  const createKnowledgeMutation = useMutation({
    mutationFn: async (data: Partial<KnowledgeBase>) => {
      return apiRequest(`/api/knowledge`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      setShowAddDialog(false);
      setEditingKnowledge(null);
      toast({ title: "Success", description: "Knowledge entry created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to create knowledge entry", variant: "destructive" });
    }
  });

  const updateKnowledgeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<KnowledgeBase> }) => {
      return apiRequest(`/api/knowledge/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      if (selectedModel) {
        queryClient.invalidateQueries({ queryKey: ['/api/models', selectedModel, 'knowledge'] });
      }
      setEditingKnowledge(null);
      toast({ title: "Success", description: "Knowledge entry updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to update knowledge entry", variant: "destructive" });
    }
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/knowledge/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/knowledge'] });
      if (selectedModel) {
        queryClient.invalidateQueries({ queryKey: ['/api/models', selectedModel, 'knowledge'] });
      }
      toast({ title: "Success", description: "Knowledge entry deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to delete knowledge entry", variant: "destructive" });
    }
  });

  const assignKnowledgeMutation = useMutation({
    mutationFn: async ({ modelId, knowledgeId }: { modelId: number; knowledgeId: number }) => {
      return apiRequest(`/api/models/${modelId}/knowledge`, {
        method: 'POST',
        body: JSON.stringify({ knowledgeId }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      if (selectedModel) {
        queryClient.invalidateQueries({ queryKey: ['/api/models', selectedModel, 'knowledge'] });
      }
      toast({ title: "Success", description: "Knowledge assigned to AI model successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to assign knowledge to AI model", variant: "destructive" });
    }
  });

  const removeKnowledgeMutation = useMutation({
    mutationFn: async ({ modelId, knowledgeId }: { modelId: number; knowledgeId: number }) => {
      return apiRequest(`/api/models/${modelId}/knowledge/${knowledgeId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      if (selectedModel) {
        queryClient.invalidateQueries({ queryKey: ['/api/models', selectedModel, 'knowledge'] });
      }
      toast({ title: "Success", description: "Knowledge removed from AI model successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to remove knowledge from AI model", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      content: formData.get('content') as string,
      source: formData.get('source') as string,
      tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()).filter(Boolean),
    };

    if (editingKnowledge) {
      updateKnowledgeMutation.mutate({ id: editingKnowledge.id, data });
    } else {
      createKnowledgeMutation.mutate(data);
    }
  };

  const isKnowledgeAssigned = (knowledgeId: number) => {
    return modelKnowledge.some(kb => kb.id === knowledgeId);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Knowledge Base Management
          </DialogTitle>
          <DialogDescription>
            Manage knowledge entries and assign them to AI models to enhance their responses.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Model Selection */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">AI Models</h3>
            <div className="space-y-2">
              {aiModels.map((model) => (
                <Button
                  key={model.id}
                  variant={selectedModel === model.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedModel(model.id)}
                >
                  {model.name}
                </Button>
              ))}
            </div>

            {selectedModel && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Assigned Knowledge</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {isLoadingModelKnowledge ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : modelKnowledge.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No knowledge assigned</div>
                  ) : (
                    modelKnowledge.map((kb) => (
                      <div key={kb.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{kb.title}</div>
                          <div className="text-xs text-muted-foreground">{kb.category}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeKnowledgeMutation.mutate({ modelId: selectedModel, knowledgeId: kb.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Knowledge Base Entries */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Knowledge Entries</h3>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading knowledge base...</div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {knowledgeBase.map((kb) => (
                  <Card key={kb.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{kb.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{kb.category}</Badge>
                            {selectedModel && (
                              <Badge variant={isKnowledgeAssigned(kb.id) ? "default" : "outline"}>
                                {isKnowledgeAssigned(kb.id) ? "Assigned" : "Not Assigned"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingKnowledge(kb)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteKnowledgeMutation.mutate(kb.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {selectedModel && !isKnowledgeAssigned(kb.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => assignKnowledgeMutation.mutate({ modelId: selectedModel, knowledgeId: kb.id })}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {kb.content}
                      </p>
                      {kb.tags && kb.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {kb.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {kb.source && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Source: {kb.source}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog || editingKnowledge !== null} onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingKnowledge(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingKnowledge ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
              </DialogTitle>
              <DialogDescription>
                {editingKnowledge ? 'Update the knowledge entry details below.' : 'Fill in the details to create a new knowledge entry.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingKnowledge?.title || ''}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={editingKnowledge?.category || ''}
                  required
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  defaultValue={editingKnowledge?.content || ''}
                  rows={6}
                  required
                />
              </div>
              <div>
                <Label htmlFor="source">Source (optional)</Label>
                <Input
                  id="source"
                  name="source"
                  defaultValue={editingKnowledge?.source || ''}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={editingKnowledge?.tags?.join(', ') || ''}
                  placeholder="ai, research, guidelines"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={createKnowledgeMutation.isPending || updateKnowledgeMutation.isPending}>
                  {editingKnowledge ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowAddDialog(false);
                  setEditingKnowledge(null);
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}