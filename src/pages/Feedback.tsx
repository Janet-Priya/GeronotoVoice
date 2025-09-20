import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Star, 
  Award, 
  TrendingUp,
  Target,
  Clock,
  MessageCircle,
  Heart,
  Brain,
  Zap
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import Confetti from 'react-confetti';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { SkillScore, Achievement, ChartData } from '../types';
import { getSkillFeedback } from '../services/api';
import SkillMeter from '../components/SkillMeter';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface FeedbackProps {
  onNavigate: (page: string) => void;
  onRestartSession: () => void;
  conversationLength: number;
  sessionCount: number;
}

const Feedback: React.FC<FeedbackProps> = ({
  onNavigate,
  onRestartSession,
  conversationLength,
  sessionCount
}) => {
  const [skillScores, setSkillScores] = useState<SkillScore[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  // Mock data for demonstration
  const mockSkillScores: SkillScore[] = [
    {
      name: 'Empathy & Compassion',
      score: 85 + Math.floor(Math.random() * 10),
      feedback: 'Excellent emotional connection. Your responses showed genuine care and understanding.',
      improvement: Math.floor(Math.random() * 15) + 5,
      icon: '❤️',
      trend: 'up'
    },
    {
      name: 'Active Listening',
      score: 78 + Math.floor(Math.random() * 15),
      feedback: 'Good attention to responses. Consider using more reflective statements to show understanding.',
      improvement: Math.floor(Math.random() * 12) + 3,
      icon: '👂',
      trend: 'up'
    },
    {
      name: 'Clear Communication',
      score: 92 + Math.floor(Math.random() * 8),
      feedback: 'Outstanding use of simple, clear language. Perfect pace and tone for elderly care.',
      improvement: Math.floor(Math.random() * 8) + 2,
      icon: '💬',
      trend: 'stable'
    },
    {
      name: 'Patience & Calm',
      score: 88 + Math.floor(Math.random() * 12),
      feedback: 'Demonstrated excellent patience during challenging moments. Keep up the great work!',
      improvement: Math.floor(Math.random() * 10) + 4,
      icon: '🧘',
      trend: 'up'
    }
  ];

  const mockAchievements: Achievement[] = [
    {
      id: 'first-session',
      title: 'First Steps',
      description: 'Complete your first training session',
      icon: '🌟',
      unlocked: sessionCount >= 1,
      progress: Math.min(sessionCount * 100, 100),
      category: 'session',
      rarity: 'common'
    },
    {
      id: 'empathy-expert',
      title: 'Empathy Expert',
      description: 'Score 90+ on empathy in 3 sessions',
      icon: '❤️',
      unlocked: skillScores.some(s => s.name.includes('Empathy') && s.score >= 90),
      progress: skillScores.find(s => s.name.includes('Empathy'))?.score || 0,
      category: 'skill',
      rarity: 'epic'
    },
    {
      id: 'conversation-pro',
      title: 'Conversation Pro',
      description: 'Complete 10 training sessions',
      icon: '💬',
      unlocked: sessionCount >= 10,
      progress: Math.min((sessionCount / 10) * 100, 100),
      category: 'session',
      rarity: 'rare'
    },
    {
      id: 'patience-guru',
      title: 'Patience Guru',
      description: 'Maintain calm in difficult scenarios',
      icon: '🧘',
      unlocked: skillScores.some(s => s.name.includes('Patience') && s.score >= 85),
      progress: skillScores.find(s => s.name.includes('Patience'))?.score || 0,
      category: 'skill',
      rarity: 'legendary'
    }
  ];

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSkillScores(mockSkillScores);
        setAchievements(mockAchievements);
        
        // Check for new achievements
        const newlyUnlocked = mockAchievements.filter(achievement => 
          achievement.unlocked && achievement.progress === 100
        );
        
        if (newlyUnlocked.length > 0) {
          setNewAchievements(newlyUnlocked);
          setShowConfetti(true);
          
          // Hide confetti after 5 seconds
          setTimeout(() => setShowConfetti(false), 5000);
        }
        
      } catch (error) {
        console.error('Failed to load feedback:', error);
        setSkillScores(mockSkillScores);
        setAchievements(mockAchievements);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeedback();
  }, [sessionCount]);

  const averageScore = skillScores.length > 0 
    ? skillScores.reduce((sum, skill) => sum + skill.score, 0) / skillScores.length 
    : 0;

  const getScoreMessage = (score: number) => {
    if (score >= 90) return { message: "Outstanding Performance!", color: "text-green-600", icon: <Award className="h-6 w-6" /> };
    if (score >= 80) return { message: "Excellent Progress!", color: "text-blue-600", icon: <Star className="h-6 w-6" /> };
    if (score >= 70) return { message: "Good Development!", color: "text-yellow-600", icon: <Target className="h-6 w-6" /> };
    return { message: "Keep Practicing!", color: "text-orange-600", icon: <TrendingUp className="h-6 w-6" /> };
  };

  const scoreMessage = getScoreMessage(averageScore);

  // Chart data
  const chartData: ChartData = {
    labels: skillScores.map(skill => skill.name),
    datasets: [
      {
        label: 'Current Score',
        data: skillScores.map(skill => skill.score),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Red for empathy
          'rgba(59, 130, 246, 0.8)',  // Blue for listening
          'rgba(16, 185, 129, 0.8)',  // Green for communication
          'rgba(139, 92, 246, 0.8)'   // Purple for patience
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Skill Assessment Results',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-primary rounded-full mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Analyzing your session...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <div className="container mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center">
            <button
              onClick={() => onNavigate('home')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-all mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Session Complete</h1>
              <p className="text-gray-600">Great job! Here's your performance analysis</p>
            </div>
          </div>
        </motion.div>

        {/* Celebration Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className={`w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold shadow-2xl ${
                averageScore >= 90 ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' :
                averageScore >= 80 ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white' :
                averageScore >= 70 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                'bg-gradient-to-r from-orange-400 to-red-500 text-white'
              }`}
            >
              {Math.round(averageScore)}
              <span className="text-lg ml-1">%</span>
            </motion.div>
            
            {/* Floating Achievement Icons */}
            {averageScore >= 85 && (
              <>
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute top-4 right-8"
                >
                  <Star className="h-6 w-6 text-yellow-400" />
                </motion.div>
                <motion.div
                  animate={{ 
                    y: [0, -15, 0],
                    rotate: [0, -5, 5, 0]
                  }}
                  transition={{ 
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                  className="absolute top-8 left-6"
                >
                  <Trophy className="h-5 w-5 text-blue-400" />
                </motion.div>
                <motion.div
                  animate={{ 
                    y: [0, -12, 0],
                    rotate: [0, 3, -3, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                  className="absolute bottom-8 right-4"
                >
                  <Heart className="h-5 w-5 text-rose-400" />
                </motion.div>
              </>
            )}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg"
          >
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
          </motion.div>
        </motion.div>

        {/* New Achievements */}
        <AnimatePresence>
          {newAchievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 mb-6 border border-yellow-200 shadow-lg"
            >
              <div className="flex items-center mb-4">
                <Trophy className="h-6 w-6 text-yellow-600 mr-2" />
                <h3 className="text-lg font-bold text-yellow-800">New Achievement Unlocked!</h3>
              </div>
              <div className="space-y-3">
                {newAchievements.map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center bg-white/50 rounded-xl p-3"
                  >
                    <div className="text-yellow-600 mr-3 text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-yellow-800">{achievement.title}</div>
                      <div className="text-sm text-yellow-700">{achievement.description}</div>
                    </div>
                    <div className="text-green-500">
                      <Zap className="h-5 w-5" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skills Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Skills Assessment
          </h3>
          <div className="h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Detailed Skills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Detailed Skills Assessment
          </h3>
          <div className="space-y-6">
            {skillScores.map((skill, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <SkillMeter
                  skill={skill}
                  showAnimation={true}
                  showTrend={true}
                  showBadge={true}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Personalized Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-500" />
            Personalized Growth Tips
          </h3>
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="flex items-start bg-blue-50 rounded-lg p-4"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 mb-1">Active Listening Enhancement</p>
                <p className="text-blue-700 text-sm">
                  Try pausing for 2-3 seconds after the elder finishes speaking. This shows respect and gives them time to add more thoughts.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
              className="flex items-start bg-green-50 rounded-lg p-4"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 mb-1">Empathy Building</p>
                <p className="text-green-700 text-sm">
                  Your compassionate responses were excellent. Continue using phrases like "That sounds difficult" and "I can understand why you'd feel that way."
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6 }}
              className="flex items-start bg-purple-50 rounded-lg p-4"
            >
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-purple-800 mb-1">Communication Clarity</p>
                <p className="text-purple-700 text-sm">
                  Practice asking open-ended questions like "How did that make you feel?" to encourage deeper sharing and connection.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="space-y-4"
        >
          <button
            onClick={onRestartSession}
            className="w-full btn-primary py-4 px-6 text-lg flex items-center justify-center"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Practice Another Scenario
          </button>
          
          <button
            onClick={() => onNavigate('home')}
            className="w-full btn-secondary py-4 px-6 text-lg"
          >
            Return to Dashboard
          </button>
        </motion.div>

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
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center mb-1">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">Feedback</span>
            </button>
            <button 
              onClick={() => onNavigate('progress')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <TrendingUp className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Progress</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
