import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Target, 
  Trophy,
  Star,
  Award,
  Brain,
  Heart
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { SkillScore, Achievement } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProgressProps {
  onNavigate: (page: string) => void;
  sessionCount: number;
  achievements: Achievement[];
}

const Progress: React.FC<ProgressProps> = ({
  onNavigate,
  sessionCount,
  achievements
}) => {
  const [skillProgress, setSkillProgress] = useState<SkillScore[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);

  useEffect(() => {
    // Mock skill progress data
    setSkillProgress([
      { 
        name: 'Empathy & Compassion', 
        score: 85, 
        feedback: 'Excellent emotional connection',
        improvement: 12,
        icon: '❤️',
        trend: 'up'
      },
      { 
        name: 'Active Listening', 
        score: 78, 
        feedback: 'Good attention to responses',
        improvement: 8,
        icon: '👂',
        trend: 'up'
      },
      { 
        name: 'Clear Communication', 
        score: 92, 
        feedback: 'Outstanding language use',
        improvement: 5,
        icon: '💬',
        trend: 'stable'
      },
      { 
        name: 'Patience & Calm', 
        score: 88, 
        feedback: 'Excellent patience demonstrated',
        improvement: 10,
        icon: '🧘',
        trend: 'up'
      }
    ]);

    // Mock weekly progress data
    setWeeklyData([65, 72, 78, 82, 85, 88, 90]);
  }, []);

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Average Score',
        data: weeklyData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
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
        text: 'Weekly Progress',
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

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const totalScore = skillProgress.length > 0 
    ? Math.round(skillProgress.reduce((sum, skill) => sum + skill.score, 0) / skillProgress.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
              <h1 className="text-3xl font-bold text-gray-800">Your Progress</h1>
              <p className="text-gray-600">Track your caregiving skills development</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600">{sessionCount}</div>
            <div className="text-sm text-gray-500">Sessions</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600">{totalScore}%</div>
            <div className="text-sm text-gray-500">Avg Score</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-purple-600">{unlockedAchievements.length}</div>
            <div className="text-sm text-gray-500">Achievements</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-orange-600">7</div>
            <div className="text-sm text-gray-500">Day Streak</div>
          </div>
        </motion.div>

        {/* Weekly Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Weekly Progress
          </h3>
          <div className="h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Skills Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Skills Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {skillProgress.map((skill, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{skill.icon}</div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{skill.name}</h4>
                      <p className="text-sm text-gray-600">{skill.feedback}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">{skill.score}%</div>
                    <div className="text-sm text-green-600">+{skill.improvement}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                className={`text-center p-4 rounded-xl transition-all ${
                  achievement.unlocked 
                    ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300' 
                    : 'bg-gray-100 border-2 border-gray-200'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <div className={`font-semibold text-sm ${
                  achievement.unlocked ? 'text-yellow-800' : 'text-gray-500'
                }`}>
                  {achievement.title}
                </div>
                <div className={`text-xs mt-1 ${
                  achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {achievement.unlocked ? 'Unlocked!' : `${achievement.progress}%`}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {[
              { date: 'Today', activity: 'Completed session with Margaret', score: 88 },
              { date: 'Yesterday', activity: 'Practiced with Robert', score: 92 },
              { date: '2 days ago', activity: 'Empathy training session', score: 85 },
              { date: '3 days ago', activity: 'Communication skills practice', score: 90 }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6 + index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-800">{item.activity}</div>
                  <div className="text-sm text-gray-500">{item.date}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{item.score}%</div>
                  <div className="text-sm text-gray-500">Score</div>
                </div>
              </motion.div>
            ))}
          </div>
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
              <span className="text-xs font-medium">Progress</span>
            </button>
            <button 
              onClick={() => onNavigate('community')}
              className="flex flex-col items-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Heart className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Community</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
