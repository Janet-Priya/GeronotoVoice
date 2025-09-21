import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Type } from 'lucide-react';
import { ConversationEntry } from '../types';
import toast from 'react-hot-toast';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onVoiceToggle: (enabled: boolean) => void;
  onTextInput?: (text: string) => void;
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
  onTextInput,
  voiceEnabled,
  confidence = 0,
  className = '',
  size = 'lg',
  showToggle = true
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recognitionAttempts, setRecognitionAttempts] = useState(0);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  
  const recognitionRef = useRef<any | null>(null);
  const synthesisRef = useRef<typeof window.speechSynthesis | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');
  const textInputRef = useRef<HTMLInputElement>(null);

  // Check for Web Speech API support and request microphone permissions
  useEffect(() => {
    const checkSupportAndPermissions = async () => {
      const speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      const speechSynthesis = 'speechSynthesis' in window;
      const mediaDevices = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      
      console.log('Browser capabilities:', {
        speechRecognition,
        speechSynthesis,
        mediaDevices,
        userAgent: navigator.userAgent
      });
      
      if (!speechRecognition) {
        console.error('Speech recognition not supported in this browser');
        setError('Speech recognition not supported in this browser');
        setShowTextInput(true);
        toast.error('Voice input not supported. Chrome/Edge recommended. Using text input instead.');
        return;
      }
      
      if (!speechSynthesis) {
        console.error('Speech synthesis not supported in this browser');
        setError('Speech synthesis not supported in this browser');
      }
      
      // Request microphone permissions early
      if (mediaDevices) {
        try {
          console.log('Requesting microphone permission...');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
          setMicPermissionGranted(true);
          console.log('Microphone permission granted');
          toast.success('Microphone access granted!');
        } catch (permissionError: any) {
          console.error('Microphone permission denied:', permissionError);
          setPermissionDenied(true);
          setShowTextInput(true);
          
          if (permissionError.name === 'NotAllowedError') {
            toast.error('Microphone access denied. Please allow microphone access and refresh.');
          } else if (permissionError.name === 'NotFoundError') {
            toast.error('No microphone found. Using text input instead.');
          } else {
            toast.error('Microphone error. Using text input instead.');
          }
        }
      } else {
        console.warn('MediaDevices API not supported');
        toast.error('Microphone access not supported. Using text input instead.');
        setShowTextInput(true);
      }
      
      setIsSupported(speechRecognition && speechSynthesis);
    };

    checkSupportAndPermissions();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false; // Prevent loops
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;
        
        recognitionRef.current.onstart = () => {
          setError(null);
          console.log('Speech recognition started');
          toast.success('Listening...', { duration: 1000 });
        };
        
        recognitionRef.current.onerror = (event: { error: string; message?: string }) => {
          console.error('Speech recognition error:', event.error, event);
          setError(`Speech recognition error: ${event.error}`);
          
          // Handle specific errors with user-friendly messages
          switch (event.error) {
            case 'not-allowed':
              toast.error('Microphone permission denied. Please allow microphone access and try again.');
              setPermissionDenied(true);
              setShowTextInput(true);
              break;
            case 'no-speech':
              console.log('No speech detected, will retry if still listening');
              if (isListening && recognitionAttempts < 2) {
                toast('No speech detected. Speak clearly into your microphone.', { 
                  icon: '🎤',
                  duration: 2000 
                });
              } else {
                toast.error('No speech detected. Try using text input.');
                setShowTextInput(true);
              }
              break;
            case 'audio-capture':
              toast.error('No microphone found. Please check your microphone or use text input.');
              setShowTextInput(true);
              break;
            case 'network':
              toast.error('Network error. Please check your internet connection.');
              break;
            case 'service-not-allowed':
              toast.error('Speech service not allowed. Try using text input.');
              setShowTextInput(true);
              break;
            case 'bad-grammar':
              toast.error('Speech recognition error. Try speaking more clearly.');
              break;
            case 'language-not-supported':
              toast.error('Language not supported. Using text input instead.');
              setShowTextInput(true);
              break;
            case 'aborted':
              console.log('Speech recognition aborted');
              // Don't show error for user-initiated stops
              break;
            default:
              toast.error(`Speech error: ${event.error}. Try using text input.`);
              setShowTextInput(true);
          }
          
          // Auto-stop listening on critical errors
          if (['not-allowed', 'audio-capture', 'service-not-allowed', 'language-not-supported'].includes(event.error)) {
            onStopListening();
          }
        };
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              console.log('Final transcript received:', finalTranscript);
            } else {
              interimTranscript += transcript;
              console.log('Interim transcript:', interimTranscript);
            }
          }
          
          // Update refs with current transcripts
          interimTranscriptRef.current = interimTranscript;
          
          // Only update final transcript when we get a final result
          if (finalTranscript.trim()) {
            finalTranscriptRef.current = finalTranscript.trim();
            console.log('Final transcript stored:', finalTranscriptRef.current);
          }
        };
        
        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          
          // Process final transcript if available
          if (finalTranscriptRef.current && finalTranscriptRef.current.trim()) {
            const transcript = finalTranscriptRef.current.trim();
            console.log('Processing final transcript:', transcript);
            
            // Submit the transcript to the parent component
            if (onTextInput) {
              onTextInput(transcript);
              toast.success(`Heard: "${transcript.substring(0, 30)}${transcript.length > 30 ? '...' : '"'}`);
            }
            
            // Clear transcripts after processing
            finalTranscriptRef.current = '';
            interimTranscriptRef.current = '';
            setRecognitionAttempts(0);
            
            // Stop listening after successful transcript
            onStopListening();
            
          } else if (isListening) {
            // Handle case where no transcript was captured
            if (recognitionAttempts < 2) {
              console.log(`No transcript captured, attempt ${recognitionAttempts + 1}/3`);
              setRecognitionAttempts(prev => prev + 1);
              
              // Small delay before restarting to avoid rapid cycling
              setTimeout(() => {
                if (isListening && recognitionRef.current) {
                  try {
                    console.log('Restarting recognition...');
                    recognitionRef.current.start();
                  } catch (error) {
                    console.error('Error restarting recognition:', error);
                    toast.error('Voice recognition failed. Try using text input.');
                    onStopListening();
                    setShowTextInput(true);
                  }
                }
              }, 500);
            } else {
              // After multiple failed attempts, suggest text input
              console.log('Multiple failed attempts, suggesting text input');
              toast.error('Having trouble with voice input. Please try text input instead.');
              setShowTextInput(true);
              onStopListening();
              setRecognitionAttempts(0);
            }
          }
        };
        
        // Add speech event handlers for better debugging
        recognitionRef.current.onspeechstart = () => {
          console.log('Speech detected - user started speaking');
          toast('Speech detected...', { icon: '😮', duration: 1000 });
        };
        
        recognitionRef.current.onspeechend = () => {
          console.log('Speech ended - user stopped speaking');
        };
        
        recognitionRef.current.onsoundstart = () => {
          console.log('Sound detected');
        };
        
        recognitionRef.current.onsoundend = () => {
          console.log('Sound ended');
        };
      }

      if ('speechSynthesis' in window) {
        synthesisRef.current = window.speechSynthesis;
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      setError('Failed to initialize speech recognition');
      setShowTextInput(true);
      toast.error('Voice recognition setup failed. Using text input instead.');
    }
  }, [isSupported, onStopListening, onTextInput]);

  // Reset recognition attempts when listening state changes
  useEffect(() => {
    if (!isListening) {
      setRecognitionAttempts(0);
      // Clear any pending transcripts when stopping
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    }
  }, [isListening]);

  // Focus text input when it becomes visible
  useEffect(() => {
    if (showTextInput && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  }, [showTextInput]);

  const handleClick = () => {
    if (!isSupported || !isInitialized) {
      console.error('Speech features not available');
      setError('Speech features not supported or not initialized');
      toast.error('Speech features not available. Using text input instead.');
      setShowTextInput(true);
      return;
    }

    if (isProcessing) {
      toast.error('Already processing speech, please wait');
      return;
    }

    if (permissionDenied && !micPermissionGranted) {
      toast.error('Microphone access denied. Please refresh and allow access, or use text input.');
      setShowTextInput(true);
      return;
    }

    if (isListening) {
      console.log('Stopping speech recognition');
      onStopListening();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          toast('Stopped listening', { icon: '⏹️', duration: 1000 });
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
    } else {
      // Reset for new session
      console.log('Starting new speech recognition session');
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setRecognitionAttempts(0);
      setError(null);
      
      onStartListening();
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log('Speech recognition started successfully');
        } catch (error: any) {
          console.error('Error starting recognition:', error);
          
          if (error.message && error.message.includes('already started')) {
            toast.error('Speech recognition already active. Please wait.');
          } else {
            toast.error('Failed to start speech recognition. Using text input instead.');
            setShowTextInput(true);
          }
          
          onStopListening();
        }
      }
    }
  };

  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInputValue.trim() && onTextInput) {
      onTextInput(textInputValue.trim());
      setTextInputValue('');
      setShowTextInput(false);
    }
  };

  const toggleTextInput = () => {
    setShowTextInput(prev => !prev);
    if (!showTextInput && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }
  };

  const speakText = (text: string) => {
    if (synthesisRef.current && voiceEnabled) {
      // Cancel any ongoing speech
      synthesisRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        toast.error('Speech synthesis failed');
      };
      
      utterance.onend = () => {
        console.log('Speech synthesis completed');
      };
      
      synthesisRef.current.speak(utterance);
    }
  };

  const toggleVoice = () => {
    onVoiceToggle(!voiceEnabled);
  };

  // Determine button size classes
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  // Determine button color classes
  const colorClasses = isListening
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-blue-500 hover:bg-blue-600 text-white';

  // Determine confidence indicator classes
  const confidenceClasses = `absolute bottom-0 left-0 h-1 bg-green-400 transition-all duration-300 rounded-full`;
  const confidenceWidth = `${Math.max(0, Math.min(100, confidence * 100))}%`;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        {/* Main voice button */}
        <button
          onClick={handleClick}
          disabled={isProcessing || permissionDenied}
          className={`relative rounded-full ${sizeClasses[size]} ${colorClasses} flex items-center justify-center transition-all duration-300 ${
            isProcessing ? 'opacity-70 cursor-not-allowed' : ''
          } ${isListening ? 'animate-pulse' : ''}`}
          title={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isProcessing ? (
            <Loader2 className="animate-spin" />
          ) : isListening ? (
            <MicOff />
          ) : (
            <Mic />
          )}
          <div
            className={confidenceClasses}
            style={{ width: confidenceWidth }}
          ></div>
        </button>

        {/* Text input toggle button */}
        <button
          onClick={toggleTextInput}
          className={`rounded-full w-8 h-8 bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all duration-300`}
          title="Toggle text input"
        >
          <Type size={16} />
        </button>

        {/* Voice output toggle button */}
        {showToggle && (
          <button
            onClick={toggleVoice}
            className={`rounded-full w-8 h-8 ${
              voiceEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'
            } text-white flex items-center justify-center transition-all duration-300`}
            title={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}
      </div>

      {/* Text input fallback */}
      {showTextInput && (
        <form onSubmit={handleTextInputSubmit} className="flex w-full max-w-md mt-2">
          <input
            ref={textInputRef}
            type="text"
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!textInputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      )}

      {/* Error message */}
      {error && !showTextInput && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
};

export default VoiceButton;

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}