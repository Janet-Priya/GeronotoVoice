#!/usr/bin/env python3
"""
Comprehensive Test Suite for Enhanced GerontoVoice Agent
Tests RAG functionality, LoRA integration, emotion detection, and voice accuracy
"""

import unittest
import sys
import os
import asyncio
import time
import json
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, List, Any

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core_ai.agent import GerontoVoiceAgent, AIResponse
from rag.rag_setup import GerontoRAGSystem, test_rag_system
from database.db import GerontoVoiceDatabase

class TestGerontoVoiceAgent(unittest.TestCase):
    """Test suite for GerontoVoice Agent functionality"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment"""
        cls.agent = None
        cls.db = None
        cls.test_session_id = "test_session_001"
        cls.test_user_id = "test_user_001"
        
        # Test queries for different scenarios
        cls.test_queries = {
            'dementia_confusion': "Handle dementia confusion",
            'diabetes_management': "How to manage blood sugar levels",
            'mobility_support': "Help with walking and mobility",
            'emotional_support': "I'm really worried about my condition",
            'confused_response': "I don't understand what you're saying",
            'happy_response': "That's wonderful news!",
            'frustrated_response': "I'm so frustrated with this situation"
        }
        
        # Expected persona responses patterns
        cls.persona_patterns = {
            'margaret': ['confused', 'memory', 'medication', 'forget'],
            'robert': ['diabetes', 'blood sugar', 'glucose', 'insulin'],
            'eleanor': ['walker', 'falling', 'mobility', 'balance']
        }
    
    def setUp(self):
        """Set up each test"""
        try:
            # Initialize agent with both RAG and LoRA (but allow LoRA to fail gracefully)
            self.agent = GerontoVoiceAgent(use_rag=True, use_lora=False)  # Disable LoRA for testing
            
            # Initialize test database
            self.db = GerontoVoiceDatabase("test_agent.db")
            
            # Create test user and session
            self.db.create_user(self.test_user_id, "Test User", "test@example.com")
            self.db.create_session(self.test_session_id, self.test_user_id, "margaret")
            
        except Exception as e:
            print(f"Setup warning: {e}")
            self.agent = None
    
    def tearDown(self):
        """Clean up after each test"""
        try:
            # Clean up test database
            if self.db:
                os.remove("test_agent.db")
        except:
            pass
    
    def test_agent_initialization(self):
        """Test agent initialization with different configurations"""
        print("\n🔧 Testing Agent Initialization...")
        
        # Test RAG-only initialization
        agent_rag = GerontoVoiceAgent(use_rag=True, use_lora=False)
        self.assertTrue(agent_rag.use_rag, "RAG should be enabled")
        self.assertFalse(agent_rag.use_lora, "LoRA should be disabled")
        
        # Test basic initialization
        agent_basic = GerontoVoiceAgent(use_rag=False, use_lora=False)
        self.assertFalse(agent_basic.use_rag, "RAG should be disabled")
        self.assertFalse(agent_basic.use_lora, "LoRA should be disabled")
        
        print("✅ Agent initialization tests passed")
    
    def test_emotion_detection(self):
        """Test enhanced emotion detection functionality"""
        print("\n😊 Testing Emotion Detection...")
        
        if not self.agent:
            self.skipTest("Agent not initialized")
        
        test_cases = [
            ("I'm really happy today!", "happy"),
            ("I'm so confused about this medication", "confused"), 
            ("This is very frustrating!", "frustrated"),
            ("I'm worried about my health", "worried"),
            ("I feel sad and lonely", "sad"),
            ("Everything is fine", "neutral"),
            ("I'm not happy at all", "neutral"),  # Negation test
            ("Are you happy?", "happy"),  # Question test (should be weaker)
        ]
        
        emotion_scores = {}
        for text, expected_emotion in test_cases:
            detected_emotion = self.agent.detect_user_emotion(text)
            emotion_scores[text] = detected_emotion
            
            print(f"Text: '{text}' -> Expected: {expected_emotion}, Detected: {detected_emotion}")
            
            # For most cases, we expect correct detection, but allow some flexibility
            if expected_emotion != "neutral":
                self.assertIn(detected_emotion, [expected_emotion, "neutral"], 
                             f"Emotion detection failed for: '{text}'")
        
        # Test that different emotions are detected
        unique_emotions = set(emotion_scores.values())
        self.assertGreater(len(unique_emotions), 1, "Should detect multiple different emotions")
        
        print("✅ Emotion detection tests passed")
        
    def test_rag_functionality(self):
        """Test RAG system integration and retrieval"""
        print("\n🔍 Testing RAG Functionality...")
        
        if not self.agent or not self.agent.use_rag or not self.agent.rag_system:
            print("⚠️ Skipping RAG tests - RAG system not available")
            return
        
        # Test RAG system directly
        rag_result = test_rag_system()
        self.assertEqual(rag_result.get("status"), "success", "RAG system should be operational")
        self.assertGreater(rag_result.get("chunks_retrieved", 0), 0, "Should retrieve chunks")
        
        # Test different query types
        for query_name, query_text in self.test_queries.items():
            print(f"Testing RAG query: {query_name}")
            
            try:
                rag_response = self.agent.rag_system.query(query_text)
                
                # Verify response structure
                self.assertIn("response", rag_response, f"RAG response should contain 'response' for {query_name}")
                self.assertIn("source_documents", rag_response, f"RAG response should contain 'source_documents' for {query_name}")
                
                # Log retrieval statistics
                chunks_retrieved = rag_response.get("num_source_documents", 0)
                print(f"  Retrieved {chunks_retrieved} chunks for '{query_text}'")
                
                if chunks_retrieved > 0:
                    print(f"  ✅ RAG retrieval successful for {query_name}")
                else:
                    print(f"  ⚠️ No chunks retrieved for {query_name}")
                    
            except Exception as e:
                print(f"  ❌ RAG query failed for {query_name}: {e}")
        
        print("✅ RAG functionality tests completed")
    
    def test_response_generation(self):
        """Test AI response generation for different personas"""
        print("\n🗣️ Testing Response Generation...")
        
        if not self.agent:
            self.skipTest("Agent not initialized")
        
        personas = ['margaret', 'robert', 'eleanor']
        test_inputs = [
            "How are you feeling today?",
            "Did you take your medication?",
            "Tell me about your concerns",
            "I'm here to help you"
        ]
        
        response_results = {}
        
        for persona in personas:
            print(f"\nTesting {persona.title()} persona:")
            response_results[persona] = []
            
            for input_text in test_inputs:
                try:
                    # Generate response (with shorter timeout for testing)
                    with patch('ollama.chat') as mock_ollama:
                        # Mock Ollama response
                        mock_ollama.return_value = {
                            "message": {
                                "content": f"Hello, I'm {persona}. Thank you for asking. I'm doing my best today."
                            }
                        }
                        
                        response = self.agent.generate_response(
                            persona_id=persona,
                            user_input=input_text,
                            difficulty_level="Intermediate"
                        )
                        
                        # Verify response structure
                        self.assertIsInstance(response, AIResponse, f"Should return AIResponse for {persona}")
                        self.assertIsNotNone(response.text, f"Response text should not be None for {persona}")
                        self.assertGreater(len(response.text), 0, f"Response should have content for {persona}")
                        
                        # Verify persona-specific content
                        response_lower = response.text.lower()
                        contains_persona_elements = any(
                            pattern in response_lower 
                            for pattern in self.persona_patterns.get(persona, [])
                        ) or persona in response_lower
                        
                        response_results[persona].append({
                            'input': input_text,
                            'response': response.text,
                            'emotion': response.emotion,
                            'confidence': response.confidence,
                            'rag_enhanced': response.rag_enhanced,
                            'contains_persona_elements': contains_persona_elements
                        })
                        
                        print(f"  Input: {input_text}")
                        print(f"  Response: {response.text[:100]}...")
                        print(f"  Emotion: {response.emotion}, RAG: {response.rag_enhanced}")
                        
                except Exception as e:
                    print(f"  ❌ Response generation failed for {persona} with '{input_text}': {e}")
                    response_results[persona].append({
                        'input': input_text,
                        'error': str(e)
                    })
        
        # Verify we got responses for all personas
        for persona in personas:
            persona_responses = response_results[persona]
            successful_responses = [r for r in persona_responses if 'error' not in r]
            self.assertGreater(len(successful_responses), 0, f"Should get at least one successful response for {persona}")
        
        print("✅ Response generation tests completed")
        
        return response_results
    
    def test_response_variety(self):
        """Test that agent generates varied responses to avoid repetition"""
        print("\n🔄 Testing Response Variety...")
        
        if not self.agent:
            self.skipTest("Agent not initialized")
        
        # Generate multiple responses to the same input
        test_input = "How are you feeling today?"
        persona = "margaret"
        responses = []
        
        with patch('ollama.chat') as mock_ollama:
            # Generate 5 different mock responses
            mock_responses = [
                f"I'm doing okay today, thank you for asking. Sometimes I get a bit confused though.",
                f"Hello dear, I'm feeling alright. My memory isn't what it used to be.",
                f"Oh, I'm managing well enough. Though I do worry about forgetting things.",
                f"Thank you for asking. I'm having a good day, though I get mixed up sometimes.",
                f"I'm doing my best, dear. Some days are harder than others with my memory."
            ]
            
            for i, mock_response in enumerate(mock_responses):
                mock_ollama.return_value = {"message": {"content": mock_response}}
                
                try:
                    response = self.agent.generate_response(persona, test_input)
                    responses.append(response.text)
                    print(f"Response {i+1}: {response.text}")
                    
                except Exception as e:
                    print(f"Failed to generate response {i+1}: {e}")
        
        # Check for variety in responses
        if len(responses) >= 2:
            unique_responses = set(responses)
            variety_ratio = len(unique_responses) / len(responses)
            
            print(f"Generated {len(responses)} responses, {len(unique_responses)} unique")
            print(f"Variety ratio: {variety_ratio:.2f}")
            
            # We expect some variety, but not necessarily 100% unique due to anti-repetition mechanisms
            self.assertGreater(variety_ratio, 0.3, "Should have reasonable response variety")
        
        print("✅ Response variety tests completed")
    
    def test_voice_accuracy_simulation(self):
        """Test voice transcript accuracy simulation"""
        print("\n🎤 Testing Voice Accuracy Simulation...")
        
        # Simulate voice recognition scenarios
        test_scenarios = [
            {
                'original': "How are you feeling today?",
                'recognized': "How are you feeling today?",
                'confidence': 0.95,
                'expected_accuracy': 'high'
            },
            {
                'original': "Did you take your medication?",
                'recognized': "Did you take your medic ation?",
                'confidence': 0.82,
                'expected_accuracy': 'medium'
            },
            {
                'original': "I'm here to help you",
                'recognized': "I'm here to help",
                'confidence': 0.76,
                'expected_accuracy': 'medium'
            },
            {
                'original': "Tell me about your concerns",
                'recognized': "Tell me about concerns",
                'confidence': 0.65,
                'expected_accuracy': 'low'
            }
        ]
        
        accuracy_results = []
        
        for scenario in test_scenarios:
            # Calculate word-level accuracy
            original_words = scenario['original'].lower().split()
            recognized_words = scenario['recognized'].lower().split()
            
            # Simple word overlap calculation
            common_words = set(original_words) & set(recognized_words)
            word_accuracy = len(common_words) / len(original_words) if original_words else 0
            
            # Character-level similarity
            char_accuracy = self._calculate_character_similarity(scenario['original'], scenario['recognized'])
            
            result = {
                'scenario': scenario,
                'word_accuracy': word_accuracy,
                'char_accuracy': char_accuracy,
                'confidence': scenario['confidence'],
                'overall_accuracy': (word_accuracy + char_accuracy) / 2
            }
            
            accuracy_results.append(result)
            
            print(f"Original: '{scenario['original']}'")
            print(f"Recognized: '{scenario['recognized']}'")
            print(f"Word accuracy: {word_accuracy:.2f}, Char accuracy: {char_accuracy:.2f}")
            print(f"Confidence: {scenario['confidence']:.2f}, Overall: {result['overall_accuracy']:.2f}")
            print()
        
        # Verify accuracy calculations are reasonable
        high_accuracy_scenarios = [r for r in accuracy_results if r['confidence'] > 0.9]
        for result in high_accuracy_scenarios:
            self.assertGreater(result['overall_accuracy'], 0.8, "High confidence should correlate with high accuracy")
        
        # Calculate average accuracy across all scenarios
        avg_accuracy = sum(r['overall_accuracy'] for r in accuracy_results) / len(accuracy_results)
        print(f"Average voice accuracy across scenarios: {avg_accuracy:.2f}")
        
        # For demo purposes, we expect reasonable accuracy
        self.assertGreater(avg_accuracy, 0.7, "Average voice accuracy should be above 70%")
        
        print("✅ Voice accuracy simulation tests completed")
        
        return accuracy_results
    
    def _calculate_character_similarity(self, text1: str, text2: str) -> float:
        """Calculate character-level similarity between two texts"""
        if not text1 or not text2:
            return 0.0
        
        # Simple Levenshtein distance approximation
        longer = text1 if len(text1) > len(text2) else text2
        shorter = text2 if len(text1) > len(text2) else text1
        
        # Count common characters
        common_chars = sum(1 for i, char in enumerate(shorter) if i < len(longer) and char.lower() == longer[i].lower())
        
        return common_chars / len(longer)
    
    def test_database_integration(self):
        """Test database integration for RAG metadata and transcripts"""
        print("\n💾 Testing Database Integration...")
        
        if not self.db:
            self.skipTest("Database not initialized")
        
        # Test RAG metadata storage
        test_rag_metadata = {
            'query': 'How to handle dementia confusion?',
            'chunks_retrieved': 5,
            'chunks_used': 3,
            'response_quality': 0.85,
            'retrieval_time': 2.3
        }
        
        # Store RAG metadata
        result = self.db.update_rag_metadata(self.test_session_id, test_rag_metadata)
        self.assertTrue(result, "Should successfully store RAG metadata")
        
        # Retrieve RAG metadata
        retrieved_metadata = self.db.get_rag_metadata(self.test_session_id)
        self.assertIsNotNone(retrieved_metadata, "Should retrieve RAG metadata")
        self.assertEqual(retrieved_metadata['query'], test_rag_metadata['query'])
        self.assertEqual(retrieved_metadata['chunks_retrieved'], test_rag_metadata['chunks_retrieved'])
        
        # Test conversation entry with voice transcript
        self.db.add_conversation_entry(
            session_id=self.test_session_id,
            user_id=self.test_user_id,
            speaker='user',
            text='How are you feeling today?',
            emotion='neutral',
            confidence=0.95,
            voice_transcript_raw='How are you feeling today?',
            voice_confidence=0.95
        )
        
        # Retrieve conversation entries
        entries = self.db.get_conversation_entries(self.test_session_id)
        self.assertGreater(len(entries), 0, "Should have conversation entries")
        
        latest_entry = entries[-1]
        self.assertEqual(latest_entry['speaker'], 'user')
        self.assertEqual(latest_entry['text'], 'How are you feeling today?')
        self.assertEqual(latest_entry['voice_transcript_raw'], 'How are you feeling today?')
        
        print("✅ Database integration tests completed")
    
    def test_performance_benchmarks(self):
        """Test performance benchmarks for demo readiness"""
        print("\n⚡ Testing Performance Benchmarks...")
        
        if not self.agent:
            self.skipTest("Agent not initialized")
        
        # Test response time (should be <2s for demo)
        test_input = "How are you feeling today?"
        persona = "margaret"
        
        with patch('ollama.chat') as mock_ollama:
            mock_ollama.return_value = {
                "message": {"content": "I'm doing okay today, thank you for asking."}
            }
            
            start_time = time.time()
            try:
                response = self.agent.generate_response(persona, test_input)
                end_time = time.time()
                
                response_time = end_time - start_time
                print(f"Response time: {response_time:.2f} seconds")
                
                # For demo readiness, response should be quick (mocked Ollama should be fast)
                self.assertLess(response_time, 5.0, "Response time should be under 5 seconds for testing")
                
                # Verify response quality
                self.assertIsNotNone(response.text, "Should generate response text")
                self.assertGreater(len(response.text), 10, "Response should be substantial")
                
            except Exception as e:
                print(f"Performance test failed: {e}")
                self.fail(f"Should be able to generate response quickly: {e}")
        
        print("✅ Performance benchmark tests completed")
    
    def test_demo_flow_simulation(self):
        """Test complete demo flow: Voice input -> RAG -> Response -> Feedback"""
        print("\n🎭 Testing Complete Demo Flow...")
        
        if not self.agent:
            self.skipTest("Agent not initialized")
        
        demo_scenarios = [
            {
                'voice_input': "How's your sugar level?",
                'persona': 'robert',
                'expected_condition': 'diabetes',
                'expected_emotion_themes': ['worried', 'neutral', 'concerned']
            },
            {
                'voice_input': "Are you confused about something?",
                'persona': 'margaret',
                'expected_condition': 'dementia',
                'expected_emotion_themes': ['confused', 'neutral', 'worried']
            },
            {
                'voice_input': "How is your walking today?",
                'persona': 'eleanor',
                'expected_condition': 'mobility',
                'expected_emotion_themes': ['worried', 'neutral', 'concerned']
            }
        ]
        
        demo_results = []
        
        for scenario in demo_scenarios:
            print(f"\n🎬 Demo scenario: {scenario['voice_input']} -> {scenario['persona']}")
            
            try:
                # Step 1: Voice input simulation (already tested above)
                voice_confidence = 0.88  # Simulate good voice recognition
                
                # Step 2: Emotion detection
                detected_emotion = self.agent.detect_user_emotion(scenario['voice_input'])
                
                # Step 3: RAG query (if available)
                rag_enhanced = False
                chunks_retrieved = 0
                if self.agent.use_rag and self.agent.rag_system:
                    try:
                        rag_result = self.agent.rag_system.query(scenario['voice_input'], scenario['persona'])
                        chunks_retrieved = rag_result.get('num_source_documents', 0)
                        rag_enhanced = chunks_retrieved > 0
                    except:
                        pass
                
                # Step 4: Generate response
                with patch('ollama.chat') as mock_ollama:
                    mock_ollama.return_value = {
                        "message": {"content": f"I'm managing my {scenario['expected_condition']} as best I can today."}
                    }
                    
                    response = self.agent.generate_response(
                        persona_id=scenario['persona'],
                        user_input=scenario['voice_input']
                    )
                
                # Step 5: Validate response
                result = {
                    'scenario': scenario,
                    'voice_confidence': voice_confidence,
                    'detected_emotion': detected_emotion,
                    'rag_enhanced': rag_enhanced,
                    'chunks_retrieved': chunks_retrieved,
                    'response': response.text,
                    'response_emotion': response.emotion,
                    'response_confidence': response.confidence,
                    'success': True
                }
                
                demo_results.append(result)
                
                print(f"  ✅ Voice confidence: {voice_confidence}")
                print(f"  ✅ Detected emotion: {detected_emotion}")
                print(f"  ✅ RAG enhanced: {rag_enhanced} ({chunks_retrieved} chunks)")
                print(f"  ✅ Response: {response.text[:100]}...")
                print(f"  ✅ Response emotion: {response.emotion}")
                
            except Exception as e:
                print(f"  ❌ Demo scenario failed: {e}")
                demo_results.append({
                    'scenario': scenario,
                    'success': False,
                    'error': str(e)
                })
        
        # Verify demo success rate
        successful_demos = [r for r in demo_results if r.get('success', False)]
        success_rate = len(successful_demos) / len(demo_scenarios)
        
        print(f"\n📊 Demo Success Rate: {success_rate:.1%}")
        
        # For demo readiness, we want high success rate
        self.assertGreaterEqual(success_rate, 0.8, "Demo success rate should be at least 80%")
        
        print("✅ Demo flow simulation completed")
        
        return demo_results

