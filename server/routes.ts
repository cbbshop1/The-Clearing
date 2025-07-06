import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { aiService } from "./services/aiService";
import { insertSessionSchema, insertMessageSchema } from "@shared/schema";

interface WebSocketClient extends WebSocket {
  userId?: number;
  sessionId?: number;
}

// Helper function to extract emojis from text
function extractEmojis(text: string): string[] {
  // Simple emoji extraction - return empty array for now
  return [];
}



// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, text files, PDFs, and documents
    const allowedTypes = /jpeg|jpg|png|gif|txt|pdf|doc|docx|md|json|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = /image\/|text\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/json|text\/csv/;
    const mimetype = allowedMimeTypes.test(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

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
          case 'forward_message':
            await handleForwardMessage(data, ws);
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
      const { sessionId, content, emojiTags, userId, targetModels = 'both', files = [] } = data;
      
      // Enhance content with file information if files are present
      const enhancedContent = files && files.length > 0 
        ? `${content}\n\n[FILES UPLOADED: ${files.map((f: string) => f.includes('/') ? f.split('/').pop() : f).join(', ')}]`
        : content;

      // Create user message
      const userMessage = await storage.createMessage({
        sessionId,
        userId,
        content: enhancedContent,
        type: 'user',
        emojiTags: emojiTags || [],
        files: files || [],
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

      // Get active AI models and filter based on target
      const activeModels = await storage.getActiveAiModels();
      const filteredModels = activeModels.filter(model => {
        if (targetModels === 'both') return true;
        if (targetModels === 'openai') return model.provider === 'openai';
        if (targetModels === 'claude') return model.provider === 'anthropic';
        return false;
      });
      
      // Get session with conversation history
      const session = await storage.getSession(sessionId);
      const conversationHistory = session?.messages || [];
      
      // Debug: Log the conversation history being sent to AI
      console.log('Number of messages in conversation history:', conversationHistory.length);

      // Generate AI responses
      for (const model of filteredModels) {
        try {
          const aiResponse = await aiService.generateResponse(
            enhancedContent,
            conversationHistory,
            emojiTags || [],
            model,
            files || []
          );

          // Create AI message with specific type based on provider
          const messageType = model.provider === 'openai' ? 'ai_openai' : 'ai_claude';
          const aiMessage = await storage.createMessage({
            sessionId,
            userId: null,
            content: aiResponse.content,
            type: messageType,
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

  async function handleForwardMessage(data: any, ws: WebSocketClient) {
    try {
      const { sessionId, content, targetProvider, userId } = data;
      
      // Get the target AI model
      const models = await storage.getActiveAiModels();
      const targetModel = models.find(m => 
        targetProvider === 'openai' ? m.provider === 'openai' : m.provider === 'anthropic'
      );
      
      if (!targetModel) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Target model not found',
        }));
        return;
      }

      // Extract emojis from forwarded content
      const emojiTags = extractEmojis(content);
      
      // Get conversation history for forwarded message
      const session = await storage.getSession(sessionId);
      const conversationHistory = session?.messages || [];
      
      // Generate AI response from target model
      const aiResponse = await aiService.generateResponse(
        `Forwarded message: ${content}`,
        conversationHistory,
        emojiTags,
        targetModel
      );

      // Create AI message
      const aiMessage = await storage.createMessage({
        sessionId,
        userId: null,
        content: aiResponse.content,
        type: targetProvider === 'openai' ? 'ai_openai' : 'ai_claude',
        aiModel: targetModel.name,
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
      console.error('Error handling forward message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to forward message',
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

  // Delete a session
  app.delete('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      await storage.deleteSession(sessionId);
      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ message: 'Failed to delete session' });
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

  // File upload endpoint
  app.post('/api/upload', upload.array('files', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const sessionId = req.body.sessionId;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const fileUrls: string[] = [];
      
      for (const file of files) {
        // Create a unique filename
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `${sessionId}_${timestamp}_${file.originalname}`;
        const newPath = path.join(uploadDir, filename);
        
        // Move file to permanent location
        fs.renameSync(file.path, newPath);
        
        // Create URL for accessing the file
        const fileUrl = `/uploads/${filename}`;
        fileUrls.push(fileUrl);
      }

      res.json({ fileUrls });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Add CORS headers for file access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    next();
  });
  
  app.use('/uploads', express.static(uploadDir));

  // Also serve from static files middleware if needed

  // Export conversation as markdown
  app.get('/api/sessions/:id/export', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Generate markdown content
      let markdown = `# ${session.title} ${session.emoji}\n\n`;
      markdown += `**Session ID:** ${session.id}\n`;
      markdown += `**Created:** ${new Date(session.createdAt || '').toLocaleString()}\n`;
      markdown += `**Moderator:** Christopher Michael\n\n`;
      markdown += `---\n\n`;
      
      session.messages.forEach(msg => {
        const timestamp = new Date(msg.timestamp || msg.createdAt || '').toLocaleTimeString();
        
        if (msg.type === 'user') {
          const userName = msg.user ? `${msg.user.firstName || ''} ${msg.user.lastName || ''}`.trim() : 'User';
          markdown += `## 👤 ${userName} (${timestamp})\n\n`;
          markdown += `${msg.content}\n\n`;
          
          if (msg.emojiTags && msg.emojiTags.length > 0) {
            markdown += `*Emojis: ${msg.emojiTags.join(' ')}*\n\n`;
          }
        } else if (msg.type === 'ai_openai') {
          markdown += `## 🤖 OpenAI GPT-4o (${timestamp})\n\n`;
          markdown += `${msg.content}\n\n`;
          
          if (msg.emojiTags && msg.emojiTags.length > 0) {
            markdown += `*Emojis: ${msg.emojiTags.join(' ')}*\n\n`;
          }
        } else if (msg.type === 'ai_claude') {
          markdown += `## 🎭 Claude (${timestamp})\n\n`;
          markdown += `${msg.content}\n\n`;
          
          if (msg.emojiTags && msg.emojiTags.length > 0) {
            markdown += `*Emojis: ${msg.emojiTags.join(' ')}*\n\n`;
          }
        }
        
        markdown += `---\n\n`;
      });
      
      markdown += `*Exported from The Clearing Collective at ${new Date().toLocaleString()}*\n`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}-${session.title.replace(/[^a-zA-Z0-9]/g, '-')}.md"`);
      res.send(markdown);
    } catch (error) {
      console.error('Error exporting session:', error);
      res.status(500).json({ message: 'Failed to export session' });
    }
  });

  return httpServer;
}
