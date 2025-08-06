import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, RefreshCw, Scale, TrendingUp, Plus, BookOpen, Shield } from "lucide-react";
import { AiModel } from "@shared/schema";

interface ModelPanelProps {
  aiModels: AiModel[];
  onOpenKnowledgeBase?: () => void;
  currentSessionId?: number;
}

export default function ModelPanel({ aiModels, onOpenKnowledgeBase, currentSessionId }: ModelPanelProps) {
  const getModelStatus = (model: AiModel) => {
    return model.isActive ? "Active" : "Inactive";
  };

  const openEthicsReflector = () => {
    const url = currentSessionId ? `/reflector?session=${currentSessionId}` : '/reflector';
    // Store session ID in localStorage for the reflector window
    if (currentSessionId) {
      localStorage.setItem('currentSessionId', currentSessionId.toString());
    }
    const ethicsWindow = window.open(url, 'ethics-reflector', 'width=900,height=700,scrollbars=yes,resizable=yes,location=no,menubar=no,toolbar=no');
    
    // Keep the window focused and prevent it from closing
    if (ethicsWindow) {
      ethicsWindow.focus();
      // Prevent the window from being closed accidentally
      ethicsWindow.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        return 'Ethics Monitor will close. Continue?';
      });
    }
  };

  const getModelColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'bg-green-50 border-green-200';
      case 'anthropic':
        return 'bg-blue-50 border-blue-200';
      case 'deepseek':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-muted border-border';
    }
  };

  const getStatusColor = (isActive: boolean | null) => {
    return isActive ? "bg-green-500" : "bg-muted-foreground";
  };

  return (
    <div className="w-48 bg-card border-l border-border flex flex-col">
      {/* Model Panel Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">AI Models</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenKnowledgeBase}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Knowledge
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Managing conversation responses</p>
      </div>

      {/* Active Models */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {aiModels.map((model) => (
            <div
              key={model.id}
              className={`border rounded-lg p-3 ${getModelColor(model.provider)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(model.isActive)}`}></div>
                  <span className="text-sm font-medium text-foreground">{model.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Provider: {model.provider}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {getModelStatus(model)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Model: {model.model}
                </p>
              </div>
            </div>
          ))}

          {/* Add New Model Placeholder */}
          <div className="bg-muted border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
                <span className="text-sm font-medium text-muted-foreground">Google Bard</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Status: Available</p>
          </div>
        </div>
      </ScrollArea>

      {/* Model Comparison */}
      <div className="p-4 border-t border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Response Comparison</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Empathy Score</span>
            <div className="flex space-x-1">
              <span className="text-green-600">GPT-4: 8.5</span>
              <span className="text-blue-600">Claude: 9.2</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Relevance</span>
            <div className="flex space-x-1">
              <span className="text-green-600">GPT-4: 9.1</span>
              <span className="text-blue-600">Claude: 8.7</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Emoji Usage</span>
            <div className="flex space-x-1">
              <span className="text-green-600">GPT-4: 6</span>
              <span className="text-blue-600">Claude: 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start h-8 px-3">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All Models
          </Button>
          <Button variant="ghost" className="w-full justify-start h-8 px-3">
            <Scale className="h-4 w-4 mr-2" />
            Compare Responses
          </Button>
          <Button variant="ghost" className="w-full justify-start h-8 px-3">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start h-8 px-3"
            onClick={openEthicsReflector}
          >
            <Shield className="h-4 w-4 mr-2" />
            Ethics Monitor
          </Button>
        </div>
      </div>
    </div>
  );
}
