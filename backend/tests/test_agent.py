"""
Tests for GerontoVoice AI Agent
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch
from datetime import datetime

# Add backend modules to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core_ai.agent import GerontoVoiceAgent, AIResponse, PersonaConfig

class TestGerontoVoiceAgent:
    """Test cases for AI Agent functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.agent = GerontoVoiceAgent()
    
    def test_agent_initialization(self):
        """Test agent initializes correctly"""
        assert self.agent.model_name == "mistral"
        assert len(self.agent.personas) == 3
        assert "margaret" in self.agent.personas
        assert "robert" in self.agent.personas
        assert "eleanor" in self.agent.personas
    
    def test_persona_configuration(self):
        """Test persona configurations are correct"""
        margaret = self.agent.personas["margaret"]
        assert margaret.name == "Margaret"
        assert margaret.age == 78
        assert margaret.condition == "Mild Dementia"
        assert "gentle" in margaret.personality_traits
        
        robert = self.agent.personas["robert"]
        assert robert.name == "Robert"
        assert robert.age == 72
        assert robert.condition == "Type 2 Diabetes"
        assert "stubborn" in robert.personality_traits
    
    def test_nih_symptoms_loading(self):
        """Test NIH symptom anchoring"""
        assert "mild_dementia" in self.agent.nih_symptoms
        assert "diabetes" in self.agent.nih_symptoms
        assert "mobility_issues" in self.agent.nih_symptoms
        
        dementia_symptoms = self.agent.nih_symptoms["mild_dementia"]
        assert len(dementia_symptoms) > 0
        assert "memory loss affecting daily activities" in dementia_symptoms
    
    @patch('ollama.chat')
    def test_generate_response_success(self, mock_chat):
        """Test successful AI response generation"""
        # Mock Ollama response
        mock_chat.return_value = {
            'message': {
                'content': "Hello dear, I'm doing well today. How are you?"
            }
        }
        
        response = self.agent.generate_response(
            persona_id="margaret",
            user_input="How are you feeling today?",
            conversation_history=[]
        )
        
        assert isinstance(response, AIResponse)
        assert response.text == "Hello dear, I'm doing well today. How are you?"
        assert response.emotion in ["neutral", "empathetic", "concerned", "encouraging", "confused", "agitated", "sad"]
        assert 0 <= response.confidence <= 1
        assert response.persona_state is not None
    
    @patch('ollama.chat')
    def test_generate_response_with_history(self, mock_chat):
        """Test AI response with conversation history"""
        mock_chat.return_value = {
            'message': {
                'content': "Yes, I remember you asking about my medication earlier."
            }
        }
        
        conversation_history = [
            {"speaker": "user", "text": "Have you taken your medication?"},
            {"speaker": "ai", "text": "I think so, but I'm not sure which ones."}
        ]
        
        response = self.agent.generate_response(
            persona_id="margaret",
            user_input="Do you remember our earlier conversation?",
            conversation_history=conversation_history
        )
        
        assert response.text is not None
        assert len(response.persona_state["memory_context"]) > 0
    
    def test_generate_response_invalid_persona(self):
        """Test error handling for invalid persona"""
        with pytest.raises(ValueError):
            self.agent.generate_response(
                persona_id="invalid_persona",
                user_input="Hello",
                conversation_history=[]
            )
    
    @patch('ollama.chat')
    def test_generate_response_ollama_error(self, mock_chat):
        """Test error handling when Ollama fails"""
        mock_chat.side_effect = Exception("Ollama connection failed")
        
        response = self.agent.generate_response(
            persona_id="margaret",
            user_input="Hello",
            conversation_history=[]
        )
        
        assert "trouble understanding" in response.text.lower()
        assert response.emotion == "confused"
        assert response.confidence < 0.5
    
    def test_emotion_analysis(self):
        """Test emotion analysis functionality"""
        # Test empathetic text
        empathetic_text = "I understand how difficult this must be for you"
        emotion = self.agent._analyze_emotion(empathetic_text, self.agent.personas["margaret"])
        assert emotion == "empathetic"
        
        # Test confused text
        confused_text = "I'm confused and don't know what to do"
        emotion = self.agent._analyze_emotion(confused_text, self.agent.personas["margaret"])
        assert emotion == "confused"
        
        # Test neutral text
        neutral_text = "Hello, how are you today?"
        emotion = self.agent._analyze_emotion(neutral_text, self.agent.personas["margaret"])
        assert emotion == "neutral"
    
    def test_persona_greetings(self):
        """Test persona greeting generation"""
        margaret_greeting = self.agent.get_persona_greeting("margaret")
        assert "Margaret" in margaret_greeting
        assert len(margaret_greeting) > 0
        
        robert_greeting = self.agent.get_persona_greeting("robert")
        assert "Robert" in robert_greeting
        
        eleanor_greeting = self.agent.get_persona_greeting("eleanor")
        assert "Eleanor" in eleanor_greeting
    
    def test_reset_persona(self):
        """Test persona state reset"""
        persona = self.agent.personas["margaret"]
        persona.current_mood = "agitated"
        persona.memory_context = ["test memory"]
        
        self.agent.reset_persona("margaret")
        
        assert persona.current_mood == "neutral"
        assert persona.memory_context == []
    
    def test_condition_symptoms_mapping(self):
        """Test condition to symptoms mapping"""
        dementia_symptoms = self.agent._get_condition_symptoms("Mild Dementia")
        assert len(dementia_symptoms) > 0
        assert "memory loss affecting daily activities" in dementia_symptoms
        
        diabetes_symptoms = self.agent._get_condition_symptoms("Type 2 Diabetes")
        assert len(diabetes_symptoms) > 0
        assert "increased thirst and urination" in diabetes_symptoms
        
        mobility_symptoms = self.agent._get_condition_symptoms("Mobility Issues")
        assert len(mobility_symptoms) > 0
        assert "difficulty walking or maintaining balance" in mobility_symptoms

if __name__ == "__main__":
    pytest.main([__file__])
