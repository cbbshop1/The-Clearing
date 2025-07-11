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
- July 06, 2025: Enhanced export functionality to generate downloadable markdown files
- July 06, 2025: Added independent scrolling areas for side-by-side AI responses
- July 06, 2025: Implemented smooth animations for message arrival
- July 06, 2025: Added independent messaging controls (send to both, OpenAI only, or Claude only)
- July 06, 2025: Fixed export file format to properly download as markdown files
- July 06, 2025: Implemented file upload functionality with support for images, documents, and text files
- July 06, 2025: Added file display in message bubbles with preview for images and download buttons
- July 06, 2025: Enhanced AI prompts to analyze and discuss uploaded file content
- July 06, 2025: Fixed file upload validation to accept more file types and improved error handling
- July 06, 2025: Enhanced conversation context with better AI memory (increased from 5 to 10 message history)
- July 06, 2025: Improved AI prompts to reference previous conversation points and maintain continuity
- July 06, 2025: Adjusted layout - reduced model panel width from 320px to 256px for larger chat area
- July 06, 2025: Major AI service refactor - implemented proper conversation history as message arrays instead of context strings
- July 06, 2025: Enhanced AI model continuity by passing conversation history in proper API format for both OpenAI and Anthropic
- July 06, 2025: Fixed "new instance" issue by restructuring how AI models receive and process conversation context
- July 06, 2025: Fixed Anthropic API error with empty message validation and improved response parsing
- July 06, 2025: Enhanced file upload recognition - AI models now properly acknowledge and discuss uploaded files
- July 06, 2025: Added explicit file information to user messages and AI system prompts for better file interaction
- July 06, 2025: Removed preset context prompts to enable tabula rasa research - AI models now start with blank slate
- July 06, 2025: Simplified system prompts to avoid predefining roles or platform knowledge for research purposes
- July 06, 2025: Completely removed system prompts except for file uploads - true tabula rasa implementation
- July 06, 2025: Eliminated old buildPrompt method that contained "Critical Guidelines" and platform context
- July 06, 2025: Added session delete functionality with confirmation dialog and cascade delete of messages
- July 06, 2025: Enhanced sidebar with export and delete buttons for each session
- July 06, 2025: Improved file upload recognition with better filename display in AI prompts
- July 06, 2025: Added file content reading for text files - AI models can now analyze actual file content
- July 06, 2025: Support for text-based file types (.txt, .md, .json, .csv, .js, .ts, .html, .css, etc.)
- July 06, 2025: Removed artificial file size restrictions per user's research requirements
- July 06, 2025: Confirmed file content reading working correctly - AI models now read and analyze full text file content
- July 07, 2025: Implemented persistent PostgreSQL database storage to replace in-memory storage
- July 07, 2025: Fixed scroll bar reset issue in chat interface for better user experience
- July 07, 2025: Added DatabaseStorage class with full CRUD operations for sessions, messages, users, and AI models
- July 07, 2025: Conversations now persist between app restarts and crashes - no more data loss

## User Preferences

Preferred communication style: Simple, everyday language.