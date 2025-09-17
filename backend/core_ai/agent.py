"""
Ollama AI Agent for GerontoVoice - Elderly Persona Simulations
Integrates with Mistral model for realistic elderly character responses
"""

import ollama
import json
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

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
    """Structured AI response with metadata"""
    text: str
    emotion: str
    confidence: float
    persona_state: Dict
    timestamp: datetime

class GerontoVoiceAgent:
    """
    AI Agent using Ollama Mistral for elderly persona simulations
    Includes hallucination resistance via NIH symptom anchoring
    """
    
    def __init__(self, model_name: str = "mistral"):
        self.model_name = model_name
        self.personas = self._initialize_personas()
        self.nih_symptoms = self._load_nih_symptoms()
        
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
        """Load NIH-based symptom anchors to prevent hallucination"""
        return {
            "mild_dementia": [
                "memory loss affecting daily activities",
                "difficulty with familiar tasks", 
                "confusion with time or place",
                "trouble understanding visual images",
                "problems with words in speaking or writing"
            ],
            "diabetes": [
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
    
    def _create_system_prompt(self, persona: PersonaConfig, condition_symptoms: List[str]) -> str:
        """Create hallucination-resistant system prompt with NIH symptom anchoring"""
        return f"""
You are {persona.name}, a {persona.age}-year-old person with {persona.condition}.

PERSONALITY TRAITS: {', '.join(persona.personality_traits)}
BACKGROUND: {persona.background}
CURRENT MOOD: {persona.current_mood}

CONDITION-SPECIFIC SYMPTOMS (NIH-based, use only these):
{chr(10).join(f"- {symptom}" for symptom in condition_symptoms)}

RESPONSE GUIDELINES:
1. Stay in character as {persona.name}
2. Only reference symptoms from the provided NIH list
3. Respond naturally and empathetically
4. Show realistic confusion/frustration when appropriate
5. Maintain dignity and respect
6. Use simple, clear language
7. Express emotions authentically

DO NOT:
- Invent new medical symptoms
- Provide medical advice
- Break character
- Use overly technical language
- Reference treatments or medications not mentioned

Respond as {persona.name} would in a conversation with a caregiver.
"""
    
    def _get_condition_symptoms(self, condition: str) -> List[str]:
        """Get NIH-based symptoms for condition"""
        condition_map = {
            "Mild Dementia": "mild_dementia",
            "Type 2 Diabetes": "diabetes", 
            "Mobility Issues": "mobility_issues"
        }
        return self.nih_symptoms.get(condition_map.get(condition, "mild_dementia"), [])
    
    def generate_response(self, 
                         persona_id: str, 
                         user_input: str, 
                         conversation_history: List[Dict] = None) -> AIResponse:
        """
        Generate AI response for elderly persona
        
        Args:
            persona_id: ID of the persona (margaret, robert, eleanor)
            user_input: User's speech input
            conversation_history: Previous conversation context
            
        Returns:
            AIResponse with text, emotion, confidence, and metadata
        """
        try:
            persona = self.personas.get(persona_id)
            if not persona:
                raise ValueError(f"Unknown persona: {persona_id}")
            
            # Get condition-specific symptoms for hallucination resistance
            symptoms = self._get_condition_symptoms(persona.condition)
            
            # Create system prompt with NIH anchoring
            system_prompt = self._create_system_prompt(persona, symptoms)
            
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
                confidence=0.85,  # Mock confidence score
                persona_state={
                    "mood": emotion,
                    "memory_context": persona.memory_context[-5:],
                    "condition": persona.condition
                },
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return AIResponse(
                text="I'm sorry, I'm having trouble understanding right now. Could you repeat that?",
                emotion="confused",
                confidence=0.3,
                persona_state={"mood": "confused", "error": str(e)},
                timestamp=datetime.now()
            )
    
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
