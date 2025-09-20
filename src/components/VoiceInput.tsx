import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, Settings, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceInputProps {
  onVoiceInput: (text: string) => void;
  isProcessing?: boolean;
  className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onVoiceInput,
  isProcessing = false,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');

  // Check for Web Speech API support
  useEffect(() => {
    const checkSupport = () => {
      const speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      setIsSupported(speechRecognition);
      
      if (!speechRecognition) {
        setError('Speech recognition not supported in this browser');
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
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onstart = () => {
        setError(null);
        setIsListening(true);
        console.log('Speech recognition started');
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        
        // Handle specific errors with toast notifications
        switch (event.error) {
          case 'not-allowed':
            toast.error('Microphone permission denied. Please allow microphone access.');
            break;
          case 'no-speech':
            toast.error('No speech detected. Please try again.');
            break;
          case 'audio-capture':
            toast.error('No microphone found. Please check your microphone.');
            break;
          case 'network':
            toast.error('Network error. Please check your connection.');
            break;
          default:
            toast.error(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence);
          } else {
            interimTranscript += transcript;
          }
        }
        
        interimTranscriptRef.current = interimTranscript;
        finalTranscriptRef.current = finalTranscript;
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        
        if (finalTranscriptRef.current.trim()) {
          onVoiceInput(finalTranscriptRef.current.trim());
          finalTranscriptRef.current = '';
        }
      };
    }
    
    setIsInitialized(true);
  }, [isSupported, onVoiceInput]);

  const handleMicClick = () => {
    if (!isSupported || !isInitialized) {
      toast.error('Speech features not available');
      return;
    }

    if (isProcessing) {
      toast.error('Already processing speech');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
    } else {
      if (recognitionRef.current) {
        try {
          finalTranscriptRef.current = '';
          interimTranscriptRef.current = '';
          setConfidence(0);
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting recognition:', error);
          toast.error('Failed to start speech recognition');
        }
      }
    }
  };

  const handlePauseClick = () => {
    setIsPaused(!isPaused);
    // Pause/resume functionality can be implemented here
  };

  const handleSettingsClick = () => {
    // Settings functionality can be implemented here
    toast.info('Settings feature coming soon');
  };

  return (
    <div className={`max-w-md mx-auto p-4 rounded-xl bg-gradient-to-r from-blue-100 to-green-100 flex flex-col items-center gap-4 ${className}`}>
      {/* Main Voice Input Container */}
      <div className="flex items-center justify-center gap-3">
        {/* Pause/Play Button */}
        <button
          onClick={handlePauseClick}
          disabled={!isSupported || isProcessing}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
            ${isPaused 
              ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }
            ${(!isSupported || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Main Microphone Button */}
        <button
          onClick={handleMicClick}
          disabled={!isSupported || isProcessing}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
            ${isListening 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600'
            }
            ${(!isSupported || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-4 focus:ring-blue-300
            ${confidence > 0 ? 'ring-4 ring-green-400' : ''}
          `}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={handleSettingsClick}
          disabled={!isSupported}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
            bg-gray-200 text-gray-600 hover:bg-gray-300
            ${!isSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Status Text */}
      <div className="text-center">
        {error && (
          <p className="text-red-500 text-sm mb-2" role="alert">
            {error}
          </p>
        )}
        
        {!isSupported && (
          <div className="text-gray-500 text-sm">
            <p>Voice features not supported</p>
            <p className="text-xs mt-1">Please use Chrome or Edge</p>
          </div>
        )}
        
        {isSupported && !isInitialized && (
          <p className="text-yellow-600 text-sm">
            Initializing speech recognition...
          </p>
        )}
        
        {isSupported && isInitialized && (
          <p className="text-gray-600 text-sm">
            {isProcessing && 'Processing...'}
            {isListening && 'Listening...'}
            {!isListening && !isProcessing && 'Tap to speak with Margaret'}
          </p>
        )}
        
        {confidence > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Confidence: {Math.round(confidence * 100)}%
          </p>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Speak naturally and clearly for best results
        </p>
      </div>

      {/* Mobile Responsiveness */}
      <style jsx>{`
        @media (max-width: 768px) {
          .max-w-md {
            max-width: 100%;
            margin: 0 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceInput;
