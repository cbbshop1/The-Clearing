import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { aiService } from "./services/aiService";
import { insertSessionSchema, insertMessageSchema } from "@shared/schema";

interface WebSocketClient extends WebSocket {
  userId?: number;
  sessionId?: number;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections
  const clients = new Map<number, WebSocketClient[]>();

  // WebSocket connection handler
  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'join_session':
            ws.userId = data.userId;
            ws.sessionId = data.sessionId;
            
            if (!clients.has(data.sessionId)) {
              clients.set(data.sessionId, []);
            }
            clients.get(data.sessionId)?.push(ws);
            
            // Send session history
            const session = await storage.getSession(data.sessionId);
            if (session) {
              ws.send(JSON.stringify({
                type: 'session_history',
                messages: session.messages,
              }));
            }
            break;
            
          case 'send_message':
            await handleSendMessage(data, ws);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    });
    
    ws.on('close', () => {
      // Remove client from session
      if (ws.sessionId) {
        const sessionClients = clients.get(ws.sessionId);
        if (sessionClients) {
          const index = sessionClients.indexOf(ws);
          if (index > -1) {
            sessionClients.splice(index, 1);
          }
        }
      }
    });
  });

  async function handleSendMessage(data: any, ws: WebSocketClient) {
    try {
      const { sessionId, content, emojiTags, userId } = data;
      
      // Create user message
      const userMessage = await storage.createMessage({
        sessionId,
        userId,
        content,
        type: 'user',
        emojiTags: emojiTags || [],
        metadata: {},
      });

      // Broadcast user message to all clients in session
      broadcastToSession(sessionId, {
        type: 'new_message',
        message: {
          ...userMessage,
          user: await storage.getUser(userId),
          timestamp: userMessage.createdAt || new Date(),
        },
      });

      // Get active AI models
      const activeModels = await storage.getActiveAiModels();
      
      // Get session context
      const session = await storage.getSession(sessionId);
      const context = session?.messages
        .slice(-5) // Last 5 messages for context
        .map(m => `${m.type}: ${m.content}`)
        .join('\n') || '';

      // Generate AI responses
      for (const model of activeModels) {
        try {
          const aiResponse = await aiService.generateResponse(
            content,
            context,
            emojiTags || [],
            model
          );

          // Create AI message
          const aiMessage = await storage.createMessage({
            sessionId,
            userId: null,
            content: aiResponse.content,
            type: 'ai',
            aiModel: model.name,
            emojiTags: aiResponse.emojiTags,
            metadata: aiResponse.metadata,
          });

          // Broadcast AI message to all clients in session
          broadcastToSession(sessionId, {
            type: 'new_message',
            message: {
              ...aiMessage,
              timestamp: aiMessage.createdAt || new Date(),
            },
          });
        } catch (error) {
          console.error(`Error generating response from ${model.name}:`, error);
          
          // Send error message to session
          broadcastToSession(sessionId, {
            type: 'ai_error',
            model: model.name,
            error: 'Failed to generate response',
          });
        }
      }
    } catch (error) {
      console.error('Error handling send message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to send message',
      }));
    }
  }

  function broadcastToSession(sessionId: number, message: any) {
    const sessionClients = clients.get(sessionId);
    if (sessionClients) {
      sessionClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  // REST API routes
  
  // Get user sessions
  app.get('/api/sessions', async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const sessions = await storage.getSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  });

  // Get session details
  app.get('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ message: 'Failed to fetch session' });
    }
  });

  // Create new session
  app.post('/api/sessions', async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(400).json({ message: 'Invalid session data' });
    }
  });

  // Get active AI models
  app.get('/api/models', async (req, res) => {
    try {
      const models = await storage.getActiveAiModels();
      res.json(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ message: 'Failed to fetch models' });
    }
  });

  // Get moderator user (for demo purposes)
  app.get('/api/moderator', async (req, res) => {
    try {
      const moderator = await storage.getUserByUsername('christopher_michael');
      res.json(moderator);
    } catch (error) {
      console.error('Error fetching moderator:', error);
      res.status(500).json({ message: 'Failed to fetch moderator' });
    }
  });

  // Export conversation
  app.get('/api/sessions/:id/export', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      const exportData = {
        session: {
          id: session.id,
          title: session.title,
          emoji: session.emoji,
          createdAt: session.createdAt,
        },
        messages: session.messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          aiModel: msg.aiModel,
          emojiTags: msg.emojiTags,
          timestamp: msg.timestamp,
          user: msg.user ? {
            firstName: msg.user.firstName,
            lastName: msg.user.lastName,
            role: msg.user.role,
          } : null,
        })),
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}-export.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting session:', error);
      res.status(500).json({ message: 'Failed to export session' });
    }
  });

  return httpServer;
}
