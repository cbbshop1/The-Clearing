import { useState, useEffect, useCallback } from 'react';
import { websocketManager } from '@/lib/websocketManager';

interface UseWebSocketManagerProps {
  onMessage: (data: any) => void;
}

export function useWebSocketManager({ onMessage }: UseWebSocketManagerProps) {
  const [isConnected, setIsConnected] = useState(false);

  const connectionCallback = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  useEffect(() => {
    // Add handlers to the singleton manager
    websocketManager.addMessageHandler(onMessage);
    websocketManager.addConnectionCallback(connectionCallback);

    return () => {
      // Clean up handlers
      websocketManager.removeMessageHandler(onMessage);
      websocketManager.removeConnectionCallback(connectionCallback);
    };
  }, []); // Remove dependencies to prevent re-registration

  const send = useCallback((data: any) => {
    websocketManager.send(data);
  }, []);

  return {
    isConnected,
    send
  };
}