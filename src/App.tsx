import { useState, useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ConversationEntry, Achievement } from './types';
import { getPersonas, simulateConversation, saveSession } from './services/api';
import Home from './pages/Home';
import Simulation from './pages/Simulation';
import Feedback from './pages/Feedback';
import Progress from './pages/Progress';
import Community from './pages/Community';
import './styles/global.css';

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'simulation' | 'feedback' | 'progress' | 'community' | 'onboarding'>('onboarding');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [selectedLanguage] = useState('en-US');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [currentScenario, setCurrentScenario] = useState('mild-dementia');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = selectedLanguage;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        if (event.results[event.results.length - 1].isFinal) {
          const userMessage: ConversationEntry = {
            speaker: 'user',
            text: transcript,
            timestamp: new Date(),
            confidence: event.results[event.results.length - 1][0].confidence
          };
          
          setConversation(prev => [...prev, userMessage]);
          
          // Get AI response
          handleAIResponse(transcript);
        }
      };
    }

    // Initialize achievements
    setAchievements([
      { 
        id: 'first-session', 
        title: 'First Steps', 
        description: 'Complete your first training session', 
        icon: '🌟', 
        unlocked: false, 
        progress: 0,
        category: 'session',
        rarity: 'common'
      },
      { 
        id: 'empathy-master', 
        title: 'Empathy Expert', 
        description: 'Score 90+ on empathy in 3 sessions', 
        icon: '❤️', 
        unlocked: false, 
        progress: 0,
        category: 'skill',
        rarity: 'epic'
      },
      { 
        id: 'conversation-pro', 
        title: 'Conversation Pro', 
        description: 'Complete 10 training sessions', 
        icon: '💬', 
        unlocked: false, 
        progress: 0,
        category: 'session',
        rarity: 'rare'
      },
      { 
        id: 'patience-guru', 
        title: 'Patience Guru', 
        description: 'Maintain calm in difficult scenarios', 
        icon: '🧘', 
        unlocked: false, 
        progress: 0,
        category: 'skill',
        rarity: 'legendary'
      }
    ]);

    // Load personas
    loadPersonas();
  }, [selectedLanguage, voiceEnabled]);

  const loadPersonas = async () => {
    try {
      await getPersonas();
    } catch (error) {
      console.error('Failed to load personas:', error);
    }
  };

  const handleAIResponse = async (userInput: string) => {
    try {
      const response = await simulateConversation(
        currentScenario,
        userInput,
        conversation
      );
      
      setConversation(prev => [...prev, response]);
      
      if (voiceEnabled && synthesisRef.current) {
        const utterance = new SpeechSynthesisUtterance(response.text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      synthesisRef.current.speak(utterance);
    }
    } catch (error) {
      console.error('Failed to get AI response:', error);
    }
  };

  const startSession = (scenario?: string) => {
    if (scenario) setCurrentScenario(scenario);
    
    const sessionId = `session_${Date.now()}`;
    setCurrentSessionId(sessionId);
    setConversation([]);
    setCurrentPage('simulation');
    
    // Initial AI greeting
    const greetings = {
      'margaret': "Hello dear, I'm Margaret. I was just looking at some old photos... they bring back such wonderful memories. How are you today?",
      'robert': "Oh, hello there! I'm Robert. I was just trying to organize all these pill bottles... there seem to be more every week. Do you have a moment to chat?",
      'eleanor': "Good morning! I'm Eleanor. I was thinking about going to the community center today, but I'm not sure... What do you think?"
    };
    
    const greeting = greetings[scenario as keyof typeof greetings] || greetings['margaret'];
    
    setTimeout(() => {
      const aiMessage: ConversationEntry = {
        speaker: 'ai',
        text: greeting,
        timestamp: new Date(),
        emotion: 'neutral'
      };
      
      setConversation([aiMessage]);
      
      if (voiceEnabled && synthesisRef.current) {
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        synthesisRef.current.speak(utterance);
      }
    }, 1000);
  };

  const endSession = async () => {
    setSessionCount(prev => prev + 1);
    
    // Skill scores will be handled by the Feedback component
    
    // Update achievements
    setAchievements(prev => prev.map(achievement => {
      if (achievement.id === 'first-session' && sessionCount === 0) {
        return { ...achievement, unlocked: true, progress: 100 };
      }
      if (achievement.id === 'conversation-pro') {
        const progress = Math.min(((sessionCount + 1) / 10) * 100, 100);
        return { ...achievement, progress, unlocked: progress === 100 };
      }
      return achievement;
    }));
    
    // Save session
    if (currentSessionId) {
      try {
        await saveSession({
          id: currentSessionId,
          userId: 'demo_user',
          personaId: currentScenario,
          startTime: new Date(),
          endTime: new Date(),
          conversation,
          skillScores: [],
          totalScore: 85,
          duration: 0,
          status: 'completed'
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
    
    setCurrentPage('feedback');
  };


  const handleNavigate = (page: string) => {
    setCurrentPage(page as any);
  };

  const handleVoiceToggle = (enabled: boolean) => {
    setVoiceEnabled(enabled);
  };


  // Check if onboarding should be shown
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('geronto_voice_onboarding_completed');
    if (hasCompletedOnboarding) {
      setCurrentPage('home');
    }
  }, []);

  return (
    <div className="App">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          },
        }}
      />
      
      {currentPage === 'onboarding' && (
        <Home
          onStartSimulation={startSession}
          onNavigate={handleNavigate}
          sessionCount={sessionCount}
          achievements={achievements}
          voiceEnabled={voiceEnabled}
          onVoiceToggle={handleVoiceToggle}
        />
      )}

      {currentPage === 'home' && (
        <Home
      onStartSimulation={startSession}
          onNavigate={handleNavigate}
      sessionCount={sessionCount}
      achievements={achievements}
      voiceEnabled={voiceEnabled}
          onVoiceToggle={handleVoiceToggle}
        />
      )}

      {currentPage === 'simulation' && (
        <Simulation
          onNavigate={handleNavigate}
      onEndSession={endSession}
          selectedPersona={currentScenario}
      voiceEnabled={voiceEnabled}
          onVoiceToggle={handleVoiceToggle}
        />
      )}

      {currentPage === 'feedback' && (
        <Feedback
          onNavigate={handleNavigate}
          onRestartSession={startSession}
      conversationLength={conversation.length}
      sessionCount={sessionCount}
        />
      )}

      {currentPage === 'progress' && (
        <Progress
          onNavigate={handleNavigate}
          sessionCount={sessionCount}
          achievements={achievements}
        />
      )}

      {currentPage === 'community' && (
        <Community
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}

export default App;
