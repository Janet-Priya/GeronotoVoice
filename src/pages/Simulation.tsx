import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  Square, 
  ArrowLeft, 
  Volume2, 
  VolumeX,
  User,
  Brain,
  Clock,
  Target,
  Settings
} from 'lucide-react';
import { ConversationEntry, Persona } from '../types';
import { simulateConversation, getPersonas } from '../services/api';
import EnhancedVoiceInput from '../components/EnhancedVoiceInput';
import toast from 'react-hot-toast';

interface SimulationProps {
  onNavigate: (page: string) => void;
  onEndSession: () => void;
  selectedPersona?: string;
  voiceEnabled: boolean;
  onVoiceToggle: (enabled: boolean) => void;
}

const Simulation: React.FC<SimulationProps> = ({
  onNavigate,
  onEndSession,
  selectedPersona = 'margaret',
  voiceEnabled,
  onVoiceToggle
}) => {
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Load personas on component mount
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const data = await getPersonas();
        setPersonas(data);
        const persona = data.find(p => p.id === selectedPersona) || data[0];
        setCurrentPersona(persona);
      } catch (error) {
        console.error('Failed to load personas:', error);
      }
    };

    loadPersonas();
  }, [selectedPersona]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Initialize audio context for voice visualization
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContextRef.current = new AudioContext();
    }
  }, []);

  const handleStartListening = () => {
    setIsListening(true);
    setConfidence(0);
  };

  const handleStopListening = () => {
    setIsListening(false);
    setIsProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      const mockUserInput = "Hello, how are you feeling today?";
      const mockConfidence = 0.85 + Math.random() * 0.15;
      
      // Add user message
      const userMessage: ConversationEntry = {
        speaker: 'user',
        text: mockUserInput,
        timestamp: new Date(),
        confidence: mockConfidence
      };
      
      setConversation(prev => [...prev, userMessage]);
      setConfidence(mockConfidence);
      
      // Get AI response
      handleAIResponse(mockUserInput);
    }, 1000 + Math.random() * 1000);
  };

  const handleAIResponse = async (userInput: string) => {
    try {
      const response = await simulateConversation(
        currentPersona?.id || 'margaret',
        userInput,
        conversation
      );
      
      setConversation(prev => [...prev, response]);
      
      // Voice output if enabled
      if (voiceEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response.text);
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Fallback response
      const fallbackResponse: ConversationEntry = {
        speaker: 'ai',
        text: "I'm sorry, I didn't quite catch that. Could you please repeat?",
        timestamp: new Date(),
        emotion: 'neutral',
        confidence: 0.8
      };
      
      setConversation(prev => [...prev, fallbackResponse]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceInput = async (text: string) => {
    console.log('Voice input received:', text);
    
    // Add user message immediately
    const userMessage: ConversationEntry = {
      speaker: 'user',
      text: text,
      timestamp: new Date(),
      confidence: 0.8
    };
    
    setConversation(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    // Get AI response
    await handleAIResponse(text);
  };

  const handlePersonaChange = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setCurrentPersona(persona);
      setShowPersonaSelector(false);
      
      // Add persona introduction
      const introduction: ConversationEntry = {
        speaker: 'ai',
        text: `Hello! I'm ${persona.name}. ${persona.description}`,
        timestamp: new Date(),
        emotion: 'neutral'
      };
      
      setConversation([introduction]);
    }
  };

  const handleEndSession = () => {
    onEndSession();
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    if (isListening) {
      setIsListening(false);
    }
  };

  const getSessionDuration = () => {
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEmotionColor = (emotion?: string) => {
    switch (emotion) {
      case 'empathetic':
        return 'bg-rose-50 border-rose-200 text-rose-800';
      case 'concerned':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'encouraging':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'frustrated':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'calm':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!currentPersona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-full mx-auto mb-4 flex items-center justify-center">
            <Brain className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-4 pb-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm"
        >
          <button
            onClick={() => onNavigate('home')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Training Session</h1>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              {isPaused ? 'Paused' : 'Active Session'}
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
              onClick={handleEndSession}
              className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors shadow-md"
            >
              End Session
            </button>
          </div>
        </motion.div>

        {/* Persona Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <div className="relative inline-block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-32 h-32 bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 rounded-full mx-auto mb-4 flex items-center justify-center shadow-2xl border-4 border-white cursor-pointer"
              onClick={() => setShowPersonaSelector(!showPersonaSelector)}
            >
              <span className="text-6xl">{currentPersona.avatar}</span>
            </motion.div>
            
            {/* Persona Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800">{currentPersona.name}</h2>
              <p className="text-gray-600">{currentPersona.age} years old</p>
              <p className="text-sm text-blue-600 font-medium">{currentPersona.condition}</p>
              <div className="flex items-center justify-center mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                  difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {difficulty}
                </span>
              </div>
            </div>
            
            {/* Speaking Animation */}
            {isProcessing && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 rounded-full border-4 border-blue-300 animate-pulse"
              />
            )}
          </div>
        </motion.div>

        {/* Persona Selector */}
        <AnimatePresence>
          {showPersonaSelector && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-xl shadow-lg p-4 w-80"
            >
              <h3 className="font-semibold text-gray-800 mb-3">Choose Training Partner</h3>
              <div className="space-y-2">
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => handlePersonaChange(persona.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      currentPersona.id === persona.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{persona.avatar}</span>
                      <div>
                        <div className="font-semibold">{persona.name}</div>
                        <div className="text-sm text-gray-600">{persona.condition}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 mb-6 max-h-96 overflow-y-auto"
        >
          <div className="p-6">
            {conversation.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-500 mb-2">Ready to start your conversation</p>
                <p className="text-sm text-gray-400">Tap the microphone when you're ready to speak</p>
              </div>
            ) : (
              <div className="space-y-6">
                {conversation.map((entry, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-start space-x-3 ${
                      entry.speaker === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                      entry.speaker === 'user' 
                        ? 'bg-gradient-primary text-white' 
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
                          ? 'bg-gradient-primary text-white'
                          : getEmotionColor(entry.emotion)
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
                  </motion.div>
                ))}
                
                {/* Processing Indicator */}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start space-x-3"
                  >
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
                  </motion.div>
                )}
                
                <div ref={conversationEndRef} />
              </div>
            )}
          </div>
        </motion.div>

        {/* Voice Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="fixed bottom-24 left-0 right-0 px-4"
        >
          <div className="max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-full p-3 shadow-2xl border border-gray-200">
              <div className="flex items-center justify-center space-x-6">
                {/* Pause/Resume Button */}
                <button
                  onClick={handlePauseToggle}
                  className={`p-3 rounded-full transition-colors ${
                    isPaused 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </button>

                {/* Main Voice Button */}
                <EnhancedVoiceInput
                  onVoiceInput={handleVoiceInput}
                  isProcessing={isProcessing}
                  voiceEnabled={voiceEnabled}
                  onVoiceToggle={onVoiceToggle}
                  className=""
                  showQualityIndicator={true}
                />

                {/* Settings Button */}
                <button
                  onClick={() => setShowPersonaSelector(!showPersonaSelector)}
                  className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Settings className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm font-medium text-gray-700">
                {isProcessing ? 'Processing your response...' :
                 isListening ? 'Listening... Tap to stop' : 
                 isPaused ? 'Session paused - tap to resume' :
                 'Tap to speak with ' + currentPersona.name}
              </p>
              {!isListening && !isProcessing && !isPaused && (
                <p className="text-xs text-gray-500 mt-1">
                  Speak naturally and clearly for best results
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Session Info */}
        <div className="fixed top-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {getSessionDuration()}
            </div>
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-1" />
              {conversation.length} exchanges
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
              <Brain className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button className="flex flex-col items-center py-2 px-4 text-blue-600">
              <Mic className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Active</span>
            </button>
            <button 
              onClick={() => onNavigate('progress')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Target className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Progress</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
