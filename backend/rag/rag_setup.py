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

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# LangChain imports
from langchain_community.document_loaders import CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.memory import ConversationBufferMemory
from langchain_community.llms import Ollama
from langchain.schema import Document

# Local imports
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)

class GerontoRAGSystem:
    """RAG system for grounded AI responses using conversation data"""
    
    def __init__(self, 
                 csv_path: str = "data/merged_elder_care.csv",
                 faiss_index_path: str = "backend/rag/faiss_index",
                 model_name: str = "all-MiniLM-L6-v2",
                 chunk_size: int = 512,
                 chunk_overlap: int = 100,
                 top_k: int = 5,
                 llm_model: str = "llama2",
                 temperature: float = 0.7):
        """
        Initialize RAG system
        
        Args:
            csv_path: Path to conversation CSV data
            faiss_index_path: Path to save/load FAISS index
            model_name: Sentence transformer model name
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            top_k: Number of relevant chunks to retrieve
            llm_model: Ollama model to use
            temperature: Temperature for LLM generation
        """
        self.csv_path = csv_path
        self.faiss_index_path = faiss_index_path
        self.model_name = model_name
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.top_k = top_k
        self.llm_model = llm_model
        self.temperature = temperature
        
        # Initialize components
        self.embeddings = None
        self.vectorstore = None
        self.qa_chain = None
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True, k=5)
        self.ollama_llm = None
        
        logger.info("RAG system initialized with model: %s, chunk_size: %d, overlap: %d", 
                   self.model_name, self.chunk_size, self.chunk_overlap)
    
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
    
    def load_and_process_data(self) -> List[Document]:
        """Load and process conversation data from CSV"""
        try:
            # Try multiple paths for the merged CSV file
            csv_paths = [
                self.csv_path,
                "data/merged_elder_care.csv",
                "backend/data/merged_elder_care.csv",
                os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'merged_elder_care.csv'),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'merged_elder_care.csv'),
                os.path.join(os.getcwd(), 'data', 'merged_elder_care.csv'),
                os.path.join(os.getcwd(), 'backend', 'data', 'conversation_text.csv'),
                "backend/data/conversation_text.csv",
                "data/conversation_text.csv"
            ]
            
            csv_file = None
            for path in csv_paths:
                if os.path.exists(path):
                    csv_file = path
                    break
            
            if not csv_file:
                logger.warning(f"Conversation CSV not found at any of these paths: {csv_paths}")
                logger.info("Creating sample data for RAG system")
                return self._create_sample_data()
            
            # Load CSV data with proper error handling
            logger.info(f"Loading CSV data from {csv_file}")
            try:
                loader = CSVLoader(file_path=csv_file, encoding='utf-8')
                documents = loader.load()
                
                if not documents:
                    logger.warning(f"No documents loaded from {csv_file}, creating sample data")
                    return self._create_sample_data()
                
                logger.info(f"Successfully loaded {len(documents)} documents from CSV")
                logger.info(f"Retrieved {len(documents)} chunks from merged elder care dataset")
                
                # Log enhanced data verification
                if documents:
                    logger.info(f"Sample document content: {documents[0].page_content[:100]}...")
                    
                    # Count different types of conversations
                    speaker_counts = {}
                    condition_counts = {}
                    emotion_counts = {}
                    
                    for doc in documents:
                        content = doc.page_content.lower()
                        # Extract speaker info
                        if 'speaker: caregiver' in content or 'speaker: user' in content:
                            speaker_counts['caregiver'] = speaker_counts.get('caregiver', 0) + 1
                        elif 'speaker: elder' in content or 'speaker: ai' in content:
                            speaker_counts['elder'] = speaker_counts.get('elder', 0) + 1
                        
                        # Extract condition info
                        if 'dementia' in content:
                            condition_counts['dementia'] = condition_counts.get('dementia', 0) + 1
                        elif 'diabetes' in content:
                            condition_counts['diabetes'] = condition_counts.get('diabetes', 0) + 1
                        elif 'mobility' in content:
                            condition_counts['mobility'] = condition_counts.get('mobility', 0) + 1
                        else:
                            condition_counts['general'] = condition_counts.get('general', 0) + 1
                    
                    logger.info(f"Document analysis: Speakers {speaker_counts}, Conditions {condition_counts}")
                
                return documents
            except Exception as csv_error:
                logger.error(f"Error loading CSV file {csv_file}: {csv_error}")
                logger.info("Falling back to sample data")
                return self._create_sample_data()
            
        except Exception as e:
            logger.error(f"Failed to load conversation data: {e}")
            return self._create_sample_data()
    
    def _create_sample_data(self) -> List[Document]:
        """Create comprehensive sample conversation data for RAG"""
        sample_conversations = [
            # Margaret (Dementia) conversations
            "Hello Margaret, how are you feeling today? I'm here to help you with anything you need.",
            "I'm doing okay, thank you for asking. Sometimes I get a bit confused though, especially with my medication.",
            "I understand that must be difficult for you. Can you tell me more about what confuses you about your medication?",
            "Well, I sometimes forget where I put things, and I get worried about my family. I don't want to be a burden.",
            "You're not a burden at all, Margaret. You're important to us. Let's work together to make things easier for you.",
            "Have you taken your medication today? Let me help you check your pill organizer.",
            "I think so, but I'm not sure. I get confused about the timing. Thank you for helping me remember.",
            "Margaret, I notice you seem worried. What's on your mind today?",
            "I can't remember if my daughter called yesterday or last week. My memory isn't what it used to be.",
            "That must be frustrating. Would you like me to help you call her? There's no rush.",
            
            # Robert (Diabetes) conversations
            "Robert, how are your blood sugar levels today? Have you been monitoring them regularly?",
            "I've been trying to check them, but sometimes I forget. My vision gets blurry when my sugar is high.",
            "I understand it can be challenging to remember everything. What signs do you usually notice when your levels are high?",
            "Well, I get thirsty a lot and need to use the bathroom more often. Sometimes I feel tired too.",
            "Those are good signs to watch for. Would you mind checking your levels now? It helps me make sure you're okay.",
            "Robert, I noticed you haven't eaten much today. How are you feeling about your meals?",
            "I just don't feel like eating sometimes. Food doesn't taste the same as it used to.",
            "I can understand that must be frustrating. Are there any foods that still taste good to you?",
            "I still like soup, especially chicken soup. Reminds me of when my wife used to make it.",
            "That sounds wonderful. Maybe we could arrange for you to have soup more often.",
            
            # Eleanor (Mobility) conversations
            "Eleanor, I notice you're using your walker today. How are you managing with it?",
            "It's frustrating sometimes. I used to be so independent. Now I need this thing to get around safely.",
            "I can understand that must be difficult. You're still very independent - you're using tools that help you stay safe.",
            "I suppose you're right. I just worry about falling and being a burden to my family.",
            "Your safety is important, and using your walker shows you're taking good care of yourself. That's very wise.",
            "Eleanor, I see you seem hesitant about going to the community center. What's been on your mind?",
            "I'm afraid of falling in front of everyone. What if I can't keep up with the activities?",
            "Those are understandable concerns. What activities did you enjoy most at the center?",
            "I loved the book club and the gentle exercise class. But now I feel so slow compared to everyone else.",
            "Many people there probably have similar concerns. Your participation and insights are valuable regardless of pace.",
            
            # General empathy and communication examples
            "I understand this must be difficult for you. How can I best support you today?",
            "Thank you for being so patient with me. It means a lot to have someone who understands.",
            "Let's take this one step at a time. There's no need to rush through anything.",
            "You're doing great. It's okay to ask for help when you need it.",
            "I'm here to listen. Please tell me what's most important to you right now.",
            "Your feelings are completely valid. It's normal to feel frustrated sometimes.",
            "I appreciate you sharing that with me. It helps me understand how to better support you.",
            "We'll work together on this. You don't have to face these challenges alone."
        ]
        
        # Create Document objects with appropriate metadata
        documents = []
        personas = ['margaret', 'robert', 'eleanor', 'general']
        conditions = ['dementia', 'diabetes', 'mobility', 'general']
        emotions = ['empathetic', 'patient', 'understanding', 'encouraging', 'concerned', 'supportive']
        
        for i, text in enumerate(sample_conversations):
            # Assign persona based on content
            persona = 'general'
            condition = 'general'
            
            if 'margaret' in text.lower() or 'confused' in text.lower() or 'memory' in text.lower():
                persona = 'margaret'
                condition = 'dementia'
            elif 'robert' in text.lower() or 'blood sugar' in text.lower() or 'diabetes' in text.lower():
                persona = 'robert'
                condition = 'diabetes'
            elif 'eleanor' in text.lower() or 'walker' in text.lower() or 'falling' in text.lower():
                persona = 'eleanor'
                condition = 'mobility'
            
            metadata = {
                'source': 'sample_data',
                'index': i,
                'persona': persona,
                'condition': condition,
                'emotion': emotions[i % len(emotions)],
                'conversation_type': 'caregiver_training'
            }
            documents.append(Document(page_content=text, metadata=metadata))
        
        logger.info(f"Created {len(documents)} sample conversation documents with comprehensive metadata")
        return documents
    
    def create_vectorstore(self, documents: List[Document]) -> FAISS:
        """Create FAISS vectorstore from documents"""
        try:
            # Ensure embeddings are set up
            if not self.embeddings:
                self.setup_embeddings()
                
            # Create text splitter for chunking
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", " ", ""]
            )
            
            # Split documents into chunks
            chunks = text_splitter.split_documents(documents)
            logger.info(f"Split {len(documents)} documents into {len(chunks)} chunks")
            
            # Create FAISS vectorstore
            vectorstore = FAISS.from_documents(chunks, self.embeddings)
            logger.info(f"Created FAISS vectorstore with {len(chunks)} chunks")
            
            # Log retrieval confirmation
            logger.info(f"Retrieved {len(chunks)} chunks for RAG processing")
            
            # Save vectorstore
            os.makedirs(os.path.dirname(self.faiss_index_path), exist_ok=True)
            vectorstore.save_local(self.faiss_index_path)
            logger.info(f"Saved FAISS index to {self.faiss_index_path}")
            
            return vectorstore
            
        except Exception as e:
            logger.error(f"Failed to create vectorstore: {e}")
            raise
    
    def load_vectorstore(self) -> Optional[FAISS]:
        """Load FAISS vectorstore from disk"""
        try:
            # Ensure embeddings are set up
            if not self.embeddings:
                self.setup_embeddings()
            
            # Check if index exists
            if os.path.exists(self.faiss_index_path):
                # Load vectorstore with dangerous deserialization allowed
                vectorstore = FAISS.load_local(self.faiss_index_path, self.embeddings, allow_dangerous_deserialization=True)
                logger.info(f"Loaded FAISS index from {self.faiss_index_path}")
                
                # Log vectorstore statistics
                if hasattr(vectorstore, 'index') and hasattr(vectorstore.index, 'ntotal'):
                    chunk_count = vectorstore.index.ntotal
                    logger.info(f"Retrieved {chunk_count} chunks from loaded FAISS index")
                
                return vectorstore
            else:
                logger.warning(f"FAISS index not found at {self.faiss_index_path}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to load vectorstore: {e}")
            return None
    
    def setup_llm(self):
        """Setup Ollama LLM with connection testing"""
        try:
            self.ollama_llm = Ollama(
                model=self.llm_model,
                temperature=self.temperature,
                base_url="http://localhost:11434"  # Explicitly set Ollama URL
            )
            
            # Test the connection
            test_response = self.ollama_llm.invoke("Hello")
            logger.info(f"Ollama LLM initialized and tested successfully with model {self.llm_model}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Ollama LLM: {e}")
            logger.warning("RAG system will continue without LLM - responses will be based on retrieved chunks only")
            raise
    
    def setup_qa_chain(self):
        """Setup QA chain with retriever and LLM"""
        try:
            # Ensure vectorstore is set up
            if not self.vectorstore:
                self.vectorstore = self.load_vectorstore()
                if not self.vectorstore:
                    documents = self.load_and_process_data()
                    self.vectorstore = self.create_vectorstore(documents)
            
            # Ensure LLM is set up
            if not self.ollama_llm:
                self.setup_llm()
            
            # Create retriever
            retriever = self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": self.top_k}
            )
            
            # Create QA chain
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.ollama_llm,
                chain_type="stuff",
                retriever=retriever,
                return_source_documents=True,
                verbose=True
            )
            
            logger.info("QA chain initialized with retriever and LLM")
            
        except Exception as e:
            logger.error(f"Failed to setup QA chain: {e}")
            raise
    
    def query(self, query: str, persona: str = None) -> Dict[str, Any]:
        """
        Query the RAG system
        
        Args:
            query: User query
            persona: Optional persona context
            
        Returns:
            Dict with response text and retrieved documents
        """
        try:
            # Ensure QA chain is set up
            if not self.qa_chain:
                self.setup_qa_chain()
            
            # Add persona context if provided
            if persona:
                persona_context = f"You are simulating {persona}. "
                if persona.lower() == "margaret":
                    persona_context += "You are 78 years old with mild dementia. You sometimes get confused about your medication and daily activities."
                elif persona.lower() == "robert":
                    persona_context += "You are 72 years old with diabetes. You sometimes struggle with monitoring your blood sugar and following your diet."
                elif persona.lower() == "eleanor":
                    persona_context += "You are 85 years old with mobility issues. You use a walker and are concerned about falling."
                
                query = f"{persona_context}\n\nUser query: {query}"
            
            # Enhanced query logging
            logger.info(f"Querying RAG system: {query[:100]}...")
            logger.info(f"Using persona context: {persona if persona else 'None'}")
            logger.info(f"Expected to retrieve {self.top_k} relevant chunks")
            
            # Execute query
            start_time = datetime.now()
            result = self.qa_chain({"query": query})
            end_time = datetime.now()
            
            # Extract response and source documents
            response_text = result.get("result", "")
            source_docs = result.get("source_documents", [])
            
            # Enhanced results logging with detailed analysis
            query_time = (end_time - start_time).total_seconds()
            logger.info(f"Query completed in {query_time:.2f}s")
            logger.info(f"Retrieved {len(source_docs)} chunks for processing")
            
            if source_docs:
                logger.info("Retrieval successful - chunks found and processed")
                
                # Analyze retrieved chunks for persona relevance
                persona_matches = 0
                condition_matches = 0
                
                for i, doc in enumerate(source_docs):
                    content = doc.page_content.lower()
                    
                    # Check persona relevance
                    if persona and persona.lower() in content:
                        persona_matches += 1
                    
                    # Check condition relevance
                    conditions = ['dementia', 'diabetes', 'mobility']
                    for condition in conditions:
                        if condition in content:
                            condition_matches += 1
                            break
                    
                    # Log first 2 chunks for debugging
                    if i < 2:
                        logger.info(f"Chunk {i+1}: {doc.page_content[:100]}...")
                
                logger.info(f"Persona matches: {persona_matches}/{len(source_docs)}, Condition matches: {condition_matches}/{len(source_docs)}")
            else:
                logger.warning("No chunks retrieved for this query")
                logger.warning("This may indicate insufficient training data or embedding issues")
            
            # Format source documents for return
            formatted_sources = []
            for doc in source_docs:
                formatted_sources.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata
                })
            
            return {
                "response": response_text,
                "source_documents": formatted_sources,
                "query_time_seconds": query_time,
                "num_source_documents": len(source_docs)
            }
            
        except Exception as e:
            logger.error(f"Query failed: {e}")
            logger.error(f"No chunks retrieved due to error: {str(e)}")
            return {
                "response": f"I apologize, but I'm having trouble accessing my knowledge base right now. Could you please rephrase your question or try again?",
                "source_documents": [],
                "query_time_seconds": 0,
                "num_source_documents": 0,
                "error": str(e)
            }

