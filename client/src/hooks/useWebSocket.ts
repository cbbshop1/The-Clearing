import { useEffect, useState, useRef } from 'react';

interface UseWebSocketProps {
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export function useWebSocket({ onMessage, onError, onClose }: UseWebSocketProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setSocket(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);
        onClose?.();
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
      
      return ws;
    };

    const ws = connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [onMessage, onError, onClose]);

  return { socket, isConnected };
}
