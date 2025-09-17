import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, Square, Settings, BarChart3, Heart, User, Home, MessageCircle, TrendingUp, Star, Award, Sparkles, Brain, Shield, Zap, Clock, Users, ChevronRight, Volume2, VolumeX, RotateCcw, Target, Trophy, Lightbulb, CheckCircle, ArrowRight, Headphones, Activity } from 'lucide-react';

// Types
interface ConversationEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
  emotion?: 'neutral' | 'empathetic' | 'concerned' | 'encouraging';
  confidence?: number;
}

interface SkillScore {
  name: string;
  score: number;
  feedback: string;
  improvement: number;
  icon: React.ReactNode;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
}

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'simulation' | 'feedback' | 'onboarding'>('onboarding');
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [skillScores, setSkillScores] = useState<SkillScore[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [currentScenario, setCurrentScenario] = useState('mild-dementia');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

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
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        if (event.results[event.results.length - 1].isFinal) {
          setIsProcessing(true);
          setConversation(prev => [...prev, {
            speaker: 'user',
            text: transcript,
            timestamp: new Date(),
            confidence: event.results[event.results.length - 1][0].confidence
          }]);
          
          // Simulate AI processing with realistic delay
          setTimeout(() => {
            const aiResponse = generateAIResponse(transcript);
            setConversation(prev => [...prev, {
              speaker: 'ai',
              text: aiResponse.text,
              timestamp: new Date(),
              emotion: aiResponse.emotion
            }]);
            if (voiceEnabled) {
              speakText(aiResponse.text);
            }
            setIsProcessing(false);
          }, 1200 + Math.random() * 800);
        }
      };
    }

    // Initialize achievements
    setAchievements([
      { id: 'first-session', title: 'First Steps', description: 'Complete your first training session', icon: <Star className="h-5 w-5" />, unlocked: false, progress: 0 },
      { id: 'empathy-master', title: 'Empathy Expert', description: 'Score 90+ on empathy in 3 sessions', icon: <Heart className="h-5 w-5" />, unlocked: false, progress: 0 },
      { id: 'conversation-pro', title: 'Conversation Pro', description: 'Complete 10 training sessions', icon: <MessageCircle className="h-5 w-5" />, unlocked: false, progress: 0 },
      { id: 'patience-guru', title: 'Patience Guru', description: 'Maintain calm in difficult scenarios', icon: <Brain className="h-5 w-5" />, unlocked: false, progress: 0 }
    ]);
  }, [selectedLanguage, voiceEnabled]);

  const generateAIResponse = (userInput: string): { text: string; emotion: 'neutral' | 'empathetic' | 'concerned' | 'encouraging' } => {
    const responses = [
      { text: "I understand you're feeling overwhelmed. That's completely normal when caring for someone with memory issues. You're doing better than you think.", emotion: 'empathetic' as const },
      { text: "Thank you for your patience with me. Can you tell me more about how you're feeling right now? I'm here to listen.", emotion: 'encouraging' as const },
      { text: "It's important to remember that taking breaks is part of good caregiving. How are you taking care of yourself these days?", emotion: 'concerned' as const },
      { text: "That sounds really challenging. Many caregivers face similar situations, and you're not alone. What has worked for you before?", emotion: 'empathetic' as const },
      { text: "I appreciate you sharing that with me. Let's practice some techniques that might help in this situation. You're learning so well.", emotion: 'encouraging' as const }
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const speakText = (text: string) => {
    if (synthesisRef.current && voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      synthesisRef.current.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  const startSession = (scenario?: string) => {
    setSessionActive(true);
    setConversation([]);
    setCurrentPage('simulation');
    if (scenario) setCurrentScenario(scenario);
    
    // Initial AI greeting with personality
    const greetings = {
      'mild-dementia': "Hello dear, I'm Margaret. I was just looking at some old photos... they bring back such wonderful memories. How are you today?",
      'diabetes-management': "Oh, hello there! I'm Robert. I was just trying to organize all these pill bottles... there seem to be more every week. Do you have a moment to chat?",
      'mobility-assistance': "Good morning! I'm Eleanor. I was thinking about going to the community center today, but I'm not sure... What do you think?"
    };
    
    const greeting = greetings[scenario as keyof typeof greetings] || greetings['mild-dementia'];
    
    setTimeout(() => {
      setConversation([{
        speaker: 'ai',
        text: greeting,
        timestamp: new Date(),
        emotion: 'neutral'
      }]);
      if (voiceEnabled) {
        speakText(greeting);
      }
    }, 1000);
  };

  const endSession = () => {
    setSessionActive(false);
    stopListening();
    setSessionCount(prev => prev + 1);
    
    // Generate enhanced skill scores with improvements
    const scores: SkillScore[] = [
      { 
        name: 'Empathy & Compassion', 
        score: 85 + Math.floor(Math.random() * 10), 
        feedback: 'Excellent emotional connection. Your responses showed genuine care and understanding.',
        improvement: Math.floor(Math.random() * 15) + 5,
        icon: <Heart className="h-5 w-5" />
      },
      { 
        name: 'Active Listening', 
        score: 78 + Math.floor(Math.random() * 15), 
        feedback: 'Good attention to responses. Consider using more reflective statements to show understanding.',
        improvement: Math.floor(Math.random() * 12) + 3,
        icon: <Headphones className="h-5 w-5" />
      },
      { 
        name: 'Clear Communication', 
        score: 92 + Math.floor(Math.random() * 8), 
        feedback: 'Outstanding use of simple, clear language. Perfect pace and tone for elderly care.',
        improvement: Math.floor(Math.random() * 8) + 2,
        icon: <MessageCircle className="h-5 w-5" />
      },
      { 
        name: 'Patience & Calm', 
        score: 88 + Math.floor(Math.random() * 12), 
        feedback: 'Demonstrated excellent patience during challenging moments. Keep up the great work!',
        improvement: Math.floor(Math.random() * 10) + 4,
        icon: <Brain className="h-5 w-5" />
      }
    ];
    setSkillScores(scores);
    
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
    
    setCurrentPage('feedback');
  };

  if (currentPage === 'onboarding') {
    return <OnboardingPage onComplete={() => setCurrentPage('home')} />;
  }

  if (currentPage === 'home') {
    return <HomePage 
      onStartSimulation={startSession}
      selectedLanguage={selectedLanguage}
      onLanguageChange={setSelectedLanguage}
      onNavigate={setCurrentPage}
      sessionCount={sessionCount}
      achievements={achievements}
      voiceEnabled={voiceEnabled}
      onVoiceToggle={setVoiceEnabled}
    />;
  }

  if (currentPage === 'simulation') {
    return <SimulationPage
      conversation={conversation}
      isListening={isListening}
      sessionActive={sessionActive}
      onStartListening={startListening}
      onStopListening={stopListening}
      onEndSession={endSession}
      onNavigate={setCurrentPage}
      currentScenario={currentScenario}
      voiceEnabled={voiceEnabled}
      onVoiceToggle={setVoiceEnabled}
      isProcessing={isProcessing}
    />;
  }

  if (currentPage === 'feedback') {
    return <FeedbackPage
      skillScores={skillScores}
      conversationLength={conversation.length}
      onNavigate={setCurrentPage}
      onRestartSession={startSession}
      achievements={achievements}
      sessionCount={sessionCount}
    />;
  }

  return null;
}

// Onboarding Page Component
function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to GerontoVoice",
      subtitle: "AI-Powered Caregiver Training",
      description: "Practice empathetic conversations with elderly individuals in a safe, supportive environment.",
      icon: <Heart className="h-16 w-16 text-rose-400" />,
      gradient: "from-rose-400 to-pink-500"
    },
    {
      title: "Voice-First Experience",
      subtitle: "Natural Conversations",
      description: "Simply speak naturally. Our AI listens, understands, and responds with empathy and wisdom.",
      icon: <Mic className="h-16 w-16 text-blue-400" />,
      gradient: "from-blue-400 to-indigo-500"
    },
    {
      title: "Personalized Feedback",
      subtitle: "Grow Your Skills",
      description: "Receive detailed insights on empathy, communication, and caregiving techniques after each session.",
      icon: <BarChart3 className="h-16 w-16 text-green-400" />,
      gradient: "from-green-400 to-emerald-500"
    },
    {
      title: "Ready to Begin?",
      subtitle: "Your Journey Starts Now",
      description: "Join thousands of caregivers who've improved their skills and confidence through practice.",
      icon: <Sparkles className="h-16 w-16 text-purple-400" />,
      gradient: "from-purple-400 to-violet-500"
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center transform transition-all duration-500 hover:scale-105">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-r ${currentStepData.gradient} mx-auto mb-6 flex items-center justify-center shadow-lg`}>
            {currentStepData.icon}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {currentStepData.title}
          </h1>
          
          <p className="text-lg text-blue-600 font-semibold mb-4">
            {currentStepData.subtitle}
          </p>
          
          <p className="text-gray-600 leading-relaxed mb-8">
            {currentStepData.description}
          </p>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                currentStep === 0 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              disabled={currentStep === 0}
            >
              Previous
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 flex items-center"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 flex items-center"
              >
                Get Started
                <Sparkles className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={onComplete}
            className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Skip introduction
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Home Page Component
function HomePage({ 
  onStartSimulation, 
  selectedLanguage, 
  onLanguageChange, 
  onNavigate,
  sessionCount,
  achievements,
  voiceEnabled,
  onVoiceToggle
}: {
  onStartSimulation: (scenario?: string) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onNavigate: (page: 'home' | 'simulation' | 'feedback') => void;
  sessionCount: number;
  achievements: Achievement[];
  voiceEnabled: boolean;
  onVoiceToggle: (enabled: boolean) => void;
}) {
  const [selectedScenario, setSelectedScenario] = useState('mild-dementia');

  const scenarios = [
    {
      id: 'mild-dementia',
      title: 'Memory Support',
      description: 'Practice with Margaret, 78, experiencing mild memory concerns',
      difficulty: 'Beginner',
      duration: '10-15 min',
      icon: <Brain className="h-6 w-6" />,
      color: 'from-blue-400 to-blue-500',
      avatar: '👵'
    },
    {
      id: 'diabetes-management',
      title: 'Health Management',
      description: 'Help Robert, 72, with diabetes care and medication',
      difficulty: 'Intermediate',
      duration: '15-20 min',
      icon: <Activity className="h-6 w-6" />,
      color: 'from-green-400 to-green-500',
      avatar: '👴'
    },
    {
      id: 'mobility-assistance',
      title: 'Mobility & Safety',
      description: 'Support Eleanor, 83, with walking aids and confidence',
      difficulty: 'Advanced',
      duration: '20-25 min',
      icon: <Shield className="h-6 w-6" />,
      color: 'from-purple-400 to-purple-500',
      avatar: '👩‍🦳'
    }
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6 pb-24">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-rose-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-800">GerontoVoice</h1>
              <p className="text-blue-600 font-medium">AI Caregiver Training</p>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex justify-center space-x-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sessionCount}</div>
              <div className="text-xs text-gray-500">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{unlockedAchievements.length}</div>
              <div className="text-xs text-gray-500">Achievements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sessionCount > 0 ? Math.round(85 + Math.random() * 10) : '--'}
              </div>
              <div className="text-xs text-gray-500">Avg Score</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Quick Start</h2>
            <button
              onClick={() => onVoiceToggle(!voiceEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>
          
          <button
            onClick={() => onStartSimulation()}
            className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white py-6 px-8 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center group"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
              <Mic className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="font-bold">Start Training Session</div>
              <div className="text-blue-100 text-sm">Begin voice conversation practice</div>
            </div>
            <ChevronRight className="h-6 w-6 ml-auto group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Scenario Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Choose Your Training</h2>
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  setSelectedScenario(scenario.id);
                  onStartSimulation(scenario.id);
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedScenario === scenario.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${scenario.color} rounded-xl flex items-center justify-center text-white mr-4 shadow-lg`}>
                    {scenario.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800">{scenario.title}</h3>
                      <span className="text-2xl">{scenario.avatar}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{scenario.description}</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        scenario.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                        scenario.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {scenario.difficulty}
                      </span>
                      <span className="text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {scenario.duration}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Recent Achievements
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {unlockedAchievements.slice(0, 4).map((achievement) => (
                <div key={achievement.id} className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200">
                  <div className="flex items-center mb-2">
                    <div className="text-yellow-600 mr-2">{achievement.icon}</div>
                    <div className="text-yellow-800 font-semibold text-sm">{achievement.title}</div>
                  </div>
                  <p className="text-yellow-700 text-xs">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="font-semibold text-gray-800">Preferences</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language & Region</label>
              <select
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="es-ES">🇪🇸 Español</option>
                <option value="fr-FR">🇫🇷 Français</option>
                <option value="zh-CN">🇨🇳 中文</option>
                <option value="de-DE">🇩🇪 Deutsch</option>
                <option value="it-IT">🇮🇹 Italiano</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-700">Voice Responses</div>
                <div className="text-sm text-gray-500">Enable AI voice feedback</div>
              </div>
              <button
                onClick={() => onVoiceToggle(!voiceEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
          <div className="flex justify-around max-w-md mx-auto">
            <button className="flex flex-col items-center py-2 px-4 text-blue-600">
              <Home className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button 
              onClick={() => onNavigate('feedback')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <TrendingUp className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Progress</span>
            </button>
            <button className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors">
              <Users className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Community</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Simulation Page Component
function SimulationPage({
  conversation,
  isListening,
  sessionActive,
  onStartListening,
  onStopListening,
  onEndSession,
  onNavigate,
  currentScenario,
  voiceEnabled,
  onVoiceToggle,
  isProcessing
}: {
  conversation: ConversationEntry[];
  isListening: boolean;
  sessionActive: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onEndSession: () => void;
  onNavigate: (page: 'home' | 'simulation' | 'feedback') => void;
  currentScenario: string;
  voiceEnabled: boolean;
  onVoiceToggle: (enabled: boolean) => void;
  isProcessing: boolean;
}) {
  const scenarios = {
    'mild-dementia': { name: 'Margaret', age: 78, condition: 'Mild Memory Concerns', avatar: '👵', mood: 'gentle' },
    'diabetes-management': { name: 'Robert', age: 72, condition: 'Diabetes Management', avatar: '👴', mood: 'concerned' },
    'mobility-assistance': { name: 'Eleanor', age: 83, condition: 'Mobility Support', avatar: '👩‍🦳', mood: 'hopeful' }
  };

  const currentPersona = scenarios[currentScenario as keyof typeof scenarios] || scenarios['mild-dementia'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-4 pb-32">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
          >
            <Home className="h-6 w-6" />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Training Session</h1>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Active Session
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onVoiceToggle(!voiceEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <button
              onClick={onEndSession}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors shadow-md"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Enhanced Virtual Avatar */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 rounded-full mx-auto mb-4 flex items-center justify-center shadow-2xl border-4 border-white">
              <span className="text-6xl">{currentPersona.avatar}</span>
            </div>
            
            {/* Mood Indicator */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
                currentPersona.mood === 'gentle' ? 'bg-blue-100 text-blue-700' :
                currentPersona.mood === 'concerned' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {currentPersona.mood}
              </div>
            </div>
            
            {/* Speaking Animation */}
            {isProcessing && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-300 animate-pulse" />
            )}
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800">{currentPersona.name}</h2>
            <p className="text-gray-600">{currentPersona.age} years old</p>
            <p className="text-sm text-blue-600 font-medium">{currentPersona.condition}</p>
          </div>
        </div>

        {/* Enhanced Conversation */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 mb-6 max-h-96 overflow-y-auto">
          <div className="p-6">
            {conversation.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-500 mb-2">Ready to start your conversation</p>
                <p className="text-sm text-gray-400">Tap the microphone when you're ready to speak</p>
              </div>
            ) : (
              <div className="space-y-6">
                {conversation.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 ${
                      entry.speaker === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                      entry.speaker === 'user' 
                        ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' 
                        : 'bg-gradient-to-r from-amber-200 to-orange-300 text-amber-800'
                    }`}>
                      {entry.speaker === 'user' ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <span className="text-lg">{currentPersona.avatar}</span>
                      )}
                    </div>
                    <div className={`max-w-xs lg:max-w-md ${
                      entry.speaker === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                        entry.speaker === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : entry.emotion === 'empathetic' ? 'bg-gradient-to-r from-rose-50 to-pink-50 text-gray-800 border border-rose-200'
                          : entry.emotion === 'concerned' ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-gray-800 border border-yellow-200'
                          : entry.emotion === 'encouraging' ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-gray-800 border border-green-200'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm leading-relaxed">{entry.text}</p>
                        {entry.confidence && entry.confidence < 0.8 && (
                          <div className="text-xs mt-1 opacity-70">
                            Low confidence - please speak clearly
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs ${
                          entry.speaker === 'user' ? 'text-blue-400' : 'text-gray-500'
                        }`}>
                          {entry.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                        {entry.emotion && entry.speaker === 'ai' && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            entry.emotion === 'empathetic' ? 'bg-rose-100 text-rose-600' :
                            entry.emotion === 'concerned' ? 'bg-yellow-100 text-yellow-600' :
                            entry.emotion === 'encouraging' ? 'bg-green-100 text-green-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {entry.emotion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Processing Indicator */}
                {isProcessing && (
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-200 to-orange-300 flex items-center justify-center shadow-md">
                      <span className="text-lg">{currentPersona.avatar}</span>
                    </div>
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Voice Controls */}
        <div className="fixed bottom-24 left-0 right-0 px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-full p-3 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={isListening ? onStopListening : onStartListening}
                  disabled={isProcessing}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg ${
                    isListening
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse shadow-red-200'
                      : isProcessing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-blue-200'
                  }`}
                >
                  {isProcessing ? (
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : isListening ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm font-medium text-gray-700">
                {isProcessing ? 'Processing your response...' :
                 isListening ? 'Listening... Tap to stop' : 
                 'Tap to speak with ' + currentPersona.name}
              </p>
              {!isListening && !isProcessing && (
                <p className="text-xs text-gray-500 mt-1">
                  Speak naturally and clearly for best results
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
          <div className="flex justify-around max-w-md mx-auto">
            <button 
              onClick={() => onNavigate('home')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Home className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button className="flex flex-col items-center py-2 px-4 text-blue-600">
              <MessageCircle className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Active</span>
            </button>
            <button className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors">
              <BarChart3 className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Feedback Page Component
function FeedbackPage({
  skillScores,
  conversationLength,
  onNavigate,
  onRestartSession,
  achievements,
  sessionCount
}: {
  skillScores: SkillScore[];
  conversationLength: number;
  onNavigate: (page: 'home' | 'simulation' | 'feedback') => void;
  onRestartSession: () => void;
  achievements: Achievement[];
  sessionCount: number;
}) {
  const averageScore = skillScores.reduce((sum, skill) => sum + skill.score, 0) / skillScores.length;
  const newAchievements = achievements.filter(a => a.unlocked && a.progress === 100);

  const getScoreMessage = (score: number) => {
    if (score >= 90) return { message: "Outstanding Performance!", color: "text-green-600", icon: <Award className="h-6 w-6" /> };
    if (score >= 80) return { message: "Excellent Progress!", color: "text-blue-600", icon: <Star className="h-6 w-6" /> };
    if (score >= 70) return { message: "Good Development!", color: "text-yellow-600", icon: <Target className="h-6 w-6" /> };
    return { message: "Keep Practicing!", color: "text-orange-600", icon: <TrendingUp className="h-6 w-6" /> };
  };

  const scoreMessage = getScoreMessage(averageScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-all"
          >
            <Home className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Session Complete</h1>
          <div className="w-10 h-6" />
        </div>

        {/* Celebration Animation */}
        <div className="text-center mb-8">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold shadow-2xl ${
              averageScore >= 90 ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
              averageScore >= 80 ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white' :
              averageScore >= 70 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
              'bg-gradient-to-r from-orange-400 to-red-500 text-white'
            }`}>
              {Math.round(averageScore)}
              <span className="text-lg ml-1">%</span>
            </div>
            
            {/* Floating Achievement Icons */}
            {averageScore >= 85 && (
              <>
                <Sparkles className="absolute top-4 right-8 h-6 w-6 text-yellow-400 animate-bounce" />
                <Star className="absolute top-8 left-6 h-5 w-5 text-blue-400 animate-pulse" />
                <Heart className="absolute bottom-8 right-4 h-5 w-5 text-rose-400 animate-bounce" style={{ animationDelay: '0.5s' }} />
              </>
            )}
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className={`flex items-center justify-center mb-2 ${scoreMessage.color}`}>
              {scoreMessage.icon}
              <h2 className="text-2xl font-bold ml-2">{scoreMessage.message}</h2>
            </div>
            <p className="text-gray-600 mb-4">
              You completed {conversationLength} meaningful exchanges with excellent care and empathy.
            </p>
            
            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-blue-600">{conversationLength}</div>
                <div className="text-xs text-blue-500">Exchanges</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-green-600">{sessionCount + 1}</div>
                <div className="text-xs text-green-500">Total Sessions</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((conversationLength / 10) * 100)}%
                </div>
                <div className="text-xs text-purple-500">Engagement</div>
              </div>
            </div>
          </div>
        </div>

        {/* New Achievements */}
        {newAchievements.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 mb-6 border border-yellow-200 shadow-lg">
            <div className="flex items-center mb-4">
              <Trophy className="h-6 w-6 text-yellow-600 mr-2" />
              <h3 className="text-lg font-bold text-yellow-800">New Achievement Unlocked!</h3>
            </div>
            <div className="space-y-3">
              {newAchievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center bg-white/50 rounded-xl p-3">
                  <div className="text-yellow-600 mr-3">{achievement.icon}</div>
                  <div>
                    <div className="font-semibold text-yellow-800">{achievement.title}</div>
                    <div className="text-sm text-yellow-700">{achievement.description}</div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Skill Breakdown */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Detailed Skills Assessment
          </h3>
          <div className="space-y-6">
            {skillScores.map((skill, index) => (
              <div key={index} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      skill.score >= 85 ? 'bg-green-100 text-green-600' :
                      skill.score >= 70 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {skill.icon}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">{skill.name}</span>
                      {skill.improvement > 0 && (
                        <div className="flex items-center text-sm text-green-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{skill.improvement}% improvement
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-bold ${
                      skill.score >= 85 ? 'text-green-600' :
                      skill.score >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {skill.score}%
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                      skill.score >= 85 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                      skill.score >= 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                      'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {skill.feedback}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Tips */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Personalized Growth Tips
          </h3>
          <div className="space-y-4">
            <div className="flex items-start bg-blue-50 rounded-lg p-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 mb-1">Active Listening Enhancement</p>
                <p className="text-blue-700 text-sm">
                  Try pausing for 2-3 seconds after the elder finishes speaking. This shows respect and gives them time to add more thoughts.
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-green-50 rounded-lg p-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 mb-1">Empathy Building</p>
                <p className="text-green-700 text-sm">
                  Your compassionate responses were excellent. Continue using phrases like "That sounds difficult" and "I can understand why you'd feel that way."
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-purple-50 rounded-lg p-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-purple-800 mb-1">Communication Clarity</p>
                <p className="text-purple-700 text-sm">
                  Practice asking open-ended questions like "How did that make you feel?" to encourage deeper sharing and connection.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={onRestartSession}
            className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white py-4 px-6 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Practice Another Scenario
          </button>
          
          <button
            onClick={() => onNavigate('home')}
            className="w-full bg-white text-gray-700 py-4 px-6 rounded-2xl font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            Return to Dashboard
          </button>
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3">
          <div className="flex justify-around max-w-md mx-auto">
            <button 
              onClick={() => onNavigate('home')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Home className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button className="flex flex-col items-center py-2 px-4 text-blue-600">
              <TrendingUp className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Progress</span>
            </button>
            <button className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors">
              <Users className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Community</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;