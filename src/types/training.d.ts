// Training session specific types
export interface TrainingSession {
  id: string;
  persona: string;
  condition: string;
  score: number;
  progress: number;
  transcript?: string;
  isActive: boolean;
  startTime: Date;
  lastActivity?: Date;
}

export interface Feedback {
  emotion: 'empathetic' | 'concerned' | 'encouraging' | 'neutral' | 'calm';
  value: number;
  message: string;
  improvement?: string;
}

export interface TrainingPersona {
  id: string;
  name: string;
  age: number;
  condition: string;
  avatar: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  backgroundColor: string;
  textColor: string;
  scenario: string;
}

export interface VoiceInput {
  transcript: string;
  confidence: number;
  isRecording: boolean;
  isProcessing: boolean;
}

export interface TrainingProgress {
  currentSession: number;
  totalSessions: number;
  overallScore: number;
  skills: {
    empathy: number;
    communication: number;
    patience: number;
    understanding: number;
  };
}

export interface TrainingResponse {
  response: string;
  emotion: string;
  score: number;
  feedback: Feedback;
  sessionProgress: number;
}