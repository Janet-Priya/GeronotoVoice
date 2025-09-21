declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Backend API Types
export interface ConversationEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: string | Date;
  emotion?: 'neutral' | 'empathetic' | 'concerned' | 'encouraging' | 'confused' | 'agitated' | 'sad' | 'happy' | 'frustrated' | 'worried' | 'calm' | 'excited';
  confidence?: number;
  detected_user_emotion?: string;
  difficulty_level?: string;
  memory_context?: string[];
  rag_enhanced?: boolean;
  relevant_chunks?: Array<{content: string; metadata: any}>;
  source_documents?: number;
}

export interface SimulationRequest {
  user_id: string;
  persona_id: string;
  user_input: string;
  conversation_history: ConversationEntry[];
  difficulty_level?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface SimulationResponse {
  session_id: string;
  ai_response: string;
  emotion: string;
  confidence: number;
  intent?: string;
  detected_user_emotion: string;
  difficulty_level: string;
  memory_context: string[];
  timestamp: string;
  rag_enhanced?: boolean;
  relevant_chunks?: RAGChunk[];
  source_documents?: number;
}

export interface SkillScore {
  skill_name: string;
  score: number;
  confidence: number;
  feedback: string;
  improvement_suggestions: string[];
}

export interface FeedbackRequest {
  session_id: string;
  conversation_data: ConversationEntry[];
}

export interface FeedbackResponse {
  session_id: string;
  total_score: number;
  skill_scores: SkillScore[];
  insights: string[];
  progress_chart?: {
    sessions: string[];
    total_scores: number[];
    skill_scores: {
      empathy: number[];
      active_listening: number[];
      clear_communication: number[];
      patience: number[];
    };
    chart_html?: string;
  };
}

export interface ProgressResponse {
  user_id: string;
  total_sessions: number;
  average_score: number;
  skill_progress: Array<{
    skill_name: string;
    current_score: number;
    improvement_trend: number;
    sessions_practiced: number;
  }>;
  achievements: Array<{
    achievement_id: string;
    achievement_name: string;
    description: string;
    unlocked_at: string;
    progress: number;
  }>;
  recent_sessions: Array<{
    session_id: string;
    persona_id: string;
    start_time: string;
    end_time?: string;
    total_score: number;
    status: string;
  }>;
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  condition: string;
  description: string;
  greeting: string;
}

export interface User {
  user_id: string;
  name: string;
  email?: string;
  created_at: string;
  last_active: string;
  total_sessions: number;
  average_score: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
}

// API Error Types
export interface APIError {
  error: string;
  detail?: string;
}

// Backend Service Status
export interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    ai_agent: string;
    dialogue_manager: string;
    skill_analyzer: string;
    database: string;
  };
}

// Enhanced Emotion Detection Types
export interface EmotionDetection {
  detected_emotion: 'happy' | 'confused' | 'frustrated' | 'worried' | 'sad' | 'calm' | 'excited' | 'neutral';
  confidence: number;
  keywords_found: string[];
  timestamp: string;
}

// Difficulty Level Types
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface DifficultyConfig {
  level: DifficultyLevel;
  description: string;
  complexity_guidance: string;
  response_adaptation: string;
}

// Memory Context Types
export interface MemoryContext {
  recent_exchanges: Array<{
    user_input: string;
    user_emotion: string;
    timestamp: string;
  }>;
  conversation_topics: string[];
  persona_state: {
    mood: string;
    condition: string;
    memory_context: string[];
  };
}

// NIH Guidelines Types
export interface NIHGuideline {
  condition: string;
  symptom: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  intervention: string;
}

// RAG (Retrieval-Augmented Generation) Types
export interface RAGChunk {
  chunk_id: number;
  text: string;
  metadata: {
    speaker?: string;
    topic?: string;
    condition?: string;
    persona?: string;
  };
  relevance_score: number;
}

export interface RAGSimulationRequest {
  user_id: string;
  persona_id: string;
  user_input: string;
  conversation_history: Array<{
    speaker: string;
    text: string;
    timestamp: string;
  }>;
  difficulty_level?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface RAGSimulationResponse {
  session_id: string;
  ai_response: string;
  emotion: string;
  confidence: number;
  detected_user_emotion: string;
  difficulty_level: string;
  memory_context: string[];
  rag_enhanced: boolean;
  relevant_chunks: RAGChunk[];
  source_documents: number;
  timestamp: string;
}

// Offline Mode Information
export interface OfflineModeInfo {
  offline_capable: boolean;
  features: {
    ai_simulation: string;
    speech_processing: string;
    data_storage: string;
    skill_analysis: string;
    emotion_detection: string;
    conversation_memory: string;
    rag_enhancement: string;
  };
  requirements: {
    ollama: string;
    browser: string;
    storage: string;
    langchain: string;
    faiss: string;
    sentence_transformers: string;
  };
  setup_instructions: string[];
}

export {};