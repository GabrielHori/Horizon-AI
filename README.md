<div align="center">

# 🚀 Horizon AI

### *One interface. Multiple intelligences.*

**A modern, secure, and high-performance desktop application for unified AI model interaction**

[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-24C8D8?style=for-the-badge&logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![Rust](https://img.shields.io/badge/Rust-Latest-CE422B?style=for-the-badge&logo=rust)](https://rust-lang.org)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Supported Providers](#-supported-providers)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Security](#-security)
- [Design Philosophy](#-design-philosophy)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Horizon AI** is a cutting-edge desktop application that provides a **unified interface for interacting with multiple AI models**, both **local and cloud-based**. Built with a strong focus on **performance, modularity, security, and user control**, Horizon AI empowers you to leverage the best AI models available without being locked into a single provider.

The application is architected to be **extensible by design**, allowing seamless integration of new AI providers, models, and execution backends without disrupting the existing system.

### Why Horizon AI?

- 🔐 **Privacy-First**: Run powerful AI models entirely offline on your local machine
- 🎯 **Unified Experience**: One beautiful interface for all your AI needs
- ⚡ **High Performance**: Built with Rust (Tauri) for maximum speed and minimal resource usage
- 🧩 **Modular Design**: Easy to extend with new providers and features
- 🔒 **Secure**: Encrypted data storage and sandboxed execution
- 💎 **Beautiful UI**: Modern, responsive interface built with React and TailwindCSS

---

## ✨ Key Features

### 🧠 Multi-Provider AI Support
- **Ollama** - Local GGUF models for fast, private inference
- **AirLLM** - VRAM-optimized loading for large Hugging Face models
- **Cloud APIs** - Optional integration with Claude, OpenAI, and compatible services

### 🔁 Intelligent Provider Routing
- Dynamic provider switching based on your needs
- Unified API across all providers
- Graceful fallback handling

### 🖥️ Native Desktop Application
- Cross-platform support (Windows, macOS, Linux)
- Native performance with minimal memory footprint
- Tauri-based architecture for security and speed

### ⚙️ Granular Control
- Manual provider activation and deactivation
- Real-time status monitoring
- Resource usage visibility
- Model lifecycle management

### 📦 Comprehensive Model Management
- Browse and download models
- Version control and updates
- Model metadata and performance stats
- Easy model switching

### 💾 Persistent & Encrypted Storage
- Secure configuration management
- Encrypted chat history
- Project and memory persistence
- Custom encryption keys

### 🔒 Offline-First Architecture
- Full functionality without internet connection
- Local model execution
- Privacy-preserving design

### 🎨 Modern User Experience
- Intuitive, responsive interface
- Dark mode support
- Smooth animations and transitions
- Accessibility features

---

## 🖼️ Screenshots

### 🏠 Main Dashboard
The central hub for managing your AI interactions, with quick access to chat, models, and settings.

![Main Interface](screenshots/main-ui.png)

---

### � Provider Selection
Easily switch between different AI providers with real-time status indicators.

![Provider Selection](screenshots/providers.png)

---

### 🧠 Model Manager (AirLLM)
Browse, download, and manage your AI models with detailed information and controls.

![AirLLM Model Selection](screenshots/airllm-models.png)

---

### ⏳ Model Loading
Real-time feedback during model initialization with progress indicators.

![Model Loading](screenshots/airllm-loading.png)

---

## 🧱 Tech Stack

### Frontend Layer
- **⚛️ React 18** - Modern component-based UI framework
- **⚡ Vite** - Next-generation frontend tooling for blazing-fast development
- **🎨 TailwindCSS** - Utility-first CSS framework for rapid UI development
- **🖥️ Tauri** - Rust-based framework for building secure, lightweight desktop applications

### Backend Layer
- **🦀 Rust** - Core application logic and system integration via Tauri
- **🐍 Python 3.9+** - AI model execution sidecar for AirLLM
- **🔌 IPC Bridge** - Seamless communication between Rust and Python workers

### AI & Model Support
- **Ollama** - Local GGUF model inference engine
- **AirLLM** - Optimized Hugging Face model loader with efficient VRAM usage
- **Cloud APIs** - Integration with Claude, OpenAI, and OpenAI-compatible endpoints

### Data & Security
- **JSON Storage** - Lightweight, encrypted persistent storage
- **Cryptography** - AES encryption for sensitive data
- **Permission System** - Granular access control for system operations

---

## 🏗️ Architecture

Horizon AI follows a modular, layered architecture that separates concerns and enables easy extensibility:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Chat    │  │  Models  │  │ Settings │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Tauri IPC
┌────────────────────────┴────────────────────────────────────┐
│                   Backend (Rust/Tauri)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Command Handlers                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │  │
│  │  │   Provider  │  │   Model     │  │  Permission  │ │  │
│  │  │   Manager   │  │   Manager   │  │   Guard      │ │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘ │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │
              ┌───────────┴──────────┐
              │                      │
┌─────────────┴──────┐  ┌───────────┴──────────┐
│  Ollama Service    │  │  Python Dispatcher   │
│  (Local/HTTP)      │  │  ┌────────────────┐  │
└────────────────────┘  │  │ AirLLM Worker  │  │
                        │  └────────────────┘  │
                        └─────────────────────┘

                   ┌──────────────────┐
                   │  Encrypted Data  │
                   │   - Chat History │
                   │   - Projects     │
                   │   - Memory       │
                   │   - Config       │
                   └──────────────────┘
```

### Directory Structure

```
Horizon AI/
│
├── src/                         # Frontend React application
│   ├── components/              # Reusable UI components
│   ├── pages/                   # Page components (Dashboard, Chat, etc.)
│   ├── services/                # Frontend services (API calls)
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utility functions
│   └── styles/                  # Global styles
│
├── src-tauri/                   # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs             # Application entry point
│   │   ├── permission_commands.rs  # Permission system
│   │   ├── model_manager.rs    # Model management
│   │   └── ...                 # Other Rust modules
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
│
├── python_dispatcher/           # Python sidecar
│   ├── dispatcher.py           # Main dispatcher
│   ├── services/
│   │   ├── ollama_service.py   # Ollama integration
│   │   ├── airllm_service.py   # AirLLM integration
│   │   ├── chat_history_service.py
│   │   ├── memory_service.py
│   │   └── project_service.py
│   └── helpers/
│       └── file_storage_helper.py  # Encrypted file operations
│
├── screenshots/                 # Application screenshots
│
└── README.md                   # This file
```

---

## 🧠 Supported Providers

### ✅ Ollama (Local GGUF Models)

**Best for**: Day-to-day AI tasks, privacy-focused usage, fast responses

- ✨ **Fast Startup** - Models load in seconds
- 🔒 **100% Offline** - No internet required
- ⚡ **Low Latency** - Near-instant responses
- 💪 **Wide Model Support** - Llama, Mistral, Phi, and more
- 🎯 **Easy Setup** - Install Ollama and you're ready

**Supported Models**: Any GGUF model compatible with Ollama

---

### ✅ AirLLM (Optimized Hugging Face Models)

**Best for**: Running large models with limited VRAM, experimental models

- 🧠 **VRAM-Efficient** - Load models larger than your GPU memory
- 🎛️ **Manual Control** - Start/stop on demand
- 📊 **Resource Monitoring** - Real-time VRAM and RAM usage
- 🔐 **GPU Safety** - Single-instance execution prevents conflicts
- 🎨 **Model Selection UI** - Browse and select from Hugging Face

**Supported Models**: Most Hugging Face transformer models

---

### ☁️ Cloud Providers (Optional)

**Best for**: Access to cutting-edge models, no local hardware required

- 🌐 **Claude** - Anthropic's powerful language models
- 🤖 **OpenAI** - GPT models via official API
- 🔌 **OpenAI-Compatible** - Any service with OpenAI-compatible endpoints

**Note**: Requires API keys and internet connection

---

## ⚙️ Provider Lifecycle

Each provider in Horizon AI follows a well-defined lifecycle for predictable behavior and resource management:

### States

- `OFF` - Provider is disabled and not using resources
- `LOADING` - Provider is initializing or loading a model
- `READY` - Provider is active and ready to process requests
- `ERROR` - Provider encountered an issue

### Operations

- **Enable/Disable** - Control whether a provider is available
- **Load/Unload** - Manage resource allocation
- **Select** - Choose which provider handles requests
- **Monitor** - View status and resource usage in real-time

### State Transitions

```
OFF → [User enables] → LOADING → [Success] → READY
                               → [Failure] → ERROR

READY → [User disables] → OFF
READY → [Error occurs] → ERROR
ERROR → [User retries] → LOADING
```

---

## � Getting Started

### Prerequisites

Before installing Horizon AI, ensure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Rust** (latest stable) - [Install](https://rustup.rs/)
- **Python 3.9+** - [Download](https://python.org/)
- **Ollama** (for local models) - [Install](https://ollama.ai/)
- **CUDA-compatible GPU** (recommended for AirLLM, optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GabrielHori/Horizon-AI.git
   cd Horizon-AI
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Tauri**
   
   The Tauri configuration is located in `src-tauri/tauri.conf.json`. Review and adjust settings as needed.

### Development

Run the application in development mode with hot-reload:

```bash
npm run dev
```

This will:
- Start the Vite development server for the React frontend
- Launch the Tauri application window
- Enable hot-module replacement for rapid development

### Building for Production

Create optimized production builds:

```bash
# Build for your current platform
npm run build

# The executable will be in src-tauri/target/release/
```

For platform-specific builds:

```bash
# Windows
npm run build -- --target x86_64-pc-windows-msvc

# macOS
npm run build -- --target x86_64-apple-darwin

# Linux
npm run build -- --target x86_64-unknown-linux-gnu
```

---

## 🔧 Configuration

### Application Settings

Configuration is stored in encrypted JSON files within the application data directory:

- **Windows**: `%APPDATA%\horizon-ai\`
- **macOS**: `~/Library/Application Support/horizon-ai/`
- **Linux**: `~/.config/horizon-ai/`

### Environment Variables

Create a `.env` file in the project root for optional settings:

```env
# Python Dispatcher
PYTHON_DISPATCHER_PORT=8000

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434

# Optional: Cloud API Keys
CLAUDE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### Encryption

Horizon AI uses AES encryption for sensitive data. On first launch, you'll be prompted to set an encryption password. This password is used to:

- Encrypt chat history
- Protect project data
- Secure memory storage
- Safeguard configuration

**Important**: Keep your encryption password safe. Data cannot be recovered without it.

---

## � Security

Horizon AI is built with security as a core principle:

### Data Protection
- 🔐 **AES Encryption** - All sensitive data encrypted at rest
- 🔑 **Unique Salt** - Each installation uses a unique cryptographic salt
- 🛡️ **Sandboxed Execution** - Tauri's security model isolates the application

### Permission System
- ✅ **Granular Controls** - Fine-grained permissions for file access and system operations
- 🚫 **Least Privilege** - Only request necessary permissions
- 📝 **Audit Trail** - Track permission requests and grants

### Content Security Policy (CSP)
- 🌐 **Strict CSP** - Prevents XSS and injection attacks
- 🔒 **HTTPS Only** - Secure external communications

### Best Practices
- 🔄 **Regular Updates** - Keep dependencies up to date
- 🧪 **Code Reviews** - All changes reviewed for security implications
- 📊 **Static Analysis** - Automated security scanning

---

## 🧠 Design Philosophy

Horizon AI is built on core principles that guide every design decision:

### 🎯 Explicit User Control
- No surprises or hidden behavior
- Clear, actionable controls for all operations
- User decides when and how resources are used

### 🚫 No Forced Providers
- Mix and match providers based on your needs
- No vendor lock-in
- Freedom to go fully offline or cloud-based

### 🔍 Transparency
- No hidden background services
- Visible resource usage
- Clear status indicators

### 📊 Clear Model Lifecycle
- Predictable state management
- Obvious transitions
- Error states clearly communicated

### 🧩 Clean Architecture
- Separation of concerns
- Modular design
- Loose coupling, high cohesion

### 🔌 Extensibility
- Add new providers without refactoring
- Plugin-ready architecture (coming soon)
- Well-documented APIs for integration

---

## 🛣️ Roadmap

### Version 2.1.0 (In Progress)
- [ ] 💬 Streaming responses for real-time feedback
- [ ] 🎨 Visual Prompt Builder UI
- [ ] 🚀 Performance optimizations
- [ ] 🧪 Comprehensive E2E tests

### Version 2.2.0 (Planned)
- [ ] 🔀 Advanced routing rules (fallback chains, load balancing)
- [ ] 🧠 Long-term conversation memory
- [ ] 📊 Model benchmarking and comparison tools
- [ ] 🎭 Multiple personas/agents

### Version 3.0.0 (Future)
- [ ] 🔌 Plugin system for community extensions
- [ ] 🌍 Multi-language support (UI localization)
- [ ] 📱 Mobile companion app
- [ ] 🤝 Collaborative features (shared chats, team workspaces)

### Additional Providers (Ongoing)
- [ ] Google Gemini integration
- [ ] Cohere support
- [ ] Local Stable Diffusion for image generation
- [ ] Whisper for speech-to-text

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages** (`git commit -m 'Add amazing feature'`)
6. **Push to your fork** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Guidelines

- ✅ **Keep changes modular** - One feature/fix per PR
- 🔒 **Don't break existing providers** - Ensure backwards compatibility
- 📁 **Follow project structure** - Place files in appropriate directories
- 📝 **Document new features** - Update README and add inline comments
- 🧪 **Add tests** - Include unit and integration tests for new code
- 🎨 **Match code style** - Use existing formatting conventions

### Reporting Issues

Found a bug or have a feature request? Please open an issue:

1. Check existing issues to avoid duplicates
2. Use a clear, descriptive title
3. Provide detailed reproduction steps (for bugs)
4. Include system information (OS, Node version, etc.)
5. Add screenshots if applicable

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🧑‍💻 Author

**Gabriel (Horizon)**

- GitHub: [@GabrielHori](https://github.com/GabrielHori)
- Project: [Horizon AI](https://github.com/GabrielHori/Horizon-AI)

---

## 🙏 Acknowledgments

Special thanks to:

- **Tauri Team** - For the amazing desktop framework
- **Ollama** - For making local AI accessible
- **Hugging Face** - For the incredible model ecosystem
- **Open Source Community** - For all the amazing tools and libraries

---

<div align="center">

### 🌟 Star this repo if you find it useful!

**Horizon AI** — *One interface. Multiple intelligences.*

Made with ❤️ and ☕

</div>
