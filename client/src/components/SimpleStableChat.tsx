import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SimpleStableChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Single, stable WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('Connected');
      setIsConnected(true);
      setSocket(newSocket);
      
      // Join session immediately
      newSocket.send(JSON.stringify({
        type: 'join_session',
        sessionId: 1,
        userId: 1,
      }));
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message received:', data.type);
        
        if (data.type === 'session_history') {
          setMessages(data.messages || []);
        } else if (data.type === 'new_message') {
          setMessages(prev => [...prev, data.message]);
        }
      } catch (error) {
        console.error('Message error:', error);
      }
    };

    newSocket.onclose = () => {
      console.log('Disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    return () => {
      newSocket.close();
    };
  }, []); // Empty dependency array - only run once

  const sendMessage = () => {
    if (socket && inputValue.trim()) {
      socket.send(JSON.stringify({
        type: 'send_message',
        sessionId: 1,
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
          Status: {isConnected ? "Connected" : "Disconnected"}
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