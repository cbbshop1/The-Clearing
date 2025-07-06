import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, RefreshCw, Scale, TrendingUp, Plus } from "lucide-react";
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
      default:
        return 'bg-muted border-border';
    }
  };

  const getStatusColor = (isActive: boolean | null) => {
    return isActive ? "bg-green-500" : "bg-muted-foreground";
  };

  return (
    <div className="h-full bg-card border-l border-border flex flex-col">
      {/* Model Panel Header - Compact */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">AI Models</h3>
        <p className="text-xs text-muted-foreground">Response Management</p>
      </div>

      {/* Active Models */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {aiModels.map((model) => (
            <div
              key={model.id}
              className={`border rounded p-2 ${getModelColor(model.provider)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(model.isActive)}`}></div>
                  <span className="text-xs font-medium text-foreground truncate">{model.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Settings className="h-2 w-2" />
                </Button>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  {model.provider} • {getModelStatus(model)}
                </p>
              </div>
            </div>
          ))}

        </div>
      </ScrollArea>

      {/* Model Comparison - Compact */}
      <div className="p-2 border-t border-border">
        <h4 className="text-xs font-medium text-foreground mb-2">Response Metrics</h4>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Empathy</span>
            <div className="flex space-x-1">
              <span className="text-green-600">8.5</span>
              <span className="text-blue-600">9.2</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Relevance</span>
            <div className="flex space-x-1">
              <span className="text-green-600">9.1</span>
              <span className="text-blue-600">8.7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Compact */}
      <div className="p-2 border-t border-border">
        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start h-6 px-2 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button variant="ghost" className="w-full justify-start h-6 px-2 text-xs">
            <Scale className="h-3 w-3 mr-1" />
            Compare
          </Button>
          <Button variant="ghost" className="w-full justify-start h-6 px-2 text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
