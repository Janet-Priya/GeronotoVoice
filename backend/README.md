# GerontoVoice Backend

A comprehensive Python backend for the GerontoVoice AI caregiver training platform, featuring local AI simulations, conversational flows, skill analysis, and progress tracking.

## 🏗️ Architecture

The backend is built with a modular architecture using free, open-source tools:

```
backend/
├── core_ai/           # Ollama integration for AI personas
│   └── agent.py       # Mistral model integration with hallucination resistance
├── dialogue/          # Rasa NLU for conversational flows
│   └── rasa_flows.py  # Intent recognition and empathetic responses
├── feedback/          # Scikit-learn skill analysis
│   └── analyzer.py    # ML-based caregiver skill assessment
├── database/          # SQLite data persistence
│   └── db.py          # Session management and progress tracking
├── server/            # FastAPI web server
│   └── app.py         # REST API endpoints
├── tests/             # Comprehensive test suite
│   ├── test_agent.py
│   └── test_database.py
└── requirements.txt   # Python dependencies
```

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+**
2. **Ollama** - Local AI model server
3. **Modern Browser** - For Web Speech API support

### Installation

1. **Clone and navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install and setup Ollama:**
   ```bash
   # Install Ollama (macOS/Linux)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Or download from https://ollama.ai/
   
   # Pull Mistral model
   ollama pull mistral
   
   # Start Ollama service
   ollama serve
   ```

4. **Start the backend server:**
   ```bash
   python server/app.py
   ```

5. **Verify installation:**
   ```bash
   curl http://localhost:8000/health
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_PATH=geronto_voice.db

# Ollama Configuration
OLLAMA_MODEL=mistral
OLLAMA_HOST=http://localhost:11434

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Ollama Model Configuration

The system uses Mistral by default, but you can configure other models:

```python
# In core_ai/agent.py
agent = GerontoVoiceAgent(model_name="llama2")  # or other model
```

## 📚 API Documentation

### Core Endpoints

#### Health Check
```http
GET /health
```
Returns service status and health information.

#### Offline Mode Info
```http
GET /offline
```
Provides offline capabilities and setup instructions.

#### User Management
```http
POST /users
{
  "user_id": "string",
  "name": "string", 
  "email": "string"
}

GET /users/{user_id}
```

#### AI Simulation
```http
POST /simulate
{
  "user_id": "string",
  "persona_id": "margaret|robert|eleanor",
  "user_input": "string",
  "conversation_history": [...]
}
```

#### Skill Analysis
```http
POST /feedback
{
  "session_id": "string",
  "conversation_data": [...]
}
```

#### Progress Tracking
```http
GET /progress/{user_id}
GET /export/{user_id}
```

### Interactive API Documentation

Visit `http://localhost:8000/docs` for interactive Swagger documentation.

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
Four core caregiver skills are analyzed:
- **Empathy**: Understanding and sharing feelings
- **Active Listening**: Fully concentrating and responding
- **Clear Communication**: Using appropriate language
- **Patience**: Maintaining calm during difficult situations

## 📊 Data Management

### SQLite Database Schema

```sql
-- Users table
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_sessions INTEGER DEFAULT 0,
    average_score REAL DEFAULT 0.0
);

-- Sessions table  
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    persona_id TEXT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    conversation_data TEXT,  -- JSON
    skill_scores TEXT,       -- JSON
    total_score REAL DEFAULT 0.0,
    status TEXT DEFAULT 'active'
);

-- Skill progress table
CREATE TABLE skill_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    current_score REAL NOT NULL,
    improvement_trend REAL DEFAULT 0.0,
    sessions_practiced INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements table
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 0
);
```

### Data Export
- **JSON Export**: Complete user data export via API
- **CSV Export**: Structured data for analysis
- **Progress Charts**: Visual progress tracking with Plotly

## 🧪 Testing

### Run Tests
```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_agent.py

# Run with coverage
pytest --cov=. tests/
```

### Test Coverage
- **AI Agent**: Response generation, emotion analysis, persona management
- **Database**: CRUD operations, data integrity, export functionality
- **API Endpoints**: Request/response validation, error handling
- **Skill Analysis**: ML model accuracy, feedback generation

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

## 🚀 Deployment

### Local Development
```bash
# Start Ollama
ollama serve

# Start backend
python server/app.py

# Access API
curl http://localhost:8000/health
```

### Production Deployment
```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn server.app:app -w 4 -k uvicorn.workers.UvicornWorker

# Or with Docker
docker build -t geronto-voice-backend .
docker run -p 8000:8000 geronto-voice-backend
```

### Docker Support
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "server/app.py"]
```

## 🔧 Troubleshooting

### Common Issues

#### Ollama Connection Failed
```bash
# Check Ollama status
ollama list

# Restart Ollama
ollama serve

# Verify model exists
ollama pull mistral
```

#### Database Errors
```bash
# Check database file permissions
ls -la geronto_voice.db

# Reset database
rm geronto_voice.db
python -c "from database.db import GerontoVoiceDatabase; GerontoVoiceDatabase()"
```

#### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
python server/app.py --port 8001
```

### Performance Optimization

#### Database Optimization
- **Indexes**: Automatic indexing on frequently queried columns
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized SQL queries for better performance

#### AI Model Optimization
- **Model Caching**: Ollama model stays loaded in memory
- **Response Caching**: Frequently used responses cached
- **Batch Processing**: Multiple requests processed efficiently

## 📈 Monitoring

### Health Checks
- **Service Status**: Real-time service health monitoring
- **Database Health**: Connection and query performance
- **AI Model Status**: Ollama service availability
- **Memory Usage**: Resource utilization tracking

### Logging
```python
# Configure logging level
import logging
logging.basicConfig(level=logging.INFO)

# View logs
tail -f logs/geronto_voice.log
```

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd geronto-voice/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest black flake8 mypy

# Run tests
pytest tests/

# Format code
black .

# Lint code
flake8 .
```

### Code Style
- **PEP 8**: Python code style guidelines
- **Type Hints**: Full type annotation coverage
- **Docstrings**: Comprehensive documentation
- **Error Handling**: Robust error management

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team**: For providing excellent local AI model serving
- **Rasa Team**: For conversational AI framework
- **Scikit-learn Team**: For machine learning capabilities
- **FastAPI Team**: For modern Python web framework
- **NIH**: For medical symptom validation data

## 📞 Support

For questions, issues, or contributions:

1. **Check Documentation**: Review this README and API docs
2. **Run Tests**: Ensure all tests pass
3. **Check Logs**: Review error logs for debugging
4. **Open Issue**: Create detailed issue reports
5. **Community**: Join discussions and contribute

---

**GerontoVoice Backend** - Empowering caregivers through AI-powered training simulations.
