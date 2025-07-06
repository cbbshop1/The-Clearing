import {
  users,
  sessions,
  messages,
  aiModels,
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
} from "@shared/schema";

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
  
  // Message operations
  getMessages(sessionId: number): Promise<ChatMessage[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // AI Model operations
  getActiveAiModels(): Promise<AiModel[]>;
  getAiModel(id: number): Promise<AiModel | undefined>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: number, updates: Partial<InsertAiModel>): Promise<AiModel>;
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
}

export const storage = new MemStorage();
