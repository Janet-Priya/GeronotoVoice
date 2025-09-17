#!/bin/bash

# GerontoVoice Setup Script
echo "🚀 Setting up GerontoVoice..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install Ollama first:"
    echo "   curl -fsSL https://ollama.ai/install.sh | sh"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# Pull Mistral model
echo "🧠 Pulling Mistral model..."
ollama pull mistral

echo "🎉 Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "1. Start Ollama: ollama serve"
echo "2. Start backend: cd backend && python start_server.py"
echo "3. Start frontend: npm run dev"
echo "4. Open: http://localhost:5173"
echo ""
echo "🧪 To test setup: python backend/test_setup.py"