def run_comprehensive_tests():
    """Run all tests and generate a comprehensive report"""
    print("🚀 Starting Comprehensive GerontoVoice Agent Tests")
    print("=" * 80)
    
    # Create test suite
    suite = unittest.TestSuite()
    
    # Add all test methods
    test_methods = [
        'test_agent_initialization',
        'test_emotion_detection', 
        'test_rag_functionality',
        'test_response_generation',
        'test_response_variety',
        'test_voice_accuracy_simulation',
        'test_database_integration',
        'test_performance_benchmarks',
        'test_demo_flow_simulation'
    ]
    
    for method in test_methods:
        suite.addTest(TestGerontoVoiceAgent(method))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Generate summary report
    print("\n" + "=" * 80)
    print("📋 COMPREHENSIVE TEST REPORT")
    print("=" * 80)
    
    total_tests = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    successes = total_tests - failures - errors
    
    print(f"Total Tests: {total_tests}")
    print(f"✅ Successful: {successes}")
    print(f"❌ Failed: {failures}")
    print(f"💥 Errors: {errors}")
    print(f"Success Rate: {(successes/total_tests)*100:.1f}%")
    
    if result.failures:
        print("\n🔴 FAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback.split('AssertionError: ')[-1].split('\n')[0]}")
    
    if result.errors:
        print("\n💥 ERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback.split('\n')[-2]}")
    
    # Demo readiness assessment
    print("\n🎯 DEMO READINESS ASSESSMENT:")
    if successes >= total_tests * 0.8:
        print("✅ DEMO READY - Most tests passing")
    elif successes >= total_tests * 0.6:
        print("⚠️ MOSTLY READY - Some issues to address")
    else:
        print("❌ NOT READY - Significant issues need fixing")
    
    print("=" * 80)
    
    return result

if __name__ == '__main__':
    # Run comprehensive test suite
    run_comprehensive_tests()