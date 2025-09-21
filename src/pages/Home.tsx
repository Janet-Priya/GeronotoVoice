import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Brain, 
  Heart, 
  BarChart3, 
  ArrowRight, 
  CheckCircle, 
  Globe, 
  Sparkles,
  Trophy,
  Users,
  MessageCircle
} from 'lucide-react';
import { Persona, LanguageOption, Achievement } from '../types';
import { getPersonas } from '../services/api';

interface HomeProps {
  onStartSimulation: (personaId?: string) => void;
  onNavigate: (page: string) => void;
  sessionCount: number;
  achievements: Achievement[];
  voiceEnabled: boolean;
  onVoiceToggle: (enabled: boolean) => void;
}

const Home: React.FC<HomeProps> = ({
  onStartSimulation,
  onNavigate,
  sessionCount,
  achievements,
  voiceEnabled,
  onVoiceToggle
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const languages: LanguageOption[] = [
    { code: 'en-US', name: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es-ES', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
    { code: 'fr-FR', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
    { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
    { code: 'de-DE', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
    { code: 'it-IT', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
    { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português' },
    { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' }
  ];

  const onboardingSteps = [
    {
      id: 'welcome',
      title: 'Welcome to GerontoVoice',
      subtitle: 'AI-Powered Caregiver Training',
      description: 'Practice empathetic conversations with elderly individuals in a safe, supportive environment.',
      icon: <Heart className="h-16 w-16 text-rose-400" />,
      gradient: 'from-rose-400 to-pink-500',
      features: ['Voice-first interactions', 'Real-time feedback', 'Safe practice environment']
    },
    {
      id: 'voice',
      title: 'Voice-First Experience',
      subtitle: 'Natural Conversations',
      description: 'Simply speak naturally. Our AI listens, understands, and responds with empathy and wisdom.',
      icon: <Mic className="h-16 w-16 text-blue-400" />,
      gradient: 'from-blue-400 to-indigo-500',
      features: ['Speech recognition', 'Natural responses', 'Multi-language support']
    },
    {
      id: 'feedback',
      title: 'Personalized Feedback',
      subtitle: 'Grow Your Skills',
      description: 'Receive detailed insights on empathy, communication, and caregiving techniques after each session.',
      icon: <BarChart3 className="h-16 w-16 text-green-400" />,
      gradient: 'from-green-400 to-emerald-500',
      features: ['Skill assessment', 'Progress tracking', 'Achievement system']
    },
    {
      id: 'ready',
      title: 'Ready to Begin?',
      subtitle: 'Your Journey Starts Now',
      description: 'Join thousands of caregivers who\'ve improved their skills and confidence through practice.',
      icon: <Sparkles className="h-16 w-16 text-purple-400" />,
      gradient: 'from-purple-400 to-violet-500',
      features: ['Multiple personas', 'Difficulty levels', 'Community support']
    }
  ];

  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const data = await getPersonas();
        setPersonas(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load personas:', error);
        setIsLoading(false);
      }
    };

    loadPersonas();

    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('geronto_voice_onboarding_completed');
    if (hasCompletedOnboarding) {
      setShowOnboarding(false);
    }
  }, []);

  const handleNextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      localStorage.setItem('geronto_voice_onboarding_completed', 'true');
      setShowOnboarding(false);
    }
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('geronto_voice_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const handleStartSimulation = (personaId?: string) => {
    onStartSimulation(personaId);
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <img 
              src="/logo.svg" 
              alt="GerontaVoice Logo" 
              className="w-16 h-16 animate-pulse"
            />
          </div>
          <p className="text-gray-600">Loading your training environment...</p>
        </motion.div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2">
              {onboardingSteps.map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="card-glass text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`w-24 h-24 rounded-full bg-gradient-to-r ${onboardingSteps[currentStep].gradient} mx-auto mb-6 flex items-center justify-center shadow-lg`}
            >
              {currentStep === 0 ? (
                <img 
                  src="/logo.svg" 
                  alt="GerontaVoice Logo" 
                  className="w-16 h-16"
                />
              ) : (
                onboardingSteps[currentStep].icon
              )}
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-gray-800 mb-2"
            >
              {onboardingSteps[currentStep].title}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-blue-600 font-semibold mb-4"
            >
              {onboardingSteps[currentStep].subtitle}
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 leading-relaxed mb-6"
            >
              {onboardingSteps[currentStep].description}
            </motion.p>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-2 mb-8"
            >
              {onboardingSteps[currentStep].features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center text-sm text-gray-600"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {feature}
                </motion.div>
              ))}
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={handleSkipOnboarding}
                className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Skip introduction
              </button>
              
              {currentStep < onboardingSteps.length - 1 ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNextStep}
                  className="btn-primary flex items-center"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNextStep}
                  className="btn-primary flex items-center"
                >
                  Get Started
                  <Sparkles className="h-4 w-4 ml-2" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mr-4"
            >
              <img 
                src="/logo.svg" 
                alt="GerontaVoice Logo" 
                className="w-16 h-16"
              />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">GerontoVoice</h1>
              <p className="text-blue-600 font-medium">CARE WITH CLARITY</p>
            </div>
          </div>
          
          {/* Language Selector */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center space-x-2"
          >
            <Globe className="h-5 w-5 text-gray-500" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="input-field w-32"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </motion.div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{sessionCount}</div>
            <div className="text-sm text-gray-500">Sessions</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{unlockedAchievements.length}</div>
            <div className="text-sm text-gray-500">Achievements</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-purple-600">
              {sessionCount > 0 ? Math.round(85 + Math.random() * 10) : '--'}
            </div>
            <div className="text-sm text-gray-500">Avg Score</div>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative mb-16 z-10"
        >
          {/* Hero Content */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden max-h-[600px]">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            {/* Floating UI Elements */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-8 right-8 w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
            >
              <Brain className="h-8 w-8 text-white" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-16 right-24 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
            >
              <Heart className="h-6 w-6 text-white" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-8 right-12 w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
            >
              <MessageCircle className="h-7 w-7 text-white" />
            </motion.div>
            
            <div className="relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Left Content */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mb-6"
                  >
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                      Master the Art of
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                        Compassionate Care
                      </span>
                    </h1>
                    <p className="text-xl text-blue-100 leading-relaxed mb-6">
                      Practice empathetic conversations with AI-powered elderly personas. 
                      Build confidence, develop skills, and make a real difference in caregiving.
                    </p>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <button
                      onClick={() => handleStartSimulation()}
                      className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      Start Training Now
                    </button>
                    <button
                      onClick={() => onNavigate('training')}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
                    >
                      <Brain className="h-5 w-5 mr-2" />
                      Advanced Training
                    </button>
                    <button
                      onClick={() => onNavigate('community')}
                      className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Join Community
                    </button>
                  </motion.div>
                  
                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="grid grid-cols-3 gap-6 mt-8"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-300">500+</div>
                      <div className="text-sm text-blue-200">Caregivers Trained</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-300">95%</div>
                      <div className="text-sm text-blue-200">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-300">24/7</div>
                      <div className="text-sm text-blue-200">Available</div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Right Content - Hero Image */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="relative"
                >
                  <div className="relative">
                    {/* Main Hero Image Container */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                      <div className="text-center">
                        {/* Hero Image */}
                        <div className="relative mx-auto w-80 h-80 mb-4 rounded-xl overflow-hidden max-h-80">
                          <img 
                            src="/hero-image.png" 
                            alt="Caregiver illustration showing compassionate care with elderly person and caregivers" 
                            className="w-full h-full object-cover rounded-xl"
                          />
                          
                          {/* Overlay with floating UI elements */}
                          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent rounded-xl">
                            {/* Floating UI Elements */}
                            <div className="absolute top-4 right-4 w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                              <Mic className="h-4 w-4 text-white" />
                            </div>
                            <div className="absolute top-12 right-2 w-6 h-6 bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                              <Heart className="h-3 w-3 text-white" />
                            </div>
                            <div className="absolute bottom-4 right-8 w-7 h-7 bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                              <Brain className="h-3 w-3 text-white" />
                            </div>
                            <div className="absolute bottom-8 left-4 w-6 h-6 bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                              <MessageCircle className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Care Training</h3>
                        <p className="text-blue-100 text-sm">
                          Practice with realistic scenarios and receive instant feedback
                        </p>
                      </div>
                    </div>
                    
                    {/* Floating Elements */}
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-2 right-2 w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center text-lg"
                    >
                      ⭐
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -15, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      className="absolute bottom-2 left-2 w-6 h-6 bg-pink-300 rounded-full flex items-center justify-center text-sm"
                    >
                      ❤️
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="text-center mb-12 relative z-20"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to Practice?</h2>
          <p className="text-gray-600 text-lg">Choose a scenario and start your voice training session.</p>
        </motion.div>

        {/* Quick Start Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <button
            onClick={() => handleStartSimulation()}
            className="w-full btn-primary py-6 text-lg flex items-center justify-center group"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
              <Mic className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="font-bold">Start Training Session</div>
              <div className="text-blue-100 text-sm">Begin voice conversation practice</div>
            </div>
            <ArrowRight className="h-6 w-6 ml-auto group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Persona Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-16"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">Choose Your Training Partner</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personas.map((persona, index) => (
              <motion.button
                key={persona.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartSimulation(persona.id)}
                className="card hover:shadow-xl transition-all duration-300 text-left group"
              >
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">{persona.avatar}</div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{persona.name}</h3>
                    <p className="text-sm text-gray-600">{persona.age} years old</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">{persona.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    persona.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                    persona.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {persona.difficulty}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Achievements */}
        {unlockedAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-16"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
              Recent Achievements
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {unlockedAchievements.slice(0, 4).map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  className="card text-center"
                >
                  <div className="text-2xl mb-2">{achievement.icon}</div>
                  <div className="text-sm font-semibold text-gray-800">{achievement.title}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Voice Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Voice Settings</h3>
              <p className="text-sm text-gray-600">Enable AI voice responses</p>
            </div>
            <button
              onClick={() => onVoiceToggle(!voiceEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                voiceEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="mt-16 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 rounded-t-2xl">
          <div className="flex justify-around max-w-md mx-auto">
            <button className="flex flex-col items-center py-2 px-4 text-blue-600">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1">
                <img 
                  src="/logo.svg" 
                  alt="GerontaVoice Logo" 
                  className="w-8 h-8"
                />
              </div>
              <span className="text-sm font-medium">Home</span>
            </button>
            <button 
              onClick={() => onNavigate('progress')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <BarChart3 className="h-6 w-6 mb-1" />
              <span className="text-sm font-medium">Progress</span>
            </button>
            <button 
              onClick={() => onNavigate('community')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Heart className="h-6 w-6 mb-1" />
              <span className="text-sm font-medium">Community</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
