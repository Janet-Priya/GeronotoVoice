"""
Enhanced Ollama AI Agent for GerontoVoice - Elderly Persona Simulations
Integrates with Llama2 for realistic elderly character responses with emotion detection
"""

import ollama
import json
import logging
import pandas as pd
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime
from collections import deque
import os
import random
import hashlib
import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
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
    Enhanced AI Agent using Ollama Llama2 with LoRA fine-tuning for elderly persona simulations
    Includes emotion detection, conversation memory, NIH symptom anchoring, and LoRA integration
    """
    
    def __init__(self, model_name: str = "llama2", use_rag: bool = True, use_lora: bool = True):
        self.model_name = model_name
        self.use_lora = use_lora
        self.lora_model = None
        self.lora_tokenizer = None
        self.personas = self._initialize_personas()
        self.nih_symptoms = self._load_nih_symptoms()
        self.conversation_memory = {}  # Track conversation by persona
        self.emotion_keywords = self._load_emotion_keywords()
        self.difficulty_levels = ["Beginner", "Intermediate", "Advanced"]
        self.use_rag = use_rag
        self.response_cache = {}  # Cache to track recent responses
        
        # Initialize LoRA model if enabled
        if self.use_lora:
            self._initialize_lora_model()
        
        # Initialize RAG system if enabled
        self.rag_system = None
        if self.use_rag:
            try:
                # Import here to avoid circular imports
                from rag.rag_setup import get_rag_system
                self.rag_system = get_rag_system()
                logger.info("RAG system initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize RAG system: {e}. Continuing without RAG.")
                self.use_rag = False
    
    def _initialize_lora_model(self):
        """Initialize LoRA fine-tuned model for enhanced elder care responses"""
        try:
            lora_path = "backend/models/lora_elder_care"
            if not os.path.exists(lora_path):
                lora_path = "../backend/models/lora_elder_care"
            
            if os.path.exists(lora_path):
                logger.info(f"Loading LoRA model from {lora_path}")
                
                # Load base model and tokenizer
                base_model_name = "microsoft/DialoGPT-medium"
                self.lora_tokenizer = AutoTokenizer.from_pretrained(base_model_name)
                
                # Set padding token
                if self.lora_tokenizer.pad_token is None:
                    self.lora_tokenizer.pad_token = self.lora_tokenizer.eos_token
                
                # Load base model
                base_model = AutoModelForCausalLM.from_pretrained(
                    base_model_name,
                    torch_dtype=torch.float32,
                    device_map=None,  # Use CPU
                    low_cpu_mem_usage=True
                )
                
                # Load LoRA adapter
                self.lora_model = PeftModel.from_pretrained(base_model, lora_path)
                self.lora_model.eval()  # Set to evaluation mode
                
                logger.info("LoRA model loaded successfully")
                
            else:
                logger.warning(f"LoRA model not found at {lora_path}. Training may be needed.")
                self.use_lora = False
                
        except Exception as e:
            logger.error(f"Failed to initialize LoRA model: {e}")
            self.use_lora = False
    
    def _generate_lora_response(self, prompt: str, max_length: int = 150) -> str:
        """Generate response using LoRA fine-tuned model"""
        if not self.lora_model or not self.lora_tokenizer:
            return ""
        
        try:
            # Tokenize input
            inputs = self.lora_tokenizer.encode(prompt, return_tensors='pt')
            
            # Generate response
            with torch.no_grad():
                outputs = self.lora_model.generate(
                    inputs,
                    max_length=inputs.shape[1] + max_length,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.lora_tokenizer.eos_token_id,
                    eos_token_id=self.lora_tokenizer.eos_token_id,
                    repetition_penalty=1.3,
                    no_repeat_ngram_size=3
                )
            
            # Decode response
            response = self.lora_tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Ensure response is a string and extract the new part
            if isinstance(response, str) and len(response) > len(prompt):
                # Fix the slicing issue - make sure we're working with strings
                try:
                    response_text = response[len(prompt):].strip()
                except (TypeError, IndexError) as e:
                    logger.warning(f"Slicing error: {e}. Converting response to string.")
                    response_text = str(response).strip()
            else:
                response_text = str(response).strip() if response else ""
            
            # Clean up response
            if response_text:
                # Remove incomplete sentences at the end
                sentences = response_text.split('.')
                if len(sentences) > 1 and sentences[-1] and not sentences[-1].strip().endswith(('!', '?')):
                    response_text = '.'.join(sentences[:-1]) + '.'
                
                logger.info(f"LoRA response generated: {response_text[:50]}...")
                return response_text
            
        except Exception as e:
            logger.error(f"LoRA generation failed: {e}")
        
        return ""
        
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
        """Load enhanced emotion detection keywords for user input analysis"""
        return {
            "happy": ["good", "great", "wonderful", "excellent", "amazing", "fantastic", "love", "enjoy", "pleased", 
                     "cheerful", "delighted", "joyful", "content", "satisfied", "glad", "thrilled", "ecstatic"],
            "confused": ["confused", "don't understand", "not sure", "unclear", "puzzled", "lost", "bewildered",
                        "perplexed", "baffled", "mixed up", "uncertain", "doubtful", "questioning"],
            "frustrated": ["frustrated", "annoyed", "irritated", "upset", "angry", "mad", "bothered", "exasperated",
                          "aggravated", "impatient", "fed up", "stressed", "overwhelmed", "difficult"],
            "worried": ["worried", "concerned", "anxious", "nervous", "scared", "afraid", "uneasy", "troubled",
                       "fearful", "apprehensive", "distressed", "panicked", "alarmed", "tense"],
            "sad": ["sad", "depressed", "down", "blue", "miserable", "unhappy", "gloomy", "melancholy",
                   "dejected", "heartbroken", "mourning", "grieving", "sorrowful", "despondent"],
            "calm": ["calm", "peaceful", "relaxed", "serene", "tranquil", "composed", "collected", "steady",
                    "quiet", "still", "centered", "balanced", "zen", "mellow"],
            "excited": ["excited", "thrilled", "enthusiastic", "eager", "pumped", "energized", "animated",
                       "exhilarated", "elated", "vibrant", "lively", "spirited", "passionate"],
            "neutral": ["okay", "fine", "alright", "normal", "regular", "standard", "typical", "average", "so-so"]
        }
    
    def _get_persona_context(self, persona_id: str) -> Dict[str, Any]:
        """Get persona context for RAG queries"""
        persona = self.personas.get(persona_id.lower())
        if not persona:
            return {}
            
        return {
            "name": persona.name,
            "age": persona.age,
            "condition": persona.condition,
            "traits": persona.personality_traits,
            "background": persona.background
        }
    
    def _create_enhanced_system_prompt(self, persona: PersonaConfig, condition_symptoms: List[str], 
                                      user_emotion: str, difficulty_level: str, rag_context: str = "") -> str:
        """Create enhanced system prompt with emotion awareness, difficulty levels, and RAG context"""
        
        # Adjust response complexity based on difficulty
        complexity_guidance = {
            "Beginner": "Use simple, clear language. Be patient and encouraging.",
            "Intermediate": "Use moderate complexity. Show some realistic challenges.",
            "Advanced": "Use more complex scenarios. Show realistic elderly behavior patterns."
        }
        
        # Memory context from recent conversations
        memory_context = ""
        if persona.name.lower() in self.conversation_memory:
            recent_topics = [entry[:50] + "..." for entry in self.conversation_memory[persona.name.lower()][-3:]]
            memory_context = f"\nRECENT CONVERSATION TOPICS: {', '.join(recent_topics)}"
        
        # Anti-repetition guidance with RAG enhancement
        anti_repetition = f"""
