# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-01-06

### Added
- **Non-linear conversation branching** - Create branches from any message to explore different conversation paths
- **Multi-model support** - Integration with OpenAI, Anthropic, Google, and xAI models
- **Model switching** - Change models on-the-fly for main conversations and individual branches
- **Rich attachment support** - Upload and include images (JPEG, PNG, GIF, WebP) and documents (PDF, Markdown, Plain Text) in conversations
- **Persistent local storage** - SQLite-based storage with automatic saving and debounced writes
- **Dual platform support** - Web app and macOS Electron desktop app
- **Secure API key storage** - macOS Keychain integration for desktop, localStorage for web
- **Branch management** - Open, close, collapse, and delete branches with visual indicators
- **Conversation management** - Create, delete, star, and organize multiple conversations
- **Message editing** - Edit messages with automatic truncation of subsequent messages
- **Dark/light mode** - Theme switching with system preference support
- **Compact mode** - Optional compact UI for denser information display
- **Web search integration** - Optional web search for enhanced AI responses (where supported)
- **Real-time streaming** - Streaming responses from all supported AI providers
- **Citation formatting** - Formatted citations for web search results
- **Markdown rendering** - Full markdown support with syntax highlighting for code blocks
- **Branch color coding** - Automatic color assignment for visual branch distinction
- **Model-specific features** - Automatic model selection for user message branches
- **Responsive UI** - Beautiful interface that works on various screen sizes
- **Conversation history** - Full conversation list with timestamps and quick access
- **IndexedDB migration** - Automatic migration from localStorage to IndexedDB for better performance

### Technical
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS + shadcn/ui component library
- sql.js (SQLite in WebAssembly) for data persistence
- React Query for efficient data fetching
- Electron for cross-platform desktop app
- Provider SDKs: @anthropic-ai/sdk, openai, @google/generative-ai, @ai-sdk/xai
- Vitest testing framework with React Testing Library
- ESLint for code quality

### Security
- Context isolation in Electron
- No server-side data storage
- Direct API communication (no intermediaries)
- API data not used for model training
- Content Security Policy configured
- Restricted IPC channels in Electron

---

[Unreleased]: https://github.com/vmehmeri/branch-chat/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/vmehmeri/branch-chat/releases/tag/v1.0.0
