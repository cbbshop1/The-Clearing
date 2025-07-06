import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { websocketManager } from "@/lib/websocketManager";

export default function SimpleChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const handleMessage = useCallback((data: any) => {
    console.log('Received WebSocket message:', data);
    if (data.type === 'new_message') {
      setMessages(prev => [...prev, data.message]);
    }
  }, []);

  const handleConnection = useCallback((connected: boolean) => {
    console.log('WebSocket connection status:', connected);
    setIsConnected(connected);
  }, []);

  // Initialize WebSocket manager
  useEffect(() => {
    websocketManager.addMessageHandler(handleMessage);
    websocketManager.addConnectionCallback(handleConnection);
    
    return () => {
      websocketManager.removeMessageHandler(handleMessage);
      websocketManager.removeConnectionCallback(handleConnection);
    };
  }, [handleMessage, handleConnection]);

  const sendTestMessage = () => {
    if (inputValue.trim() && isConnected) {
      websocketManager.send({
        type: 'send_message',
        sessionId: 1,
        userId: 1,
        content: inputValue,
        emojiTags: [],
        targetModels: 'both',
        files: [],
      });
      setInputValue("");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Simple Chat Test</h2>
      <div className="mb-2">
        Status: {isConnected ? "Connected" : "Disconnected"}
      </div>
      
      <div className="mb-4 h-40 overflow-y-auto border p-2">
        {messages.map((msg, index) => (
          <div key={index} className="mb-1">
            <strong>{msg.type}:</strong> {msg.content}
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
        />
        <Button onClick={sendTestMessage} disabled={!isConnected}>
          Send
        </Button>
      </div>
    </div>
  );
}