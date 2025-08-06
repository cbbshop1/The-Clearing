import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Forward, Send } from "lucide-react";
import { ChatMessage } from "@shared/schema";

interface ForwardDialogProps {
  message: ChatMessage;
  onForward: (message: ChatMessage, targets: string[]) => void;
  isForwarded: boolean;
}

export default function ForwardDialog({ message, onForward, isForwarded }: ForwardDialogProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const availableTargets = [
    { id: 'openai', name: 'OpenAI GPT-4o', icon: '🤖' },
    { id: 'claude', name: 'Claude', icon: '🎭' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🧠' }
  ];

  // Filter out the current message's model as a target
  const validTargets = availableTargets.filter(target => {
    if (message.type === 'ai_openai' && target.id === 'openai') return false;
    if (message.type === 'ai_claude' && target.id === 'claude') return false;
    if (message.type === 'ai_deepseek' && target.id === 'deepseek') return false;
    return true;
  });

  const handleTargetToggle = (targetId: string) => {
    setSelectedTargets(prev => 
      prev.includes(targetId) 
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const handleForward = () => {
    if (selectedTargets.length > 0) {
      onForward(message, selectedTargets);
      setSelectedTargets([]);
      setIsOpen(false);
    }
  };

  const getMessageTypeLabel = () => {
    if (message.type === 'ai_openai') return '🤖 OpenAI';
    if (message.type === 'ai_claude') return '🎭 Claude';
    if (message.type === 'ai_deepseek') return '🧠 DeepSeek';
    return '👤 User';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex items-center space-x-1 ${isForwarded ? 'text-green-600' : ''}`}
          disabled={isForwarded}
        >
          <Forward className="h-3 w-3" />
          <span>{isForwarded ? 'Forwarded' : 'Forward'}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Forward className="h-5 w-5" />
            <span>Forward Message</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">From: {getMessageTypeLabel()}</div>
            <div className="text-sm text-muted-foreground line-clamp-3">
              {message.content}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-3">Forward to:</div>
            <div className="space-y-2">
              {validTargets.map(target => (
                <div key={target.id} className="flex items-center space-x-3">
                  <Checkbox 
                    id={target.id}
                    checked={selectedTargets.includes(target.id)}
                    onCheckedChange={() => handleTargetToggle(target.id)}
                  />
                  <label 
                    htmlFor={target.id} 
                    className="flex items-center space-x-2 text-sm font-medium cursor-pointer"
                  >
                    <span>{target.icon}</span>
                    <span>{target.name}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleForward}
              disabled={selectedTargets.length === 0}
              className="flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Forward to {selectedTargets.length} model{selectedTargets.length !== 1 ? 's' : ''}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}