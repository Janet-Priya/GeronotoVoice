#!/usr/bin/env python3
"""
GerontoVoice Backend Startup Script
Handles service initialization and health checks
"""

import os
import sys
import time
import subprocess
import requests
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GerontoVoiceBackend:
    """Backend service manager"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.ollama_url = "http://localhost:11434"
        self.backend_url = "http://localhost:8000"
        self.ollama_process = None
        self.backend_process = None
    
    def check_ollama_installed(self) -> bool:
        """Check if Ollama is installed"""
        try:
            result = subprocess.run(['ollama', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def check_mistral_model(self) -> bool:
        """Check if Mistral model is available"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                return any('mistral' in model.get('name', '') for model in models)
            return False
        except requests.RequestException:
            return False
    
    def start_ollama(self) -> bool:
        """Start Ollama service"""
        try:
            logger.info("Starting Ollama service...")
            self.ollama_process = subprocess.Popen(
                ['ollama', 'serve'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for Ollama to start
            for i in range(30):  # 30 second timeout
                try:
                    response = requests.get(f"{self.ollama_url}/api/tags", timeout=2)
                    if response.status_code == 200:
                        logger.info("Ollama service started successfully")
                        return True
                except requests.RequestException:
                    pass
                time.sleep(1)
            
            logger.error("Ollama service failed to start")
            return False
            
        except Exception as e:
            logger.error(f"Error starting Ollama: {e}")
            return False
    
    def pull_mistral_model(self) -> bool:
        """Pull Mistral model if not available"""
        try:
            logger.info("Pulling Mistral model...")
            result = subprocess.run(
                ['ollama', 'pull', 'mistral'],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                logger.info("Mistral model pulled successfully")
                return True
            else:
                logger.error(f"Failed to pull Mistral model: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("Timeout pulling Mistral model")
            return False
        except Exception as e:
            logger.error(f"Error pulling Mistral model: {e}")
            return False
    
    def install_dependencies(self) -> bool:
        """Install Python dependencies"""
        try:
            logger.info("Installing Python dependencies...")
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'],
                cwd=self.backend_dir,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("Dependencies installed successfully")
                return True
            else:
                logger.error(f"Failed to install dependencies: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error installing dependencies: {e}")
            return False
    
    def start_backend(self) -> bool:
        """Start FastAPI backend server"""
        try:
            logger.info("Starting FastAPI backend server...")
            self.backend_process = subprocess.Popen(
                [sys.executable, 'server/app.py'],
                cwd=self.backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for backend to start
            for i in range(30):  # 30 second timeout
                try:
                    response = requests.get(f"{self.backend_url}/health", timeout=2)
                    if response.status_code == 200:
                        logger.info("Backend server started successfully")
                        return True
                except requests.RequestException:
                    pass
                time.sleep(1)
            
            logger.error("Backend server failed to start")
            return False
            
        except Exception as e:
            logger.error(f"Error starting backend server: {e}")
            return False
    
    def check_services(self) -> dict:
        """Check status of all services"""
        status = {
            'ollama_installed': self.check_ollama_installed(),
            'ollama_running': False,
            'mistral_model': False,
            'backend_running': False,
            'dependencies_installed': False
        }
        
        # Check Ollama service
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=2)
            status['ollama_running'] = response.status_code == 200
        except requests.RequestException:
            pass
        
        # Check Mistral model
        if status['ollama_running']:
            status['mistral_model'] = self.check_mistral_model()
        
        # Check backend service
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=2)
            status['backend_running'] = response.status_code == 200
        except requests.RequestException:
            pass
        
        # Check dependencies
        try:
            import fastapi, ollama, sklearn, pandas
            status['dependencies_installed'] = True
        except ImportError:
            pass
        
        return status
    
    def setup_services(self) -> bool:
        """Setup all required services"""
        logger.info("Setting up GerontoVoice Backend services...")
        
        # Check current status
        status = self.check_services()
        logger.info(f"Service status: {status}")
        
        # Install dependencies if needed
        if not status['dependencies_installed']:
            if not self.install_dependencies():
                return False
        
        # Check Ollama installation
        if not status['ollama_installed']:
            logger.error("Ollama is not installed. Please install Ollama first:")
            logger.error("  macOS/Linux: curl -fsSL https://ollama.ai/install.sh | sh")
            logger.error("  Windows: Download from https://ollama.ai/")
            return False
        
        # Start Ollama if not running
        if not status['ollama_running']:
            if not self.start_ollama():
                return False
        
        # Pull Mistral model if not available
        if not status['mistral_model']:
            if not self.pull_mistral_model():
                return False
        
        # Start backend if not running
        if not status['backend_running']:
            if not self.start_backend():
                return False
        
        logger.info("All services are running successfully!")
        logger.info(f"Backend API: {self.backend_url}")
        logger.info(f"API Documentation: {self.backend_url}/docs")
        logger.info(f"Health Check: {self.backend_url}/health")
        
        return True
    
    def stop_services(self):
        """Stop all services"""
        logger.info("Stopping services...")
        
        if self.backend_process:
            self.backend_process.terminate()
            self.backend_process.wait()
            logger.info("Backend server stopped")
        
        if self.ollama_process:
            self.ollama_process.terminate()
            self.ollama_process.wait()
            logger.info("Ollama service stopped")
    
    def run(self):
        """Main run method"""
        try:
            if not self.setup_services():
                logger.error("Failed to setup services")
                return False
            
            logger.info("GerontoVoice Backend is running!")
            logger.info("Press Ctrl+C to stop...")
            
            # Keep running until interrupted
            while True:
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("Shutdown requested...")
            self.stop_services()
            return True
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            self.stop_services()
            return False

def main():
    """Main entry point"""
    backend = GerontoVoiceBackend()
    success = backend.run()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
