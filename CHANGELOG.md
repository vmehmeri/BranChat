# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-08

Initial release of BranChat.

### Added

- **Conversation Branching** - Fork conversations at any message to explore different directions without polluting the main thread
- **Multi-Model Support** - Chat with models from OpenAI, Anthropic, Google AI, and xAI in one unified interface
- **Model Switching** - Change models on the fly for the main conversation or individual branches
- **Rich Attachments** - Support for images and documents (PDF, Markdown, Plain Text)
- **Web Search** - Integrated web search capability for up-to-date information
- **Local Persistence** - All conversations stored locally using SQLite (sql.js WebAssembly)
- **Dark/Light Mode** - Theme switching with system preference detection
- **Mac Desktop App** - Electron-based native app with secure Keychain storage for API keys
- **Web Version** - Browser-based version with localStorage for settings and data
- **Privacy-First Design** - No telemetry, no cloud sync, direct API calls only
