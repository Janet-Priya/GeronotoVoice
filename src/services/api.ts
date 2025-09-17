/**
 * Backend API Service for GerontoVoice
 * Handles communication with Python FastAPI backend
 */

import { 
  ConversationEntry, 
  SimulationRequest, 
  SimulationResponse,
  FeedbackRequest,
  FeedbackResponse,
  ProgressResponse,
  Persona,
  User,
  APIError,
  ServiceStatus,
  OfflineModeInfo
} from '../types/speech';

const API_BASE_URL = 'http://localhost:8000';

class GerontoVoiceAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorData: APIError = await response.json();
        throw new Error(errorData.detail || errorData.error || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health and Status
  async checkHealth(): Promise<ServiceStatus> {
    return this.makeRequest<ServiceStatus>('/health');
  }

  async getOfflineModeInfo(): Promise<OfflineModeInfo> {
    return this.makeRequest<OfflineModeInfo>('/offline');
  }

  // User Management
  async createUser(userId: string, name: string, email?: string): Promise<{ message: string; user_id: string; name: string }> {
    return this.makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        name,
        email
      })
    });
  }

  async getUser(userId: string): Promise<User> {
    return this.makeRequest<User>(`/users/${userId}`);
  }

  // Simulation
  async simulateConversation(
    userId: string,
    personaId: string,
    userInput: string,
    conversationHistory: ConversationEntry[] = []
  ): Promise<SimulationResponse> {
    const request: SimulationRequest = {
      user_id: userId,
      persona_id: personaId,
      user_input: userInput,
      conversation_history: conversationHistory
    };

    return this.makeRequest<SimulationResponse>('/simulate', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Feedback Analysis
  async analyzeConversation(
    sessionId: string,
    conversationData: ConversationEntry[]
  ): Promise<FeedbackResponse> {
    const request: FeedbackRequest = {
      session_id: sessionId,
      conversation_data: conversationData
    };

    return this.makeRequest<FeedbackResponse>('/feedback', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Progress Tracking
  async getUserProgress(userId: string): Promise<ProgressResponse> {
    return this.makeRequest<ProgressResponse>(`/progress/${userId}`);
  }

  async exportUserData(userId: string): Promise<any> {
    return this.makeRequest(`/export/${userId}`);
  }

  // Personas and Intents
  async getAvailablePersonas(): Promise<{ personas: Persona[] }> {
    return this.makeRequest<{ personas: Persona[] }>('/personas');
  }

  async getAvailableIntents(): Promise<{ intents: string[]; intent_descriptions: Record<string, string> }> {
    return this.makeRequest<{ intents: string[]; intent_descriptions: Record<string, string> }>('/intents');
  }

  // Utility Methods
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      console.warn('Backend not available:', error);
      return false;
    }
  }

  // Offline Mode Detection
  async checkOfflineCapabilities(): Promise<{
    isOfflineCapable: boolean;
    requirements: string[];
    setupInstructions: string[];
  }> {
    try {
      const offlineInfo = await this.getOfflineModeInfo();
      return {
        isOfflineCapable: offlineInfo.offline_capable,
        requirements: Object.values(offlineInfo.requirements),
        setupInstructions: offlineInfo.setup_instructions
      };
    } catch (error) {
      return {
        isOfflineCapable: false,
        requirements: ['Backend server must be running'],
        setupInstructions: ['Start the Python backend server']
      };
    }
  }
}

// Create singleton instance
export const apiService = new GerontoVoiceAPI();

// Export for testing or custom configuration
export { GerontoVoiceAPI };

// Utility functions for frontend integration
export const convertConversationToAPI = (
  conversation: Array<{ speaker: 'user' | 'ai'; text: string; timestamp: Date; emotion?: string; confidence?: number }>
): ConversationEntry[] => {
  return conversation.map(entry => ({
    speaker: entry.speaker,
    text: entry.text,
    timestamp: entry.timestamp.toISOString(),
    emotion: entry.emotion as any,
    confidence: entry.confidence
  }));
};

export const convertAPIResponseToConversation = (
  apiResponse: SimulationResponse,
  conversationHistory: ConversationEntry[]
): ConversationEntry[] => {
  return [
    ...conversationHistory,
    {
      speaker: 'ai' as const,
      text: apiResponse.ai_response,
      timestamp: apiResponse.timestamp,
      emotion: apiResponse.emotion as any,
      confidence: apiResponse.confidence
    }
  ];
};

// Error handling utilities
export const handleAPIError = (error: any): string => {
  if (error.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Offline mode utilities
export const getOfflineModeMessage = (): string => {
  return `
    GerontoVoice Offline Mode
    
    To use GerontoVoice with full AI capabilities:
    
    1. Install Ollama: https://ollama.ai/
    2. Pull Mistral model: ollama pull mistral
    3. Start Ollama service: ollama serve
    4. Start the Python backend server
    5. Refresh this page
    
    Current limitations without backend:
    - No AI persona responses
    - No skill analysis
    - No progress tracking
    - Limited to basic voice recognition
  `;
};
