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

// Generic API call with error handling
const apiCall = async <T>(
    endpoint: string, 
    options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
      
      if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    const data = await response.json();
    return { success: true, data };
    } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

// Simulate conversation with AI (RAG-enhanced)
export const simulateConversation = async (
    personaId: string,
    userInput: string,
    conversationHistory: ConversationEntry[] = []
): Promise<ConversationEntry> => {
  const result = await apiCall<ConversationEntry>('/simulate', {
    method: 'POST',
    body: JSON.stringify({
      user_id: 'demo_user', // Add user_id for RAG
      persona_id: personaId,
      user_input: userInput,
      conversation_history: conversationHistory,
      difficulty_level: 'Beginner'
    }),
  });

  if (result.success && result.data) {
    return result.data;
  }

  // Fallback to mock response
  return generateMockResponse(personaId, userInput);
};

// Check RAG system status
export const checkRAGStatus = async (): Promise<any> => {
  const result = await apiCall('/rag-status');
  
  if (result.success && result.data) {
    return result.data;
  }

  return {
    rag_enabled: false,
    rag_system_initialized: false,
    chunk_count: 0,
    vectorstore_ready: false,
    error: 'RAG status check failed'
  };
};

// Generate mock AI response for offline mode
const generateMockResponse = (personaId: string, userInput: string): ConversationEntry => {
  const personas = getDefaultPersonas();
  const persona = personas.find(p => p.id === personaId) || personas[0];
  
  const responses = {
    margaret: [
      "Oh, hello dear. I was just looking at some old photos... they bring back such wonderful memories. How are you today?",
      "I'm sorry, I seem to have forgotten what we were talking about. Could you remind me?",
      "You're so kind to visit me. I sometimes get confused, but I appreciate your patience.",
      "I remember when I was younger, I used to love gardening. Do you have any hobbies?",
      "Thank you for being so understanding. Sometimes I feel lost, but you make me feel safe."
    ],
    robert: [
      "Oh, hello there! I was just trying to organize all these pill bottles... there seem to be more every week.",
      "I know I should take my medication, but sometimes I forget. I don't want to be a burden.",
      "My doctor says I need to watch my diet, but it's hard to change habits at my age.",
      "I appreciate you checking on me, but I don't want to trouble anyone with my problems.",
      "Sometimes I worry about what will happen if I can't take care of myself anymore."
    ],
    eleanor: [
      "Good morning! I was thinking about going to the community center today, but I'm not sure...",
      "I used to walk everywhere, but now I need this walker. It's frustrating sometimes.",
      "I'm worried about falling. My daughter says I should be more careful, but I want to stay independent.",
      "Thank you for helping me. I know I need assistance, but I don't want to lose my dignity.",
      "I miss being able to do things on my own, but I'm grateful for people like you who care."
    ]
  };

  const personaResponses = responses[personaId as keyof typeof responses] || responses.margaret;
  const randomResponse = personaResponses[Math.floor(Math.random() * personaResponses.length)];
  
  return {
    speaker: 'ai',
    text: randomResponse,
    timestamp: new Date(),
    emotion: Math.random() > 0.5 ? 'empathetic' : 'neutral',
    confidence: 0.85 + Math.random() * 0.15
  };
};

// Get skill feedback
export const getSkillFeedback = async (
    sessionId: string,
  conversation: ConversationEntry[]
): Promise<SkillScore[]> => {
  const result = await apiCall<SkillScore[]>('/feedback', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      conversation_data: conversation,
    }),
  });

  if (result.success && result.data) {
    return result.data;
  }

  // Fallback to mock feedback
  return generateMockFeedback(conversation);
};

