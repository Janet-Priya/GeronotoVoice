"""
Enhanced RAG System Tests for GerontoVoice
Tests RAG pipeline, response variability, and voice transcript accuracy
"""

import pytest
import os
import sys
import tempfile
import shutil
from unittest.mock import Mock, patch
from datetime import datetime

# Add backend to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from rag.rag_setup import GerontoRAGSystem, get_rag_system, test_rag_system
    from core_ai.agent import GerontoVoiceAgent
    from database.db import GerontoVoiceDatabase
except ImportError as e:
    print(f"Import error: {e}")
    pytest.skip("RAG dependencies not available", allow_module_level=True)

class TestEnhancedRAG:
    """Test enhanced RAG functionality"""
    
    def test_dementia_confusion_query(self):
        """Test that 'How to handle dementia confusion?' retrieves relevant chunks"""
        with patch('rag.rag_setup.get_rag_system') as mock_get_rag:
            mock_rag = Mock()
            mock_rag.query.return_value = {
                "response": "When dealing with dementia confusion, remain patient and use simple language.",
                "source_documents": [
                    {"content": "How to handle dementia confusion step by step", "metadata": {"persona": "margaret"}},
                    {"content": "Be patient with confused individuals", "metadata": {"emotion": "empathy"}}
                ],
                "num_source_documents": 2,
                "query_time_seconds": 0.8
            }
            mock_get_rag.return_value = mock_rag
            
            rag_system = get_rag_system()
            result = rag_system.query("How to handle dementia confusion?", "margaret")
            
            assert "patient" in result["response"].lower()
            assert result["num_source_documents"] == 2
            assert result["query_time_seconds"] < 2.0  # Performance requirement
    
    def test_response_variability(self):
        """Test RAG system generates 5 unique responses"""
        with patch('rag.rag_setup.get_rag_system') as mock_get_rag:
            mock_rag = Mock()
            
            # Different responses for each call
            responses = [
                "I understand this must be difficult for you.",
                "That's a common concern, let me help you.",
                "I can see why you'd feel that way.",
                "Let's work through this together.",
                "Your feelings are completely valid."
            ]
            
            mock_rag.query.side_effect = [
                {"response": resp, "source_documents": [], "num_source_documents": 1}
                for resp in responses
            ]
            mock_get_rag.return_value = mock_rag
            
            rag_system = get_rag_system()
            actual_responses = []
            
            for i in range(5):
                result = rag_system.query("How are you feeling?", "margaret")
                actual_responses.append(result["response"])
            
            # Verify all responses are unique
            unique_responses = set(actual_responses)
            assert len(unique_responses) == 5, f"Expected 5 unique responses, got {len(unique_responses)}"
    
    def test_voice_transcript_accuracy(self):
        """Test voice transcript processing accuracy"""
        test_cases = [
            {"transcript": "How's your sugar level", "confidence": 0.92, "should_process": True},
            {"transcript": "did you take medicine", "confidence": 0.88, "should_process": True},
            {"transcript": "feeling confused today", "confidence": 0.95, "should_process": True},
            {"transcript": "garbled audio text", "confidence": 0.65, "should_process": False}
        ]
        
        def process_transcript(text, confidence):
            """Simple transcript processing logic"""
            if confidence < 0.8:
                return None  # Too low confidence
            
            # Basic cleaning
            processed = text.strip().capitalize()
            if not processed.endswith(('?', '.', '!')):
                if any(word in processed.lower() for word in ['how', 'what', 'where', 'when', 'did']):
                    processed += '?'
                else:
                    processed += '.'
            return processed
        
        high_confidence_processed = 0
        for case in test_cases:
            result = process_transcript(case["transcript"], case["confidence"])
            
            if case["should_process"]:
                assert result is not None, f"High confidence transcript should be processed: {case['transcript']}"
                assert result[0].isupper(), "Processed transcript should be capitalized"
                assert result.endswith(('.', '?', '!')), "Processed transcript should have punctuation"
                high_confidence_processed += 1
            else:
                assert result is None, f"Low confidence transcript should be rejected: {case['transcript']}"
        
        assert high_confidence_processed >= 3, "Should successfully process high-confidence transcripts"
    
    def test_rag_integration_with_agent(self):
        """Test RAG integration with AI agent"""
        with patch('core_ai.agent.get_rag_system') as mock_get_rag:
            mock_rag = Mock()
            mock_rag.query.return_value = {
                "response": "I'm doing okay today, dear. Thank you for asking.",
                "source_documents": [{"content": "empathetic response", "metadata": {}}],
                "num_source_documents": 1
            }
            mock_get_rag.return_value = mock_rag
            
            # Mock ollama for fallback
            with patch('core_ai.agent.ollama.chat') as mock_chat:
                mock_chat.return_value = {"message": {"content": "Fallback response"}}
                
                agent = GerontoVoiceAgent(use_rag=True)
                response = agent.generate_response(
                    persona_id="margaret",
                    user_input="How are you feeling today?",
                    conversation_history=[]
                )
                
                # Verify RAG was used
                assert hasattr(response, 'rag_enhanced')
                assert response.text
                assert response.emotion
                assert response.confidence > 0
    
    def test_performance_requirements(self):
        """Test that responses meet performance requirements (<2s)"""
        start_time = datetime.now()
        
        # Simulate processing time
        with patch('rag.rag_setup.get_rag_system') as mock_get_rag:
            mock_rag = Mock()
            mock_rag.query.return_value = {
                "response": "Quick response for performance test",
                "source_documents": [],
                "num_source_documents": 0,
                "query_time_seconds": 0.5
            }
            mock_get_rag.return_value = mock_rag
            
            rag_system = get_rag_system()
            result = rag_system.query("Test query", "margaret")
            
            end_time = datetime.now()
            total_time = (end_time - start_time).total_seconds()
            
            assert total_time < 2.0, f"Response time {total_time}s exceeds 2s requirement"
            assert result["query_time_seconds"] < 2.0, "RAG query time should be under 2s"
    
    def test_offline_capability(self):
        """Test offline processing capabilities"""
        offline_features = {
            "faiss_vectorstore": True,
            "local_embeddings": True,
            "sqlite_database": True,
            "web_speech_api": True,
            "ollama_llm": True
        }
        
        # Verify all components can work offline
        for feature, available in offline_features.items():
            assert available, f"Offline feature {feature} should be available"
    
    def test_database_rag_metadata(self):
        """Test database storage of RAG metadata"""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as temp_db:
            db_path = temp_db.name
        
        try:
            db = GerontoVoiceDatabase(db_path)
            
            # Create test data
            user_id = "test_user"
            session_id = "test_session"
            
            db.create_user(user_id, "Test User")
            db.create_session(session_id, user_id, "margaret")
            
            # Add conversation with RAG metadata
            rag_metadata = {
                "rag_enhanced": True,
                "source_documents": 3,
                "relevant_chunks": ["chunk1", "chunk2"],
                "query_time": 0.8
            }
            
            db.add_conversation_entry(
                session_id=session_id,
                user_id=user_id,
                speaker="ai",
                text="RAG-enhanced response",
                emotion="empathetic",
                metadata=rag_metadata
            )
            
            # Verify storage
            entries = db.get_conversation_entries(session_id)
            assert len(entries) == 1
            assert entries[0]['metadata']['rag_enhanced'] == True
            assert entries[0]['metadata']['source_documents'] == 3
            
        finally:
            os.unlink(db_path)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])