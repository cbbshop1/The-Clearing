// Global flag to prevent multiple WebSocket instances
let globalWebSocketInstance: WebSocket | null = null;
let globalConnectionCount = 0;

// Singleton WebSocket manager to prevent multiple connections
class WebSocketManager {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers = new Set<(data: any) => void>();
  private connectionCallbacks = new Set<(connected: boolean) => void>();
  private hasInitialized = false;

  private connect() {
    // Check if we already have a global connection
    if (globalWebSocketInstance && globalWebSocketInstance.readyState === WebSocket.OPEN) {
      this.socket = globalWebSocketInstance;
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    // Prevent multiple connections globally
    if (globalConnectionCount > 0) {
      console.warn('WebSocket connection attempt blocked - connection already exists');
      return;
    }

    this.isConnecting = true;
    globalConnectionCount++;
    console.log('Creating WebSocket connection...');

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.socket = new WebSocket(wsUrl);
    globalWebSocketInstance = this.socket;

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.notifyConnectionChange(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error('Error in WebSocket message handler:', error);
          }
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
      globalConnectionCount = 0;
      this.notifyConnectionChange(false);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnecting = false;
      this.socket = null;
      globalWebSocketInstance = null;
      globalConnectionCount = 0;
      this.notifyConnectionChange(false);
      
      // Reconnect after 3 seconds
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, 3000);
    };
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  public initialize() {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.connect();
    }
  }

  public addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
  }

  public removeMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.delete(handler);
  }

  public addConnectionCallback(callback: (connected: boolean) => void) {
    this.connectionCallbacks.add(callback);
    // Immediately notify of current connection state
    callback(this.isConnected());
  }

  public removeConnectionCallback(callback: (connected: boolean) => void) {
    this.connectionCallbacks.delete(callback);
  }

  public send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  public isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnecting = false;
  }
}

// Export singleton instance
export const websocketManager = new WebSocketManager();

// Initialize the WebSocket manager immediately when the module loads
if (typeof window !== 'undefined') {
  websocketManager.initialize();
}