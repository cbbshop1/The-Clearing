import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Smile, Send, MoreHorizontal } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import MessageBubble from "./MessageBubble";
import { ChatMessage } from "@shared/schema";

interface ChatInterfaceProps {
  sessionId: number | null;
  userId?: number;
  onOpenEmojiLexicon: () => void;
}

export interface ChatInterfaceRef {
  handleEmojiSelect: (emoji: string) => void;
}

const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({
  sessionId,
  userId,
  onOpenEmojiLexicon,
}: ChatInterfaceProps, ref) => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [forwardedMessages, setForwardedMessages] = useState<Set<number>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEmojiSelect = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setCurrentMessage(newText);
      
      // Reset cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleEmojiSelect
  }));

  const { socket, isConnected } = useWebSocket({
    onMessage: (data) => {
      switch (data.type) {
        case 'session_history':
          setMessages(data.messages);
          break;
        case 'new_message':
          setMessages(prev => [...prev, data.message]);
          break;
        case 'ai_error':
          console.error('AI Error:', data.error);
          break;
      }
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (socket && sessionId && userId) {
      socket.send(JSON.stringify({
        type: 'join_session',
        sessionId,
        userId,
      }));
      // Clear forwarded messages state for new session
      setForwardedMessages(new Set());
    }
  }, [socket, sessionId, userId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !socket || !sessionId || !userId) return;

    const emojiTags = extractEmojis(currentMessage);
    
    setIsLoading(true);
    socket.send(JSON.stringify({
      type: 'send_message',
      sessionId,
      userId,
      content: currentMessage,
      emojiTags,
    }));

    setCurrentMessage("");
  };

  const handleForwardMessage = (message: ChatMessage) => {
    if (!socket || !sessionId || !userId) return;
    
    const targetProvider = message.type === 'ai_openai' ? 'claude' : 'openai';
    const forwardContent = `[Forwarded from ${message.type === 'ai_openai' ? 'OpenAI GPT-4o' : 'Claude'}]: ${message.content}`;
    
    // Mark message as forwarded
    setForwardedMessages(prev => new Set(prev).add(message.id));
    
    setIsLoading(true);
    socket.send(JSON.stringify({
      type: 'forward_message',
      sessionId,
      userId,
      content: forwardContent,
      targetProvider,
      originalMessage: message,
    }));
  };

  const extractEmojis = (text: string): string[] => {
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
    return text.match(emojiRegex) || [];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Select a session to start chatting
          </h2>
          <p className="text-muted-foreground">
            Choose an existing session or create a new one to begin the conversation.
          </p>
        </div>
      </div>
    );
  }

  const currentSession = messages.length > 0 ? messages[0] : null;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">😊</span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {currentSession?.sessionId ? `Session ${currentSession.sessionId}` : 'Chat Session'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Multi-model conversation with human moderation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              {isConnected ? 'Live' : 'Connecting...'}
            </Badge>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message) => {
            // Group AI responses that follow each other
            if (message.type === 'ai_openai' || message.type === 'ai_claude') {
              const nextMessage = messages[messages.indexOf(message) + 1];
              const isGroupedWithNext = nextMessage && 
                (nextMessage.type === 'ai_openai' || nextMessage.type === 'ai_claude') &&
                nextMessage.type !== message.type;
              
              const prevMessage = messages[messages.indexOf(message) - 1];
              const isGroupedWithPrev = prevMessage && 
                (prevMessage.type === 'ai_openai' || prevMessage.type === 'ai_claude') &&
                prevMessage.type !== message.type;
                
              if (isGroupedWithNext) {
                // Show side-by-side layout
                return (
                  <div key={`${message.id}-${nextMessage.id}`} className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        {message.type === 'ai_openai' ? 'OpenAI GPT-4o' : 'Claude'}
                      </div>
                      <MessageBubble 
                        message={message} 
                        onForward={handleForwardMessage} 
                        isForwarded={forwardedMessages.has(message.id)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        {nextMessage.type === 'ai_openai' ? 'OpenAI GPT-4o' : 'Claude'}
                      </div>
                      <MessageBubble 
                        message={nextMessage} 
                        onForward={handleForwardMessage} 
                        isForwarded={forwardedMessages.has(nextMessage.id)}
                      />
                    </div>
                  </div>
                );
              } else if (isGroupedWithPrev) {
                // Skip this message as it's already rendered in the previous group
                return null;
              }
            }
            
            // Regular message display
            return (
              <MessageBubble 
                key={message.id} 
                message={message} 
                onForward={handleForwardMessage} 
                isForwarded={forwardedMessages.has(message.id)}
              />
            );
          })}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center animate-pulse">
                <div className="w-4 h-4 bg-muted-foreground rounded-full"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">AI Processing...</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or use emojis..."
              className="resize-none min-h-[48px] pr-12"
              rows={1}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onOpenEmojiLexicon}
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isLoading}
            className="px-4 py-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