ANTI-REPETITION AND RAG GUIDANCE:
1. Use the provided conversation context below to inform your response
2. Vary your response patterns and sentence structures
3. Use different phrases and expressions from previous responses
4. Avoid repeating the same words or phrases within this conversation
5. Draw from the knowledge base context when relevant
6. Respond to the specific content of the user's message
7. Add natural variation in your speech patterns
8. If similar questions were asked before, provide complementary information

CONVERSATION CONTEXT FROM KNOWLEDGE BASE:
{rag_context}
"""
        
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

{anti_repetition}

DO NOT:
- Invent new medical symptoms
- Provide medical advice
- Break character
- Use overly technical language
- Reference treatments or medications not mentioned
- Repeat yourself in the same way as previous responses

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
        """Enhanced emotion detection from input text using advanced keyword analysis with weighting"""
        text_lower = user_input.lower()
        emotion_scores = {}
        
        # Weight emotions based on strength and context of keywords
        for emotion, keywords in self.emotion_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    # Give higher weight to longer, more specific keywords
                    base_weight = len(keyword.split())
                    
                    # Context-based weighting
                    context_weight = 1.0
                    
                    # Increase weight for strong emotional indicators
                    if keyword in ['very', 'extremely', 'really', 'so', 'quite']:
                        context_weight *= 1.5
                    
                    # Check for negation ("not happy" should reduce happy score)
                    words_before_keyword = text_lower[:text_lower.find(keyword)].split()[-3:]
                    if any(neg in words_before_keyword for neg in ['not', 'never', 'no', "don't", "can't", "won't"]):
                        context_weight *= 0.3  # Reduce weight for negated emotions
                    
                    # Question vs statement weighting
                    if '?' in user_input:
                        context_weight *= 0.8  # Questions are less emotionally certain
                    
                    final_weight = base_weight * context_weight
                    score += final_weight
                    
            emotion_scores[emotion] = score
        
        # Advanced emotion classification
        max_emotion = "neutral"
        max_score = 0
        
        if emotion_scores:
            max_emotion = max(emotion_scores, key=emotion_scores.get)
            max_score = emotion_scores[max_emotion]
            
            # Only return detected emotion if score is significant enough
            if max_score > 0.5:
                logger.info(f"Detected user emotion: {max_emotion} (score: {max_score:.2f})")
                
                # Log top emotions for debugging
                sorted_emotions = sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)[:3]
                logger.debug(f"Top emotions: {sorted_emotions}")
                
                return max_emotion
        
        logger.debug("No strong emotion detected, defaulting to neutral")
        return "neutral"
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts using word overlap"""
        if not text1 or not text2:
            return 0.0
            
        # Normalize and tokenize
        words1 = set(re.findall(r'\b\w+\b', text1.lower()))
        words2 = set(re.findall(r'\b\w+\b', text2.lower()))
        
        if not words1 or not words2:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def _is_repetitive(self, response: str, persona_id: str) -> bool:
        """Check if response is too similar to recent responses"""
        if persona_id not in self.response_cache:
            return False
            
        recent_responses = self.response_cache[persona_id]
        
        for recent in recent_responses:
            similarity = self._calculate_similarity(response, recent)
            if similarity > 0.7:  # Threshold for repetition
                logger.warning(f"Repetitive response detected (similarity: {similarity:.2f})")
                return True
                
        return False
    
    def _add_response_variation(self, response: str, persona_id: str) -> str:
        """Add intelligent variation to repetitive responses based on persona"""
        # Persona-specific variation patterns
        persona_variations = {
            "margaret": {
                "starters": ["Oh dear, ", "You know, ", "Well, ", "Let me think... ", "I suppose ", "Oh my, "],
                "enders": [" if that makes sense.", " you know?", " at least I think so.", " don't you think?"],
                "replacements": {
                    "I'm": "I am", "can't": "cannot", "don't": "do not", "won't": "will not"
                }
            },
            "robert": {
                "starters": ["Well, ", "Look, ", "Listen, ", "I tell you what, ", "You see, ", "The thing is, "],
                "enders": [" that's just how it is.", " if you ask me.", " that's my opinion.", " take it or leave it."],
                "replacements": {
                    "I'm": "I am", "don't": "do not", "can't": "cannot", "won't": "will not"
                }
            },
            "eleanor": {
                "starters": ["Well dear, ", "You see, ", "I must say, ", "In my experience, ", "To be honest, "],
                "enders": [" if I may say so.", " that's been my experience.", " don't you agree?", " at my age."],
                "replacements": {
                    "I'm": "I am", "can't": "cannot", "don't": "do not", "it's": "it is"
                }
            }
        }
        
        variations = persona_variations.get(persona_id, persona_variations["margaret"])
        
        # Use hash for deterministic but varied changes
        hash_hex = hashlib.md5(response.encode()).hexdigest()
        response_hash = int(hash_hex[:8], 16)
        
        # Apply persona-specific replacements
        for old, new in variations["replacements"].items():
            if old in response and response_hash % 3 == 0:
                response = response.replace(old, new, 1)
        
        # Add variation based on hash
        variation_type = response_hash % 4
        
        if variation_type == 0 and not any(s in response for s in variations["starters"]):
            starter = variations["starters"][response_hash % len(variations["starters"])]
            response = starter + response[0].lower() + response[1:]
        elif variation_type == 1 and not any(e in response for e in variations["enders"]):
            ender = variations["enders"][response_hash % len(variations["enders"])]
            response = response.rstrip('.!?') + ender
        elif variation_type == 2:
            # Rephrase by changing sentence structure
            sentences = response.split('. ')
            if len(sentences) > 1:
                # Occasionally reorder sentences
                if response_hash % 5 == 0:
                    sentences[0], sentences[-1] = sentences[-1], sentences[0]
                response = '. '.join(sentences)
        
        return response
    
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
            # Normalize persona ID
            persona_id = persona_id.lower()
            
            # Initialize conversation memory for this persona if needed
            if persona_id not in self.conversation_memory:
                self.conversation_memory[persona_id] = deque(maxlen=10)
                
            # Initialize response cache for this persona if needed
            if persona_id not in self.response_cache:
                self.response_cache[persona_id] = deque(maxlen=5)
            
            persona = self.personas.get(persona_id)
            if not persona:
                raise ValueError(f"Unknown persona: {persona_id}")
            
            # Detect user emotion
            detected_emotion = self.detect_user_emotion(user_input)
            
            # Update conversation memory
            self.conversation_memory[persona_id].append(user_input)
            
            # Get condition-specific symptoms for hallucination resistance
            symptoms = self._get_condition_symptoms(persona.condition)
            
            # Create enhanced system prompt with emotion awareness
            system_prompt = self._create_enhanced_system_prompt(persona, symptoms, detected_emotion, difficulty_level)
            
            # Try RAG-enhanced response first if available
            rag_enhanced = False
            relevant_chunks = []
            source_documents = 0
            response_text = ""
            rag_context = ""
            
            if self.use_rag and self.rag_system:
                try:
                    logger.info(f"Generating RAG response for {persona_id} with query: {user_input[:50]}...")
                    
                    # Create context-aware query for RAG
                    context_query = f"""
                    Persona: {persona.name} ({persona.condition})
                    User emotion: {detected_emotion}
                    Conversation context: {'; '.join(self.conversation_memory[persona_id]) if persona_id in self.conversation_memory else 'None'}
                    Current user input: {user_input}
                    
                    Please provide relevant conversation examples and guidance for responding to this caregiver training scenario.
                    """
                    
                    # Query RAG system for relevant chunks
                    rag_result = self.rag_system.query(context_query, persona_id)
                    
                    if rag_result and "response" in rag_result and rag_result["response"]:
                        source_documents = rag_result.get("num_source_documents", 0)
                        
                        # Extract relevant chunks for context
                        if "source_documents" in rag_result and rag_result["source_documents"]:
                            for doc in rag_result["source_documents"]:
                                relevant_chunks.append({
                                    "content": doc.get("content", ""),
                                    "metadata": doc.get("metadata", {})
                                })
                            
                            # Create context from retrieved chunks
                            rag_context = "\n".join([
                                f"- {chunk['content'][:200]}..." if len(chunk['content']) > 200 else f"- {chunk['content']}"
                                for chunk in relevant_chunks[:3]  # Use top 3 chunks
                            ])
                        
                        logger.info(f"RAG retrieval successful: {source_documents} documents retrieved")
                        logger.info(f"Retrieved {len(relevant_chunks)} chunks for context")
                        
                    else:
                        logger.warning("RAG query returned no useful response")
                        
                except Exception as e:
                    logger.error(f"RAG generation failed: {e}, falling back to standard generation")
            
            # Create enhanced system prompt with RAG context
            system_prompt = self._create_enhanced_system_prompt(
                persona, symptoms, detected_emotion, difficulty_level, rag_context
            )
            
            # Generate response using enhanced methods (LoRA + RAG + Ollama)
            response_methods = []
            
            # Method 1: LoRA fine-tuned model (highest priority)
            if self.use_lora and self.lora_model:
                try:
                    lora_prompt = f"Caregiver: {user_input}\nElder ({persona.name}, {persona.condition}):"
                    lora_response = self._generate_lora_response(lora_prompt)
                    
                    if lora_response and len(lora_response.strip()) > 10:
                        response_text = lora_response
                        rag_enhanced = True  # Mark as enhanced since LoRA was trained on our data
                        logger.info("Using LoRA fine-tuned response")
                    
                except Exception as e:
                    logger.error(f"LoRA generation failed: {e}")
            
            # Method 2: Enhanced Ollama with RAG context (if LoRA didn't work)
            if not response_text:
                logger.info("Using enhanced Ollama generation with RAG context")
                
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
                
                # Generate response with Ollama
                response = ollama.chat(
                    model=self.model_name,
                    messages=messages,
                    options={
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40,
                        "repeat_penalty": 1.3,  # Increased to reduce repetition
                        "presence_penalty": 0.6,  # Add presence penalty
                        "frequency_penalty": 0.6  # Add frequency penalty
                    }
                )
                
                response_text = response["message"]["content"]
                
                # Mark as RAG-enhanced if we used RAG context
                if rag_context:
                    rag_enhanced = True
                    logger.info(f"Response enhanced with RAG context from {len(relevant_chunks)} chunks")
            
            # Check for repetition and add variation if needed
            if self._is_repetitive(response_text, persona_id):
                logger.info("Adding variation to repetitive response")
                response_text = self._add_response_variation(response_text, persona_id)
            
            # Update response cache
            self.response_cache[persona_id].append(response_text)
            
            # Extract emotion from response
            response_emotion = self._extract_emotion_from_response(response_text)
            
            # Create AI response object
            ai_response = AIResponse(
                text=response_text,
                emotion=response_emotion,
                confidence=0.8 if rag_enhanced else 0.7,
                persona_state={"name": persona.name, "mood": response_emotion},
                timestamp=datetime.now(),
                detected_user_emotion=detected_emotion,
                memory_context=list(self.conversation_memory[persona_id]),
                difficulty_level=difficulty_level,
                rag_enhanced=rag_enhanced,
                relevant_chunks=relevant_chunks if relevant_chunks is not None else [],
                source_documents=source_documents
            )
            
            logger.info(f"Generated response for {persona_id} (RAG: {rag_enhanced}, emotion: {response_emotion})")
            return ai_response
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return self._fallback_response(persona_id, user_input, detected_emotion="neutral")
    
    def _extract_emotion_from_response(self, response_text: str) -> str:
        """Extract emotion from AI response using keyword analysis"""
        text_lower = response_text.lower()
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
    
    def _fallback_response(self, persona_id: str, user_input: str, detected_emotion: str = "neutral") -> AIResponse:
        """Generate fallback response when main generation fails"""
        persona = self.personas.get(persona_id, self.personas["margaret"])
        
        fallback_responses = [
            f"I'm sorry, I didn't quite catch that. Could you please repeat?",
            f"Oh dear, I'm having a bit of trouble understanding. Can you say that again?",
            f"I'm not sure I followed what you said. Could you try again?",
            f"I'm sorry, my mind wandered for a moment. What were you saying?",
            f"Forgive me, I got a bit confused. Could you repeat that?"
        ]
        
        # Use hash of input to deterministically select a response
        hash_hex = hashlib.md5(user_input.encode()).hexdigest()
        response_index = int(hash_hex[:8], 16) % len(fallback_responses)
        response_text = fallback_responses[response_index]
        
        return AIResponse(
            text=response_text,
            emotion="confused",
            confidence=0.5,
            persona_state={"name": persona.name, "mood": "confused"},
            timestamp=datetime.now(),
            detected_user_emotion=detected_emotion,
            memory_context=[],
            difficulty_level="Beginner",
            rag_enhanced=False,
            relevant_chunks=[],  # Ensure this is always a list
            source_documents=0
        )