// Generate mock skill feedback
const generateMockFeedback = (conversation: ConversationEntry[]): SkillScore[] => {
  const baseScores = [75, 80, 85, 78];
  const improvements = [5, 8, 3, 6];
  
  return [
    {
      name: 'Empathy & Compassion',
      score: baseScores[0] + Math.floor(Math.random() * 15),
      feedback: 'Excellent emotional connection. Your responses showed genuine care and understanding.',
      improvement: improvements[0],
      icon: '❤️',
      trend: 'up'
    },
    {
      name: 'Active Listening',
      score: baseScores[1] + Math.floor(Math.random() * 15),
      feedback: 'Good attention to responses. Consider using more reflective statements to show understanding.',
      improvement: improvements[1],
      icon: '👂',
      trend: 'up'
    },
    {
      name: 'Clear Communication',
      score: baseScores[2] + Math.floor(Math.random() * 15),
      feedback: 'Outstanding use of simple, clear language. Perfect pace and tone for elderly care.',
      improvement: improvements[2],
      icon: '💬',
      trend: 'stable'
    },
    {
      name: 'Patience & Calm',
      score: baseScores[3] + Math.floor(Math.random() * 15),
      feedback: 'Demonstrated excellent patience during challenging moments. Keep up the great work!',
      improvement: improvements[3],
      icon: '🧘',
      trend: 'up'
    }
  ];
};

// Get user progress
export const getUserProgress = async (userId: string): Promise<UserProgress> => {
  const result = await apiCall<UserProgress>(`/progress/${userId}`);
  
  if (result.success && result.data) {
    return result.data;
  }

  // Fallback to offline data
  const offlineData = getOfflineData();
  if (offlineData?.progress) {
    return offlineData.progress;
  }

  // Return default progress
  return {
    userId,
    totalSessions: 0,
    averageScore: 0,
    currentLevel: 'Beginner',
    skillProgress: [],
    achievements: [],
    streak: 0,
    lastActive: new Date()
  };
};

// Save session
export const saveSession = async (session: Session): Promise<boolean> => {
  const result = await apiCall('/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });

  if (result.success) {
    // Also save to offline storage
    const offlineData = getOfflineData();
    const sessions = offlineData?.sessions || [];
    sessions.push(session);
    setOfflineData({ sessions });
    return true;
  }

  // Save to offline storage even if API fails
  const offlineData = getOfflineData();
  const sessions = offlineData?.sessions || [];
  sessions.push(session);
  setOfflineData({ sessions });
  return false;
};

// Export user data
export const exportUserData = async (userId: string): Promise<Blob | null> => {
  const result = await apiCall(`/export/${userId}`);
  
  if (result.success && result.data) {
    return new Blob([JSON.stringify(result.data)], { type: 'application/json' });
  }

  // Export offline data
  const offlineData = getOfflineData();
  if (offlineData) {
    return new Blob([JSON.stringify(offlineData)], { type: 'application/json' });
  }

  return null;
};

// Check if offline mode should be used
export const shouldUseOfflineMode = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return !response.ok;
  } catch {
    return true;
  }
};

// Sync offline data when connection is restored
export const syncOfflineData = async (): Promise<boolean> => {
  const offlineData = getOfflineData();
  if (!offlineData?.sessions) return true;

  try {
    // Attempt to sync sessions
    for (const session of offlineData.sessions) {
      await saveSession(session);
    }
    
    // Clear offline data after successful sync
    localStorage.removeItem(OFFLINE_KEY);
    return true;
  } catch (error) {
    console.warn('Failed to sync offline data:', error);
    return false;
  }
};

// Get community messages
export const getCommunityMessages = async (): Promise<CommunityMessage[]> => {
  const result = await apiCall<CommunityMessage[]>('/community/messages');
  
  if (result.success && result.data) {
    return result.data;
  }

  // Return mock community messages for demo
  return getMockCommunityMessages();
};

