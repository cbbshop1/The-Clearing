import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, RefreshCw } from "lucide-react";
import { AiModel } from "@shared/schema";

interface ModelPanelProps {
  aiModels: AiModel[];
}

export default function ModelPanel({ aiModels }: ModelPanelProps) {
  const getModelStatus = (model: AiModel) => {
    return model.isActive ? "Active" : "Inactive";
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
    <div className="w-32 bg-card border-l border-border flex flex-col">
      {/* Model Panel Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-foreground">AI Models</h3>
        </div>
        <p className="text-sm text-muted-foreground">Active AI Models</p>
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

        </div>
      </ScrollArea>

    </div>
  );
}
