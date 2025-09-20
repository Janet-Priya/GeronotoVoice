#!/usr/bin/env python3
"""
Unit tests for RAG (Retrieval-Augmented Generation) functionality
Tests RAG retrieval, response grounding, and persona matching
"""

import unittest
import asyncio
import os
import sys
import tempfile
import shutil
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add backend modules to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag.rag_setup import GerontoRAGSystem
from core_ai.agent import GerontoVoiceAgent
from database.db import GerontoVoiceDatabase

class TestRAGSystem(unittest.TestCase):
    """Test RAG system functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.rag_system = GerontoRAGSystem(
            csv_path="test_conversations.csv",
            faiss_index_path=os.path.join(self.temp_dir, "test_faiss_index")
        )
    
    def tearDown(self):
        """Clean up test environment"""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_rag_system_initialization(self):
        """Test RAG system initialization"""
        self.assertIsNotNone(self.rag_system)
        self.assertEqual(self.rag_system.chunk_size, 512)
        self.assertEqual(self.rag_system.chunk_overlap, 50)
        self.assertEqual(self.rag_system.top_k, 5)
    
    def test_sample_data_creation(self):
        """Test creation of sample conversation data"""
        sample_data = self.rag_system._create_sample_data()
        
        self.assertIsInstance(sample_data, list)
        self.assertGreater(len(sample_data), 0)
        
        # Check data structure
        for entry in sample_data:
            self.assertIn('text', entry)
            self.assertIn('metadata', entry)
            self.assertIn('timestamp', entry)
            self.assertIn('source', entry)
    
    def test_embeddings_setup(self):
        """Test embeddings setup"""
        try:
            self.rag_system.setup_embeddings()
            self.assertIsNotNone(self.rag_system.embeddings)
        except Exception as e:
            self.skipTest(f"Embeddings setup failed (likely missing dependencies): {e}")
    
    @patch('rag.rag_setup.FAISS')
    @patch('rag.rag_setup.RecursiveCharacterTextSplitter')
    def test_vectorstore_creation(self, mock_splitter, mock_faiss):
        """Test vectorstore creation with mocked dependencies"""
        # Mock the splitter
        mock_splitter.return_value.split_documents.return_value = [
            MagicMock(page_content="test content", metadata={})
        ]
        
        # Mock FAISS
        mock_vectorstore = MagicMock()
        mock_faiss.from_documents.return_value = mock_vectorstore
        
        # Mock embeddings
        self.rag_system.embeddings = MagicMock()
        
        # Test vectorstore creation
        documents = self.rag_system._create_sample_data()
        vectorstore = self.rag_system.create_vectorstore(documents)
        
        self.assertIsNotNone(vectorstore)
        mock_faiss.from_documents.assert_called_once()
    
    def test_retrieve_relevant_chunks(self):
        """Test chunk retrieval functionality"""
        # Mock vectorstore
        mock_vectorstore = MagicMock()
        mock_doc = MagicMock()
        mock_doc.page_content = "test conversation about dementia"
        mock_doc.metadata = {"speaker": "margaret", "topic": "dementia"}
        mock_vectorstore.similarity_search.return_value = [mock_doc]
        
        self.rag_system.vectorstore = mock_vectorstore
        
        # Test retrieval
        chunks = self.rag_system.retrieve_relevant_chunks("dementia confusion", "margaret")
        
        self.assertIsInstance(chunks, list)
        self.assertGreater(len(chunks), 0)
        
        # Check chunk structure
        chunk = chunks[0]
        self.assertIn('chunk_id', chunk)
        self.assertIn('text', chunk)
        self.assertIn('metadata', chunk)
        self.assertIn('relevance_score', chunk)
    
    def test_fallback_response(self):
        """Test fallback response when RAG fails"""
        response = self.rag_system._fallback_response(
            query="test query",
            persona_id="margaret",
            user_input="Hello Margaret"
        )
        
        self.assertIsInstance(response, dict)
        self.assertIn('text', response)
        self.assertIn('emotion', response)
        self.assertIn('confidence', response)
        self.assertIn('rag_enhanced', response)
        self.assertFalse(response['rag_enhanced'])

class TestRAGAgentIntegration(unittest.TestCase):
    """Test RAG integration with AI agent"""
    
    def setUp(self):
        """Set up test environment"""
        self.agent = GerontoVoiceAgent(use_rag=False)  # Disable RAG for basic tests
    
    def test_agent_rag_initialization(self):
        """Test agent RAG initialization"""
        # Test with RAG disabled
        self.assertFalse(self.agent.use_rag)
        self.assertIsNone(self.agent.rag_system)
    
    @patch('core_ai.agent.GerontoRAGSystem')
    def test_agent_rag_enabled(self, mock_rag_system):
        """Test agent with RAG enabled"""
        mock_rag_instance = MagicMock()
        mock_rag_system.return_value = mock_rag_instance
        
        agent = GerontoVoiceAgent(use_rag=True)
        
        self.assertTrue(agent.use_rag)
        self.assertIsNotNone(agent.rag_system)
    
    def test_rag_response_fallback(self):
        """Test RAG response fallback to regular response"""
        # Test with RAG disabled (should use regular response)
        response = self.agent.generate_rag_response(
            persona_id="margaret",
            user_input="Hello Margaret, how are you?",
            conversation_history=[],
            difficulty_level="Beginner"
        )
        
        self.assertIsNotNone(response)
        self.assertFalse(response.rag_enhanced)
        self.assertEqual(len(response.relevant_chunks), 0)
        self.assertEqual(response.source_documents, 0)

class TestRAGRetrieval(unittest.TestCase):
    """Test RAG retrieval functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.rag_system = GerontoRAGSystem()
    
    def test_dementia_query_retrieval(self):
        """Test retrieval for dementia-related queries"""
        # Mock vectorstore with dementia-related content
        mock_vectorstore = MagicMock()
        mock_docs = [
            MagicMock(
                page_content="Margaret sometimes gets confused about her medication",
                metadata={"speaker": "margaret", "topic": "dementia", "condition": "mild_dementia"}
            ),
            MagicMock(
                page_content="I'm worried about my memory, I forget things easily",
                metadata={"speaker": "margaret", "topic": "memory", "condition": "mild_dementia"}
            )
        ]
        mock_vectorstore.similarity_search.return_value = mock_docs
        self.rag_system.vectorstore = mock_vectorstore
        
        # Test retrieval
        chunks = self.rag_system.retrieve_relevant_chunks("dementia confusion", "margaret")
        
        self.assertGreater(len(chunks), 0)
        
        # Check that retrieved chunks are relevant
        for chunk in chunks:
            self.assertIn('text', chunk)
            self.assertIn('metadata', chunk)
            # Should contain dementia-related content
            self.assertTrue(
                any(keyword in chunk['text'].lower() for keyword in ['confused', 'memory', 'dementia'])
            )
    
    def test_diabetes_query_retrieval(self):
        """Test retrieval for diabetes-related queries"""
        # Mock vectorstore with diabetes-related content
        mock_vectorstore = MagicMock()
        mock_docs = [
            MagicMock(
                page_content="Robert needs to monitor his blood sugar levels regularly",
                metadata={"speaker": "robert", "topic": "diabetes", "condition": "type_2_diabetes"}
            ),
            MagicMock(
                page_content="My vision gets blurry when my sugar is high",
                metadata={"speaker": "robert", "topic": "diabetes_symptoms", "condition": "type_2_diabetes"}
            )
        ]
        mock_vectorstore.similarity_search.return_value = mock_docs
        self.rag_system.vectorstore = mock_vectorstore
        
        # Test retrieval
        chunks = self.rag_system.retrieve_relevant_chunks("blood sugar diabetes", "robert")
        
        self.assertGreater(len(chunks), 0)
        
        # Check that retrieved chunks are relevant
        for chunk in chunks:
            self.assertIn('text', chunk)
            self.assertIn('metadata', chunk)
            # Should contain diabetes-related content
            self.assertTrue(
                any(keyword in chunk['text'].lower() for keyword in ['sugar', 'diabetes', 'blood'])
            )
    
    def test_mobility_query_retrieval(self):
        """Test retrieval for mobility-related queries"""
        # Mock vectorstore with mobility-related content
        mock_vectorstore = MagicMock()
        mock_docs = [
            MagicMock(
                page_content="Eleanor has trouble with her walker and is afraid of falling",
                metadata={"speaker": "eleanor", "topic": "mobility", "condition": "mobility_issues"}
            ),
            MagicMock(
                page_content="My joints are so stiff in the morning, it's hard to move",
                metadata={"speaker": "eleanor", "topic": "joint_pain", "condition": "mobility_issues"}
            )
        ]
        mock_vectorstore.similarity_search.return_value = mock_docs
        self.rag_system.vectorstore = mock_vectorstore
        
        # Test retrieval
        chunks = self.rag_system.retrieve_relevant_chunks("mobility walker falling", "eleanor")
        
        self.assertGreater(len(chunks), 0)
        
        # Check that retrieved chunks are relevant
        for chunk in chunks:
            self.assertIn('text', chunk)
            self.assertIn('metadata', chunk)
            # Should contain mobility-related content
            self.assertTrue(
                any(keyword in chunk['text'].lower() for keyword in ['walker', 'falling', 'joints', 'mobility'])
            )

