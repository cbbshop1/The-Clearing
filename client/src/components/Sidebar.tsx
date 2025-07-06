import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Plus, Download, Bot, Edit, Trash2, Check, X } from "lucide-react";
import { User, Session } from "@shared/schema";

interface SidebarProps {
  moderator?: User;
  sessions: Session[];
  selectedSessionId: number | null;
  onSessionSelect: (sessionId: number) => void;
  onNewSession: (title: string, emoji: string) => void;
  onExportSession: (sessionId: number) => void;
  onDeleteSession: (sessionId: number) => void;
  onUpdateSession: (sessionId: number, title: string, emoji: string) => void;
}

export default function Sidebar({
  moderator,
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  onExportSession,
  onDeleteSession,
  onUpdateSession,
}: SidebarProps) {
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionEmoji, setNewSessionEmoji] = useState("😊");
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editEmoji, setEditEmoji] = useState("😊");

  const handleCreateSession = () => {
    if (newSessionTitle.trim()) {
      onNewSession(newSessionTitle.trim(), newSessionEmoji);
      setNewSessionTitle("");
      setNewSessionEmoji("😊");
      setIsNewSessionOpen(false);
    }
  };

  const handleEditSession = (sessionId: number, currentTitle: string, currentEmoji: string | null) => {
    setEditingSessionId(sessionId);
    setEditTitle(currentTitle);
    setEditEmoji(currentEmoji || "😊");
  };

  const handleSaveEdit = () => {
    if (editingSessionId && editTitle.trim()) {
      onUpdateSession(editingSessionId, editTitle.trim(), editEmoji);
      setEditingSessionId(null);
      setEditTitle("");
      setEditEmoji("😊");
    }
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditTitle("");
    setEditEmoji("😊");
  };

  const handleDeleteSession = (sessionId: number) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      onDeleteSession(sessionId);
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
                  className={`p-2 rounded transition-colors group ${
                    selectedSessionId === session.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  {editingSessionId === session.id ? (
                    // Edit mode
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1">
                        <Input
                          value={editEmoji}
                          onChange={(e) => setEditEmoji(e.target.value)}
                          className="w-8 h-6 text-xs text-center p-0"
                          maxLength={2}
                        />
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-6 text-xs flex-1"
                          placeholder="Session title"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={handleSaveEdit}
                        >
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div
                      className="cursor-pointer"
                      onClick={() => onSessionSelect(session.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="text-sm">{session.emoji}</span>
                          <span className="text-xs font-medium text-foreground truncate">{session.title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTimeAgo(session.updatedAt)}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex space-x-1 ml-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSession(session.id, session.title || "", session.emoji);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
