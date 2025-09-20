"""
FastAPI Server for GerontoVoice Backend
Bridges React frontend with Python backend services
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import logging
import asyncio
from datetime import datetime
import uuid
import os
import sys

# Add backend modules to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core_ai.agent import GerontoVoiceAgent, AIResponse
from dialogue.rasa_flows import RasaDialogueManager, IntentResult, DialogueResponse
from feedback.analyzer import CaregiverSkillAnalyzer, ConversationAnalysis
from database.db import GerontoVoiceDatabase, User, Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan event handler (replaces deprecated on_event)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting GerontoVoice Backend API")
    logger.info("Services initialized:")
    logger.info("- AI Agent (Ollama)")
    logger.info("- Dialogue Manager (Rasa)")
    logger.info("- Skill Analyzer (scikit-learn)")
    logger.info("- Database (SQLite)")
    yield
    # Shutdown
    logger.info("Shutting down GerontoVoice Backend API")

# Initialize FastAPI app
app = FastAPI(
    title="GerontoVoice Backend API",
    description="AI-powered caregiver training platform backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ai_agent = GerontoVoiceAgent()
dialogue_manager = RasaDialogueManager()
skill_analyzer = CaregiverSkillAnalyzer()
database = GerontoVoiceDatabase()

# Pydantic models for API
class ConversationEntry(BaseModel):
    speaker: str = Field(..., description="Speaker: 'user' or 'ai'")
    text: str = Field(..., description="Conversation text")
    timestamp: datetime = Field(default_factory=datetime.now)
    emotion: Optional[str] = Field(None, description="Emotion tag")
    confidence: Optional[float] = Field(None, description="Confidence score")

class SimulationRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    persona_id: str = Field(..., description="Persona ID (margaret, robert, eleanor)")
    user_input: str = Field(..., description="User speech input")
    conversation_history: List[ConversationEntry] = Field(default=[], description="Previous conversation")
    difficulty_level: str = Field(default="Beginner", description="Training difficulty level")

class SimulationResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    ai_response: str = Field(..., description="AI persona response")
    emotion: str = Field(..., description="Detected emotion")
    confidence: float = Field(..., description="Response confidence")
    intent: Optional[str] = Field(None, description="Recognized user intent")
    detected_user_emotion: str = Field(..., description="Detected user emotion")
    difficulty_level: str = Field(..., description="Training difficulty level")
    memory_context: List[str] = Field(default=[], description="Recent conversation context")
    timestamp: datetime = Field(default_factory=datetime.now)
    rag_enhanced: bool = Field(default=False, description="Whether response used RAG")
    relevant_chunks: List[Dict] = Field(default=[], description="Relevant conversation chunks")
    source_documents: int = Field(default=0, description="Number of source documents used")

class RAGSimulationRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    persona_id: str = Field(..., description="Persona identifier (margaret, robert, eleanor)")
    user_input: str = Field(..., description="User input text")
    conversation_history: List[Dict] = Field(default=[], description="Previous conversation history")
    difficulty_level: str = Field(default="Beginner", description="Training difficulty level")

class RAGSimulationResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    ai_response: str = Field(..., description="RAG-enhanced AI response")
    emotion: str = Field(..., description="Detected emotion")
    confidence: float = Field(..., description="Response confidence")
    detected_user_emotion: str = Field(..., description="Detected user emotion")
    difficulty_level: str = Field(..., description="Training difficulty level")
    memory_context: List[str] = Field(default=[], description="Recent conversation context")
    rag_enhanced: bool = Field(..., description="Whether response used RAG")
    relevant_chunks: List[Dict] = Field(default=[], description="Relevant conversation chunks")
    source_documents: int = Field(default=0, description="Number of source documents used")
    timestamp: datetime = Field(default_factory=datetime.now)

class FeedbackRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    conversation_data: List[ConversationEntry] = Field(..., description="Complete conversation")

class FeedbackResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    total_score: float = Field(..., description="Overall skill score")
    skill_scores: List[Dict[str, Any]] = Field(..., description="Individual skill scores")
    insights: List[str] = Field(..., description="Analysis insights")
    progress_chart: Optional[Dict] = Field(None, description="Progress visualization data")

class ProgressRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")

class ProgressResponse(BaseModel):
    user_id: str = Field(..., description="User identifier")
    total_sessions: int = Field(..., description="Total training sessions")
    average_score: float = Field(..., description="Average skill score")
    skill_progress: List[Dict[str, Any]] = Field(..., description="Skill progress data")
    achievements: List[Dict[str, Any]] = Field(..., description="Unlocked achievements")
    recent_sessions: List[Dict[str, Any]] = Field(..., description="Recent session data")

class UserCreateRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    name: str = Field(..., description="User name")
    email: Optional[str] = Field(None, description="User email")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ai_agent": "active",
            "dialogue_manager": "active", 
            "skill_analyzer": "active",
            "database": "active"
        }
    }

# Offline mode endpoint
@app.get("/offline")
async def offline_mode():
    """Check offline capabilities and provide offline mode hints"""
    return {
        "offline_capable": True,
        "features": {
            "ai_simulation": "Requires Ollama running locally",
            "speech_processing": "Browser-based Web Speech API",
            "data_storage": "Local SQLite database",
            "skill_analysis": "Local scikit-learn models"
        },
        "requirements": {
            "ollama": "Must be installed and running with Mistral model",
            "browser": "Chrome/Edge recommended for Web Speech API",
            "storage": "Local SQLite database (no cloud required)"
        },
        "setup_instructions": [
            "1. Install Ollama: https://ollama.ai/",
            "2. Pull Mistral model: ollama pull mistral",
            "3. Start Ollama service: ollama serve",
            "4. Run this backend server",
            "5. Access frontend in supported browser"
        ]
    }

# User management endpoints
@app.post("/users", response_model=Dict[str, str])
async def create_user(user_data: UserCreateRequest):
    """Create a new user"""
    try:
        user = database.create_user(
            user_id=user_data.user_id,
            name=user_data.name,
            email=user_data.email
        )
        return {
            "message": "User created successfully",
            "user_id": user.user_id,
            "name": user.name
        }
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user information"""
    try:
        user = database.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat(),
            "last_active": user.last_active.isoformat(),
            "total_sessions": user.total_sessions,
            "average_score": user.average_score
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Simulation endpoints
@app.post("/simulate", response_model=SimulationResponse)
async def simulate_conversation(request: SimulationRequest):
    """
    Main simulation endpoint - processes user input and returns AI response
    """
    try:
        # Update user activity
        database.update_user_activity(request.user_id)
        
        # Create session if it doesn't exist
        session_id = f"{request.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Check if this is a new conversation
        if not request.conversation_history:
            # Create new enhanced session
            session = database.create_session(session_id, request.user_id, request.persona_id, 
                                             request.difficulty_level)
            logger.info(f"Created new enhanced session: {session_id} at {request.difficulty_level} level")
        
        # Convert conversation history to format expected by AI agent
        conversation_history = [
            {
                "speaker": entry.speaker,
                "text": entry.text,
                "timestamp": entry.timestamp.isoformat()
            }
            for entry in request.conversation_history
        ]
        
        # Generate enhanced AI response using Ollama with emotion detection
        ai_response = ai_agent.generate_response(
            persona_id=request.persona_id,
            user_input=request.user_input,
            conversation_history=conversation_history,
            difficulty_level=request.difficulty_level
        )
        
        # Recognize user intent using Rasa
        intent_result = await dialogue_manager.recognize_intent(request.user_input)
        
        # Generate empathetic response
        dialogue_response = dialogue_manager.generate_empathetic_response(
            intent=intent_result.intent,
            emotion_context=ai_response.emotion,
            persona_context={"persona_id": request.persona_id}
        )
        
        # Update session with conversation data
        updated_conversation = request.conversation_history + [
            ConversationEntry(
                speaker="user",
                text=request.user_input,
                timestamp=datetime.now()
            ),
            ConversationEntry(
                speaker="ai", 
                text=ai_response.text,
                emotion=ai_response.emotion,
                timestamp=datetime.now()
            )
        ]
        
        # Convert to dict format for database
        conversation_data = [
            {
                "speaker": entry.speaker,
                "text": entry.text,
                "timestamp": entry.timestamp.isoformat(),
                "emotion": entry.emotion,
                "confidence": entry.confidence
            }
            for entry in updated_conversation
        ]
        
        database.update_session_conversation(session_id, conversation_data)
        
        return SimulationResponse(
            session_id=session_id,
            ai_response=ai_response.text,
            emotion=ai_response.emotion,
            confidence=ai_response.confidence,
            intent=intent_result.intent,
            detected_user_emotion=ai_response.detected_user_emotion,
            difficulty_level=ai_response.difficulty_level,
            memory_context=ai_response.memory_context,
            timestamp=datetime.now(),
            rag_enhanced=ai_response.rag_enhanced,
            relevant_chunks=ai_response.relevant_chunks or [],
            source_documents=ai_response.source_documents
        )
        
    except Exception as e:
        logger.error(f"Error in simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rag-simulate", response_model=RAGSimulationResponse)
