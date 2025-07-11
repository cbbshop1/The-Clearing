import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatInterface from "@/components/ChatInterface";
import Sidebar from "@/components/Sidebar";
import ModelPanel from "@/components/ModelPanel";
import EmojiLexicon from "@/components/EmojiLexicon";
import KnowledgeBase from "@/components/KnowledgeBase";
import { Session, AiModel } from "@shared/schema";

export default function Home() {
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isEmojiLexiconOpen, setIsEmojiLexiconOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const chatInterfaceRef = useRef<{ handleEmojiSelect: (emoji: string) => void } | null>(null);
  
  // Get moderator user
  const { data: moderator } = useQuery({
    queryKey: ['/api/moderator'],
  });

  // Get user sessions (using moderator ID for demo)
  const { data: sessions = [] } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: async () => {
      const response = await fetch(`/api/sessions?userId=${moderator?.id}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    enabled: !!moderator?.id,
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
        // If the deleted session was selected, clear selection
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
        }
        // Reload to refresh the session list
        window.location.reload();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <>
      <div className="h-screen flex overflow-hidden bg-background">
        <Sidebar
          moderator={moderator}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSessionSelect={setSelectedSessionId}
          onNewSession={handleNewSession}
          onExportSession={handleExportSession}
          onDeleteSession={handleDeleteSession}
        />
        
        <ChatInterface
          ref={chatInterfaceRef}
          sessionId={selectedSessionId}
          userId={moderator?.id}
          onOpenEmojiLexicon={() => setIsEmojiLexiconOpen(true)}
        />
        
        <ModelPanel 
          aiModels={aiModels} 
          onOpenKnowledgeBase={() => setIsKnowledgeBaseOpen(true)}
        />
      </div>
      
      <EmojiLexicon
        isOpen={isEmojiLexiconOpen}
        onClose={() => setIsEmojiLexiconOpen(false)}
        onEmojiSelect={(emoji) => {
          chatInterfaceRef.current?.handleEmojiSelect(emoji);
          setIsEmojiLexiconOpen(false);
        }}
      />
      
      <KnowledgeBase
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        aiModels={aiModels}
      />
    </>
  );
}
