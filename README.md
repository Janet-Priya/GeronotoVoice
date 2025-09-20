# GerontoVoice - AI Caregiver Training Platform

A comprehensive voice-first AI platform designed to help family caregivers practice empathetic communication with elderly individuals through realistic AI-powered simulations.

## 🌟 Features

### Frontend (React + TypeScript)
- **Voice-First Interface**: Built on Web Speech API for natural STT/TTS interactions
- **Empathetic AI Personas**: Practice with realistic elderly characters facing common challenges
- **Skills Assessment**: Receive personalized feedback on empathy, communication, and care techniques
- **Mobile-Optimized**: Responsive design optimized for smartphones and tablets
- **Accessibility-First**: Large buttons, clear typography, and voice-driven navigation
- **Multi-Language Support**: Available in 8 languages including English, Spanish, French, and Chinese
- **Offline-Ready**: Local storage and progressive web app capabilities
- **Privacy-Focused**: No data collection, all processing happens locally
- **Premium UX**: Glassmorphism design, floating animations, confetti celebrations
- **Gamification**: Achievement system, progress tracking, skill meters with Chart.js
- **Real-time Feedback**: Voice wave animations, confidence scoring, emotion detection

### Backend (Python + FastAPI)
- **Local AI Integration**: Ollama with Mistral model for realistic elderly persona simulations
- **Conversational AI**: Rasa NLU for intent recognition and empathetic response generation
- **ML-Powered Analysis**: Scikit-learn for caregiver skill assessment and feedback
- **Local Data Storage**: SQLite database for session management and progress tracking
- **RESTful API**: FastAPI server with comprehensive endpoints
- **Hallucination Resistance**: NIH symptom anchoring to prevent AI medical misinformation
- **Offline Capable**: No cloud dependencies, runs entirely locally

## 🏗️ Architecture

```
GerontoVoice/
├── src/                    # React Frontend
│   ├── components/         # UI Components
│   ├── services/           # API Integration
│   ├── types/             # TypeScript Definitions
│   └── utils/             # Utilities
├── backend/               # Python Backend
│   ├── core_ai/          # Ollama Integration
│   ├── dialogue/         # Rasa NLU
│   ├── feedback/         # Skill Analysis
│   ├── database/         # SQLite Management
│   ├── server/           # FastAPI Server
│   └── tests/            # Test Suite
└── docs/                 # Documentation
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** - For React frontend
2. **Python 3.8+** - For Python backend
3. **Ollama** - Local AI model server
4. **Modern Browser** - Chrome/Edge recommended for Web Speech API

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd geronto-voice
   ```

2. **Setup Frontend:**
   ```bash
   # Install dependencies
   npm install
   
   # Install additional dependencies for enhanced features
   npm install chart.js react-chartjs-2 react-confetti react-audio-analyser framer-motion react-hot-toast
   
   # Start development server
   npm run dev
   ```

3. **Setup Backend:**
   ```bash
   cd backend
   
   # Install Python dependencies
   pip install -r requirements.txt
   
   # Install and setup Ollama
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama pull mistral
   ollama serve
   
   # Start backend server
   python start_server.py
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🤖 AI Personas

### Margaret (78) - Mild Dementia
- **Condition**: Memory concerns and cognitive decline
- **Personality**: Gentle, sometimes confused, formerly independent
- **Training Focus**: Redirection techniques, maintaining dignity, building trust
- **NIH Symptoms**: Memory loss, confusion with time/place, trouble with familiar tasks

### Robert (72) - Diabetes Management
- **Condition**: Type 2 Diabetes
- **Personality**: Stubborn, independent, worried about burden
- **Training Focus**: Medication compliance, dietary discussions, addressing fears
- **NIH Symptoms**: Increased thirst/urination, fatigue, blurred vision

### Eleanor (83) - Mobility Issues
- **Condition**: Mobility challenges requiring walking aids
- **Personality**: Proud, safety-conscious, socially active
- **Training Focus**: Safe mobility practices, confidence building, social connections
- **NIH Symptoms**: Difficulty walking, muscle weakness, fear of falling

## 🧠 AI Features

### Hallucination Resistance
- **NIH Symptom Anchoring**: AI responses are anchored to validated medical symptoms
- **Contextual Constraints**: Responses stay within defined persona characteristics
- **Medical Accuracy**: Prevents AI from generating unvalidated medical information

### Intent Recognition
The system recognizes 8 caregiver-specific intents:
- `ask_medication` - Medication compliance questions
- `offer_help` - Offering assistance
- `check_wellbeing` - Checking on elderly person's health
- `provide_comfort` - Emotional support and comfort
- `redirect_conversation` - Redirecting from difficult topics
- `encourage_activity` - Encouraging physical activity
- `address_concerns` - Addressing worries and concerns
- `general_greeting` - General conversation starters

### Skill Analysis
Four core caregiver skills are analyzed using scikit-learn:
- **Empathy**: Understanding and sharing feelings
- **Active Listening**: Fully concentrating and responding
- **Clear Communication**: Using appropriate language
- **Patience**: Maintaining calm during difficult situations

## 📊 Data Management

### Local Storage
- **SQLite Database**: Local data persistence with no cloud dependencies
- **Session Management**: Complete conversation history and analysis
- **Progress Tracking**: Skill improvement over time
- **Achievement System**: Unlockable milestones and progress indicators

### Data Export
- **JSON Export**: Complete user data export via API
- **CSV Export**: Structured data for analysis
- **Progress Charts**: Visual progress tracking with Plotly

## 🔒 Privacy & Security

### Data Privacy
- **Local Processing**: All AI processing happens locally
- **No Cloud Dependencies**: No data sent to external services
- **SQLite Storage**: Local database with no network access
- **GDPR Compliant**: No personal data collection or transmission

### Security Features
- **Input Validation**: All API inputs are validated
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin access
- **Error Handling**: Secure error messages without sensitive data

## 🧪 Testing

### Frontend Tests
```bash
npm test
npm run test:coverage
```

### Backend Tests
```bash
cd backend
pytest tests/
pytest --cov=. tests/
```

## 🚀 Deployment

### Local Development
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Backend
cd backend
python start_server.py

# Terminal 3: Start Frontend
npm run dev
```