async def rag_simulate_conversation(request: RAGSimulationRequest):
    """
    RAG-enhanced simulation endpoint - uses conversation data for grounded responses
    """
    try:
        # Update user activity
        database.update_user_activity(request.user_id)
        
        # Create session if it doesn't exist
        session_id = f"{request.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Check if this is a new conversation
        if not request.conversation_history:
            # Create new enhanced session
            session = database.create_session(session_id, request.user_id, request.persona_id, 
                                             request.difficulty_level)
            logger.info(f"Created new RAG session: {session_id} at {request.difficulty_level} level")
        
        # Convert conversation history to the format expected by the agent
        conversation_history = []
        for entry in request.conversation_history:
            conversation_history.append({
                "speaker": entry.get("speaker", "user"),
                "text": entry.get("text", ""),
                "timestamp": entry.get("timestamp", datetime.now().isoformat())
            })
        
        # Generate RAG-enhanced AI response
        ai_response = ai_agent.generate_rag_response(
            persona_id=request.persona_id,
            user_input=request.user_input,
            conversation_history=conversation_history,
            difficulty_level=request.difficulty_level
        )
        
        # Recognize user intent
        intent_result = await dialogue_manager.recognize_intent(request.user_input)
        
        # Update conversation history
        updated_conversation = conversation_history + [
            {
                "speaker": "user",
                "text": request.user_input,
                "timestamp": datetime.now().isoformat()
            },
            {
                "speaker": "ai", 
                "text": ai_response.text,
                "emotion": ai_response.emotion,
                "timestamp": datetime.now().isoformat()
            }
        ]
        
        # Convert to dict format for database
        conversation_data = [
            {
                "speaker": entry["speaker"],
                "text": entry["text"],
                "timestamp": entry["timestamp"],
                "emotion": entry.get("emotion", "neutral"),
                "confidence": ai_response.confidence if entry["speaker"] == "ai" else 1.0,
                "rag_enhanced": ai_response.rag_enhanced if entry["speaker"] == "ai" else False,
                "relevant_chunks": ai_response.relevant_chunks if entry["speaker"] == "ai" else [],
                "source_documents": ai_response.source_documents if entry["speaker"] == "ai" else 0
            }
            for entry in updated_conversation
        ]
        
        database.update_session_conversation(session_id, conversation_data)
        
        return RAGSimulationResponse(
            session_id=session_id,
            ai_response=ai_response.text,
            emotion=ai_response.emotion,
            confidence=ai_response.confidence,
            detected_user_emotion=ai_response.detected_user_emotion,
            difficulty_level=ai_response.difficulty_level,
            memory_context=ai_response.memory_context,
            rag_enhanced=ai_response.rag_enhanced,
            relevant_chunks=ai_response.relevant_chunks or [],
            source_documents=ai_response.source_documents,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error in RAG simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback", response_model=FeedbackResponse)
async def analyze_conversation(request: FeedbackRequest, background_tasks: BackgroundTasks):
    """
    Analyze conversation and provide skill feedback
    """
    try:
        # Convert conversation data to format expected by analyzer
        conversation_data = [
            {
                "speaker": entry.speaker,
                "text": entry.text,
                "timestamp": entry.timestamp.isoformat()
            }
            for entry in request.conversation_data
        ]
        
        # Analyze conversation using scikit-learn
        analysis = skill_analyzer.analyze_conversation(
            conversation_data=conversation_data,
            session_id=request.session_id
        )
        
        # Update database with analysis results
        skill_scores_dict = {score.skill_name: score.score for score in analysis.skill_scores}
        database.complete_session(
            session_id=request.session_id,
            skill_scores=skill_scores_dict,
            total_score=analysis.total_score
        )
        
        # Update skill progress for user
        session = database.get_user_sessions(request.session_id.split('_')[0])[0] if database.get_user_sessions(request.session_id.split('_')[0]) else None
        if session:
            user_id = session.user_id
            for score in analysis.skill_scores:
                database.update_skill_progress(user_id, score.skill_name.lower(), score.score)
        
        # Generate progress chart data
        user_sessions = database.get_user_sessions(session.user_id) if session else []
        progress_chart = skill_analyzer.generate_progress_chart(user_sessions)
        
        # Prepare skill scores for response
        skill_scores_response = [
            {
                "skill_name": score.skill_name,
                "score": score.score,
                "confidence": score.confidence,
                "feedback": score.feedback,
                "improvement_suggestions": score.improvement_suggestions
            }
            for score in analysis.skill_scores
        ]
        
        return FeedbackResponse(
            session_id=request.session_id,
            total_score=analysis.total_score,
            skill_scores=skill_scores_response,
            insights=analysis.insights,
            progress_chart=progress_chart
        )
        
    except Exception as e:
        logger.error(f"Error analyzing conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/progress/{user_id}", response_model=ProgressResponse)
async def get_user_progress(user_id: str):
    """
    Get user progress and statistics
    """
    try:
        # Get user statistics
        stats = database.get_user_statistics(user_id)
        if "error" in stats:
            raise HTTPException(status_code=404, detail=stats["error"])
        
        # Get recent sessions
        sessions = database.get_user_sessions(user_id, limit=10)
        recent_sessions = [
            {
                "session_id": session.session_id,
                "persona_id": session.persona_id,
                "start_time": session.start_time.isoformat(),
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "total_score": session.total_score,
                "status": session.status
            }
            for session in sessions
        ]
        
        return ProgressResponse(
            user_id=user_id,
            total_sessions=stats["session_stats"]["total_sessions"],
            average_score=stats["session_stats"]["average_score"],
            skill_progress=list(stats["skill_stats"].values()),
            achievements=stats["achievements"]["recent_achievements"],
            recent_sessions=recent_sessions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/{user_id}")
async def export_user_data(user_id: str):
    """
    Export user data as JSON
    """
    try:
        export_data = database.export_user_data(user_id)
        if "error" in export_data:
            raise HTTPException(status_code=404, detail=export_data["error"])
        
        return JSONResponse(content=export_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/personas")
async def get_available_personas():
    """
    Get available AI personas
    """
    return {
        "personas": [
            {
                "id": "margaret",
                "name": "Margaret",
                "age": 78,
                "condition": "Mild Dementia",
                "description": "Practice with Margaret, experiencing mild memory concerns",
                "greeting": ai_agent.get_persona_greeting("margaret")
            },
            {
                "id": "robert", 
                "name": "Robert",
                "age": 72,
                "condition": "Type 2 Diabetes",
                "description": "Help Robert with diabetes care and medication management",
                "greeting": ai_agent.get_persona_greeting("robert")
            },
            {
                "id": "eleanor",
                "name": "Eleanor", 
                "age": 83,
                "condition": "Mobility Issues",
                "description": "Support Eleanor with walking aids and confidence building",
                "greeting": ai_agent.get_persona_greeting("eleanor")
            }
        ]
    }

@app.get("/intents")
async def get_available_intents():
    """
    Get available conversation intents
    """
    return {
        "intents": list(dialogue_manager.intents.keys()),
        "intent_descriptions": {
            intent: data["description"] 
            for intent, data in dialogue_manager.intents.items()
        }
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Resource not found", "detail": str(exc)}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "An unexpected error occurred"}
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "GerontoVoice Backend API",
        "version": "1.0.0",
        "description": "AI-powered caregiver training platform",
        "endpoints": {
            "health": "/health",
            "offline": "/offline", 
            "simulate": "/simulate",
            "feedback": "/feedback",
            "progress": "/progress/{user_id}",
            "personas": "/personas",
            "docs": "/docs"
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
