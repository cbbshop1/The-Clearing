import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Brain, Lightbulb, Forward } from "lucide-react";
import { ChatMessage } from "@shared/schema";

interface MessageBubbleProps {
  message: ChatMessage;
  onForward?: (message: ChatMessage) => void;
  isForwarded?: boolean;
}

export default function MessageBubble({ message, onForward, isForwarded = false }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getAvatarContent = () => {
    switch (message.type) {
      case 'user':
        return {
          icon: <User className="h-4 w-4 text-muted-foreground" />,
          bg: "bg-muted",
          name: "User",
          badge: null,
        };
      case 'moderator':
        return {
          icon: message.user?.profileImageUrl ? (
            <AvatarImage src={message.user.profileImageUrl} />
          ) : (
            <User className="h-4 w-4 text-primary" />
          ),
          bg: "bg-primary/10",
          name: `${message.user?.firstName} ${message.user?.lastName}`,
          badge: <Badge variant="outline" className="text-primary">Moderator</Badge>,
        };
      case 'ai':
        const isOpenAI = message.aiModel?.includes('GPT') || message.aiModel?.includes('OpenAI');
        return {
          icon: isOpenAI ? (
            <Brain className="h-4 w-4 text-white" />
          ) : (
            <Lightbulb className="h-4 w-4 text-white" />
          ),
          bg: isOpenAI ? "bg-green-500" : "bg-blue-500",
          name: message.aiModel || 'AI Model',
          badge: <Badge variant="outline" className={isOpenAI ? "text-green-700 bg-green-50" : "text-blue-700 bg-blue-50"}>AI Model</Badge>,
        };
      default:
        return {
          icon: <User className="h-4 w-4" />,
          bg: "bg-muted",
          name: "Unknown",
          badge: null,
        };
    }
  };

  const getMessageStyle = () => {
    switch (message.type) {
      case 'user':
        return "bg-muted border-border";
      case 'moderator':
        return "bg-primary/10 border-primary/20";
      case 'ai':
        const isOpenAI = message.aiModel?.includes('GPT') || message.aiModel?.includes('OpenAI');
        return isOpenAI
          ? "bg-green-50 border-green-200"
          : "bg-blue-50 border-blue-200";
      default:
        return "bg-muted border-border";
    }
  };

  const avatar = getAvatarContent();

  return (
    <div className="flex items-start space-x-3">
      <Avatar className={`w-8 h-8 ${avatar.bg}`}>
        <AvatarFallback className={avatar.bg}>
          {avatar.icon}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-foreground">{avatar.name}</span>
          {avatar.badge}
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        <div className={`rounded-lg p-3 max-w-md border ${getMessageStyle()}`}>
          <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
          
          {/* Forward button for AI responses */}
          {(message.type === 'ai_openai' || message.type === 'ai_claude') && onForward && (
            <div className="flex justify-end mt-2">
              <Button
                variant={isForwarded ? "default" : "ghost"}
                size="sm"
                onClick={() => onForward(message)}
                className={`text-xs h-6 px-2 ${isForwarded ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                disabled={isForwarded}
              >
                <Forward className="h-3 w-3 mr-1" />
                {isForwarded ? 'Forwarded' : `Forward to ${message.type === 'ai_openai' ? 'Claude' : 'GPT-4o'}`}
              </Button>
            </div>
          )}
          
          {message.emojiTags && message.emojiTags.length > 0 && (
            <div className="flex items-center space-x-1 mt-2">
              {message.emojiTags.map((emoji, index) => (
                <span key={index} className="text-lg">
                  {emoji}
                </span>
              ))}
            </div>
          )}
          
          {message.metadata && typeof message.metadata === 'object' && 'responseTime' in message.metadata && (
            <div className="text-xs text-muted-foreground mt-2">
              Response time: {message.metadata.responseTime}ms
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