### Production Deployment
```bash
# Build frontend
npm run build

# Deploy backend
cd backend
gunicorn server.app:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 🔧 Configuration

### Environment Variables

Create configuration files:

**Frontend (.env):**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=GerontoVoice
```

**Backend (config.env):**
```env
DATABASE_PATH=geronto_voice.db
OLLAMA_MODEL=mistral
OLLAMA_HOST=http://localhost:11434
HOST=0.0.0.0
PORT=8000
```

## 📚 API Documentation

### Core Endpoints

- `GET /health` - Service health check
- `GET /offline` - Offline capabilities info
- `POST /simulate` - AI conversation simulation
- `POST /feedback` - Skill analysis
- `GET /progress/{user_id}` - User progress tracking
- `GET /personas` - Available AI personas
- `GET /export/{user_id}` - Data export

### Interactive Documentation
Visit `http://localhost:8000/docs` for complete API documentation.

## 🎯 Use Cases

### Family Caregivers
- Practice difficult conversations before they happen
- Learn empathetic communication techniques
- Build confidence in caregiving situations
- Track skill improvement over time

### Healthcare Professionals
- Train staff in elderly communication
- Assess caregiver communication skills
- Provide evidence-based feedback
- Monitor training effectiveness

### Educational Institutions
- Gerontology and nursing programs
- Communication skills training
- Simulation-based learning
- Assessment and evaluation tools

## 🔧 Troubleshooting

### Common Issues

#### Web Speech API Not Working
- Use Chrome or Edge browser
- Ensure microphone permissions are granted
- Check HTTPS requirement for production

#### Ollama Connection Failed
```bash
# Check Ollama status
ollama list

# Restart Ollama
ollama serve

# Verify model exists
ollama pull mistral
```

#### Backend API Not Responding
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check logs
tail -f backend/logs/geronto_voice.log
```

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd geronto-voice

# Setup frontend
npm install

# Setup backend
cd backend
pip install -r requirements.txt
pip install pytest black flake8 mypy

# Run tests
npm test
pytest tests/
```

### Code Style
- **Frontend**: ESLint + Prettier
- **Backend**: Black + Flake8 + MyPy
- **Type Safety**: Full TypeScript and Python type hints
- **Documentation**: Comprehensive docstrings and comments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team**: For providing excellent local AI model serving
- **Rasa Team**: For conversational AI framework
- **Scikit-learn Team**: For machine learning capabilities
- **FastAPI Team**: For modern Python web framework
- **NIH**: For medical symptom validation data
- **React Team**: For the frontend framework
- **Tailwind CSS**: For the styling system

## 📞 Support

For questions, issues, or contributions:

1. **Check Documentation**: Review README files and API docs
2. **Run Tests**: Ensure all tests pass
3. **Check Logs**: Review error logs for debugging
4. **Open Issue**: Create detailed issue reports
5. **Community**: Join discussions and contribute

## 🌟 Future Enhancements

- **Additional Personas**: More elderly characters with different conditions
- **Advanced Analytics**: Detailed performance metrics and insights
- **Multi-User Support**: Family and professional caregiver accounts
- **Integration APIs**: Connect with healthcare systems
- **Mobile Apps**: Native iOS and Android applications
- **AR/VR Integration**: Immersive training experiences
- **Advanced AI**: Integration with larger language models
- **Real-time Collaboration**: Multi-user training sessions

---

**GerontoVoice** - Empowering caregivers through AI-powered training simulations.

*Built with ❤️ for the global community of 53+ million family caregivers*