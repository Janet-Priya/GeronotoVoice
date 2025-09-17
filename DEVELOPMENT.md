# GerontoVoice Development Guide

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- Ollama (for AI models)
- Git

### Quick Start
```bash
# Clone repository
git clone <your-repo-url>
cd geronto-voice

# Run setup script
./setup.sh  # Linux/Mac
# or
setup.bat   # Windows

# Start services
ollama serve
cd backend && python start_server.py
npm run dev
```

## 🏗️ Project Structure

```
geronto-voice/
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
├── .gitignore            # Git ignore rules
├── .gitattributes        # Git file handling
└── README.md            # Main documentation
```

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

### Setup Verification
```bash
python backend/test_setup.py
```

## 🔧 Development Commands

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend
```bash
cd backend
python start_server.py    # Start with auto-setup
python server/app.py       # Start server directly
python test_setup.py       # Verify setup
pytest tests/              # Run tests
```

## 📝 Code Style

### Frontend (React/TypeScript)
- ESLint configuration in `eslint.config.js`
- Prettier for code formatting
- TypeScript strict mode enabled
- Component-based architecture

### Backend (Python)
- PEP 8 style guidelines
- Type hints for all functions
- Comprehensive docstrings
- Black code formatting (optional)

## 🚀 Deployment

### Local Development
1. Start Ollama: `ollama serve`
2. Start Backend: `cd backend && python start_server.py`
3. Start Frontend: `npm run dev`

### Production Build
```bash
# Build frontend
npm run build

# Deploy backend
cd backend
gunicorn server.app:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 🐛 Debugging

### Common Issues

#### Ollama Connection Failed
```bash
# Check Ollama status
ollama list
ollama serve
```

#### Backend API Not Responding
```bash
# Check health
curl http://localhost:8000/health

# Check logs
tail -f backend/logs/geronto_voice.log
```

#### Frontend Build Errors
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
```

## 📊 Monitoring

### Health Checks
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000/health`
- API Docs: `http://localhost:8000/docs`

### Logs
- Backend logs: `backend/logs/`
- Browser console: F12 Developer Tools
- Network requests: Browser Network tab

## 🤝 Contributing

### Git Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Create pull request

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] TypeScript types defined

## 🔒 Security

### Data Privacy
- No personal data collection
- Local processing only
- No cloud dependencies
- GDPR compliant

### Security Best Practices
- Input validation on all endpoints
- SQL injection protection
- CORS configuration
- Secure error messages

## 📚 Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Ollama Documentation](https://ollama.ai/docs)

### Tools
- [VS Code](https://code.visualstudio.com/) - Recommended IDE
- [Postman](https://www.postman.com/) - API testing
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools) - Frontend debugging

## 🆘 Support

### Getting Help
1. Check this development guide
2. Review README.md
3. Check existing issues
4. Run test setup script
5. Create detailed issue report

### Issue Template
```markdown
**Bug Description**
Clear description of the issue

**Steps to Reproduce**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: Windows/Mac/Linux
- Node.js version:
- Python version:
- Browser: Chrome/Firefox/Safari

**Additional Context**
Any other relevant information
```
