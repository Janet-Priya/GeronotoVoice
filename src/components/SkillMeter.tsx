import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Award, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SkillScore, Achievement } from '../types';

interface SkillMeterProps {
  skill: SkillScore;
  showAnimation?: boolean;
  showTrend?: boolean;
  showBadge?: boolean;
  className?: string;
}

interface BadgeProps {
  achievement: Achievement;
  onUnlock?: (achievement: Achievement) => void;
}

const Badge: React.FC<BadgeProps> = ({ achievement, onUnlock }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement.unlocked && achievement.progress === 100) {
      setIsVisible(true);
      onUnlock?.(achievement);
    }
  }, [achievement.unlocked, achievement.progress, onUnlock]);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'achievement-common';
      case 'rare':
        return 'achievement-rare';
      case 'epic':
        return 'achievement-epic';
      case 'legendary':
        return 'achievement-legendary';
      default:
        return 'achievement-common';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return <Star className="w-4 h-4" />;
      case 'rare':
        return <Award className="w-4 h-4" />;
      case 'epic':
        return <Trophy className="w-4 h-4" />;
      case 'legendary':
        return <Zap className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`
            achievement-badge ${getRarityColor(achievement.rarity)}
            flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg
            animate-bounce-in
          `}>
            {getRarityIcon(achievement.rarity)}
            <span className="font-semibold">{achievement.title}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SkillMeter: React.FC<SkillMeterProps> = ({
  skill,
  showAnimation = true,
  showTrend = true,
  showBadge = true,
  className = ''
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (showAnimation) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayScore(skill.score);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDisplayScore(skill.score);
    }
  }, [skill.score, showAnimation]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-400 to-green-600';
    if (score >= 80) return 'from-blue-400 to-blue-600';
    if (score >= 70) return 'from-yellow-400 to-yellow-600';
    if (score >= 60) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  const getTrendIcon = () => {
    switch (skill.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (skill.trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  // Generate mock achievement for demonstration
  const mockAchievement: Achievement = {
    id: `achievement-${skill.name.toLowerCase().replace(/\s+/g, '-')}`,
    title: `${skill.name} Expert`,
    description: `Achieved ${skill.score}% in ${skill.name}`,
    icon: skill.icon,
    unlocked: skill.score >= 90,
    progress: skill.score,
    category: 'skill',
    rarity: skill.score >= 90 ? 'legendary' : skill.score >= 80 ? 'epic' : skill.score >= 70 ? 'rare' : 'common'
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Skill Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{skill.icon}</div>
          <div>
            <h3 className="font-semibold text-gray-800">{skill.name}</h3>
            <p className="text-sm text-gray-600">{getScoreLabel(skill.score)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showTrend && getTrendIcon()}
          <span className="text-2xl font-bold text-gray-800">
            {Math.round(displayScore)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="skill-meter">
        <motion.div
          className={`skill-meter-fill bg-gradient-to-r ${getScoreColor(skill.score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${displayScore}%` }}
          transition={{ 
            duration: showAnimation ? 1.5 : 0,
            ease: 'easeOut',
            delay: showAnimation ? 0.5 : 0
          }}
          style={{
            background: `linear-gradient(90deg, ${getScoreColor(skill.score).split(' ')[0]}, ${getScoreColor(skill.score).split(' ')[2]})`
          }}
        />
      </div>

      {/* Improvement Indicator */}
      {skill.improvement > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className={`flex items-center space-x-1 text-sm ${getTrendColor()}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>+{skill.improvement}% improvement</span>
        </motion.div>
      )}

      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="bg-gray-50 rounded-lg p-3"
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          {skill.feedback}
        </p>
      </motion.div>

      {/* Achievement Badge */}
      {showBadge && mockAchievement.unlocked && (
        <Badge achievement={mockAchievement} />
      )}

      {/* Animation Overlay */}
      {isAnimating && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-green-400/20 rounded-full animate-pulse" />
        </motion.div>
      )}
    </div>
  );
};

export default SkillMeter;