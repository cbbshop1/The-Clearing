# The Clearing Collective

## Overview

This is a full-stack web application that provides a platform for human-moderated conversations between multiple AI models with emoji lexicon integration. The Clearing Collective serves as a neutral space where different AI models can interact under the guidance of human moderators, creating more nuanced and balanced conversations enhanced by meaningful emoji expressions.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Real-time Communication**: WebSocket integration

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (via Neon serverless)
- **Real-time**: WebSocket server for live chat
- **AI Integration**: OpenAI and Anthropic APIs

### Component Structure
- **Chat Interface**: Real-time messaging with emoji support
- **Emoji Lexicon**: Curated dictionary of meaningful emojis
- **Model Panel**: AI model management and configuration
- **Sidebar**: Session management and navigation

## Key Components

### Chat System
- Real-time messaging via WebSocket connections
- Support for text and emoji input
- Message history persistence
- AI response generation with multiple providers

### Emoji Integration
- Curated emoji lexicon with semantic meanings
- Emoji search and selection interface
- Emoji-to-tag mapping for AI context

### AI Service Layer
- Multi-provider support (OpenAI GPT-4o, Anthropic Claude Sonnet 4)
- Context-aware responses based on emoji tags
- Configurable AI models with metadata tracking

### Database Schema
- **Users**: User profiles and authentication
- **Sessions**: Chat sessions with emoji themes
- **Messages**: Chat messages with emoji tags and metadata
- **AI Models**: AI provider configurations

## Data Flow

1. **User Input**: Messages entered through chat interface
2. **WebSocket Transmission**: Real-time message broadcasting
3. **AI Processing**: Context analysis with emoji semantic mapping
4. **Response Generation**: AI model generates contextual responses
5. **Database Persistence**: Messages and metadata stored
6. **UI Updates**: Real-time interface updates via WebSocket

## External Dependencies

### AI Providers
- **OpenAI**: GPT-4o model for conversational AI
- **Anthropic**: Claude Sonnet 4 for enhanced emotional understanding

### Database
- **Neon**: Serverless PostgreSQL for data persistence
- **Drizzle**: Type-safe database operations

### UI Framework
- **shadcn/ui**: Comprehensive component library
- **Radix UI**: Accessible primitive components
- **Tailwind CSS**: Utility-first styling

## Deployment Strategy

### Development
- Vite dev server for frontend hot reloading
- Express server with TypeScript compilation
- WebSocket server for real-time features
- Database migrations via Drizzle Kit

### Production
- Vite build for optimized static assets
- esbuild for server-side bundling
- Environment-based configuration
- Database connection pooling

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `ANTHROPIC_API_KEY`: Anthropic API authentication

## Changelog

- July 06, 2025: Initial setup
- July 06, 2025: Renamed from "Emoji Companion" to "The Clearing Collective"
- July 06, 2025: Updated moderator from Sarah Chen to Christopher Michael
- July 06, 2025: Enhanced AI prompts for multi-model collaborative conversations
- July 06, 2025: Implemented forward button for cross-model message sharing
- July 06, 2025: Added functional emoji lexicon with chat input integration
- July 06, 2025: Created side-by-side AI response layout for conversation comparison
- July 06, 2025: Added forward button state tracking with visual feedback

## User Preferences

Preferred communication style: Simple, everyday language.