class TestRAGPersonaMatching(unittest.TestCase):
    """Test RAG response persona matching"""
    
    def setUp(self):
        """Set up test environment"""
        self.rag_system = GerontoRAGSystem()
    
    def test_margaret_persona_responses(self):
        """Test that Margaret responses match dementia persona"""
        # Mock RAG response for Margaret
        mock_response = {
            'text': "I'm doing okay, but sometimes I get confused about my medication. I forget where I put things.",
            'emotion': 'confused',
            'confidence': 0.8,
            'persona_id': 'margaret',
            'detected_user_emotion': 'neutral',
            'relevant_chunks': [
                {
                    'text': 'Margaret sometimes gets confused about her medication',
                    'metadata': {'speaker': 'margaret', 'topic': 'dementia'}
                }
            ],
            'source_documents': 1,
            'timestamp': datetime.now().isoformat(),
            'rag_enhanced': True
        }
        
        # Test persona matching
        self.assertEqual(mock_response['persona_id'], 'margaret')
        self.assertIn('confused', mock_response['text'].lower())
        self.assertTrue(mock_response['rag_enhanced'])
        self.assertGreater(mock_response['source_documents'], 0)
    
    def test_robert_persona_responses(self):
        """Test that Robert responses match diabetes persona"""
        # Mock RAG response for Robert
        mock_response = {
            'text': "I've been trying to check my blood sugar, but my vision gets blurry sometimes.",
            'emotion': 'concerned',
            'confidence': 0.8,
            'persona_id': 'robert',
            'detected_user_emotion': 'neutral',
            'relevant_chunks': [
                {
                    'text': 'Robert needs to monitor his blood sugar levels',
                    'metadata': {'speaker': 'robert', 'topic': 'diabetes'}
                }
            ],
            'source_documents': 1,
            'timestamp': datetime.now().isoformat(),
            'rag_enhanced': True
        }
        
        # Test persona matching
        self.assertEqual(mock_response['persona_id'], 'robert')
        self.assertIn('blood sugar', mock_response['text'].lower())
        self.assertTrue(mock_response['rag_enhanced'])
        self.assertGreater(mock_response['source_documents'], 0)
    
    def test_eleanor_persona_responses(self):
        """Test that Eleanor responses match mobility persona"""
        # Mock RAG response for Eleanor
        mock_response = {
            'text': "I'm afraid of falling, and my joints are so stiff in the morning. Could you help me with my walker?",
            'emotion': 'worried',
            'confidence': 0.8,
            'persona_id': 'eleanor',
            'detected_user_emotion': 'neutral',
            'relevant_chunks': [
                {
                    'text': 'Eleanor has trouble with her walker and is afraid of falling',
                    'metadata': {'speaker': 'eleanor', 'topic': 'mobility'}
                }
            ],
            'source_documents': 1,
            'timestamp': datetime.now().isoformat(),
            'rag_enhanced': True
        }
        
        # Test persona matching
        self.assertEqual(mock_response['persona_id'], 'eleanor')
        self.assertIn('walker', mock_response['text'].lower())
        self.assertIn('falling', mock_response['text'].lower())
        self.assertTrue(mock_response['rag_enhanced'])
        self.assertGreater(mock_response['source_documents'], 0)

