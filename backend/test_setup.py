#!/usr/bin/env python3
"""
GerontoVoice Backend Setup Test
Verifies that all components are properly installed and configured
"""

import sys
import os
import importlib
import requests
import subprocess
from pathlib import Path

def test_python_version():
    """Test Python version compatibility"""
    print("🐍 Testing Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - Compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Requires Python 3.8+")
        return False

def test_dependencies():
    """Test required Python packages"""
    print("\n📦 Testing Python dependencies...")
    required_packages = [
        'fastapi', 'uvicorn', 'ollama', 'pandas', 'numpy', 
        'scikit-learn', 'sqlite3', 'pydantic', 'matplotlib', 'seaborn', 'plotly'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            if package == 'sqlite3':
                import sqlite3
            else:
                importlib.import_module(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - Not installed")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n💡 Install missing packages: pip install {' '.join(missing_packages)}")
        return False
    
    return True

def test_ollama_installation():
    """Test Ollama installation"""
    print("\n🤖 Testing Ollama installation...")
    try:
        result = subprocess.run(['ollama', '--version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print(f"✅ Ollama installed: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ Ollama not working: {result.stderr}")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("❌ Ollama not found - Install from https://ollama.ai/")
        return False

def test_ollama_service():
    """Test Ollama service"""
    print("\n🔧 Testing Ollama service...")
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            print("✅ Ollama service running")
            return True
        else:
            print(f"❌ Ollama service not responding: {response.status_code}")
            return False
    except requests.RequestException:
        print("❌ Ollama service not running - Start with: ollama serve")
        return False

def test_mistral_model():
    """Test Mistral model availability"""
    print("\n🧠 Testing Mistral model...")
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            mistral_models = [m for m in models if 'mistral' in m.get('name', '')]
            if mistral_models:
                print(f"✅ Mistral model available: {mistral_models[0]['name']}")
                return True
            else:
                print("❌ Mistral model not found - Install with: ollama pull mistral")
                return False
        else:
            print("❌ Cannot check models")
            return False
    except requests.RequestException:
        print("❌ Cannot connect to Ollama")
        return False

def test_backend_modules():
    """Test backend module imports"""
    print("\n🔧 Testing backend modules...")
    
    # Add backend to path
    backend_dir = Path(__file__).parent
    sys.path.insert(0, str(backend_dir))
    
    modules_to_test = [
        'core_ai.agent',
        'dialogue.rasa_flows', 
        'feedback.analyzer',
        'database.db',
        'server.app'
    ]
    
    failed_modules = []
    for module in modules_to_test:
        try:
            importlib.import_module(module)
            print(f"✅ {module}")
        except ImportError as e:
            print(f"❌ {module}: {e}")
            failed_modules.append(module)
    
    if failed_modules:
        print(f"\n💡 Fix import issues in: {', '.join(failed_modules)}")
        return False
    
    return True

def test_database_creation():
    """Test database creation"""
    print("\n💾 Testing database creation...")
    try:
        from database.db import GerontoVoiceDatabase
        db = GerontoVoiceDatabase("test_setup.db")
        
        # Test user creation
        user = db.create_user("test_user", "Test User", "test@example.com")
        if user.user_id == "test_user":
            print("✅ Database operations working")
            
            # Cleanup
            os.remove("test_setup.db")
            return True
        else:
            print("❌ Database operations failed")
            return False
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints"""
    print("\n🌐 Testing API endpoints...")
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend API responding")
            return True
        else:
            print(f"❌ Backend API not responding: {response.status_code}")
            return False
    except requests.RequestException:
        print("❌ Backend API not running - Start with: python server/app.py")
        return False

def run_all_tests():
    """Run all setup tests"""
    print("🚀 GerontoVoice Backend Setup Test")
    print("=" * 50)
    
    tests = [
        ("Python Version", test_python_version),
        ("Dependencies", test_dependencies),
        ("Ollama Installation", test_ollama_installation),
        ("Ollama Service", test_ollama_service),
        ("Mistral Model", test_mistral_model),
        ("Backend Modules", test_backend_modules),
        ("Database Creation", test_database_creation),
        ("API Endpoints", test_api_endpoints)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! GerontoVoice Backend is ready to use.")
        print("\n🚀 Next steps:")
        print("1. Start the backend: python start_server.py")
        print("2. Start the frontend: npm run dev")
        print("3. Access the app: http://localhost:5173")
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please fix the issues above.")
        print("\n💡 Common fixes:")
        print("- Install missing packages: pip install -r requirements.txt")
        print("- Install Ollama: https://ollama.ai/")
        print("- Pull Mistral model: ollama pull mistral")
        print("- Start Ollama: ollama serve")
        print("- Start backend: python server/app.py")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
