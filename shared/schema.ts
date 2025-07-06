import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").default("user"), // user, moderator, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  emoji: text("emoji").default("😊"),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  type: text("type").notNull(), // user, moderator, ai
  aiModel: text("ai_model"), // openai, anthropic, etc.
  emojiTags: text("emoji_tags").array().default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiModels = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  provider: text("provider").notNull(), // openai, anthropic
  model: text("model").notNull(), // gpt-4o, claude-sonnet-4-20250514
  isActive: boolean("is_active").default(true),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModels.$inferSelect;

export interface ChatMessage extends Message {
  user?: User;
  timestamp: Date;
}

export interface SessionWithMessages extends Session {
  messages: ChatMessage[];
  user?: User;
}
