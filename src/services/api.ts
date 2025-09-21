import { ConversationEntry, Persona, SkillScore, Session, UserProgress, ApiResponse, OfflineData, CommunityMessage } from '../types';

const API_BASE_URL = 'http://localhost:8001';
const OFFLINE_KEY = 'geronto_voice_offline_data';

// Offline data management
const getOfflineData = (): OfflineData | null => {
  try {
    const data = localStorage.getItem(OFFLINE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setOfflineData = (data: Partial<OfflineData>): void => {
  try {
    const existing = getOfflineData() || {} as OfflineData;
    const updated = { ...existing, ...data, lastSync: new Date() };
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save offline data:', error);
  }
};

// Enhanced API call with retry logic and better error handling - DEMO OPTIMIZED
const apiCall = async <T>(
    endpoint: string, 
    options: RequestInit = {},
    retries = 1, // Reduced retries for faster demo response
    timeout = 3000 // Reduced timeout for quicker fallback
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    console.log(`API call: ${endpoint}`, { retries, timeout });
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });
    
    clearTimeout(timeoutId);
      
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      // Enhanced error logging
      console.error(`[API ERROR] Endpoint: ${endpoint} | Status: ${response.status} | Details: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`API success: ${endpoint}`, { dataKeys: Object.keys(data) });
    return { success: true, data };
  } catch (error) {
    clearTimeout(timeoutId);
    // Enhanced error logging
    console.error(`[API CALL FAILED] Endpoint: ${endpoint} | Error:`, error);
    
    // DEMO FIX: Immediate fallback for simulation endpoint
    if (endpoint === '/simulate' && options.method === 'POST') {
      console.log('DEMO MODE: Using immediate local fallback response');
      return {
        success: false,
        error: 'Backend connecting... using demo mode',
        offline: true
      };
    }
    
    // Network error retry logic (only one retry for demo speed)
    if (retries > 0 && (error instanceof TypeError || (error as any).name === 'AbortError')) {
      console.log(`Quick retry for ${endpoint}... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Faster retry
      return apiCall(endpoint, options, retries - 1, timeout);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Health check
export const checkHealth = async (): Promise<boolean> => {
  const result = await apiCall('/health');
  return result.success;
};

// Get available personas
export const getPersonas = async (): Promise<Persona[]> => {
  const result = await apiCall<Persona[]>('/personas');
  
  if (result.success && result.data) {
    return result.data;
  }

  // Fallback to offline data or default personas
  const offlineData = getOfflineData();
  if (offlineData?.sessions) {
    return getDefaultPersonas();
  }

  return getDefaultPersonas();
};

// Default personas for offline mode
const getDefaultPersonas = (): Persona[] => [
  {
    id: 'margaret',
    name: 'Margaret',
    age: 78,
    condition: 'Mild Dementia',
    avatar: '👵',
    personality: 'Gentle, sometimes confused, formerly independent',
    difficulty: 'beginner',
    description: 'Practice with Margaret, who experiences mild memory concerns and needs patient, empathetic communication.',
    nihSymptoms: ['Memory loss', 'Confusion with time/place', 'Trouble with familiar tasks']
  },
  {
    id: 'robert',
    name: 'Robert',
    age: 72,
    condition: 'Diabetes Management',
    avatar: '👴',
    personality: 'Stubborn, independent, worried about burden',
    difficulty: 'intermediate',
    description: 'Help Robert manage his diabetes care and medication while addressing his concerns about being a burden.',
    nihSymptoms: ['Increased thirst/urination', 'Fatigue', 'Blurred vision']
  },
  {
    id: 'eleanor',
    name: 'Eleanor',
    age: 83,
    condition: 'Mobility Issues',
    avatar: '👩‍🦳',
    personality: 'Proud, safety-conscious, socially active',
    difficulty: 'advanced',
    description: 'Support Eleanor with mobility challenges while maintaining her dignity and social connections.',
    nihSymptoms: ['Difficulty walking', 'Muscle weakness', 'Fear of falling']
  }
];

// Get difficulty level for persona
const getDifficultyForPersona = (personaId: string): string => {
  const personas = getDefaultPersonas();
  const persona = personas.find(p => p.id === personaId);
  return persona?.difficulty || 'beginner';
};

// Enhanced RAG-aware conversation simulation
export const simulateConversation = async (
    personaId: string,
    userInput: string,
    conversationHistory: ConversationEntry[] = [],
    userId: string = 'demo_user'
): Promise<ConversationEntry> => {
  // Log the request for debugging
  console.log('Simulating RAG-enhanced conversation:', { 
    personaId, 
    userInput: userInput.substring(0, 50) + '...', 
    historyLength: conversationHistory.length,
    timestamp: new Date().toISOString()
  });
  
  const result = await apiCall<{
    ai_response?: string;
    response?: string;
    text?: string;
    emotion: string;
    confidence: number;
    detected_user_emotion?: string;
    rag_enhanced?: boolean;
    relevant_chunks?: Array<{content: string; metadata: any}>;
    source_documents?: number;
    memory_context?: string[];
    difficulty_level?: string;
    speaker?: string;
    timestamp?: string;
  }>('/simulate', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      persona_id: personaId,
      user_input: userInput,
      conversation_history: conversationHistory.slice(-5).map(entry => ({
        speaker: entry.speaker,
        text: entry.text,
        timestamp: entry.timestamp,
        emotion: entry.emotion
      })),
      difficulty_level: getDifficultyForPersona(personaId)
    }),
  });

  if (result.success && result.data) {
    // Log successful RAG response
    console.log('RAG-enhanced simulation response:', {
      ragEnhanced: result.data.rag_enhanced,
      sourceDocuments: result.data.source_documents,
      relevantChunks: result.data.relevant_chunks?.length || 0,
      emotion: result.data.emotion,
      confidence: result.data.confidence
    });
    
    // Handle different response formats from the backend
    const responseText = result.data.ai_response || result.data.response || result.data.text || 'I understand you, dear.';
    
    // Format the enhanced response
    return {
      speaker: 'ai',
      text: responseText,
      timestamp: new Date(),
      emotion: result.data.emotion as any,
      confidence: result.data.confidence || 0.85
    };
  }

  // If we're in offline mode, generate a mock response
  if (result.offline) {
    console.log('DEMO MODE: Using enhanced contextual response');
    return generateMockResponse(personaId, userInput);
  }

  // Log the error and generate a fallback response
  console.error('Simulation failed, using fallback response:', result.error);
  return {
    speaker: 'ai',
    text: `Hello dear! I'm having a bit of trouble with my hearing today, but I'm so glad you're here to chat with me. Could you try speaking a bit slower? [Demo mode: Backend is starting up]`,
    timestamp: new Date(),
    emotion: 'empathetic',
    confidence: 0.7
  };
};