# Singleton instance for application use
_rag_system = None

def get_rag_system() -> GerontoRAGSystem:
    """Get or create singleton RAG system instance"""
    global _rag_system
    if _rag_system is None:
        _rag_system = GerontoRAGSystem()
        # Initialize components
        _rag_system.setup_embeddings()
        try:
            _rag_system.vectorstore = _rag_system.load_vectorstore()
            if not _rag_system.vectorstore:
                documents = _rag_system.load_and_process_data()
                _rag_system.vectorstore = _rag_system.create_vectorstore(documents)
            _rag_system.setup_llm()
            _rag_system.setup_qa_chain()
        except Exception as e:
            logger.error(f"Failed to initialize RAG system: {e}")
    return _rag_system

# Utility function to get chunk count
def get_chunk_count() -> int:
    """Get the number of chunks in the vectorstore"""
    try:
        rag_system = get_rag_system()
        if rag_system and hasattr(rag_system, 'vectorstore') and rag_system.vectorstore:
            # Try multiple methods to get the count
            if hasattr(rag_system.vectorstore, 'index') and hasattr(rag_system.vectorstore.index, 'ntotal'):
                return rag_system.vectorstore.index.ntotal
            elif hasattr(rag_system.vectorstore, 'index_to_docstore_id'):
                return len(rag_system.vectorstore.index_to_docstore_id)
            elif hasattr(rag_system.vectorstore, 'docstore') and hasattr(rag_system.vectorstore.docstore, '_dict'):
                return len(rag_system.vectorstore.docstore._dict)
            else:
                logger.warning("Unable to determine exact chunk count")
                return 0
        return 0
    except Exception as e:
        logger.error(f"Failed to get chunk count: {e}")
        return 0

# Utility function to test RAG system
def test_rag_system() -> Dict[str, Any]:
    """Test RAG system functionality"""
    try:
        rag_system = get_rag_system()
        test_query = "How to handle dementia confusion?"
        
        result = rag_system.query(test_query)
        
        return {
            "status": "success",
            "test_query": test_query,
            "response_length": len(result.get("response", "")),
            "chunks_retrieved": result.get("num_source_documents", 0),
            "query_time": result.get("query_time_seconds", 0),
            "vectorstore_ready": rag_system.vectorstore is not None,
            "llm_ready": rag_system.ollama_llm is not None
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "vectorstore_ready": False,
            "llm_ready": False
        }
