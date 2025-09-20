// Core conversation interface
export interface ConversationEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
  emotion?: 'neutral' | 'empathetic' | 'concerned' | 'encouraging' | 'frustrated' | 'calm';
  confidence?: number;
}

// AI Personas
export interface Persona {
  id: string;
  name: string;
  age: number;
  condition: string;
  avatar: string;
  personality: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  nihSymptoms: string[];
}

// Skill assessment
export interface SkillScore {
  name: string;
  score: number;
  feedback: string;
  improvement: number;
  icon: string;
  trend: 'up' | 'down' | 'stable';
}

// Achievements and badges
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  category: 'session' | 'skill' | 'streak' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Session data
export interface Session {
  id: string;
  userId: string;
  personaId: string;
  startTime: Date;
  endTime?: Date;
  conversation: ConversationEntry[];
  skillScores: SkillScore[];
  totalScore: number;
  duration: number;
  status: 'active' | 'completed' | 'abandoned';
}

// User progress
export interface UserProgress {
  userId: string;
  totalSessions: number;
  averageScore: number;
  currentLevel: string;
  skillProgress: SkillScore[];
  achievements: Achievement[];
  streak: number;
  lastActive: Date;
}

// API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Voice settings
export interface VoiceSettings {
  enabled: boolean;
  language: string;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
}

// UI state
export interface UIState {
  currentPage: 'home' | 'simulation' | 'feedback' | 'progress' | 'community';
  isOnboarding: boolean;
  isListening: boolean;
  isProcessing: boolean;
  selectedPersona: string;
  selectedDifficulty: 'beginner' | 'intermediate' | 'advanced';
  voiceSettings: VoiceSettings;
}

// Chart data
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor: string | string[];
    borderWidth: number;
  }[];
}

// Community features
export interface CommunityPost {
  id: string;
  author: string;
  avatar: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  timeAgo: string;
  tags: string[];
}

// Language options
export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Offline data
export interface OfflineData {
  sessions: Session[];
  progress: UserProgress;
  settings: VoiceSettings;
  lastSync: Date;
}