// Enhanced RAG system status check
export const checkRAGStatus = async (): Promise<{
  enabled: boolean;
  chunk_count: number;
  vectorstore_ready: boolean;
  llm_ready: boolean;
  embedding_model: string;
  index_path: string;
  last_query?: string;
  query_count?: number;
  error?: string;
}> => {
  const result = await apiCall<{
    enabled: boolean;
    chunk_count: number;
    vectorstore_ready: boolean;
    llm_ready: boolean;
    embedding_model: string;
    index_path: string;
    last_query?: string;
    query_count?: number;
    error?: string;
  }>('/rag-status');
  
  if (result.success && result.data) {
    console.log('RAG status:', result.data);
    return result.data;
  }

  console.error('RAG status check failed:', result.error);
  return {
    enabled: false,
    chunk_count: 0,
    vectorstore_ready: false,
    llm_ready: false,
    embedding_model: '',
    index_path: '',
    error: result.error || 'RAG status check failed'
  };
};

// Submit feedback on AI response
export const submitFeedback = async (
  sessionId: string,
  conversationId: string,
  rating: number,
  comment?: string
): Promise<boolean> => {
  const result = await apiCall('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      conversation_id: conversationId,
      rating,
      comment
    }),
  });

  return result.success;
};

// Generate mock AI response for offline mode - DEMO ENHANCED
const generateMockResponse = (personaId: string, userInput: string): ConversationEntry => {
  const personas = getDefaultPersonas();
  const persona = personas.find(p => p.id === personaId) || personas[0];
  
  // DEMO ENHANCEMENT: Context-aware responses based on user input
  const getContextualResponse = (input: string, personaId: string) => {
    const lowerInput = input.toLowerCase();
    
    // Greeting responses
    if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('how are you')) {
      const greetings = {
        margaret: [
          "Oh, hello dear! I'm doing well today, thank you for asking. I was just looking at some old photos.",
          "Hello! It's so nice to see a friendly face. I'm feeling quite good today, though my memory isn't what it used to be.",
          "Hi there! I'm having a lovely day. Would you like to sit and chat with me for a while?"
        ],
        robert: [
          "Hello! I'm doing alright, just keeping an eye on my sugar levels. How are you doing?",
          "Hi there! I'm feeling pretty good today. Just finished checking my blood sugar - all normal.",
          "Hello! Thanks for asking. I'm managing my diabetes well today, feeling energetic."
        ],
        eleanor: [
          "Hello dear! I'm doing well, just taking things slowly with my walker today.",
          "Hi! I'm feeling good, though I have to be careful moving around. But I'm staying positive!",
          "Hello! I'm having a nice day. Been thinking about calling my grandchildren later."
        ]
      };
      const responses = greetings[personaId as keyof typeof greetings] || greetings.margaret;
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Medicine/health related
    if (lowerInput.includes('medicine') || lowerInput.includes('medication') || lowerInput.includes('pills')) {
      const healthResponses = {
        margaret: [
          "Oh, my pills... I think I took them this morning, but sometimes I forget. There are so many of them!",
          "Medicine? Yes, I have quite a few pills to take. Sometimes I get confused about which is which."
        ],
        robert: [
          "Yes, I took my diabetes medication this morning with breakfast. I'm very careful about that.",
          "I never miss my insulin. It's too important. I check my blood sugar regularly too."
        ],
        eleanor: [
          "I take my pills every morning with my coffee. My daughter helps me organize them in a weekly container.",
          "Yes, I'm good about taking my medication. It helps with my joint pain and keeps me mobile."
        ]
      };
      const responses = healthResponses[personaId as keyof typeof healthResponses] || healthResponses.margaret;
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Feeling/emotion related
    if (lowerInput.includes('feel') || lowerInput.includes('today') || lowerInput.includes('doing')) {
      const feelingResponses = {
        margaret: [
          "I'm feeling a bit nostalgic today. Looking at old photos always makes me think of happier times.",
          "Some days are better than others. Today is a good day - I feel clear and remember things well.",
          "I feel grateful for visitors like you. It gets lonely sometimes, but conversations brighten my day."
        ],
        robert: [
          "I'm feeling strong today! My blood sugar is stable and I even took a short walk this morning.",
          "I feel determined to stay healthy. Managing diabetes isn't easy, but I'm doing my best.",
          "Honestly, I worry sometimes about being a burden, but today I feel hopeful and positive."
        ],
        eleanor: [
          "I feel blessed despite my challenges. Yes, I move slowly, but I'm still here and still enjoying life.",
          "Today I feel brave! I even went out to get the mail by myself - small victories matter.",
          "I feel proud of how I'm adapting. This walker is my friend now, not something to be ashamed of."
        ]
      };
      const responses = feelingResponses[personaId as keyof typeof feelingResponses] || feelingResponses.margaret;
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Default responses for other inputs
    const defaultResponses = {
      margaret: [
        "That's interesting, dear. Could you tell me more about that?",
        "You know, that reminds me of something from my past. Memory is such a funny thing.",
        "I appreciate you talking with me. What else would you like to know?"
      ],
      robert: [
        "That's a good point. I try to stay informed about health matters.",
        "I understand what you're saying. It's important to take care of ourselves, isn't it?",
        "Thank you for caring about my wellbeing. It means a lot to have support."
      ],
      eleanor: [
        "That sounds very thoughtful. I enjoy our conversations so much.",
        "You're very kind to spend time with me. What else is on your mind?",
        "I appreciate your patience with an old lady like me. Tell me more."
      ]
    };
    const responses = defaultResponses[personaId as keyof typeof defaultResponses] || defaultResponses.margaret;
    return responses[Math.floor(Math.random() * responses.length)];
  };
  
  return {
    speaker: 'ai',
    text: getContextualResponse(userInput, personaId),
    timestamp: new Date(),
    emotion: Math.random() > 0.5 ? 'empathetic' : 'calm',
    confidence: 0.85 + Math.random() * 0.15
  };
};

// Get skill feedback
export const getSkillFeedback = async (
    sessionId: string,
    personaId: string
): Promise<SkillScore[]> => {
  const result = await apiCall<SkillScore[]>(`/skills/${sessionId}/${personaId}`);
  
  if (result.success && result.data) {
    return result.data;
  }
  
  // Return mock skill scores for offline mode
  return [
    { 
      name: 'Empathy', 
      skill: 'Empathy', 
      score: Math.random() * 100, 
      feedback: 'Good empathetic responses',
      improvement: 5,
      icon: '❤️',
      trend: 'up',
      progress: 75
    },
    { 
      name: 'Clarity', 
      skill: 'Clarity', 
      score: Math.random() * 100, 
      feedback: 'Clear communication',
      improvement: 3,
      icon: '🔍',
      trend: 'stable',
      progress: 65
    },
    { 
      name: 'Patience', 
      skill: 'Patience', 
      score: Math.random() * 100, 
      feedback: 'Patient interactions',
      improvement: 7,
      icon: '⏱️',
      trend: 'up',
      progress: 80
    },
    { 
      name: 'Active Listening', 
      skill: 'Active Listening', 
      score: Math.random() * 100, 
      feedback: 'Good listening skills',
      improvement: 2,
      icon: '👂',
      trend: 'stable',
      progress: 70
    },
  ];
};

// Get user sessions
export const getUserSessions = async (userId: string): Promise<Session[]> => {
  const result = await apiCall<Session[]>(`/sessions/${userId}`);
  
  if (result.success && result.data) {
    return result.data;
  }
  
  // Return mock sessions for offline mode
  const offlineData = getOfflineData();
  if (offlineData?.sessions) {
    return offlineData.sessions;
  }
  
  return [];
};

// Get user progress
export const getUserProgress = async (userId: string): Promise<UserProgress> => {
  const result = await apiCall<UserProgress>(`/progress/${userId}`);
  
  if (result.success && result.data) {
    return result.data;
  }
  
  // Return mock progress for offline mode
  return {
    userId: 'demo_user',
    totalSessions: 5,
    averageScore: 75,
    currentLevel: 'Intermediate',
    skillProgress: [
      { name: 'Empathy', skill: 'Empathy', progress: 78, score: 78, feedback: 'Good progress', improvement: 5, icon: '❤️', trend: 'up' },
      { name: 'Clarity', skill: 'Clarity', progress: 65, score: 65, feedback: 'Improving', improvement: 3, icon: '🔍', trend: 'stable' },
      { name: 'Patience', skill: 'Patience', progress: 82, score: 82, feedback: 'Excellent', improvement: 7, icon: '⏱️', trend: 'up' },
      { name: 'Active Listening', skill: 'Active Listening', progress: 70, score: 70, feedback: 'Good', improvement: 2, icon: '👂', trend: 'stable' },
    ],
    achievements: [],
    streak: 3,
    lastActive: new Date()
  };
};

// Get community messages
export const getCommunityMessages = async (): Promise<CommunityMessage[]> => {
  const result = await apiCall<CommunityMessage[]>('/community');
  
  if (result.success && result.data) {
    return result.data;
  }
  
  // Return mock community messages for offline mode
  return [
    {
      id: '1',
      author: 'Sarah',
      role: 'Caregiver',
      message: 'I found the dementia simulation really helpful. It gave me more patience with my mother.',
      timestamp: new Date(Date.now() - 86400000 * 2),
      likes: 12
    },
    {
      id: '2',
      author: 'Michael',
      role: 'Nurse',
      message: 'The diabetes management scenario helped me understand the emotional aspects better.',
      timestamp: new Date(Date.now() - 86400000),
      likes: 8
    },
    {
      id: '3',
      author: 'Jessica',
      role: 'Family Member',
      message: 'I wish I had this training earlier. It would have made caring for my grandfather easier.',
      timestamp: new Date(),
      likes: 5
    }
  ];
};

// Save session data
export const saveSession = async (sessionId: string, conversation: ConversationEntry[], scenario: string): Promise<boolean> => {
  try {
    const result = await apiCall<{success: boolean}>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        conversation,
        scenario
      })
    });
    
    return result.success;
  } catch (error) {
    console.error('Failed to save session:', error);
    return false;
  }
};

// Export types for use in components
export type { 
  ConversationEntry, 
  Persona, 
  SkillScore, 
  Session, 
  UserProgress, 
  ApiResponse, 
  OfflineData, 
  CommunityMessage 
};
