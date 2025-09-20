#!/usr/bin/env python3
"""
RAG (Retrieval-Augmented Generation) Setup for GerontoVoice
Uses LangChain, FAISS, and Sentence Transformers for grounded AI responses
"""

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

# LangChain imports
from langchain_community.document_loaders import CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.memory import ConversationBufferMemory
from langchain_community.llms import Ollama

# Local imports
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core_ai.agent import GerontoVoiceAgent

logger = logging.getLogger(__name__)

class GerontoRAGSystem:
    """RAG system for grounded AI responses using conversation data"""
    
    def __init__(self, 
                 csv_path: str = "data/conversation_text.csv",
                 faiss_index_path: str = "backend/rag/faiss_index",
                 model_name: str = "all-MiniLM-L6-v2",
                 chunk_size: int = 512,
                 chunk_overlap: int = 50,
                 top_k: int = 5):
        """
        Initialize RAG system
        
        Args:
            csv_path: Path to conversation CSV data
            faiss_index_path: Path to save/load FAISS index
            model_name: Sentence transformer model name
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            top_k: Number of relevant chunks to retrieve
        """
        self.csv_path = csv_path
        self.faiss_index_path = faiss_index_path
        self.model_name = model_name
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.top_k = top_k
        
        # Initialize components
        self.embeddings = None
        self.vectorstore = None
        self.qa_chain = None
        self.memory = None
        self.ollama_llm = None
        
        # Initialize AI agent for persona handling
        self.ai_agent = GerontoVoiceAgent()
        
        logger.info("RAG system initialized")
    
    def setup_embeddings(self):
        """Setup sentence transformer embeddings"""
        try:
            self.embeddings = HuggingFaceEmbeddings(
                model_name=self.model_name,
                model_kwargs={'device': 'cpu'},  # Use CPU for compatibility
                encode_kwargs={'normalize_embeddings': True}
            )
            logger.info(f"Embeddings loaded: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load embeddings: {e}")
            raise
    
    def load_and_process_data(self) -> List[Dict]:
        """Load and process conversation data from CSV"""
        try:
            # Try multiple paths for the CSV file
            csv_paths = [
                self.csv_path,
                f"backend/{self.csv_path}",
                os.path.join(os.path.dirname(__file__), '..', self.csv_path),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), self.csv_path)
            ]
            
            csv_file = None
            for path in csv_paths:
                if os.path.exists(path):
                    csv_file = path
                    break
            
            if not csv_file:
                logger.warning("Conversation CSV not found, creating sample data")
                return self._create_sample_data()
            
            # Load CSV data
            loader = CSVLoader(file_path=csv_file, encoding='utf-8')
            documents = loader.load()
            
            # Process documents
            processed_docs = []
            for doc in documents:
                # Extract conversation data
                content = doc.page_content
                metadata = doc.metadata
                
                # Create structured conversation entry
                conversation_entry = {
                    'text': content,
                    'metadata': metadata,
                    'timestamp': datetime.now().isoformat(),
                    'source': csv_file
                }
                processed_docs.append(conversation_entry)
            
            logger.info(f"Loaded {len(processed_docs)} conversation entries")
            return processed_docs
            
        except Exception as e:
            logger.error(f"Failed to load conversation data: {e}")
            return self._create_sample_data()
    
    def _create_sample_data(self) -> List[Dict]:
        """Create sample conversation data for RAG"""
        sample_conversations = [
            {
                'text': "Hello Margaret, how are you feeling today? I'm here to help you with anything you need.",
                'metadata': {'speaker': 'caregiver', 'persona': 'margaret', 'topic': 'greeting'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "I'm doing okay, thank you for asking. Sometimes I get a bit confused though, especially with my medication.",
                'metadata': {'speaker': 'margaret', 'persona': 'margaret', 'topic': 'medication'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "I understand that must be difficult for you. Can you tell me more about what confuses you about your medication?",
                'metadata': {'speaker': 'caregiver', 'persona': 'margaret', 'topic': 'empathy'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "Well, I sometimes forget where I put things, and I get worried about my family. I don't want to be a burden.",
                'metadata': {'speaker': 'margaret', 'persona': 'margaret', 'topic': 'concerns'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "You're not a burden at all, Margaret. You're important to us. Let's work together to make things easier for you.",
                'metadata': {'speaker': 'caregiver', 'persona': 'margaret', 'topic': 'reassurance'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "Robert, how are your blood sugar levels today? Have you been monitoring them regularly?",
                'metadata': {'speaker': 'caregiver', 'persona': 'robert', 'topic': 'diabetes'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "I've been trying to check them, but sometimes I forget. My vision gets blurry when my sugar is high.",
                'metadata': {'speaker': 'robert', 'persona': 'robert', 'topic': 'diabetes_symptoms'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "Eleanor, I notice you're having trouble with your walker. Would you like me to help you get more comfortable?",
                'metadata': {'speaker': 'caregiver', 'persona': 'eleanor', 'topic': 'mobility'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            },
            {
                'text': "Yes, please. I'm afraid of falling, and my joints are so stiff in the morning.",
                'metadata': {'speaker': 'eleanor', 'persona': 'eleanor', 'topic': 'mobility_concerns'},
                'timestamp': datetime.now().isoformat(),
                'source': 'sample_data'
            }
        ]
        
        logger.info(f"Created {len(sample_conversations)} sample conversation entries")
        return sample_conversations
    
    def create_vectorstore(self, documents: List[Dict]) -> FAISS:
        """Create FAISS vectorstore from documents"""
        try:
            # Convert documents to LangChain format
            from langchain.schema import Document
            
            langchain_docs = []
            for doc in documents:
                langchain_doc = Document(
                    page_content=doc['text'],
                    metadata=doc['metadata']
                )
                langchain_docs.append(langchain_doc)
            
            # Split documents into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", " ", ""]
            )
            
            splits = text_splitter.split_documents(langchain_docs)
            logger.info(f"Split documents into {len(splits)} chunks")
            
            # Create vectorstore
            vectorstore = FAISS.from_documents(splits, self.embeddings)
            
            # Save vectorstore
            os.makedirs(os.path.dirname(self.faiss_index_path), exist_ok=True)
            vectorstore.save_local(self.faiss_index_path)
            logger.info(f"Vectorstore saved to {self.faiss_index_path}")
            
            return vectorstore
            
        except Exception as e:
            logger.error(f"Failed to create vectorstore: {e}")
            raise
    
    def load_vectorstore(self) -> Optional[FAISS]:
        """Load existing FAISS vectorstore"""
        try:
            if os.path.exists(self.faiss_index_path):
                vectorstore = FAISS.load_local(
                    self.faiss_index_path, 
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Vectorstore loaded from {self.faiss_index_path}")
                return vectorstore
            else:
                logger.info("No existing vectorstore found")
                return None
        except Exception as e:
            logger.error(f"Failed to load vectorstore: {e}")
            return None
    
    def setup_qa_chain(self, vectorstore: FAISS):
        """Setup RetrievalQA chain with Ollama"""
        try:
            # Initialize Ollama LLM with better parameters for variety
            self.ollama_llm = Ollama(
                model="llama2",
                temperature=0.7,  # Increased for more variety
                base_url="http://127.0.0.1:11434",
                top_p=0.9,  # Add top_p for better sampling
                top_k=40,   # Add top_k for diversity
                repeat_penalty=1.1  # Reduce repetition
            )
            
            # Setup memory
            self.memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="answer"
            )
            
            # Create retriever
            retriever = vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": self.top_k}
            )
            
            # Create QA chain
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.ollama_llm,
                chain_type="stuff",
                retriever=retriever,
                memory=self.memory,
                return_source_documents=True,
                verbose=True
            )
            
            logger.info("QA chain setup complete")
            
        except Exception as e:
            logger.error(f"Failed to setup QA chain: {e}")
            raise
    
    def initialize_rag_system(self):
        """Initialize the complete RAG system"""
        try:
            logger.info("Initializing RAG system...")
            
            # Setup embeddings
            self.setup_embeddings()
            
            # Try to load existing vectorstore
            self.vectorstore = self.load_vectorstore()
            
            # If no vectorstore exists, create one
            if self.vectorstore is None:
                logger.info("Creating new vectorstore...")
                documents = self.load_and_process_data()
                self.vectorstore = self.create_vectorstore(documents)
            
            # Setup QA chain
            self.setup_qa_chain(self.vectorstore)
            
            logger.info("RAG system initialization complete!")
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG system: {e}")
            raise
    
    def retrieve_relevant_chunks(self, query: str, persona_id: str = None) -> List[Dict]:
        """Retrieve relevant chunks for a query"""
        try:
            if self.vectorstore is None:
                logger.warning("Vectorstore not initialized")
                return []
            
            # Add persona context to query if provided
            if persona_id:
                persona_context = f"Persona: {persona_id}. Query: {query}"
            else:
                persona_context = query
            
            # Retrieve similar documents
            docs = self.vectorstore.similarity_search(
                persona_context, 
                k=self.top_k
            )
            
            # Format results
            results = []
            for i, doc in enumerate(docs):
                result = {
                    'chunk_id': i,
                    'text': doc.page_content,
                    'metadata': doc.metadata,
                    'relevance_score': 1.0 - (i * 0.1)  # Simple scoring
                }
                results.append(result)
            
            logger.info(f"Retrieved {len(results)} relevant chunks")
            return results
            
        except Exception as e:
            logger.error(f"Failed to retrieve chunks: {e}")
            return []
    
    def generate_grounded_response(self, 
                                 query: str, 
                                 persona_id: str,
                                 user_input: str,
                                 conversation_history: List[Dict] = None) -> Dict[str, Any]:
        """Generate grounded response using RAG with anti-repetition measures"""
        try:
            if self.qa_chain is None:
                logger.warning("QA chain not initialized")
                return self._fallback_response(query, persona_id, user_input)
            
            # Retrieve relevant chunks
            relevant_chunks = self.retrieve_relevant_chunks(query, persona_id)
            
            # Add conversation history context to prevent repetition
            history_context = ""
            if conversation_history:
                recent_messages = conversation_history[-3:]  # Last 3 messages
                history_context = "\n".join([
                    f"{msg.get('speaker', 'user')}: {msg.get('text', '')}" 
                    for msg in recent_messages
                ])
            
            # Create enhanced query with persona context and anti-repetition
            persona_context = self.ai_agent._get_persona_context(persona_id)
            enhanced_query = f"""
            Persona: {persona_id} ({persona_context.get('condition', 'elderly person')})
            User Input: {user_input}
            Recent Conversation:
            {history_context}
            
            Instructions: 
            - Respond as this persona would, based on the retrieved conversation examples
            - Avoid repeating recent responses
            - Be natural and varied in your responses
            - Show appropriate emotion for the situation
            """
            
            # Generate response using QA chain
            result = self.qa_chain({"query": enhanced_query})
            
            # Extract response and sources
            response_text = result.get("answer", "I'm not sure how to respond to that.")
            source_docs = result.get("source_documents", [])
            
            # Post-process to ensure variety
            response_text = self._ensure_response_variety(response_text, conversation_history)
            
            # Get emotion detection from AI agent
            detected_emotion = self.ai_agent.detect_user_emotion(user_input)
            
            # Create response
            response = {
                'text': response_text,
                'emotion': 'neutral',  # Will be determined by AI agent
                'confidence': 0.8,  # High confidence for RAG responses
                'persona_id': persona_id,
                'detected_user_emotion': detected_emotion,
                'relevant_chunks': relevant_chunks,
                'source_documents': len(source_docs),
                'timestamp': datetime.now().isoformat(),
                'rag_enhanced': True
            }
            
            logger.info(f"Generated grounded response for {persona_id} with {len(relevant_chunks)} chunks")
            return response
            
        except Exception as e:
            logger.error(f"Failed to generate grounded response: {e}")
            return self._fallback_response(query, persona_id, user_input)
    
    def _ensure_response_variety(self, response_text: str, conversation_history: List[Dict] = None) -> str:
        """Ensure response variety by checking against recent conversation"""
        if not conversation_history:
            return response_text
        
        # Check for exact repetition
        recent_responses = [
            msg.get('text', '') for msg in conversation_history[-5:] 
            if msg.get('speaker') == 'ai'
        ]
        
        # If response is too similar to recent ones, add variation
        for recent_response in recent_responses:
            if self._calculate_similarity(response_text, recent_response) > 0.8:
                logger.info("Detected repetitive response, adding variation")
                response_text = self._add_response_variation(response_text)
                break
        
        return response_text
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple similarity between two texts"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    def _add_response_variation(self, response_text: str) -> str:
        """Add variation to repetitive responses"""
        variations = [
            "Well, ",
            "You know, ",
            "I suppose ",
            "Actually, ",
            "I think ",
            "You see, ",
            "I mean, "
        ]
        
        # Add a variation prefix if not already present
        for variation in variations:
            if not response_text.lower().startswith(variation.lower().strip()):
                return variation + response_text.lower()
        
        return response_text
    
    def _fallback_response(self, query: str, persona_id: str, user_input: str) -> Dict[str, Any]:
        """Fallback response when RAG fails"""
        try:
            # Use regular AI agent as fallback
            ai_response = self.ai_agent.generate_response(
                persona_id=persona_id,
                user_input=user_input,
                conversation_history=[]
            )
            
            return {
                'text': ai_response.text,
                'emotion': ai_response.emotion,
                'confidence': ai_response.confidence,
                'persona_id': persona_id,
                'detected_user_emotion': ai_response.detected_user_emotion,
                'relevant_chunks': [],
                'source_documents': 0,
                'timestamp': datetime.now().isoformat(),
                'rag_enhanced': False
            }
            
        except Exception as e:
            logger.error(f"Fallback response failed: {e}")
            return {
                'text': "I'm sorry, I'm having trouble understanding. Could you please repeat that?",
                'emotion': 'neutral',
                'confidence': 0.3,
                'persona_id': persona_id,
                'detected_user_emotion': 'neutral',
                'relevant_chunks': [],
                'source_documents': 0,
                'timestamp': datetime.now().isoformat(),
                'rag_enhanced': False
            }

def initialize_rag_system() -> GerontoRAGSystem:
    """Initialize and return RAG system instance"""
    try:
        rag_system = GerontoRAGSystem()
        rag_system.initialize_rag_system()
        return rag_system
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        raise

if __name__ == "__main__":
    # Test RAG system
    logging.basicConfig(level=logging.INFO)
    
    try:
        print("🚀 Initializing RAG System...")
        rag = initialize_rag_system()
        
        print("✅ RAG System Ready!")
        print("Testing retrieval...")
        
        # Test retrieval
        chunks = rag.retrieve_relevant_chunks("dementia confusion", "margaret")
        print(f"Retrieved {len(chunks)} chunks")
        
        for i, chunk in enumerate(chunks):
            print(f"Chunk {i+1}: {chunk['text'][:100]}...")
        
    except Exception as e:
        print(f"❌ RAG System failed: {e}")
