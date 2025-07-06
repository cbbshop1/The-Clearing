import { useEffect, useState, useRef, useCallback } from 'react';

interface UseWebSocketProps {
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export function useWebSocket({ onMessage, onError, onClose }: UseWebSocketProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const lastConnectAttempt = useRef<number>(0);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);

  // Update refs when callbacks change
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  onCloseRef.current = onClose;

  useEffect(() => {
    const connect = () => {
      const now = Date.now();
      // Prevent connection attempts more than once per second
      if (now - lastConnectAttempt.current < 1000) {
        return;
      }
      lastConnectAttempt.current = now;
      
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
          onMessageRef.current(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onErrorRef.current?.(error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);
        onCloseRef.current?.();
        
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
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []); // Empty dependency array to prevent reconnections

  return { socket, isConnected };
}
