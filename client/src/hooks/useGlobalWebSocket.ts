import { useEffect, useRef, useCallback } from 'react';

// Global WebSocket instance
let globalSocket: WebSocket | null = null;
let isConnecting = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
const messageHandlers = new Set<(data: any) => void>();

interface UseGlobalWebSocketProps {
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export function useGlobalWebSocket({ onMessage, onError, onClose }: UseGlobalWebSocketProps) {
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);

  // Update refs when callbacks change
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  onCloseRef.current = onClose;

  const connectWebSocket = useCallback(() => {
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      return globalSocket;
    }

    if (isConnecting) {
      return null;
    }

    isConnecting = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    globalSocket = new WebSocket(wsUrl);

    globalSocket.onopen = () => {
      console.log('Global WebSocket connected');
      isConnecting = false;
    };

    globalSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Broadcast to all registered handlers
        messageHandlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    globalSocket.onerror = (error) => {
      console.error('Global WebSocket error:', error);
      isConnecting = false;
      // Notify all error handlers
      messageHandlers.forEach(() => {
        // We can't easily call individual error handlers, so we'll just log
      });
    };

    globalSocket.onclose = () => {
      console.log('Global WebSocket disconnected');
      isConnecting = false;
      globalSocket = null;
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeout = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    return globalSocket;
  }, []);

  useEffect(() => {
    // Add message handler to the global set
    messageHandlers.add(onMessageRef.current);
    
    // Connect if not already connected
    if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }

    return () => {
      // Remove message handler from the global set
      messageHandlers.delete(onMessageRef.current);
    };
  }, [connectWebSocket]);

  useEffect(() => {
    // Update the handler in the set when it changes
    messageHandlers.delete(onMessageRef.current);
    messageHandlers.add(onMessage);
  }, [onMessage]);

  const send = useCallback((data: any) => {
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      globalSocket.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }, []);

  return {
    socket: globalSocket,
    isConnected: globalSocket?.readyState === WebSocket.OPEN,
    send
  };
}