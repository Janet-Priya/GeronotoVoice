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
  timestamp: string;
  emotion?: 'neutral' | 'empathetic' | 'concerned' | 'encouraging' | 'confused' | 'agitated' | 'sad';
  confidence?: number;
}

export interface SimulationRequest {
  user_id: string;
  persona_id: string;
  user_input: string;
  conversation_history: ConversationEntry[];
}

export interface SimulationResponse {
  session_id: string;
  ai_response: string;
  emotion: string;
  confidence: number;
  intent?: string;
  timestamp: string;
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

// Offline Mode Information
export interface OfflineModeInfo {
  offline_capable: boolean;
  features: {
    ai_simulation: string;
    speech_processing: string;
    data_storage: string;
    skill_analysis: string;
  };
  requirements: {
    ollama: string;
    browser: string;
    storage: string;
  };
  setup_instructions: string[];
}

export {};