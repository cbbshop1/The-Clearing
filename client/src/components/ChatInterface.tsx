import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Smile, Send, MoreHorizontal, Paperclip, X } from "lucide-react";
import { websocketManager } from "@/lib/websocketManager";
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
  const [selectedTarget, setSelectedTarget] = useState<'both' | 'openai' | 'claude'>('both');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('Received WebSocket message:', data.type);
    
    // Use a more stable state update pattern
    switch (data.type) {
      case 'session_history':
        setMessages(data.messages || []);
        setIsLoading(false);
        break;
      case 'new_message':
        if (data.message) {
          setMessages(prev => {
            const newMessages = [...prev, data.message];
            return newMessages;
          });
          // Only stop loading if it's an AI message (response completed)
          if (data.message.type.startsWith('ai_')) {
            setIsLoading(false);
          }
        }
        break;
      case 'ai_error':
        console.error('AI Error:', data.error);
        setIsLoading(false);
        break;
      case 'error':
        console.error('WebSocket Error:', data.message);
        setIsLoading(false);
        break;
    }
  }, []);

  const [isConnected, setIsConnected] = useState(false);

  // Direct WebSocket manager integration
  useEffect(() => {
    const connectionCallback = (connected: boolean) => {
      setIsConnected(connected);
    };

    websocketManager.addMessageHandler(handleWebSocketMessage);
    websocketManager.addConnectionCallback(connectionCallback);

    return () => {
      websocketManager.removeMessageHandler(handleWebSocketMessage);
      websocketManager.removeConnectionCallback(connectionCallback);
    };
  }, [handleWebSocketMessage]);

  const send = useCallback((data: any) => {
    websocketManager.send(data);
  }, []);

  useEffect(() => {
    if (sessionId && userId && isConnected) {
      // First leave any existing session
      send({
        type: 'leave_session',
      });
      
      // Small delay before joining new session
      setTimeout(() => {
        if (isConnected) {
          send({
            type: 'join_session',
            sessionId,
            userId,
          });
        }
      }, 50);
      
      // Clear forwarded messages state for new session
      setForwardedMessages(new Set());
      setMessages([]); // Clear messages when switching sessions
    }
  }, [sessionId, userId, isConnected, send]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!currentMessage.trim() && selectedFiles.length === 0) || !isConnected || !sessionId || !userId) return;
    
    // Ensure WebSocket is connected before sending
    if (!isConnected) {
      console.log('WebSocket not ready, message not sent');
      return;
    }

    const emojiTags = extractEmojis(currentMessage);
    
    setIsLoading(true);
    setFileUploading(true);

    try {
      // If files are selected, upload them first
      let fileUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
        formData.append('sessionId', sessionId.toString());

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          fileUrls = result.fileUrls;
        } else {
          console.error('File upload failed');
        }
      }

      send({
        type: 'send_message',
        sessionId,
        userId,
        content: currentMessage,
        emojiTags,
        targetModels: selectedTarget,
        files: fileUrls,
      });

      setCurrentMessage("");
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error sending message with files:', error);
    } finally {
      setFileUploading(false);
    }
  };

  const handleForwardMessage = (message: ChatMessage) => {
    if (!isConnected || !sessionId || !userId) return;
    
    const targetProvider = message.type === 'ai_openai' ? 'claude' : 'openai';
    const forwardContent = `[Forwarded from ${message.type === 'ai_openai' ? 'OpenAI GPT-4o' : 'Claude'}]: ${message.content}`;
    
    // Mark message as forwarded
    setForwardedMessages(prev => new Set(prev).add(message.id));
    
    setIsLoading(true);
    send({
      type: 'forward_message',
      sessionId,
      userId,
      content: forwardContent,
      targetProvider,
      originalMessage: message,
    });
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
          {messages.map((message, index) => {
            // Group AI responses that follow each other
            if (message.type === 'ai_openai' || message.type === 'ai_claude') {
              const nextMessage = messages[index + 1];
              const isGroupedWithNext = nextMessage && 
                (nextMessage.type === 'ai_openai' || nextMessage.type === 'ai_claude') &&
                nextMessage.type !== message.type;
              
              const prevMessage = messages[index - 1];
              const isGroupedWithPrev = prevMessage && 
                (prevMessage.type === 'ai_openai' || prevMessage.type === 'ai_claude') &&
                prevMessage.type !== message.type;
                
              if (isGroupedWithNext) {
                // Show side-by-side layout with independent scroll areas
                return (
                  <div key={`${message.id}-${nextMessage.id}`} className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background z-10 pb-1 border-b">
                        {message.type === 'ai_openai' ? '🤖 OpenAI GPT-4o' : '🎭 Claude'}
                      </div>
                      <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                        <MessageBubble 
                          message={message} 
                          onForward={handleForwardMessage} 
                          isForwarded={forwardedMessages.has(message.id)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background z-10 pb-1 border-b">
                        {nextMessage.type === 'ai_openai' ? '🤖 OpenAI GPT-4o' : '🎭 Claude'}
                      </div>
                      <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                        <MessageBubble 
                          message={nextMessage} 
                          onForward={handleForwardMessage} 
                          isForwarded={forwardedMessages.has(nextMessage.id)}
                        />
                      </div>
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
        {/* File Preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Attached Files ({selectedFiles.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 bg-background p-2 rounded border">
                  <span className="text-sm truncate max-w-32">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)}KB
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-end space-x-3 mb-3">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Type your message to ${selectedTarget === 'both' ? 'both models' : selectedTarget === 'openai' ? 'OpenAI GPT-4o' : 'Claude'}...`}
              className="resize-none min-h-[48px] pr-24"
              rows={1}
            />
            <div className="absolute right-2 top-2 flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenEmojiLexicon}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={(!currentMessage.trim() && selectedFiles.length === 0) || isLoading || fileUploading}
            className="px-4 py-3"
          >
            {fileUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Target Selection - Now below the input */}
        <div className="flex justify-center space-x-2">
          <Button
            variant={selectedTarget === 'both' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTarget('both')}
            className="flex items-center space-x-1"
          >
            <span>🤖🎭</span>
            <span>Both</span>
          </Button>
          <Button
            variant={selectedTarget === 'openai' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTarget('openai')}
            className="flex items-center space-x-1"
          >
            <span>🤖</span>
            <span>OpenAI</span>
          </Button>
          <Button
            variant={selectedTarget === 'claude' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTarget('claude')}
            className="flex items-center space-x-1"
          >
            <span>🎭</span>
            <span>Claude</span>
          </Button>
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,text/*,.pdf,.doc,.docx,.txt,.md,.json,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
