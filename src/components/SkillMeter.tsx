import React from 'react';
import { TrendingUp, Award, Target } from 'lucide-react';

interface SkillScore {
  name: string;
  score: number;
  feedback: string;
}

interface SkillMeterProps {
  skill: SkillScore;
  showFeedback?: boolean;
}

export default function SkillMeter({ skill, showFeedback = true }: SkillMeterProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 85) return <Award className="h-4 w-4" />;
    if (score >= 70) return <Target className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  const color = getScoreColor(skill.score);
  const colorClasses = {
    green: {
      bg: 'bg-green-500',
      text: 'text-green-600',
      icon: 'text-green-500'
    },
    yellow: {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600',
      icon: 'text-yellow-500'
    },
    red: {
      bg: 'bg-red-500',
      text: 'text-red-600',
      icon: 'text-red-500'
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className={colorClasses[color].icon}>
            {getScoreIcon(skill.score)}
          </span>
          <span className="font-medium text-gray-800">{skill.name}</span>
        </div>
        <span className={`font-bold ${colorClasses[color].text}`}>
          {skill.score}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ease-out ${colorClasses[color].bg}`}
          style={{ width: `${skill.score}%` }}
        />
      </div>
      
      {showFeedback && (
        <p className="text-sm text-gray-600 leading-relaxed">
          {skill.feedback}
        </p>
      )}
    </div>
  );
}