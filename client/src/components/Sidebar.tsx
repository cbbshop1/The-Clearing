import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Plus, Download, Bot } from "lucide-react";
import { User, Session } from "@shared/schema";

interface SidebarProps {
  moderator?: User;
  sessions: Session[];
  selectedSessionId: number | null;
  onSessionSelect: (sessionId: number) => void;
  onNewSession: (title: string, emoji: string) => void;
  onExportSession: (sessionId: number) => void;
}

export default function Sidebar({
  moderator,
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  onExportSession,
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
    <div className="h-full bg-card border-r border-border flex flex-col">
      {/* Header - Compact */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="text-primary-foreground" size={16} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">The Clearing</h1>
              <p className="text-xs text-muted-foreground">AI Conversations</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* User Profile - Compact */}
      {moderator && (
        <div className="p-2 border-b border-border">
          <div className="flex items-center space-x-2">
            <img
              src={moderator.profileImageUrl || "/default-avatar.png"}
              alt="Moderator profile"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <p className="text-xs font-medium text-foreground">
                {moderator.firstName} {moderator.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{moderator.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Session History */}
      <div className="flex-1 overflow-hidden">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-foreground">Sessions</h2>
            <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary h-6 px-2">
                  <Plus className="h-3 w-3 mr-1" />
                  <span className="text-xs">New</span>
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
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedSessionId === session.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-sm">{session.emoji}</span>
                      <span className="text-xs font-medium text-foreground truncate">{session.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTimeAgo(session.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Export & Analysis */}
      <div className="p-2 border-t border-border">
        <Button
          variant="outline"
          className="w-full h-8"
          size="sm"
          onClick={() => selectedSessionId && onExportSession(selectedSessionId)}
          disabled={!selectedSessionId}
        >
          <Download className="h-3 w-3 mr-1" />
          <span className="text-xs">Export</span>
        </Button>
      </div>
    </div>
  );
}
