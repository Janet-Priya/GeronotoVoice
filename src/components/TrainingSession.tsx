import React, { useState, useEffect, useRef } from 'react';
import { TrainingSession as TrainingSessionType, Feedback } from '../types/training';
import EnhancedVoiceInput from './EnhancedVoiceInput';
import { simulateConversation, getPersonas } from '../services/api';
import { Persona, ConversationEntry } from '../types';

interface TrainingSessionProps {
  onSessionComplete?: (session: TrainingSessionType) => void;
  className?: string;
}

const TrainingSession: React.FC<TrainingSessionProps> = ({ 
  onSessionComplete, 
  className = '' 
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Map<string, TrainingSessionType>>(new Map());
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Map<string, Feedback>>(new Map());
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const conversationHistory = useRef<Map<string, ConversationEntry[]>>(new Map());

  // Initialize personas and sessions
  useEffect(() => {
    const initializeTraining = async () => {
      try {
        setLoading(true);
        const fetchedPersonas = await getPersonas();
        setPersonas(fetchedPersonas);
        
        // Initialize sessions for each persona
        const initialSessions = new Map<string, TrainingSessionType>();
        fetchedPersonas.forEach(persona => {
          initialSessions.set(persona.id, {
            id: `session_${persona.id}_${Date.now()}`,
            persona: persona.name,
            condition: persona.condition,
            score: 0,
            progress: 0,
            transcript: '',
            isActive: false,
            startTime: new Date(),
            lastActivity: new Date()
          });
        });
        setSessions(initialSessions);
        
        // Initialize conversation history
        fetchedPersonas.forEach(persona => {
          conversationHistory.current.set(persona.id, []);
        });
        
        setError(null);
      } catch (err) {
        setError('Failed to initialize training session. Using offline mode.');
        console.error('Training initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeTraining();
  }, []);

  // Calculate overall progress
  useEffect(() => {
    const totalSessions = sessions.size;
    if (totalSessions === 0) return;
    
    let totalProgress = 0;
    sessions.forEach(session => {
      totalProgress += session.progress;
    });
    
    setOverallProgress(Math.round(totalProgress / totalSessions));
  }, [sessions]);

  const handleCardClick = (personaId: string) => {
    setSelectedPersona(selectedPersona === personaId ? null : personaId);
    
    // Update session as active
    setSessions(prev => {
      const updated = new Map(prev);
      const session = updated.get(personaId);
      if (session) {
        updated.set(personaId, {
          ...session,
          isActive: true,
          lastActivity: new Date()
        });
      }
      return updated;
    });
  };

  const handleVoiceInput = async (personaId: string, transcript: string) => {
    try {
      console.log(`Processing voice input for ${personaId}:`, transcript);
      
      const currentHistory = conversationHistory.current.get(personaId) || [];
      
      // Add user input to conversation history
      const userEntry: ConversationEntry = {
        speaker: 'user',
        text: transcript,
        timestamp: new Date(),
        emotion: 'neutral',
        confidence: 0.9
      };
      
      const updatedHistory = [...currentHistory, userEntry];
      conversationHistory.current.set(personaId, updatedHistory);
      
      // Get AI response
      const aiResponse = await simulateConversation(
        personaId,
        transcript,
        updatedHistory.slice(-5), // Last 5 messages for context
        'demo_user'
      );
      
      // Add AI response to conversation history
      const finalHistory = [...updatedHistory, aiResponse];
      conversationHistory.current.set(personaId, finalHistory);
      
      // Calculate empathy score based on response quality
      const empathyScore = calculateEmpathyScore(transcript, aiResponse.text);
      
      // Update session with new transcript and score
      setSessions(prev => {
        const updated = new Map(prev);
        const session = updated.get(personaId);
        if (session) {
          const newProgress = Math.min(session.progress + 15, 100);
          updated.set(personaId, {
            ...session,
            transcript: transcript,
            score: empathyScore,
            progress: newProgress,
            lastActivity: new Date()
          });
        }
        return updated;
      });
      
      // Generate feedback
      const newFeedback: Feedback = {
        emotion: aiResponse.emotion as Feedback['emotion'] || 'empathetic',
        value: empathyScore,
        message: generateFeedbackMessage(empathyScore),
        improvement: empathyScore > 80 ? 'Excellent empathetic response!' : 'Try using more understanding language.'
      };
      
      setFeedback(prev => {
        const updated = new Map(prev);
        updated.set(personaId, newFeedback);
        return updated;
      });
      
      // Trigger feedback animation
      setTimeout(() => {
        const cardElement = document.getElementById(`card-${personaId}`);
        if (cardElement) {
          cardElement.classList.add('feedback-pulse');
          setTimeout(() => {
            cardElement.classList.remove('feedback-pulse');
          }, 1500);
        }
      }, 100);
      
    } catch (err) {
      console.error('Voice input processing error:', err);
      setError('Failed to process voice input. Please try again.');
    }
  };

  const calculateEmpathyScore = (userInput: string, aiResponse: string): number => {
    let score = 60; // Base score
    
    const userLower = userInput.toLowerCase();
    const responseLower = aiResponse.toLowerCase();
    
    // Positive indicators for empathy
    const empathyIndicators = [
      'understand', 'feel', 'sorry', 'care', 'help', 'support',
      'listen', 'here for you', 'difficult', 'challenging'
    ];
    
    const compassionateWords = [
      'dear', 'sweetheart', 'honey', 'gentle', 'patient',
      'warm', 'loving', 'kind', 'understanding'
    ];
    
    // Check for empathy indicators
    empathyIndicators.forEach(indicator => {
      if (responseLower.includes(indicator)) {
        score += 5;
      }
    });
    
    // Check for compassionate language
    compassionateWords.forEach(word => {
      if (responseLower.includes(word)) {
        score += 3;
      }
    });
    
    // Bonus for appropriate response length (not too short or too long)
    if (aiResponse.length > 50 && aiResponse.length < 200) {
      score += 5;
    }
    
    // Check if response addresses user's emotional state
    if (userLower.includes('sad') || userLower.includes('worried')) {
      if (responseLower.includes('understand') || responseLower.includes('here')) {
        score += 10;
      }
    }
    
    return Math.min(Math.max(score, 0), 100);
  };

  const generateFeedbackMessage = (score: number): string => {
    if (score >= 90) return 'Outstanding empathy! Your response showed deep understanding.';
    if (score >= 80) return 'Great empathetic response! You connected well with the persona.';
    if (score >= 70) return 'Good empathy shown. Consider adding more emotional support.';
    if (score >= 60) return 'Moderate empathy. Try using more compassionate language.';
    return 'Focus on showing more understanding and emotional connection.';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading training session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${className}`} style={{
      background: 'linear-gradient(135deg, hsl(var(--cozy-cream)) 0%, hsl(var(--cozy-amber)) 25%, hsl(var(--cozy-sunset)) 50%, hsl(var(--cozy-rust)) 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Enhanced Header with Cozy Design */}
      <header className="relative overflow-hidden" style={{
        background: 'var(--gradient-forest)',
        boxShadow: 'var(--shadow-leaf)'
      }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-4xl animate-pulse">🌿</div>
          <div className="absolute top-8 right-8 text-3xl animate-bounce">🌸</div>
          <div className="absolute bottom-4 left-1/4 text-2xl animate-pulse delay-300">🍃</div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="handwritten-large text-white mb-2 drop-shadow-lg">
              Training Session
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-white/90 text-lg font-medium">Active Session</p>
            </div>
            <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
              Practice warm, empathetic conversations with our elderly care personas
            </p>
          </div>
          
          {error && (
            <div className="mt-6 max-w-2xl mx-auto p-4 bg-red-100/90 backdrop-blur-sm border-2 border-red-300 rounded-2xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content with Enhanced Design */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Single Persona Focus Design */}
        {selectedPersona ? (
          <div className="space-y-8">
            {/* Selected Persona Card */}
            {personas.filter(p => p.id === selectedPersona).map((persona) => {
              const session = sessions.get(persona.id);
              const personaFeedback = feedback.get(persona.id);
              const isRecordingPersona = isRecording === persona.id;
              
              return (
                <div key={persona.id} className="space-y-8">
                  {/* Persona Header Card */}
                  <div className="cozy-card text-center relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-2xl opacity-30 animate-pulse">
                      {persona.avatar}
                    </div>
                    
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center text-6xl shadow-lg border-4 border-white">
                          {persona.avatar}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <h2 className="handwritten text-4xl text-gray-800 mb-2">{persona.name}</h2>
                        <p className="text-lg text-gray-600 font-medium mb-3">{persona.condition}</p>
                        <p className="text-gray-700 max-w-2xl mx-auto leading-relaxed text-lg">
                          {persona.description}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedPersona(null)}
                      className="absolute top-4 left-4 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                    >
                      <span className="text-xl">←</span>
                    </button>
                  </div>

                  {/* Enhanced Voice Interface */}
                  <div className="cozy-container text-center relative">
                    <div className="absolute top-6 left-6 text-3xl opacity-20 animate-bounce">🎤</div>
                    <div className="absolute top-6 right-6 text-3xl opacity-20 animate-pulse delay-500">💬</div>
                    
                    <h3 className="handwritten text-2xl text-gray-800 mb-6">
                      Ready to start your conversation
                    </h3>
                    
                    <div className="max-w-md mx-auto mb-8">
                      <EnhancedVoiceInput
                        onVoiceInput={(transcript: string) => handleVoiceInput(persona.id, transcript)}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="text-center space-y-4">
                      <p className="text-gray-600 text-lg">
                        Tap to speak with {persona.name}
                      </p>
                      <p className="text-sm text-gray-500 italic">
                        Speak naturally and clearly for best results
                      </p>
                      
                      {isRecordingPersona && (
                        <div className="flex items-center justify-center gap-3 p-4 bg-red-50 rounded-2xl border-2 border-red-200">
                          <div className="flex space-x-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse delay-75"></div>
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse delay-150"></div>
                          </div>
                          <span className="text-red-700 font-medium text-lg">
                            🎙️ Listening to you...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conversation History */}
                  {session?.transcript && (
                    <div className="cozy-card">
                      <h4 className="handwritten text-xl text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-2xl">💭</span>
                        Your Last Message
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                        <p className="text-gray-800 text-lg italic leading-relaxed">
                          "{session.transcript}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Compact Feedback Box */}
                  {session && session.score > 0 && (
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                      {/* Compact Feedback Display */}
                      <div className="inline-block max-w-xs p-2 bg-green-100 border border-green-200 rounded-lg" 
                           style={{
                             animation: 'none',
                             transform: 'scale(1)'
                           }}>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600 font-semibold">
                            Feedback: {session.score}% Empathy
                          </span>
                          <span className="text-lg">❤️</span>
                        </div>
                        {personaFeedback && (
                          <p className="text-green-700 text-xs mt-1 leading-tight">
                            {personaFeedback.message}
                          </p>
                        )}
                      </div>

                      {/* Compact Progress Display */}
                      <div className="inline-block max-w-xs p-2 bg-blue-100 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-blue-600 font-semibold">
                            Progress: {session.progress || 0}%
                          </span>
                          <span className="text-lg">🌱</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full transition-all duration-1000 ${
                              getProgressColor(session.progress || 0)
                            }`}
                            style={{ width: `${session.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Feedback & Progress - Mobile Responsive */}
                  {session && session.score > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-6">
                      {/* Empathy Score */}
                      <div className="max-w-sm mx-auto p-4 bg-white rounded-2xl shadow-lg text-center">
                        <h4 className="text-lg text-gray-800 mb-3 flex items-center justify-center gap-2">
                          <span className="text-xl">❤️</span>
                          Empathy Score
                        </h4>
                        <div className="relative">
                          <div className={`text-4xl font-bold mb-2 ${getScoreColor(session.score)}`}>
                            {session.score}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-1000 ${
                                session.score >= 80 ? 'bg-green-500' : 
                                session.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${session.score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="max-w-sm mx-auto p-4 bg-white rounded-2xl shadow-lg text-center">
                        <h4 className="text-lg text-gray-800 mb-3 flex items-center justify-center gap-2">
                          <span className="text-xl">🌱</span>
                          Training Progress
                        </h4>
                        <div className="relative">
                          <div className="text-4xl font-bold text-blue-600 mb-2">
                            {session.progress || 0}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-1000 ${
                                getProgressColor(session.progress || 0)
                              }`}
                              style={{ width: `${session.progress || 0}%` }}
                            ></div>
                          </div>
                          <p className="text-gray-600 text-xs">
                            Keep practicing to improve!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Persona Selection Grid */
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="handwritten text-4xl text-gray-800 mb-4">
                Choose Your Training Partner
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Select a persona to begin your empathetic conversation practice
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {personas.map((persona) => {
                const session = sessions.get(persona.id);
                
                return (
                  <div
                    key={persona.id}
                    id={`card-${persona.id}`}
                    className="max-w-sm mx-auto p-2 bg-white rounded-2xl shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-102 hover:shadow-xl group relative overflow-hidden"
                    onClick={() => handleCardClick(persona.id)}
                    style={{
                      animation: 'none',
                      '--tw-scale-x': '1',
                      '--tw-scale-y': '1'
                    } as React.CSSProperties}
                  >
                    {/* Background decoration */}
                    <div className="absolute top-4 right-4 text-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                      {persona.avatar}
                    </div>
                    
                    {/* Active indicator */}
                    {session?.isActive && (
                      <div className="absolute top-4 left-4 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
                    )}

                    {/* Persona Header */}
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center text-4xl shadow-lg border-4 border-white group-hover:scale-110 transition-transform duration-300">
                        {persona.avatar}
                      </div>
                      <h3 className="handwritten text-2xl text-gray-800 mb-2">
                        {persona.name}
                      </h3>
                      <p className="text-gray-600 font-medium mb-3">{persona.condition}</p>
                    </div>

                    {/* Description */}
                    <p className="text-gray-700 text-sm leading-relaxed mb-6 line-clamp-3">
                      {persona.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">Progress</span>
                        <span className="text-sm font-bold text-gray-700">
                          {session?.progress || 0}%
                        </span>
                      </div>
                      <div className="cozy-progress h-3">
                        <div
                          className={`cozy-progress-fill h-3 transition-all duration-500`}
                          style={{ width: `${session?.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overall Progress Section */}
        <div className="mt-16">
          <div className="cozy-container text-center relative overflow-hidden">
            <div className="absolute top-6 left-6 text-4xl opacity-20 animate-pulse">🏆</div>
            <div className="absolute bottom-6 right-6 text-3xl opacity-20 animate-bounce delay-300">⭐</div>
            
            <h3 className="handwritten text-3xl text-gray-800 mb-6">
              Overall Training Progress
            </h3>
            
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium text-gray-700">Total Progress</span>
                <span className="text-3xl font-bold text-blue-600">
                  {overallProgress}%
                </span>
              </div>
              
              <div className="cozy-progress h-6 mb-6">
                <div
                  className="cozy-progress-fill h-6 transition-all duration-1000"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              
              <p className="text-gray-600 text-lg leading-relaxed">
                Complete conversations with all personas to master empathetic communication
              </p>
              
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span>Not Started</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TrainingSession;
