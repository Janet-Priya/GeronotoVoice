import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceButtonProps {
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  size?: 'small' | 'medium' | 'large';
}

export default function VoiceButton({ 
  isListening, 
  onStartListening, 
  onStopListening, 
  size = 'large' 
}: VoiceButtonProps) {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16', 
    large: 'w-20 h-20'
  };

  const iconSizes = {
    small: 'h-5 w-5',
    medium: 'h-6 w-6',
    large: 'h-8 w-8'
  };

  return (
    <button
      onClick={isListening ? onStopListening : onStartListening}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 ${
        isListening
          ? 'bg-red-500 text-white shadow-lg animate-pulse'
          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
      }`}
      aria-label={isListening ? 'Stop listening' : 'Start listening'}
    >
      {isListening ? (
        <MicOff className={iconSizes[size]} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </button>
  );
}