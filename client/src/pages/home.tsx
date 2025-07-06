import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInterface from "@/components/ChatInterface";
import Sidebar from "@/components/Sidebar";
import ModelPanel from "@/components/ModelPanel";
import EmojiLexicon from "@/components/EmojiLexicon";
import { Session, AiModel } from "@shared/schema";

export default function Home() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isEmojiLexiconOpen, setIsEmojiLexiconOpen] = useState(false);
  const chatInterfaceRef = useRef<{ handleEmojiSelect: (emoji: string) => void } | null>(null);
  
  // Get moderator user
  const { data: moderator } = useQuery({
    queryKey: ['/api/moderator'],
  });

  // Get user sessions (using moderator ID for demo)
  const { data: sessions = [] } = useQuery({
    queryKey: ['/api/sessions', moderator?.id],
    queryFn: async () => {
      if (!moderator?.id) {
        throw new Error('No moderator ID available');
      }
      const response = await fetch(`/api/sessions?userId=${moderator.id}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    enabled: !!moderator?.id,
    retry: false, // Disable retries to prevent excessive requests
  });

  // Get active AI models
  const { data: aiModels = [] } = useQuery({
    queryKey: ['/api/models'],
  });

  const handleNewSession = async (title: string, emoji: string) => {
    if (!moderator?.id) return;
    
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        emoji,
        userId: moderator.id,
      }),
    });
    
    if (response.ok) {
      const newSession = await response.json();
      setSelectedSessionId(newSession.id);
      // Refetch sessions to update the list
      window.location.reload();
    }
  };

  const handleExportSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${sessionId}-export.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // If we're deleting the currently selected session, clear the selection
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
        }
        // Refetch sessions to update the list
        window.location.reload();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleUpdateSession = async (sessionId: number, title: string, emoji: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, emoji }),
      });
      
      if (response.ok) {
        // Refetch sessions to update the list
        window.location.reload();
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  return (
    <>
      <div className="h-screen flex overflow-hidden bg-background">
        {/* Left Sidebar - Slimmer */}
        <div className="w-64 flex-shrink-0">
          <Sidebar
            moderator={moderator}
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSessionSelect={setSelectedSessionId}
            onNewSession={handleNewSession}
            onExportSession={handleExportSession}
            onDeleteSession={handleDeleteSession}
            onUpdateSession={handleUpdateSession}
          />
        </div>
        
        {/* Main Chat Area - Takes up most space */}
        <div className="flex-1 min-w-0">
          <ChatInterface
            ref={chatInterfaceRef}
            sessionId={selectedSessionId}
            userId={moderator?.id}
            onOpenEmojiLexicon={() => setIsEmojiLexiconOpen(true)}
          />
        </div>
        
        {/* Right Panel - Slimmer */}
        <div className="w-64 flex-shrink-0">
          <ModelPanel aiModels={aiModels} />
        </div>
      </div>
      
      <EmojiLexicon
        isOpen={isEmojiLexiconOpen}
        onClose={() => setIsEmojiLexiconOpen(false)}
        onEmojiSelect={(emoji) => {
          chatInterfaceRef.current?.handleEmojiSelect(emoji);
          setIsEmojiLexiconOpen(false);
        }}
      />
    </>
  );
}
