#!/usr/bin/env python3
"""
Simple startup script for GerontoVoice backend
"""

import os
import sys
import uvicorn

# Add backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# Change to backend directory
os.chdir(backend_dir)

# Import and run the app
from server.app import app

if __name__ == "__main__":
    print("🚀 Starting GerontoVoice Backend Server...")
    print("📍 Backend will be available at: http://localhost:8001")
    print("📖 API docs will be available at: http://localhost:8001/docs")
    print("🛑 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )
