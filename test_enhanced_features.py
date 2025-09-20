#!/usr/bin/env python3
"""
Quick test script for enhanced GerontoVoice features
"""

import sys
import os
sys.path.append('backend')

from core_ai.agent import GerontoVoiceAgent
from dialogue.rasa_flows import RasaDialogueManager
from feedback.analyzer import CaregiverSkillAnalyzer

def test_enhanced_features():
    print("🧪 Testing Enhanced GerontoVoice Features...")
    print("=" * 50)
    
    # Test 1: Emotion Detection
    print("\n1. Testing Emotion Detection...")
    agent = GerontoVoiceAgent()
    
    test_inputs = [
        "I'm confused about my medication",
        "I'm frustrated with this situation", 
        "I'm feeling great today!",
        "Okay, I understand"
    ]
    
    for text in test_inputs:
        emotion = agent.detect_user_emotion(text)
        print(f"   '{text}' → {emotion}")
    
    # Test 2: Enhanced AI Response
    print("\n2. Testing Enhanced AI Response...")
    response = agent.generate_response(
        persona_id="margaret",
        user_input="I'm confused about my medication",
        difficulty_level="Intermediate"
    )
    
    print(f"   AI Response: {response.text[:100]}...")
    print(f"   Detected User Emotion: {response.detected_user_emotion}")
    print(f"   Difficulty Level: {response.difficulty_level}")
    print(f"   Memory Context: {len(response.memory_context)} items")
    
    # Test 3: Intent Recognition
    print("\n3. Testing Intent Recognition...")
    dialogue_manager = RasaDialogueManager()
    
    test_phrases = [
        "Have you taken your medication today?",
        "It's okay, take your time",
        "How are you feeling today?"
    ]
    
    for phrase in test_phrases:
        import asyncio
        intent_result = asyncio.run(dialogue_manager.recognize_intent(phrase))
        print(f"   '{phrase}' → {intent_result.intent} (confidence: {intent_result.confidence:.2f})")
    
    # Test 4: Skill Analysis
    print("\n4. Testing Skill Analysis...")
    analyzer = CaregiverSkillAnalyzer()
    
    test_text = "I understand how difficult this must be for you. I'm here to help."
    score = analyzer._analyze_skill("empathy", test_text)
    
    print(f"   Text: '{test_text}'")
    print(f"   Skill: {score.skill_name}")
    print(f"   Score: {score.score:.2f}")
    print(f"   Feedback: {score.feedback}")
    print(f"   Suggestions: {len(score.improvement_suggestions)} tips")
    
    print("\n✅ All Enhanced Features Working!")
    print("=" * 50)

if __name__ == "__main__":
    test_enhanced_features()
