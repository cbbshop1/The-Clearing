import {
  users,
  sessions,
  messages,
  aiModels,
  knowledgeBase,
  aiModelKnowledge,
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
  type Message,
  type InsertMessage,
  type ChatMessage,
  type SessionWithMessages,
  type AiModel,
  type InsertAiModel,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type AiModelKnowledge,
  type InsertAiModelKnowledge,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session operations
  getSessions(userId: number): Promise<Session[]>;
  getSession(id: number): Promise<SessionWithMessages | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, updates: Partial<InsertSession>): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  
  // Message operations
  getMessages(sessionId: number): Promise<ChatMessage[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // AI Model operations
  getActiveAiModels(): Promise<AiModel[]>;
  getAiModel(id: number): Promise<AiModel | undefined>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: number, updates: Partial<InsertAiModel>): Promise<AiModel>;
  
  // Knowledge Base operations
  getKnowledgeBase(): Promise<KnowledgeBase[]>;
  getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined>;
  createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeBase(id: number, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase>;
  deleteKnowledgeBase(id: number): Promise<void>;
  searchKnowledgeBase(query: string): Promise<KnowledgeBase[]>;
  
  // AI Model Knowledge operations
  getAiModelKnowledge(aiModelId: number): Promise<KnowledgeBase[]>;
  assignKnowledgeToAiModel(aiModelId: number, knowledgeId: number, priority?: number): Promise<void>;
  removeKnowledgeFromAiModel(aiModelId: number, knowledgeId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private sessions: Map<number, Session> = new Map();
  private messages: Map<number, Message> = new Map();
  private aiModels: Map<number, AiModel> = new Map();
  private currentUserId = 1;
  private currentSessionId = 1;
  private currentMessageId = 1;
  private currentModelId = 1;

  constructor() {
    // Initialize with default moderator user
    this.createUser({
      username: "christopher_michael",
      email: "christopher.michael@example.com",
      firstName: "Christopher",
      lastName: "Michael",
      profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      role: "moderator",
    });

    // Initialize default AI models
    this.createAiModel({
      name: "OpenAI GPT-4o",
      provider: "openai",
      model: "gpt-4o",
      isActive: true,
      config: { temperature: 0.7, maxTokens: 1000 },
    });

    this.createAiModel({
      name: "Anthropic Claude",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      isActive: true,
      config: { temperature: 0.7, maxTokens: 1000 },
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      role: insertUser.role || "user",
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async getSessions(userId: number): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
  }

  async getSession(id: number): Promise<SessionWithMessages | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const sessionMessages = await this.getMessages(id);
    const user = session.userId ? await this.getUser(session.userId) : undefined;

    return {
      ...session,
      messages: sessionMessages,
      user,
    };
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.currentSessionId++;
    const now = new Date();
    const session: Session = {
      id,
      title: insertSession.title,
      emoji: insertSession.emoji || "😊",
      userId: insertSession.userId || null,
      isActive: insertSession.isActive !== undefined ? insertSession.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: number, updates: Partial<InsertSession>): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("Session not found");

    const updatedSession: Session = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: number): Promise<void> {
    // Delete all messages associated with the session
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.sessionId === id)
      .map(([messageId, _]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
    
    // Delete the session itself
    this.sessions.delete(id);
  }

  async getMessages(sessionId: number): Promise<ChatMessage[]> {
    const sessionMessages = Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));

    const chatMessages: ChatMessage[] = [];
    for (const message of sessionMessages) {
      const user = message.userId ? await this.getUser(message.userId) : undefined;
      chatMessages.push({
        ...message,
        user,
        timestamp: message.createdAt || new Date(),
      });
    }

    return chatMessages;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const now = new Date();
    const message: Message = {
      id,
      sessionId: insertMessage.sessionId || null,
      userId: insertMessage.userId || null,
      content: insertMessage.content,
      type: insertMessage.type,
      aiModel: insertMessage.aiModel || null,
      emojiTags: insertMessage.emojiTags || null,
      files: insertMessage.files || null,
      metadata: insertMessage.metadata || {},
      createdAt: now,
    };
    this.messages.set(id, message);
    return message;
  }

  async getActiveAiModels(): Promise<AiModel[]> {
    return Array.from(this.aiModels.values()).filter(model => model.isActive);
  }

  async getAiModel(id: number): Promise<AiModel | undefined> {
    return this.aiModels.get(id);
  }

  async createAiModel(insertModel: InsertAiModel): Promise<AiModel> {
    const id = this.currentModelId++;
    const now = new Date();
    const model: AiModel = {
      id,
      name: insertModel.name,
      provider: insertModel.provider,
      model: insertModel.model,
      isActive: insertModel.isActive ?? true,
      config: insertModel.config || {},
      createdAt: now,
    };
    this.aiModels.set(id, model);
    return model;
  }

  async updateAiModel(id: number, updates: Partial<InsertAiModel>): Promise<AiModel> {
    const model = this.aiModels.get(id);
    if (!model) throw new Error("AI Model not found");

    const updatedModel: AiModel = {
      ...model,
      ...updates,
    };
    this.aiModels.set(id, updatedModel);
    return updatedModel;
  }

  // Knowledge Base operations - stub implementations for MemStorage
  async getKnowledgeBase(): Promise<KnowledgeBase[]> {
    return [];
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    return undefined;
  }

  async createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase> {
    throw new Error("Knowledge base not supported in memory storage");
  }

  async updateKnowledgeBase(id: number, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase> {
    throw new Error("Knowledge base not supported in memory storage");
  }

  async deleteKnowledgeBase(id: number): Promise<void> {
    // No-op
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBase[]> {
    return [];
  }

  async getAiModelKnowledge(aiModelId: number): Promise<KnowledgeBase[]> {
    return [];
  }

  async assignKnowledgeToAiModel(aiModelId: number, knowledgeId: number, priority?: number): Promise<void> {
    // No-op
  }

  async removeKnowledgeFromAiModel(aiModelId: number, knowledgeId: number): Promise<void> {
    // No-op
  }
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    // Create default moderator if not exists
    const existingModerator = await this.getUserByUsername("christopher_michael");
    if (!existingModerator) {
      await this.createUser({
        username: "christopher_michael",
        email: "christopher@clearingcollective.com",

      });
    }

    // Create default AI models if not exist
    const existingModels = await this.getActiveAiModels();
    if (existingModels.length === 0) {
      await this.createAiModel({
        name: "OpenAI GPT-4o",
        provider: "openai",
        model: "gpt-4o",
        isActive: true,
      });

      await this.createAiModel({
        name: "Claude Sonnet 4",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        isActive: true,
      });
    }

    // Add sample knowledge base entries
    const existingKnowledge = await this.getKnowledgeBase();
    if (existingKnowledge.length === 0) {
      const sampleKnowledge = [
        {
          title: "Research Methodology Guidelines",
          category: "Research",
          content: "When conducting research conversations, maintain objectivity and avoid leading questions. Focus on exploring multiple perspectives rather than confirming existing beliefs. Document findings systematically and acknowledge limitations in your analysis.",
          tags: ["research", "methodology", "objectivity"],
          source: "The Clearing Collective Research Protocol",
        },
        {
          title: "Collaborative AI Communication",
          category: "Communication",
          content: "When interacting with other AI models, be respectful of different approaches and viewpoints. Reference previous points in the conversation to maintain continuity. When disagreeing, explain your reasoning clearly without dismissing alternative perspectives.",
          tags: ["collaboration", "communication", "ai-interaction"],
          source: "Multi-AI Conversation Best Practices",
        },
        {
          title: "Emotional Intelligence in AI",
          category: "Psychology",
          content: "Recognize emotional cues in human communication and respond appropriately. Use empathetic language when discussing sensitive topics. Balance analytical thinking with emotional understanding to provide more nuanced responses.",
          tags: ["emotional-intelligence", "empathy", "human-interaction"],
          source: "AI Psychology Guidelines",
        },
        {
          title: "Critical Thinking Framework",
          category: "Analysis",
          content: "Apply systematic critical thinking: 1) Identify assumptions, 2) Evaluate evidence quality, 3) Consider alternative explanations, 4) Assess logical consistency, 5) Recognize cognitive biases. Question claims that seem too convenient or align perfectly with expectations.",
          tags: ["critical-thinking", "analysis", "reasoning"],
          source: "Logical Reasoning Handbook",
        },
      ];

      const models = await this.getActiveAiModels();
      const openaiModel = models.find(m => m.provider === "openai");
      const claudeModel = models.find(m => m.provider === "anthropic");

      for (const knowledge of sampleKnowledge) {
        try {
          const createdKnowledge = await this.createKnowledgeBase(knowledge);
          
          // Assign knowledge to both AI models
          if (openaiModel) {
            await this.assignKnowledgeToAiModel(openaiModel.id, createdKnowledge.id, 1);
          }
          if (claudeModel) {
            await this.assignKnowledgeToAiModel(claudeModel.id, createdKnowledge.id, 1);
          }
        } catch (error) {
          console.error("Error creating sample knowledge:", error);
        }
      }
    }

    this.initialized = true;
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getSessions(userId: number): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt));
  }

  async getSession(id: number): Promise<SessionWithMessages | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!session) return undefined;

    const sessionMessages = await db
      .select({
        id: messages.id,
        sessionId: messages.sessionId,
        userId: messages.userId,
        type: messages.type,
        content: messages.content,
        aiModel: messages.aiModel,
        emojiTags: messages.emojiTags,
        files: messages.files,
        targetModels: messages.targetModels,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        user: users,
        timestamp: messages.createdAt,
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.sessionId, id))
      .orderBy(messages.createdAt);

    return {
      ...session,
      messages: sessionMessages,
    };
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateSession(id: number, updates: Partial<InsertSession>): Promise<Session> {
    const [session] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }

  async deleteSession(id: number): Promise<void> {
    // Delete messages first (cascade delete)
    await db.delete(messages).where(eq(messages.sessionId, id));
    // Then delete the session
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async getMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db
      .select({
        id: messages.id,
        sessionId: messages.sessionId,
        userId: messages.userId,
        type: messages.type,
        content: messages.content,
        aiModel: messages.aiModel,
        emojiTags: messages.emojiTags,
        files: messages.files,
        targetModels: messages.targetModels,
        metadata: messages.metadata,
        createdAt: messages.createdAt,
        user: users,
        timestamp: messages.createdAt,
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        targetModels: insertMessage.targetModels || 'both'
      })
      .returning();
    return message;
  }

  async getActiveAiModels(): Promise<AiModel[]> {
    return await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.isActive, true));
  }

  async getAiModel(id: number): Promise<AiModel | undefined> {
    const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id));
    return model || undefined;
  }

  async createAiModel(insertModel: InsertAiModel): Promise<AiModel> {
    const [model] = await db
      .insert(aiModels)
      .values(insertModel)
      .returning();
    return model;
  }

  async updateAiModel(id: number, updates: Partial<InsertAiModel>): Promise<AiModel> {
    const [model] = await db
      .update(aiModels)
      .set(updates)
      .where(eq(aiModels.id, id))
      .returning();
    return model;
  }

  // Knowledge Base operations
  async getKnowledgeBase(): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, true))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  async getKnowledgeBaseById(id: number): Promise<KnowledgeBase | undefined> {
    const [knowledge] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
    return knowledge || undefined;
  }

  async createKnowledgeBase(insertKnowledge: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [knowledge] = await db
      .insert(knowledgeBase)
      .values(insertKnowledge)
      .returning();
    return knowledge;
  }

  async updateKnowledgeBase(id: number, updates: Partial<InsertKnowledgeBase>): Promise<KnowledgeBase> {
    const [knowledge] = await db
      .update(knowledgeBase)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, id))
      .returning();
    return knowledge;
  }

  async deleteKnowledgeBase(id: number): Promise<void> {
    // Remove all AI model associations first
    await db.delete(aiModelKnowledge).where(eq(aiModelKnowledge.knowledgeBaseId, id));
    // Then delete the knowledge base entry
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, true))
      .orderBy(desc(knowledgeBase.createdAt));
  }

  // AI Model Knowledge operations
  async getAiModelKnowledge(aiModelId: number): Promise<KnowledgeBase[]> {
    return await db
      .select({
        id: knowledgeBase.id,
        title: knowledgeBase.title,
        content: knowledgeBase.content,
        category: knowledgeBase.category,
        tags: knowledgeBase.tags,
        source: knowledgeBase.source,
        isActive: knowledgeBase.isActive,
        createdAt: knowledgeBase.createdAt,
        updatedAt: knowledgeBase.updatedAt,
      })
      .from(aiModelKnowledge)
      .innerJoin(knowledgeBase, eq(aiModelKnowledge.knowledgeBaseId, knowledgeBase.id))
      .where(eq(aiModelKnowledge.aiModelId, aiModelId))
      .orderBy(desc(aiModelKnowledge.priority));
  }

  async assignKnowledgeToAiModel(aiModelId: number, knowledgeId: number, priority: number = 1): Promise<void> {
    await db
      .insert(aiModelKnowledge)
      .values({
        aiModelId,
        knowledgeBaseId: knowledgeId,
        priority,
      })
      .onConflictDoNothing();
  }

  async removeKnowledgeFromAiModel(aiModelId: number, knowledgeId: number): Promise<void> {
    await db
      .delete(aiModelKnowledge)
      .where(eq(aiModelKnowledge.aiModelId, aiModelId))
      .where(eq(aiModelKnowledge.knowledgeBaseId, knowledgeId));
  }
}

export const storage = new DatabaseStorage();