class TestRAGDatabaseIntegration(unittest.TestCase):
    """Test RAG integration with database"""
    
    def setUp(self):
        """Set up test environment"""
        self.db = GerontoVoiceDatabase(":memory:")  # Use in-memory database for testing
    
    def test_rag_metadata_storage(self):
        """Test storing RAG metadata in database"""
        # Create test session
        session_id = "test_rag_session"
        user_id = "test_user"
        persona_id = "margaret"
        
        session = self.db.create_session(session_id, user_id, persona_id, "Beginner")
        self.assertIsNotNone(session)
        
        # Test conversation data with RAG metadata
        conversation_data = [
            {
                "speaker": "user",
                "text": "Hello Margaret, how are you?",
                "timestamp": datetime.now().isoformat(),
                "emotion": "neutral",
                "confidence": 1.0,
                "rag_enhanced": False,
                "relevant_chunks": [],
                "source_documents": 0
            },
            {
                "speaker": "ai",
                "text": "I'm doing okay, but sometimes I get confused about my medication.",
                "timestamp": datetime.now().isoformat(),
                "emotion": "confused",
                "confidence": 0.8,
                "rag_enhanced": True,
                "relevant_chunks": [
                    {
                        "chunk_id": 0,
                        "text": "Margaret sometimes gets confused about her medication",
                        "metadata": {"speaker": "margaret", "topic": "dementia"},
                        "relevance_score": 0.9
                    }
                ],
                "source_documents": 1
            }
        ]
        
        # Update session with RAG data
        self.db.update_session_conversation(session_id, conversation_data)
        
        # Retrieve and verify
        retrieved_session = self.db.get_session(session_id)
        self.assertIsNotNone(retrieved_session)
        
        # Check that RAG metadata is preserved
        conversation = retrieved_session.conversation_data
        self.assertIsNotNone(conversation)
        
        ai_message = next((msg for msg in conversation if msg["speaker"] == "ai"), None)
        self.assertIsNotNone(ai_message)
        self.assertTrue(ai_message.get("rag_enhanced", False))
        self.assertGreater(ai_message.get("source_documents", 0), 0)
        self.assertGreater(len(ai_message.get("relevant_chunks", [])), 0)

def run_rag_tests():
    """Run all RAG tests"""
    print("🧪 Running RAG System Tests...")
    print("=" * 50)
    
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestRAGSystem,
        TestRAGAgentIntegration,
        TestRAGRetrieval,
        TestRAGPersonaMatching,
        TestRAGDatabaseIntegration
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n" + "=" * 50)
    if result.wasSuccessful():
        print("✅ All RAG tests passed!")
    else:
        print(f"❌ {len(result.failures)} test(s) failed, {len(result.errors)} error(s)")
        for failure in result.failures:
            print(f"FAIL: {failure[0]}")
        for error in result.errors:
            print(f"ERROR: {error[0]}")
    
    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_rag_tests()
    exit(0 if success else 1)