# For testing
if __name__ == "__main__":
    agent = GerontoVoiceAgent(use_lora=True, use_rag=True)
    
    test_inputs = [
        "How are you feeling today?",
        "Did you take your medication this morning?", 
        "Tell me about your family.",
        "Are you having any trouble with your memory?",
        "I'm really worried about your condition.",
        "You seem confused about something.",
        "That's wonderful news!",
        "I'm frustrated with this situation."
    ]
    
    print("=== GerontoVoice Agent Testing ===")
    print(f"LoRA enabled: {agent.use_lora}")
    print(f"RAG enabled: {agent.use_rag}")
    print("=" * 50)
    
    for persona_id in ["margaret", "robert", "eleanor"]:
        print(f"\nTesting {persona_id.capitalize()} persona:")
        print("-" * 40)
        
        for i, user_input in enumerate(test_inputs):
            try:
                response = agent.generate_response(
                    persona_id, 
                    user_input,
                    difficulty_level="Intermediate"
                )
                
                print(f"\n[{i+1}] User: {user_input}")
                print(f"{persona_id.capitalize()}: {response.text}")
                print(f"Emotion: {response.emotion} | User emotion: {response.detected_user_emotion}")
                print(f"RAG enhanced: {response.rag_enhanced} | Confidence: {response.confidence}")
                print(f"Source documents: {response.source_documents}")
                
                if i < len(test_inputs) - 1:  # Don't print separator after last item
                    print("." * 30)
                    
            except Exception as e:
                print(f"Error testing {persona_id} with '{user_input}': {e}")
        
        print("\n" + "=" * 80)
