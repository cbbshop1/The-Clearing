import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Plus, Download, Bot, Trash2 } from "lucide-react";
import { User, Session } from "@shared/schema";

interface SidebarProps {
  moderator?: User;
  sessions: Session[];
  selectedSessionId: number | null;
  onSessionSelect: (sessionId: number) => void;
  onNewSession: (title: string, emoji: string) => void;
  onExportSession: (sessionId: number) => void;
  onDeleteSession: (sessionId: number) => void;
}

export default function Sidebar({
  moderator,
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  onExportSession,
  onDeleteSession,
}: SidebarProps) {
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionEmoji, setNewSessionEmoji] = useState("😊");
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);

  const handleCreateSession = () => {
    if (newSessionTitle.trim()) {
      onNewSession(newSessionTitle.trim(), newSessionEmoji);
      setNewSessionTitle("");
      setNewSessionEmoji("😊");
      setIsNewSessionOpen(false);
    }
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "Unknown";
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "Unknown";
    
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="text-primary-foreground" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">The Clearing Collective</h1>
              <p className="text-sm text-muted-foreground">Human-Moderated AI Conversations</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* User Profile */}
      {moderator && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <img
              src={moderator.profileImageUrl || "/default-avatar.png"}
              alt="Moderator profile"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {moderator.firstName} {moderator.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{moderator.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Session History */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-foreground">Recent Sessions</h2>
            <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                  <Plus className="h-4 w-4 mr-1" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      placeholder="Enter session title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Emoji</label>
                    <Input
                      value={newSessionEmoji}
                      onChange={(e) => setNewSessionEmoji(e.target.value)}
                      placeholder="😊"
                      maxLength={2}
                    />
                  </div>
                  <Button onClick={handleCreateSession} className="w-full">
                    Create Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg transition-colors ${
                    selectedSessionId === session.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => onSessionSelect(session.id)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{session.emoji}</span>
                      <span className="text-sm font-medium text-foreground">{session.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(session.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end space-x-1 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportSession(session.id);
                      }}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this session?')) {
                          onDeleteSession(session.id);
                        }
                      }}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Export & Analysis */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => selectedSessionId && onExportSession(selectedSessionId)}
          disabled={!selectedSessionId}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Conversations
        </Button>
      </div>
    </div>
  );
}
