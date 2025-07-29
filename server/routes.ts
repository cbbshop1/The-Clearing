import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { aiService } from "./services/aiService";
import { insertSessionSchema, insertMessageSchema, insertKnowledgeBaseSchema } from "@shared/schema";

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
  // Initialize database with default data
  await storage.initialize();
  
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
        console.log('🔌 WEBSOCKET RECEIVED:', data.type, data.sessionId ? `session:${data.sessionId}` : '', data.content ? data.content.substring(0, 30) + '...' : '');
        
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
    console.log('💬 RECEIVED MESSAGE:', { sessionId: data.sessionId, content: data.content?.substring(0, 50), targetModels: data.targetModels || 'both' });
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
        targetModels: targetModels || 'both',
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
      console.log('📋 AVAILABLE MODELS:', activeModels.map(m => `${m.name} (${m.provider})`));
      console.log('📋 TARGET MODELS:', targetModels);
      
      const filteredModels = activeModels.filter(model => {
        if (targetModels === 'both') return true;
        if (targetModels === 'openai') return model.provider === 'openai';
        if (targetModels === 'claude') return model.provider === 'anthropic';
        if (targetModels === 'deepseek') return model.provider === 'deepseek';
        return false;
      });
      
      console.log('📋 FILTERED MODELS:', filteredModels.map(m => `${m.name} (${m.provider})`));
      
      // Get session with conversation history (exclude the current user message to avoid duplication)
      const session = await storage.getSession(sessionId);
      const allMessages = session?.messages || [];
      
      // Generate AI responses
      console.log('🚀 PROCESSING', filteredModels.length, 'AI MODELS...');
      for (const model of filteredModels) {
        console.log(`🤖 CALLING MODEL: ${model.name} (${model.provider})`);
        
        // Filter conversation history for this specific model
        // Each model only sees user messages that were sent to it and its own previous responses
        const modelConversationHistory = allMessages.filter(msg => {
          if (msg.id === userMessage.id) return false; // Exclude current message
          
          // For user messages, check if they were sent to this model
          if (msg.type === 'user') {
            const msgTargetModels = msg.targetModels || 'both';
            if (msgTargetModels === 'both') return true; // Message was sent to all models
            if (msgTargetModels === 'openai' && model.provider === 'openai') return true;
            if (msgTargetModels === 'claude' && model.provider === 'anthropic') return true;
            if (msgTargetModels === 'deepseek' && model.provider === 'deepseek') return true;
            return false; // Message was not sent to this model
          }
          
          // Include only this model's own responses
          if (model.provider === 'openai' && msg.type === 'ai_openai') return true;
          if (model.provider === 'anthropic' && msg.type === 'ai_claude') return true;
          if (model.provider === 'deepseek' && msg.type === 'ai_deepseek') return true;
          
          return false; // Exclude other AI models' responses
        });
        
        console.log(`📝 ${model.name}: Filtered to ${modelConversationHistory.length} messages from ${allMessages.length} total`);
        
        try {
          const aiResponse = await aiService.generateResponse(
            enhancedContent,
            modelConversationHistory,
            emojiTags || [],
            model,
            files || []
          );
          console.log(`✅ SUCCESS: ${model.name} responded with ${aiResponse.content.length} characters`);

          // Create AI message with specific type based on provider
          const messageType = model.provider === 'openai' ? 'ai_openai' : 
                              model.provider === 'anthropic' ? 'ai_claude' : 
                              'ai_deepseek';
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
        targetProvider === 'openai' ? m.provider === 'openai' : 
        targetProvider === 'claude' ? m.provider === 'anthropic' : 
        m.provider === 'deepseek'
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
      const allMessages = session?.messages || [];
      
      // Filter conversation history for the target model
      const modelConversationHistory = allMessages.filter(msg => {
        // For user messages, check if they were sent to this model
        if (msg.type === 'user') {
          const msgTargetModels = msg.targetModels || 'both';
          if (msgTargetModels === 'both') return true; // Message was sent to all models
          if (msgTargetModels === 'openai' && targetProvider === 'openai') return true;
          if (msgTargetModels === 'claude' && targetProvider === 'claude') return true;
          if (msgTargetModels === 'deepseek' && targetProvider === 'deepseek') return true;
          return false; // Message was not sent to this model
        }
        
        // Include only this model's own responses
        if (targetProvider === 'openai' && msg.type === 'ai_openai') return true;
        if (targetProvider === 'claude' && msg.type === 'ai_claude') return true;
        if (targetProvider === 'deepseek' && msg.type === 'ai_deepseek') return true;
        
        return false; // Exclude other AI models' responses
      });
      
      console.log(`📝 FORWARD to ${targetModel.name}: Filtered to ${modelConversationHistory.length} messages from ${allMessages.length} total`);
      
      // Generate AI response from target model
      const aiResponse = await aiService.generateResponse(
        content, // Remove "Forwarded message:" prefix to avoid confusion
        modelConversationHistory,
        emojiTags,
        targetModel
      );

      // Create AI message
      const aiMessage = await storage.createMessage({
        sessionId,
        userId: null,
        content: aiResponse.content,
        type: targetProvider === 'openai' ? 'ai_openai' : 
              targetProvider === 'claude' ? 'ai_claude' : 
              'ai_deepseek',
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

  // Knowledge Base API routes
  app.get('/api/knowledge', async (req, res) => {
    try {
      const knowledge = await storage.getKnowledgeBase();
      res.json(knowledge);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      res.status(500).json({ message: 'Failed to fetch knowledge base' });
    }
  });

  app.post('/api/knowledge', async (req, res) => {
    try {
      const validatedData = insertKnowledgeBaseSchema.parse(req.body);
      const knowledge = await storage.createKnowledgeBase(validatedData);
      res.json(knowledge);
    } catch (error) {
      console.error('Error creating knowledge base entry:', error);
      res.status(400).json({ message: 'Invalid knowledge base data' });
    }
  });

  app.put('/api/knowledge/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const knowledge = await storage.updateKnowledgeBase(id, updates);
      res.json(knowledge);
    } catch (error) {
      console.error('Error updating knowledge base:', error);
      res.status(500).json({ message: 'Failed to update knowledge base entry' });
    }
  });

  app.delete('/api/knowledge/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteKnowledgeBase(id);
      res.json({ message: 'Knowledge base entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting knowledge base entry:', error);
      res.status(500).json({ message: 'Failed to delete knowledge base entry' });
    }
  });

  // Get AI model specific knowledge
  app.get('/api/models/:id/knowledge', async (req, res) => {
    try {
      const aiModelId = parseInt(req.params.id);
      const knowledge = await storage.getAiModelKnowledge(aiModelId);
      res.json(knowledge);
    } catch (error) {
      console.error('Error fetching AI model knowledge:', error);
      res.status(500).json({ message: 'Failed to fetch AI model knowledge' });
    }
  });

  // Assign knowledge to AI model
  app.post('/api/models/:id/knowledge', async (req, res) => {
    try {
      const aiModelId = parseInt(req.params.id);
      const { knowledgeId, priority = 1 } = req.body;
      await storage.assignKnowledgeToAiModel(aiModelId, knowledgeId, priority);
      res.json({ message: 'Knowledge assigned to AI model successfully' });
    } catch (error) {
      console.error('Error assigning knowledge to AI model:', error);
      res.status(500).json({ message: 'Failed to assign knowledge to AI model' });
    }
  });

  // Remove knowledge from AI model
  app.delete('/api/models/:id/knowledge/:knowledgeId', async (req, res) => {
    try {
      const aiModelId = parseInt(req.params.id);
      const knowledgeId = parseInt(req.params.knowledgeId);
      await storage.removeKnowledgeFromAiModel(aiModelId, knowledgeId);
      res.json({ message: 'Knowledge removed from AI model successfully' });
    } catch (error) {
      console.error('Error removing knowledge from AI model:', error);
      res.status(500).json({ message: 'Failed to remove knowledge from AI model' });
    }
  });

  return httpServer;
}
