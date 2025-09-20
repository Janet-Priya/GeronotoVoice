import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { ConversationEntry } from '../types';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onVoiceToggle: (enabled: boolean) => void;
  voiceEnabled: boolean;
  confidence?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showToggle?: boolean;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  isProcessing,
  onStartListening,
  onStopListening,
  onVoiceToggle,
  voiceEnabled,
  confidence = 0,
  className = '',
  size = 'lg',
  showToggle = true
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // Check for Web Speech API support
  useEffect(() => {
    const checkSupport = () => {
      const speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      const speechSynthesis = 'speechSynthesis' in window;
      
      setIsSupported(speechRecognition && speechSynthesis);
      
      if (!speechRecognition) {
        setError('Speech recognition not supported in this browser');
      } else if (!speechSynthesis) {
        setError('Speech synthesis not supported in this browser');
      }
    };

    checkSupport();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setError(null);
      };
      
      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
      };
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        if (event.results[event.results.length - 1].isFinal) {
          // Process final transcript
          console.log('Final transcript:', transcript);
        }
      };
    }

    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }
  }, [isSupported]);

  const handleClick = () => {
    if (!isSupported) {
      setError('Speech features not supported');
      return;
    }

    if (isProcessing) return;

    if (isListening) {
      onStopListening();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      onStartListening();
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    }
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

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-16 h-16 text-lg';
      case 'md':
        return 'w-20 h-20 text-xl';
      case 'lg':
        return 'w-24 h-24 text-2xl';
      default:
        return 'w-24 h-24 text-2xl';
    }
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'ring-green-400';
    if (confidence >= 0.6) return 'ring-yellow-400';
    return 'ring-red-400';
  };

  const getButtonState = () => {
    if (!isSupported) return 'disabled';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    return 'idle';
  };

  const buttonState = getButtonState();

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Main Voice Button */}
      <button
        onClick={handleClick}
        disabled={!isSupported || isProcessing}
        className={`
          voice-button ${getSizeClasses()}
          ${buttonState === 'listening' ? 'voice-button-active' : ''}
          ${buttonState === 'processing' ? 'opacity-75 cursor-not-allowed' : ''}
          ${buttonState === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
          ${confidence > 0 ? `ring-4 ${getConfidenceColor()}` : ''}
          focus:outline-none focus:ring-4 focus:ring-blue-300
        `}
        aria-label={buttonState === 'listening' ? 'Stop listening' : 'Start listening'}
        aria-describedby="voice-status"
      >
        {buttonState === 'processing' ? (
          <Loader2 className="animate-spin" />
        ) : buttonState === 'listening' ? (
          <MicOff />
        ) : (
          <Mic />
        )}
      </button>

      {/* Voice Wave Animation */}
      {isListening && (
        <div className="voice-wave">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="voice-wave-bar"
              style={{
                height: `${20 + Math.random() * 20}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Status Text */}
      <div id="voice-status" className="text-center">
        {error && (
          <p className="text-red-500 text-sm mb-2" role="alert">
            {error}
          </p>
        )}
        
        {!isSupported && (
          <p className="text-gray-500 text-sm mb-2">
            Voice features not supported in this browser
          </p>
        )}
        
        {isSupported && (
          <p className="text-gray-600 text-sm">
            {buttonState === 'processing' && 'Processing...'}
            {buttonState === 'listening' && 'Listening...'}
            {buttonState === 'idle' && 'Tap to speak'}
            {buttonState === 'disabled' && 'Voice not available'}
          </p>
        )}
        
        {confidence > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Confidence: {Math.round(confidence * 100)}%
          </p>
        )}
      </div>

      {/* Voice Toggle */}
      {showToggle && (
        <button
          onClick={() => onVoiceToggle(!voiceEnabled)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300
            ${voiceEnabled 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }
          `}
          aria-label={`${voiceEnabled ? 'Disable' : 'Enable'} voice responses`}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="text-sm font-medium">
            Voice {voiceEnabled ? 'On' : 'Off'}
          </span>
        </button>
      )}

      {/* Accessibility Instructions */}
      <div className="sr-only">
        <p>
          Voice button for speech recognition. 
          {buttonState === 'idle' && 'Press to start listening.'}
          {buttonState === 'listening' && 'Press to stop listening.'}
          {buttonState === 'processing' && 'Currently processing speech.'}
          {buttonState === 'disabled' && 'Voice features are not available.'}
        </p>
      </div>
    </div>
  );
};

export default VoiceButton;