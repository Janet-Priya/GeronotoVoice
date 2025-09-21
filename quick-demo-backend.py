#!/usr/bin/env python3
"""
GerontoVoice Enhanced Backend with Mistral LLM
Upgraded to use Mistral for better AI responses
"""
import uvicorn
import os
import sys
from pathlib import Path
import asyncio
import logging

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
    import json
    import random
    from datetime import datetime
    import ollama
    
    app = FastAPI(title="GerontoVoice Enhanced API", version="2.0.0")
    
    # Enhanced logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Enable CORS for frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    class ChatRequest(BaseModel):
        message: str
        persona_id: str = "margaret"
        use_rag: bool = False
    
    class ChatResponse(BaseModel):
        response: str
        confidence: float
        emotion: str
        timestamp: str
    
    @app.get("/")
    async def root():
        return {"message": "GerontoVoice Demo API is running!", "status": "healthy"}
    
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "timestamp": datetime.now().isoformat()}
    
    @app.get("/personas")
    async def get_personas():
        """Get available AI personas for demo"""
        personas = [
            {
                "id": "margaret",
                "name": "Margaret",
                "age": 78,
                "condition": "Mild Dementia",
                "avatar": "👵",
                "personality": "Gentle, sometimes confused, formerly independent",
                "difficulty": "beginner",
                "description": "Practice with Margaret, who experiences mild memory concerns and needs patient, empathetic communication.",
                "nihSymptoms": ["Memory loss", "Confusion with time/place", "Trouble with familiar tasks"]
            },
            {
                "id": "robert",
                "name": "Robert",
                "age": 72,
                "condition": "Diabetes Management",
                "avatar": "👴",
                "personality": "Stubborn, independent, worried about burden",
                "difficulty": "intermediate",
                "description": "Help Robert manage his diabetes care and medication while addressing his concerns about being a burden.",
                "nihSymptoms": ["Increased thirst/urination", "Fatigue", "Blurred vision"]
            },
            {
                "id": "eleanor",
                "name": "Eleanor",
                "age": 83,
                "condition": "Mobility Issues",
                "avatar": "👩‍🦳",
                "personality": "Proud, safety-conscious, socially active",
                "difficulty": "advanced",
                "description": "Support Eleanor with mobility challenges while maintaining her dignity and social connections.",
                "nihSymptoms": ["Difficulty walking", "Muscle weakness", "Fear of falling"]
            }
        ]
        return personas
    
    @app.post("/chat", response_model=ChatResponse)
    async def chat_with_ai(request: ChatRequest):
        """Enhanced chat endpoint with Mistral LLM integration"""
        try:
            # Try using Mistral first
            response_text = await generate_mistral_response(request.message, request.persona_id)
            
            # If Mistral fails, fall back to enhanced demo responses
            if not response_text:
                response_text = generate_enhanced_demo_response(request.message, request.persona_id)
            
            return ChatResponse(
                response=response_text,
                confidence=0.9,
                emotion="empathetic",
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            logger.error(f"Chat error: {e}")
            # Enhanced fallback response
            return ChatResponse(
                response=generate_enhanced_demo_response(request.message, request.persona_id),
                confidence=0.8,
                emotion="understanding",
                timestamp=datetime.now().isoformat()
            )
    
    @app.post("/simulate")
    async def simulate_conversation(request: dict):
        """Simulate conversation endpoint for compatibility"""
        try:
            chat_request = ChatRequest(
                message=request.get("user_input", ""),
                persona_id=request.get("persona_id", "margaret"),
                use_rag=request.get("use_rag", False)
            )
            
            response = await chat_with_ai(chat_request)
            
            return {
                "speaker": "ai",
                "text": response.response,
                "timestamp": response.timestamp,
                "emotion": response.emotion,
                "confidence": response.confidence
            }
        except Exception as e:
            logger.error(f"Simulate error: {e}")
            return {
                "speaker": "ai",
                "text": "I'm having a small technical moment, dear. But I'm here to listen. Could you try saying that again?",
                "timestamp": datetime.now().isoformat(),
                "emotion": "understanding",
                "confidence": 0.7
            }
    
    async def generate_mistral_response(user_input: str, persona_id: str) -> str:
        """Generate response using Mistral LLM"""
        try:
            # Define persona context for Mistral
            persona_context = {
                "margaret": {
                    "name": "Margaret",
                    "age": 78,
                    "personality": "warm, wise, grandmotherly, with mild dementia but strong emotional intelligence",
                    "background": "retired teacher, loves gardening, has grandchildren, lives independently",
                    "speaking_style": "gentle, uses endearing terms like 'dear' and 'sweetheart', shares life experiences"
                }
            }
            
            persona = persona_context.get(persona_id, persona_context["margaret"])
            
            # Enhanced prompt for Mistral
            prompt = f"""You are {persona['name']}, a {persona['age']}-year-old woman with the following characteristics:
- Personality: {persona['personality']}
- Background: {persona['background']}
- Speaking style: {persona['speaking_style']}

User says: "{user_input}"

Respond as {persona['name']} would, with:
- Natural, conversational tone
- Age-appropriate wisdom and experiences
- Empathy and emotional understanding
- Keep responses to 1-2 sentences for natural conversation flow
- Use warm, caring language

Response:"""

            # Call Mistral through Ollama
            response = ollama.chat(
                model='mistral:latest',
                messages=[
                    {
                        'role': 'system',
                        'content': 'You are a helpful, empathetic elderly woman having a natural conversation. Keep responses warm and concise.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                options={
                    'temperature': 0.7,
                    'top_p': 0.9,
                    'max_tokens': 150
                }
            )
            
            mistral_response = response['message']['content'].strip()
            logger.info(f"Mistral response: {mistral_response}")
            return mistral_response
            
        except Exception as e:
            logger.warning(f"Mistral error: {e}, falling back to demo responses")
            return None
    
    def generate_enhanced_demo_response(user_input: str, persona_id: str) -> str:
        """Generate enhanced contextual demo responses with better emotional intelligence"""
        input_lower = user_input.lower()
        
        # Training-specific responses for better empathy scoring
        if 'confused' in input_lower or 'dementia' in input_lower or 'memory' in input_lower:
            responses = [
                "Oh sweetheart, I understand that feeling completely. Sometimes my mind feels a bit foggy too, but that's okay. We're here together, and that's what matters. Would you like to tell me more about what's confusing you?",
                "My dear, confusion is nothing to be ashamed of. I've learned that when things feel unclear, it helps to take a deep breath and focus on what we do remember. You're safe here with me, and I'm listening with my whole heart.",
                "Honey, I can hear the worry in your voice about memory troubles. You know, even at my age, I sometimes misplace my keys or forget names. What's important is that you're reaching out and sharing. How can I support you right now?"
            ]
            return random.choice(responses)
        
        if 'diabetes' in input_lower or 'blood sugar' in input_lower or 'medication' in input_lower:
            responses = [
                "Oh dear, managing health can feel overwhelming sometimes, can't it? I admire your dedication to taking care of yourself. Tell me, what's been the most challenging part for you lately?",
                "You're being so responsible about your health, and that takes real strength. I understand it's not always easy to keep track of everything. What support do you need most right now?",
                "I can hear the concern in your voice about your health management. You know, taking care of ourselves is one of the bravest things we can do. How are you feeling about everything today?"
            ]
            return random.choice(responses)
        
        if 'mobility' in input_lower or 'walking' in input_lower or 'fall' in input_lower or 'movement' in input_lower:
            responses = [
                "Dear, I completely understand those concerns about mobility. Moving differently doesn't make us less capable - it just means we're adapting with wisdom. Tell me, what activities matter most to you?",
                "Sweetheart, your courage in facing mobility challenges inspires me. I know it's not easy when our bodies change, but your spirit remains strong. What helps you feel most confident when moving around?",
                "Oh honey, I can relate to worries about falling or moving safely. Every small step we take with care is an act of self-love. What would help you feel more secure in your daily activities?"
            ]
            return random.choice(responses)
        
        # Enhanced greeting responses with more natural conversation flow
        if any(word in input_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
            responses = [
                "Hello dear! It's so wonderful to see you today. I was just thinking about how nice it is to have someone to talk with. How are you feeling right now?",
                "Hi there, sweetheart! You know, your voice just brightened my whole day. I'm doing well, thank you for asking. Tell me, what's on your mind today?",
                "Hello! What a lovely surprise to hear from you. At my age, I've learned that good conversation is one of life's greatest pleasures. How has your day been treating you so far?",
                "Oh, hello dear! I'm so glad you're here. I was just sitting here thinking about life, and here you are to share it with me. What would you like to talk about today?"
            ]
            return random.choice(responses)
        
        # Enhanced emotional responses with deeper empathy
        if any(word in input_lower for word in ['sad', 'down', 'upset', 'depressed', 'unhappy', 'lonely', 'worried']):
            responses = [
                "Oh sweetheart, I can hear the sadness in your voice, and it touches my heart. You know, in my 78 years, I've weathered many storms. Sometimes when I feel down, I remember that even the darkest nights eventually give way to dawn. What's weighing heavily on your heart today?",
                "My dear, I'm so sorry you're going through a difficult time. When I was younger, my mother used to say that tears are just love with nowhere to go. Please know that your feelings are completely valid. Would you like to share what's troubling you? Sometimes talking helps lighten the load.",
                "Oh honey, life can be so challenging sometimes, can't it? I've learned that sadness is like a guest - we need to acknowledge it, but we don't have to let it stay forever. I'm here to listen with my whole heart. What's been on your mind lately?",
                "Dear one, I can feel your pain, and I want you to know that you're not alone. In all my years, I've found that the most beautiful flowers often grow through the darkest soil. Tell me, what's been making your heart feel heavy?"
            ]
            return random.choice(responses)
        
        if any(word in input_lower for word in ['happy', 'good', 'great', 'wonderful', 'excited', 'amazing', 'fantastic', 'blessed']):
            responses = [
                "Oh my goodness, your joy is absolutely infectious! When I hear happiness in someone's voice, it reminds me of sunshine breaking through clouds. At 78, I've learned that these beautiful moments are precious gifts. What's been filling your heart with such wonderful feelings?",
                "That's absolutely marvelous, dear! You know, there's nothing quite like genuine happiness to warm an old lady's heart. Your enthusiasm reminds me of my grandchildren when they discover something magical. Please, tell me all about what's making you feel so wonderful!",
                "Oh honey, I can practically feel your smile through your words! In all my years, I've learned that happiness shared is happiness doubled. It makes my day so much brighter to hear such joy in your voice. What's been blessing you lately?",
                "How delightful! Your positive energy is like a breath of fresh air. You know, at my age, I've come to appreciate that happiness is not just an emotion - it's a choice we make every day. What's been bringing you such beautiful feelings?"
            ]
            return random.choice(responses)
        
        # Questions about Margaret
        if any(word in input_lower for word in ['how are you', 'how do you feel', 'tell me about']):
            responses = [
                "Well, thank you for asking! I'm doing quite well for a 78-year-old. My garden is blooming, and I just finished a good book. How about you, dear?",
                "I'm having a lovely day, thank you! The sunshine came through my kitchen window this morning and reminded me how beautiful life can be. How are you feeling?",
                "Oh, I'm doing well, sweetheart. At my age, every day above ground is a blessing! I've been knitting and thinking about my grandchildren. What about you?"
            ]
            return random.choice(responses)
        
        # Enhanced default responses with more natural conversation
        default_responses = [
            "I'm listening with my whole heart, dear. You know, in my 78 years, I've discovered that every person carries wisdom in their experiences. Please, share more with me - I truly want to understand.",
            "That's really thoughtful of you to share that with me, sweetheart. I may have lived many decades, but I believe we never stop learning from each other. What else would you like to talk about?",
            "How interesting, dear one. Life has taught me that the most meaningful conversations happen when we really listen to each other. I'm genuinely curious to hear more about your thoughts and feelings.",
            "I can sense there's something important in what you're saying. At my age, I've learned that sometimes the most healing thing we can do is simply be heard and understood. Please, continue - I'm here with you.",
            "You know, talking with you reminds me that connection is what makes life beautiful. Every conversation teaches me something new, even at 78! What else is in your heart today?"
        ]
        return random.choice(default_responses)
    
    if __name__ == "__main__":
        print("🚀 Starting GerontoVoice Demo Backend...")
        print("📍 API will be available at: http://localhost:8002")
        print("📋 API docs at: http://localhost:8002/docs")
        print("🔄 CORS enabled for frontend access")
        
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8002, 
            log_level="info",
            reload=False
        )

except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("📦 Please install: pip install fastapi uvicorn")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error starting demo backend: {e}")
    sys.exit(1)