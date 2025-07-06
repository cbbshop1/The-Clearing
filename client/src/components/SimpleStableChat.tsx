import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SimpleStableChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Watch for session changes in localStorage or URL
  useEffect(() => {
    const checkForActiveSession = () => {
      // Try to get session from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const sessionParam = urlParams.get('session');
      if (sessionParam) {
        const sessionId = parseInt(sessionParam);
        if (sessionId !== currentSessionId) {
          setCurrentSessionId(sessionId);
        }
      } else if (!currentSessionId) {
        // Default to session 1 if no session specified
        setCurrentSessionId(1);
      }
    };

    checkForActiveSession();
    const interval = setInterval(checkForActiveSession, 1000);
    return () => clearInterval(interval);
  }, [currentSessionId]);

  // Single, stable WebSocket connection
  useEffect(() => {
    if (!currentSessionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('Connected to session', currentSessionId);
      setIsConnected(true);
      setSocket(newSocket);
      
      // Join the current session
      newSocket.send(JSON.stringify({
        type: 'join_session',
        sessionId: currentSessionId,
        userId: 1,
      }));
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message received:', data.type);
        
        if (data.type === 'session_history') {
          console.log('Loading session history:', data.messages?.length || 0, 'messages');
          setMessages(data.messages || []);
        } else if (data.type === 'new_message') {
          console.log('New message from:', data.message?.type);
          setMessages(prev => [...prev, data.message]);
        }
      } catch (error) {
        console.error('Message error:', error);
      }
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    newSocket.onclose = () => {
      console.log('Disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    return () => {
      console.log('Cleaning up WebSocket connection');
      newSocket.close();
    };
  }, [currentSessionId]); // Reconnect when session changes

  const sendMessage = () => {
    if (socket && inputValue.trim() && currentSessionId) {
      console.log('Sending message to session', currentSessionId);
      socket.send(JSON.stringify({
        type: 'send_message',
        sessionId: currentSessionId,
        userId: 1,
        content: inputValue,
        emojiTags: [],
        targetModels: 'both',
        files: [],
      }));
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">The Clearing Collective</h2>
        <div className="text-sm text-gray-600">
          Status: {isConnected ? "Connected" : "Disconnected"} | Session: {currentSessionId || "None"}
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className="mb-4 p-3 border rounded">
            <div className="text-xs text-gray-500 mb-1">
              {msg.type} {msg.aiModel && `(${msg.aiModel})`}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!isConnected}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}