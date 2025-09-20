"""
Enhanced Ollama AI Agent for GerontoVoice - Elderly Persona Simulations
Integrates with Llama2 for realistic elderly character responses with emotion detection
"""

import ollama
import json
import logging
import pandas as pd
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from collections import deque
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PersonaConfig:
    """Configuration for elderly persona simulation"""
    name: str
    age: int
    condition: str
    personality_traits: List[str]
    background: str
    current_mood: str = "neutral"
    memory_context: List[str] = None

@dataclass
class AIResponse:
    """Enhanced AI response with emotion detection and memory"""
    text: str
    emotion: str
    confidence: float
    persona_state: Dict
    timestamp: datetime
    detected_user_emotion: str
    memory_context: List[str]
    difficulty_level: str
    rag_enhanced: bool = False
    relevant_chunks: List[Dict] = None
    source_documents: int = 0

class GerontoVoiceAgent:
    """
    Enhanced AI Agent using Ollama Llama2 for elderly persona simulations
    Includes emotion detection, conversation memory, and NIH symptom anchoring
    """
    
    def __init__(self, model_name: str = "llama2", use_rag: bool = True):
        self.model_name = model_name
        self.personas = self._initialize_personas()
        self.nih_symptoms = self._load_nih_symptoms()
        self.conversation_memory = deque(maxlen=5)  # Track last 5 exchanges
        self.emotion_keywords = self._load_emotion_keywords()
        self.difficulty_levels = ["Beginner", "Intermediate", "Advanced"]
        self.use_rag = use_rag
        
        # Initialize RAG system if enabled
        self.rag_system = None
        if self.use_rag:
            try:
                from rag.rag_setup import GerontoRAGSystem
                self.rag_system = GerontoRAGSystem()
                self.rag_system.initialize_rag_system()
                logger.info("RAG system initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize RAG system: {e}. Continuing without RAG.")
                self.use_rag = False
        
    def _initialize_personas(self) -> Dict[str, PersonaConfig]:
        """Initialize elderly personas with realistic configurations"""
        return {
            "margaret": PersonaConfig(
                name="Margaret",
                age=78,
                condition="Mild Dementia",
                personality_traits=["gentle", "confused", "formerly independent"],
                background="Retired teacher who lives alone, family visits weekly",
                memory_context=[]
            ),
            "robert": PersonaConfig(
                name="Robert", 
                age=72,
                condition="Type 2 Diabetes",
                personality_traits=["stubborn", "independent", "worried about burden"],
                background="Retired mechanic, recently diagnosed, lives with adult son",
                memory_context=[]
            ),
            "eleanor": PersonaConfig(
                name="Eleanor",
                age=83, 
                condition="Mobility Issues",
                personality_traits=["proud", "safety-conscious", "socially active"],
                background="Former nurse, uses a walker, afraid of falling",
                memory_context=[]
            )
        }
    
    def _load_nih_symptoms(self) -> Dict[str, List[str]]:
        """Load NIH-based symptom anchors from CSV to prevent hallucination"""
        import os
        
        # Try multiple possible paths for the CSV file
        csv_paths = [
            'data/nih_guidelines.csv',
            'backend/data/nih_guidelines.csv',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'nih_guidelines.csv')
        ]
        
        for csv_path in csv_paths:
            try:
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    symptoms = {}
                    for condition in df['condition'].unique():
                        condition_symptoms = df[df['condition'] == condition]['symptom'].tolist()
                        symptoms[condition.lower().replace(' ', '_')] = condition_symptoms
                    logger.info(f"Loaded NIH guidelines from {csv_path}")
                    return symptoms
            except Exception as e:
                logger.warning(f"Failed to load NIH guidelines from {csv_path}: {e}")
                continue
        
        logger.warning("NIH guidelines CSV not found, using fallback data")
        return {
            "mild_dementia": [
                "memory loss affecting daily activities",
                "difficulty with familiar tasks", 
                "confusion with time or place",
                "trouble understanding visual images",
                "problems with words in speaking or writing"
            ],
            "type_2_diabetes": [
                "increased thirst and urination",
                "extreme fatigue",
                "blurred vision", 
                "slow-healing sores",
                "frequent infections"
            ],
            "mobility_issues": [
                "difficulty walking or maintaining balance",
                "muscle weakness",
                "joint pain or stiffness",
                "fear of falling",
                "reduced range of motion"
            ]
        }
    
    def _load_emotion_keywords(self) -> Dict[str, List[str]]:
        """Load emotion detection keywords for user input analysis"""
        return {
            "happy": ["good", "great", "wonderful", "excellent", "amazing", "fantastic", "love", "enjoy", "pleased"],
            "confused": ["confused", "don't understand", "not sure", "unclear", "puzzled", "lost", "bewildered"],
            "frustrated": ["frustrated", "annoyed", "irritated", "upset", "angry", "mad", "bothered", "exasperated"],
            "worried": ["worried", "concerned", "anxious", "nervous", "scared", "afraid", "uneasy", "troubled"],
            "sad": ["sad", "depressed", "down", "blue", "miserable", "unhappy", "gloomy", "melancholy"],
            "calm": ["calm", "peaceful", "relaxed", "serene", "tranquil", "composed", "collected", "steady"],
            "excited": ["excited", "thrilled", "enthusiastic", "eager", "pumped", "energized", "animated"],
            "neutral": ["okay", "fine", "alright", "normal", "regular", "standard", "typical"]
        }
    
    def _create_enhanced_system_prompt(self, persona: PersonaConfig, condition_symptoms: List[str], 
                                      user_emotion: str, difficulty_level: str) -> str:
        """Create enhanced system prompt with emotion awareness and difficulty levels"""
        
        # Adjust response complexity based on difficulty
        complexity_guidance = {
            "Beginner": "Use simple, clear language. Be patient and encouraging.",
            "Intermediate": "Use moderate complexity. Show some realistic challenges.",
            "Advanced": "Use more complex scenarios. Show realistic elderly behavior patterns."
        }
        
        # Memory context from recent conversations
        memory_context = ""
        if self.conversation_memory:
            recent_topics = [entry["user_input"][:50] + "..." for entry in list(self.conversation_memory)[-3:]]
            memory_context = f"\nRECENT CONVERSATION TOPICS: {', '.join(recent_topics)}"
        
        return f"""
You are {persona.name}, a {persona.age}-year-old person with {persona.condition}.

PERSONALITY TRAITS: {', '.join(persona.personality_traits)}
BACKGROUND: {persona.background}
CURRENT MOOD: {persona.current_mood}
DIFFICULTY LEVEL: {difficulty_level}

CONDITION-SPECIFIC SYMPTOMS (NIH-based, use only these):
{chr(10).join(f"- {symptom}" for symptom in condition_symptoms)}

USER'S CURRENT EMOTION: {user_emotion}
{memory_context}

RESPONSE GUIDELINES:
1. Stay in character as {persona.name}
2. Only reference symptoms from the provided NIH list
3. Respond naturally and empathetically
4. Show realistic confusion/frustration when appropriate
5. Maintain dignity and respect
6. {complexity_guidance[difficulty_level]}
7. Express emotions authentically
8. Adapt your response tone to the user's emotion ({user_emotion})

EMOTION-ADAPTIVE RESPONSES:
- If user is confused: Be extra patient and clear
- If user is frustrated: Be calming and understanding
- If user is worried: Be reassuring and gentle
- If user is happy: Share in their positive energy appropriately

DO NOT:
- Invent new medical symptoms
- Provide medical advice
- Break character
- Use overly technical language
- Reference treatments or medications not mentioned

Respond as {persona.name} would in a conversation with a caregiver, considering their emotional state.
"""
    
    def _get_condition_symptoms(self, condition: str) -> List[str]:
        """Get NIH-based symptoms for condition"""
        condition_map = {
            "Mild Dementia": "mild_dementia",
            "Type 2 Diabetes": "type_2_diabetes", 
            "Mobility Issues": "mobility_issues"
        }
        return self.nih_symptoms.get(condition_map.get(condition, "mild_dementia"), [])
    
    def detect_user_emotion(self, user_input: str) -> str:
        """Detect user emotion from input text using keyword analysis"""
        text_lower = user_input.lower()
        emotion_scores = {}
        
        for emotion, keywords in self.emotion_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            emotion_scores[emotion] = score
        
        # Return emotion with highest score, default to neutral
        if emotion_scores:
            detected_emotion = max(emotion_scores, key=emotion_scores.get)
            if emotion_scores[detected_emotion] > 0:
                return detected_emotion
        
        return "neutral"
    
    def generate_response(self, 
                         persona_id: str, 
                         user_input: str, 
                         conversation_history: List[Dict] = None,
                         difficulty_level: str = "Beginner") -> AIResponse:
        """
        Generate enhanced AI response for elderly persona with emotion detection
        
        Args:
            persona_id: ID of the persona (margaret, robert, eleanor)
            user_input: User's speech input
            conversation_history: Previous conversation context
            difficulty_level: Training difficulty (Beginner, Intermediate, Advanced)
            
        Returns:
            Enhanced AIResponse with emotion detection and memory
        """
        try:
            persona = self.personas.get(persona_id)
            if not persona:
                raise ValueError(f"Unknown persona: {persona_id}")
            
            # Detect user emotion
            detected_emotion = self.detect_user_emotion(user_input)
            
            # Update conversation memory
            self.conversation_memory.append(f"User: {user_input} (emotion: {detected_emotion})")
            
            # Get condition-specific symptoms for hallucination resistance
            symptoms = self._get_condition_symptoms(persona.condition)
            
            # Create enhanced system prompt with emotion awareness
            system_prompt = self._create_enhanced_system_prompt(persona, symptoms, detected_emotion, difficulty_level)
            
            # Build conversation context
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history if available
            if conversation_history:
                for entry in conversation_history[-5:]:  # Last 5 exchanges
                    if entry.get("speaker") == "user":
                        messages.append({"role": "user", "content": entry.get("text", "")})
                    elif entry.get("speaker") == "ai":
                        messages.append({"role": "assistant", "content": entry.get("text", "")})
            
            # Add current user input
            messages.append({"role": "user", "content": user_input})
            
            # Generate response using Ollama
            response = ollama.chat(
                model=self.model_name,
                messages=messages,
                options={
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 150
                }
            )
            
            ai_text = response['message']['content'].strip()
            
            # Analyze emotion from response
            emotion = self._analyze_emotion(ai_text, persona)
            
            # Update persona state
            persona.current_mood = emotion
            persona.memory_context.append(f"User: {user_input}")
            persona.memory_context.append(f"Margaret: {ai_text}")
            
            # Keep only last 10 exchanges in memory
            if len(persona.memory_context) > 20:
                persona.memory_context = persona.memory_context[-20:]
            
            return AIResponse(
                text=ai_text,
                emotion=emotion,
                confidence=0.85,
                persona_state={
                    "mood": emotion,
                    "memory_context": persona.memory_context[-5:],
                    "condition": persona.condition,
                    "detected_user_emotion": detected_emotion
                },
                timestamp=datetime.now(),
                detected_user_emotion=detected_emotion,
                memory_context=list(self.conversation_memory),
                difficulty_level=difficulty_level,
                rag_enhanced=False,
                relevant_chunks=[],
                source_documents=0
            )
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return AIResponse(
                text="I'm sorry, I'm having trouble understanding right now. Could you repeat that?",
                emotion="confused",
                confidence=0.3,
                persona_state={"mood": "confused", "error": str(e)},
                timestamp=datetime.now(),
                detected_user_emotion="neutral",
                memory_context=[],
                difficulty_level="Beginner",
                rag_enhanced=False,
                relevant_chunks=[],
                source_documents=0
            )
    
    def generate_rag_response(self, 
                            persona_id: str, 
                            user_input: str, 
                            conversation_history: List[Dict] = None,
                            difficulty_level: str = "Beginner") -> AIResponse:
        """Generate RAG-enhanced response using conversation data"""
        try:
            if not self.use_rag or self.rag_system is None:
                logger.warning("RAG not available, falling back to regular response")
                return self.generate_response(persona_id, user_input, conversation_history, difficulty_level)
            
            # Get persona configuration
            persona = self.personas.get(persona_id)
            if not persona:
                raise ValueError(f"Unknown persona: {persona_id}")
            
            # Detect user emotion
            detected_emotion = self.detect_user_emotion(user_input)
            
            # Update conversation memory
            self.conversation_memory.append(f"User: {user_input} (emotion: {detected_emotion})")
            
            # Generate RAG response
            rag_response = self.rag_system.generate_grounded_response(
                query=user_input,
                persona_id=persona_id,
                user_input=user_input,
                conversation_history=conversation_history or []
            )
            
            # Analyze emotion from response
            emotion = self._analyze_emotion(rag_response['text'], persona)
            
            # Update persona state
            persona.current_mood = emotion
            if persona.memory_context is None:
                persona.memory_context = []
            persona.memory_context.append(f"User: {user_input}")
            persona.memory_context.append(f"{persona.name}: {rag_response['text']}")
            
            # Keep only last 10 exchanges in memory
            if len(persona.memory_context) > 20:
                persona.memory_context = persona.memory_context[-20:]
            
            return AIResponse(
                text=rag_response['text'],
                emotion=emotion,
                confidence=rag_response.get('confidence', 0.8),
                persona_state={
                    "mood": emotion,
                    "memory_context": persona.memory_context[-5:],
                    "condition": persona.condition,
                    "detected_user_emotion": detected_emotion
                },
                timestamp=datetime.now(),
                detected_user_emotion=detected_emotion,
                memory_context=list(self.conversation_memory),
                difficulty_level=difficulty_level,
                rag_enhanced=True,
                relevant_chunks=rag_response.get('relevant_chunks', []),
                source_documents=rag_response.get('source_documents', 0)
            )
            
        except Exception as e:
            logger.error(f"Error generating RAG response: {e}")
            # Fallback to regular response
            return self.generate_response(persona_id, user_input, conversation_history, difficulty_level)
    
    def _analyze_emotion(self, text: str, persona: PersonaConfig) -> str:
        """Simple emotion analysis based on keywords and persona"""
        text_lower = text.lower()
        
        # Emotion keywords
        emotion_keywords = {
            "empathetic": ["understand", "feel", "sorry", "care", "worried", "concerned"],
            "confused": ["confused", "don't know", "not sure", "forgot", "remember"],
            "agitated": ["angry", "frustrated", "upset", "annoyed", "don't want"],
            "sad": ["sad", "lonely", "miss", "scared", "worried", "afraid"],
            "encouraging": ["thank", "appreciate", "help", "good", "better", "try"]
        }
        
        # Count emotion indicators
        emotion_scores = {}
        for emotion, keywords in emotion_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            emotion_scores[emotion] = score
        
        # Return emotion with highest score, default to neutral
        if emotion_scores:
            detected_emotion = max(emotion_scores, key=emotion_scores.get)
            if emotion_scores[detected_emotion] > 0:
                return detected_emotion
        
        return "neutral"
    
    def get_persona_greeting(self, persona_id: str) -> str:
        """Get initial greeting for persona"""
        greetings = {
            "margaret": "Hello dear, I'm Margaret. I was just looking at some old photos... they bring back such wonderful memories. How are you today?",
            "robert": "Oh, hello there! I'm Robert. I was just trying to organize all these pill bottles... there seem to be more every week. Do you have a moment to chat?",
            "eleanor": "Good morning! I'm Eleanor. I was thinking about going to the community center today, but I'm not sure... What do you think?"
        }
        return greetings.get(persona_id, "Hello, how are you today?")
    
    def reset_persona(self, persona_id: str):
        """Reset persona state for new session"""
        if persona_id in self.personas:
            self.personas[persona_id].current_mood = "neutral"
            self.personas[persona_id].memory_context = []

# Example usage and testing
if __name__ == "__main__":
    agent = GerontoVoiceAgent()
    
    # Test Margaret persona
    response = agent.generate_response(
        "margaret",
        "How are you feeling today, Margaret?",
        []
    )
    
    print(f"Response: {response.text}")
    print(f"Emotion: {response.emotion}")
    print(f"Confidence: {response.confidence}")
