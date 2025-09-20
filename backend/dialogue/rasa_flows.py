"""
Simplified Dialogue Manager for GerontoVoice Conversational Flows
Handles user intent recognition and generates empathetic responses without Rasa dependency
"""

import json
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class IntentResult:
    """Result from Rasa NLU intent recognition"""
    intent: str
    confidence: float
    entities: List[Dict]
    text: str
    timestamp: datetime

@dataclass
class DialogueResponse:
    """Structured dialogue response with emotion tags"""
    text: str
    emotion: str
    intent: str
    confidence: float
    follow_up_suggestions: List[str]

class RasaDialogueManager:
    """
    Simplified dialogue manager for caregiver training conversations
    Handles intent recognition and empathetic response generation without Rasa dependency
    """
    
    def __init__(self):
        self.intents = self._define_caregiver_intents()
        self.response_templates = self._create_response_templates()
    
    def _define_caregiver_intents(self) -> Dict[str, Dict]:
        """Define enhanced caregiver-specific intents with difficulty levels"""
        return {
            "ask_medication": {
                "examples": [
                    "Have you taken your medication today?",
                    "Did you remember to take your pills?",
                    "It's time for your medicine",
                    "Have you had your diabetes medication?",
                    "Don't forget your pills",
                    "Let's check your medication schedule",
                    "Are you taking your prescribed medications?"
                ],
                "description": "Asking about medication compliance",
                "difficulty_levels": {
                    "Beginner": "Simple, direct questions about medication",
                    "Intermediate": "More detailed medication management",
                    "Advanced": "Complex medication adherence scenarios"
                }
            },
            "offer_help": {
                "examples": [
                    "Can I help you with that?",
                    "Would you like me to assist you?",
                    "Let me help you with this",
                    "I'm here to help",
                    "Do you need any assistance?"
                ],
                "description": "Offering assistance or help"
            },
            "check_wellbeing": {
                "examples": [
                    "How are you feeling today?",
                    "Are you feeling okay?",
                    "How's your health today?",
                    "Are you in any pain?",
                    "How are you doing?"
                ],
                "description": "Checking on elderly person's wellbeing"
            },
            "provide_comfort": {
                "examples": [
                    "I understand how you feel",
                    "That must be difficult for you",
                    "I'm here for you",
                    "You're not alone in this",
                    "I care about you"
                ],
                "description": "Providing emotional comfort and support"
            },
            "redirect_conversation": {
                "examples": [
                    "Let's talk about something else",
                    "How about we discuss your garden?",
                    "Tell me about your family",
                    "What did you do today?",
                    "Let's change the subject"
                ],
                "description": "Redirecting from difficult topics"
            },
            "encourage_activity": {
                "examples": [
                    "Would you like to go for a walk?",
                    "Let's do some exercises",
                    "How about some light activity?",
                    "Would you like to go outside?",
                    "Let's stay active"
                ],
                "description": "Encouraging physical activity"
            },
            "address_concerns": {
                "examples": [
                    "What's worrying you?",
                    "Tell me what's on your mind",
                    "I'm listening to your concerns",
                    "What's bothering you?",
                    "Share your worries with me"
                ],
                "description": "Addressing elderly person's concerns"
            },
            "general_greeting": {
                "examples": [
                    "Hello, how are you?",
                    "Good morning",
                    "Hi there",
                    "Nice to see you",
                    "How's your day going?"
                ],
                "description": "General greeting and conversation starter",
                "difficulty_levels": {
                    "Beginner": "Simple greetings and basic conversation starters",
                    "Intermediate": "More personalized greetings and engagement",
                    "Advanced": "Complex social interaction scenarios"
                }
            },
            "calm_patient": {
                "examples": [
                    "It's okay, take your time",
                    "Don't worry, we'll figure this out together",
                    "You're doing great, just breathe",
                    "I'm here with you, you're safe",
                    "Let's take this one step at a time",
                    "Everything will be alright",
                    "You're not alone in this"
                ],
                "description": "Calming and reassuring the patient",
                "difficulty_levels": {
                    "Beginner": "Basic calming phrases and reassurance",
                    "Intermediate": "More sophisticated calming techniques",
                    "Advanced": "Complex emotional support scenarios"
                }
            },
            "redirect_confusion": {
                "examples": [
                    "Let's focus on something else",
                    "How about we talk about your family?",
                    "What's your favorite memory?",
                    "Tell me about your garden",
                    "What did you enjoy doing when you were younger?",
                    "Let's change the subject to something pleasant"
                ],
                "description": "Redirecting from confusion or difficult topics",
                "difficulty_levels": {
                    "Beginner": "Simple topic redirection",
                    "Intermediate": "More nuanced conversation steering",
                    "Advanced": "Complex emotional redirection techniques"
                }
            }
        }
    
    def _create_response_templates(self) -> Dict[str, Dict]:
        """Create empathetic response templates for each intent"""
        return {
            "ask_medication": {
                "empathetic": [
                    "I understand it can be hard to remember all your medications. Let me help you with that.",
                    "Taking medication regularly is important for your health. I'm here to support you.",
                    "I know managing medications can be overwhelming. Let's work through this together."
                ],
                "encouraging": [
                    "Great job remembering your medication! That's really important for your health.",
                    "You're doing well with your medication routine. Keep it up!",
                    "I'm proud of you for staying on top of your medications."
                ],
                "concerned": [
                    "I'm concerned about your medication schedule. Let's make sure you're taking them properly.",
                    "It's important we address your medication routine for your wellbeing.",
                    "I want to make sure you're getting the care you need with your medications."
                ]
            },
            "offer_help": {
                "empathetic": [
                    "I'm here to help you with whatever you need. You don't have to do this alone.",
                    "I care about you and want to make things easier for you.",
                    "Let me know how I can best support you today."
                ],
                "encouraging": [
                    "I'm happy to help! Together we can accomplish anything.",
                    "You're doing great, and I'm here to support you.",
                    "Let's work together to make this easier for you."
                ],
                "neutral": [
                    "I'm available to help whenever you need it.",
                    "Just let me know what you need assistance with.",
                    "I'm here if you need any help."
                ]
            },
            "check_wellbeing": {
                "empathetic": [
                    "I'm genuinely concerned about how you're feeling. Please tell me what's on your mind.",
                    "Your wellbeing is important to me. How can I help you feel better?",
                    "I want to make sure you're comfortable and feeling okay."
                ],
                "encouraging": [
                    "You're doing great! I'm here to support you through anything.",
                    "I'm proud of how you're handling everything. How are you feeling?",
                    "You're stronger than you know. Tell me how you're doing."
                ],
                "concerned": [
                    "I'm worried about you. Please let me know if something is bothering you.",
                    "Your health and happiness matter to me. What's going on?",
                    "I want to make sure you're okay. Please share what's on your mind."
                ]
            },
            "provide_comfort": {
                "empathetic": [
                    "I can only imagine how difficult this must be for you. You're not alone.",
                    "Your feelings are completely valid. I'm here to listen and support you.",
                    "I understand this is hard for you. Let me help you through this."
                ],
                "encouraging": [
                    "You're handling this so well. I'm here to support you every step of the way.",
                    "You're stronger than you think. Together we can get through this.",
                    "I believe in you and your ability to handle whatever comes your way."
                ],
                "neutral": [
                    "I'm here for you whenever you need someone to talk to.",
                    "You can always come to me with your concerns.",
                    "I'm listening and I care about what you have to say."
                ]
            },
            "redirect_conversation": {
                "empathetic": [
                    "I understand this topic might be difficult. Let's talk about something that brings you joy.",
                    "Sometimes it helps to focus on positive things. What makes you happy?",
                    "I can see this is upsetting you. Let's change to a more pleasant topic."
                ],
                "encouraging": [
                    "Great idea! Let's focus on something more positive.",
                    "I love hearing about the good things in your life. Tell me more.",
                    "You have so many wonderful stories to share. What would you like to talk about?"
                ],
                "neutral": [
                    "Let's talk about something else for a while.",
                    "How about we discuss something different?",
                    "What other topics would you like to explore?"
                ]
            },
            "encourage_activity": {
                "empathetic": [
                    "I know staying active can be challenging, but it's so important for your health.",
                    "I understand if you're not feeling up to it, but even a little movement can help.",
                    "Let's find an activity that feels comfortable for you."
                ],
                "encouraging": [
                    "You're doing great with staying active! Let's keep it up.",
                    "I'm proud of your commitment to your health. What activity sounds good?",
                    "You're inspiring me with your dedication to staying healthy."
                ],
                "neutral": [
                    "Activity is important for your wellbeing. What would you like to try?",
                    "Let's find something active that you enjoy.",
                    "What kind of movement feels good for you today?"
                ]
            },
            "address_concerns": {
                "empathetic": [
                    "I'm here to listen to whatever is worrying you. Your concerns matter to me.",
                    "Please share what's on your mind. I want to help you feel better.",
                    "I can see something is bothering you. Let's talk about it together."
                ],
                "encouraging": [
                    "You're so brave to share your concerns. I'm here to support you.",
                    "Talking about your worries is a great first step. Let's work through this.",
                    "I'm proud of you for opening up. Together we can address your concerns."
                ],
                "neutral": [
                    "I'm listening. Please tell me what's on your mind.",
                    "What concerns would you like to discuss?",
                    "I'm here to help with whatever is worrying you."
                ]
            },
            "general_greeting": {
                "empathetic": [
                    "Hello! I'm so glad to see you today. How are you feeling?",
                    "Good to see you! I've been thinking about you. How are you doing?",
                    "Hello there! I hope you're having a good day. How are things?"
                ],
                "encouraging": [
                    "Hello! You're looking wonderful today. How are you?",
                    "Good to see you! You always brighten my day. How are you doing?",
                    "Hello! I'm excited to spend time with you today. How are you feeling?"
                ],
                "neutral": [
                    "Hello! How are you today?",
                    "Good to see you! How are things going?",
                    "Hello! How are you doing today?"
                ]
            }
        }
    
    
    async def recognize_intent(self, text: str) -> IntentResult:
        """
        Recognize user intent using keyword matching
        
        Args:
            text: User input text
            
        Returns:
            IntentResult with recognized intent and confidence
        """
        try:
            # Use simple keyword matching
            intent, confidence = self._simple_intent_matching(text)
            
            return IntentResult(
                intent=intent,
                confidence=confidence,
                entities=[],
                text=text,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error recognizing intent: {e}")
            return IntentResult(
                intent="general_greeting",
                confidence=0.5,
                entities=[],
                text=text,
                timestamp=datetime.now()
            )
    
    def _simple_intent_matching(self, text: str) -> Tuple[str, float]:
        """Simple keyword-based intent matching"""
        text_lower = text.lower()
        
        # Score each intent based on keyword matches
        intent_scores = {}
        for intent, data in self.intents.items():
            score = 0
            for example in data["examples"]:
                # Simple word overlap scoring
                example_words = set(example.lower().split())
                text_words = set(text_lower.split())
                overlap = len(example_words.intersection(text_words))
                score += overlap / len(example_words) if example_words else 0
            
            intent_scores[intent] = score / len(data["examples"])
        
        # Return intent with highest score
        if intent_scores:
            best_intent = max(intent_scores, key=intent_scores.get)
            confidence = min(intent_scores[best_intent], 0.95)  # Cap confidence
            return best_intent, confidence
        
        return "general_greeting", 0.5
    
    def generate_empathetic_response(self, 
                                   intent: str, 
                                   emotion_context: str = "neutral",
                                   persona_context: Dict = None) -> DialogueResponse:
        """
        Generate empathetic response based on intent and context
        
        Args:
            intent: Recognized user intent
            emotion_context: Current emotion context
            persona_context: Elderly persona context
            
        Returns:
            DialogueResponse with empathetic text and suggestions
        """
        try:
            # Get response templates for intent
            templates = self.response_templates.get(intent, self.response_templates["general_greeting"])
            
            # Select emotion-appropriate response
            emotion_responses = templates.get(emotion_context, templates.get("neutral", templates.get("empathetic")))
            
            if not emotion_responses:
                emotion_responses = templates.get("neutral", ["I understand. How can I help you?"])
            
            # Select response randomly from available options
            response_text = random.choice(emotion_responses)
            
            # Generate follow-up suggestions
            follow_ups = self._generate_follow_up_suggestions(intent, emotion_context)
            
            return DialogueResponse(
                text=response_text,
                emotion=emotion_context,
                intent=intent,
                confidence=0.85,
                follow_up_suggestions=follow_ups
            )
            
        except Exception as e:
            logger.error(f"Error generating empathetic response: {e}")
            return DialogueResponse(
                text="I'm here to help. How can I support you today?",
                emotion="neutral",
                intent=intent,
                confidence=0.5,
                follow_up_suggestions=["How are you feeling?", "What can I help with?"]
            )
    
    def _generate_follow_up_suggestions(self, intent: str, emotion: str) -> List[str]:
        """Generate contextual follow-up suggestions"""
        suggestions_map = {
            "ask_medication": [
                "Would you like me to help organize your medications?",
                "How are you feeling after taking your medication?",
                "Do you have any questions about your medications?"
            ],
            "offer_help": [
                "What specific help do you need?",
                "How can I make things easier for you?",
                "What would be most helpful right now?"
            ],
            "check_wellbeing": [
                "Tell me more about how you're feeling",
                "Is there anything specific bothering you?",
                "How can I help you feel better?"
            ],
            "provide_comfort": [
                "What's on your mind?",
                "How can I support you better?",
                "You're not alone in this"
            ],
            "redirect_conversation": [
                "What brings you joy?",
                "Tell me about your family",
                "What are your favorite memories?"
            ],
            "encourage_activity": [
                "What activities do you enjoy?",
                "How about a gentle walk?",
                "What feels comfortable for you?"
            ],
            "address_concerns": [
                "What's worrying you most?",
                "How can I help with your concerns?",
                "Let's work through this together"
            ],
            "general_greeting": [
                "How are you feeling today?",
                "What would you like to talk about?",
                "How can I help you today?"
            ]
        }
        
        return suggestions_map.get(intent, ["How can I help you?", "What's on your mind?"])
    
    def train_model(self):
        """Placeholder for model training (not needed for simplified version)"""
        logger.info("Simplified dialogue manager - no training required")
        return True

# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_dialogue_manager():
        dialogue_manager = RasaDialogueManager()
        
        # Test intent recognition
        test_inputs = [
            "Have you taken your medication today?",
            "How are you feeling?",
            "Can I help you with that?",
            "I understand how you feel"
        ]
        
        for text in test_inputs:
            intent_result = await dialogue_manager.recognize_intent(text)
            response = dialogue_manager.generate_empathetic_response(
                intent_result.intent, 
                "empathetic"
            )
            
            print(f"Input: {text}")
            print(f"Intent: {intent_result.intent} (confidence: {intent_result.confidence})")
            print(f"Response: {response.text}")
            print(f"Emotion: {response.emotion}")
            print("---")
    
    asyncio.run(test_dialogue_manager())