// Generate mock community messages
const getMockCommunityMessages = (): CommunityMessage[] => [
  {
    id: 'msg_1',
    author: 'Sarah Chen',
    avatar: 'SC',
    content: 'Just completed my first session with Margaret today. Her gentle confusion about her medication really touched my heart. The AI gave me such helpful tips on how to respond with patience and empathy. This platform is truly a blessing! 💙',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    reactions: [
      { emoji: '❤️', count: 8, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8'] },
      { emoji: '👍', count: 5, users: ['user9', 'user10', 'user11', 'user12', 'user13'] },
      { emoji: '😊', count: 3, users: ['user14', 'user15', 'user16'] }
    ]
  },
  {
    id: 'msg_2',
    author: 'Michael Rodriguez',
    avatar: 'MR',
    content: 'Has anyone else noticed how much their communication skills have improved? I used to get frustrated when my dad would repeat the same question, but now I understand it\'s part of his condition. The practice sessions really help!',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    reactions: [
      { emoji: '👍', count: 12, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12'] },
      { emoji: '💪', count: 7, users: ['user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19'] },
      { emoji: '❤️', count: 4, users: ['user20', 'user21', 'user22', 'user23'] }
    ]
  },
  {
    id: 'msg_3',
    author: 'Emma Thompson',
    avatar: 'ET',
    content: 'The empathy training with Robert was eye-opening. I learned that sometimes the best response is just to listen and validate their feelings. Thank you to everyone who shared their experiences - it really helps knowing we\'re not alone in this journey.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    reactions: [
      { emoji: '❤️', count: 15, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15'] },
      { emoji: '🤗', count: 9, users: ['user16', 'user17', 'user18', 'user19', 'user20', 'user21', 'user22', 'user23', 'user24'] },
      { emoji: '💙', count: 6, users: ['user25', 'user26', 'user27', 'user28', 'user29', 'user30'] }
    ]
  },
  {
    id: 'msg_4',
    author: 'David Kim',
    avatar: 'DK',
    content: 'Pro tip: I found that using Eleanor\'s scenario really helped me practice handling mobility concerns. The key is to maintain their dignity while offering support. The AI feedback was spot on!',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    reactions: [
      { emoji: '💡', count: 11, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11'] },
      { emoji: '👍', count: 8, users: ['user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19'] },
      { emoji: '⭐', count: 5, users: ['user20', 'user21', 'user22', 'user23', 'user24'] }
    ]
  },
  {
    id: 'msg_5',
    author: 'Lisa Johnson',
    avatar: 'LJ',
    content: 'My mom has been so much more responsive since I started using the techniques I learned here. She actually smiled when I used the reflective listening approach. This community is amazing! 🌟',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    reactions: [
      { emoji: '🌟', count: 18, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18'] },
      { emoji: '😊', count: 12, users: ['user19', 'user20', 'user21', 'user22', 'user23', 'user24', 'user25', 'user26', 'user27', 'user28', 'user29', 'user30'] },
      { emoji: '❤️', count: 9, users: ['user31', 'user32', 'user33', 'user34', 'user35', 'user36', 'user37', 'user38', 'user39'] }
    ]
  },
  {
    id: 'msg_6',
    author: 'James Wilson',
    avatar: 'JW',
    content: 'Just wanted to share that I achieved the "Patience Guru" badge today! It took 3 months of practice, but the feeling when you can stay calm during difficult moments is incredible. Keep practicing, everyone!',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    reactions: [
      { emoji: '🏆', count: 22, users: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15', 'user16', 'user17', 'user18', 'user19', 'user20', 'user21', 'user22'] },
      { emoji: '🎉', count: 16, users: ['user23', 'user24', 'user25', 'user26', 'user27', 'user28', 'user29', 'user30', 'user31', 'user32', 'user33', 'user34', 'user35', 'user36', 'user37', 'user38'] },
      { emoji: '💪', count: 13, users: ['user39', 'user40', 'user41', 'user42', 'user43', 'user44', 'user45', 'user46', 'user47', 'user48', 'user49', 'user50', 'user51'] }
    ]
  }
];