import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Brain, Lightbulb, Forward, Download, FileText, Image } from "lucide-react";
import { ChatMessage } from "@shared/schema";

interface MessageBubbleProps {
  message: ChatMessage;
  onForward?: (message: ChatMessage, targets?: string[]) => void;
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

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
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
          
          {/* Display attached files */}
          {message.files && message.files.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-muted-foreground">Attachments:</div>
              <div className="grid gap-2">
                {message.files.map((fileUrl, index) => {
                  const fileName = fileUrl.split('/').pop() || 'file';
                  const displayName = fileName.split('_').slice(2).join('_') || fileName;
                  
                  return (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded border">
                      {isImageFile(displayName) ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <img 
                            src={fileUrl} 
                            alt={displayName}
                            className="w-16 h-16 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium truncate">{displayName}</div>
                            <div className="text-xs text-muted-foreground">Image</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 flex-1">
                          {getFileIcon(displayName)}
                          <div className="flex-1">
                            <div className="text-sm font-medium truncate">{displayName}</div>
                            <div className="text-xs text-muted-foreground">Document</div>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Simple forward button for AI responses only */}
          {(message.type === 'ai_openai' || message.type === 'ai_claude' || message.type === 'ai_deepseek') && onForward && (
            <div className="flex justify-end mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`flex items-center space-x-1 ${isForwarded ? 'text-green-600' : ''}`}
                disabled={isForwarded}
                onClick={() => {
                  // Auto-forward to both other AI models
                  const targets = [];
                  if (message.type !== 'ai_openai') targets.push('openai');
                  if (message.type !== 'ai_claude') targets.push('claude');
                  if (message.type !== 'ai_deepseek') targets.push('deepseek');
                  onForward(message, targets);
                }}
              >
                <Forward className="h-3 w-3" />
                <span>{isForwarded ? 'Forwarded to others' : 'Forward to others'}</span>
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
