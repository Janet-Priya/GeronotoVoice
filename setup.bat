@echo off
REM GerontoVoice Setup Script for Windows

echo 🚀 Setting up GerontoVoice...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if Ollama is installed
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama is not installed. Please install Ollama first:
    echo    Download from https://ollama.ai/
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

REM Pull Mistral model
echo 🧠 Pulling Mistral model...
ollama pull mistral

echo 🎉 Setup complete!
echo.
echo 🚀 To start the application:
echo 1. Start Ollama: ollama serve
echo 2. Start backend: cd backend ^&^& python start_server.py
echo 3. Start frontend: npm run dev
echo 4. Open: http://localhost:5173
echo.
echo 🧪 To test setup: python backend/test_setup.py
pause
