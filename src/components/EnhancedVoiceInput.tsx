import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, Settings, Loader2, Volume2, VolumeX, Type, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  EnhancedSpeechManager, 
  createEnhancedSpeechManager, 
  elderlyOptimizedSettings,
  SpeechResult,
  SpeechError,
  VoiceSettings,
  calculateSpeechQuality,
  getBestAlternative,
  preprocessSpeechText
} from '../utils/enhancedSpeechUtils';

interface EnhancedVoiceInputProps {
  onVoiceInput: (text: string) => void;
  isProcessing?: boolean;
  className?: string;
  voiceEnabled?: boolean;
  onVoiceToggle?: (enabled: boolean) => void;
  settings?: Partial<VoiceSettings>;
  showQualityIndicator?: boolean;
  showAlternatives?: boolean;
}

const EnhancedVoiceInput: React.FC<EnhancedVoiceInputProps> = ({
  onVoiceInput,
  isProcessing = false,
  className = '',
  voiceEnabled = true,
  onVoiceToggle,
  settings,
  showQualityIndicator = true,
  showAlternatives = false
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [speechQuality, setSpeechQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [alternatives, setAlternatives] = useState<Array<{transcript: string; confidence: number}>>([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  const speechManagerRef = useRef<EnhancedSpeechManager | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Initialize enhanced speech manager
  useEffect(() => {
    const initializeSpeechManager = async () => {
      try {
        const mergedSettings = { ...elderlyOptimizedSettings, ...settings };
        speechManagerRef.current = createEnhancedSpeechManager(mergedSettings);
        
        const supported = speechManagerRef.current.isSupported();
        setIsSupported(supported);
        setIsInitialized(true);
        
        if (!supported) {
          setError('Enhanced speech features not supported in this browser');
          setShowTextInput(true);
          toast.error('Voice input not supported. Using text input instead.');
        } else {
          console.log('Enhanced speech manager initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize enhanced speech manager:', error);
        setError('Failed to initialize speech recognition');
        setShowTextInput(true);
      }
    };

    initializeSpeechManager();

    return () => {
      if (speechManagerRef.current) {
        speechManagerRef.current.stopListening();
      }
    };
  }, [settings]);

  // Handle speech results - DEMO OPTIMIZED
  const handleSpeechResult = (result: SpeechResult) => {
    console.log('Speech result received:', result);
    
    setCurrentTranscript(result.transcript);
    setConfidence(result.confidence);
    setSpeechQuality(calculateSpeechQuality(result));
    setAlternatives(result.alternatives);
    
    // Process final results with DEMO-FRIENDLY thresholds
    if (result.isFinal && result.transcript.trim()) {
      const processedText = preprocessSpeechText(result.transcript);
      console.log('Final transcript processed:', processedText);
      
      // DEMO FIX: Lower confidence threshold to 0.3 as per memory guidelines
      let finalText = processedText;
      if (result.confidence < 0.3 && result.alternatives.length > 0) {
        const bestAlternative = getBestAlternative(result.alternatives);
        if (bestAlternative) {
          finalText = preprocessSpeechText(bestAlternative);
          console.log('Using best alternative:', finalText);
        }
      }
      
      // DEMO FIX: Accept any transcript with confidence > 0.2 or length > 2
      if (result.confidence > 0.2 || processedText.length > 2) {
        onVoiceInput(finalText);
        setCurrentTranscript('');
        setAlternatives([]);
        setRetryCount(0);
        setError(null); // Clear any previous errors
      } else {
        console.log('Transcript rejected: low confidence and short length');
      }
    }
  };

  // Handle speech errors
  const handleSpeechError = (speechError: SpeechError) => {
    console.error('Speech error:', speechError);
    
    setError(speechError.message);
    setIsListening(false);
    
    // Update retry count
    if (speechManagerRef.current) {
      setRetryCount(speechManagerRef.current.getRetryCount());
    }
    
    // Show appropriate toast message
    if (speechError.recoverable) {
      toast.error(`${speechError.message}. ${speechError.suggestion}`);
    } else {
      toast.error(`${speechError.message}. ${speechError.suggestion}`);
      setShowTextInput(true);
    }
  };

  // Handle speech end
  const handleSpeechEnd = () => {
    console.log('Speech recognition ended');
    setIsListening(false);
    setCurrentTranscript('');
  };

  // Start listening
  const startListening = async () => {
    if (!speechManagerRef.current || !isSupported || isProcessing) {
      return;
    }

    try {
      setError(null);
      setIsListening(true);
      
      await speechManagerRef.current.startListening(
        handleSpeechResult,
        handleSpeechError,
        handleSpeechEnd
      );
    } catch (error) {
      console.error('Failed to start listening:', error);
      setError('Failed to start speech recognition');
      setIsListening(false);
      toast.error('Failed to start voice input. Try text input instead.');
      setShowTextInput(true);
    }
  };

  // Stop listening
  const stopListening = () => {
    if (speechManagerRef.current) {
      speechManagerRef.current.stopListening();
    }
    setIsListening(false);
    setCurrentTranscript('');
  };

  // Handle microphone button click
  const handleMicClick = () => {
    if (!isSupported || !isInitialized) {
      toast.error('Speech features not available');
      setShowTextInput(true);
      return;
    }

    if (isProcessing) {
      toast.error('Already processing speech');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Handle pause/resume
  const handlePauseClick = () => {
    setIsPaused(!isPaused);
    if (isPaused && isListening) {
      startListening();
    } else if (!isPaused && isListening) {
      stopListening();
    }
  };

  // Handle settings
  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  // Handle voice toggle
  const handleVoiceToggle = () => {
    if (onVoiceToggle) {
      onVoiceToggle(!voiceEnabled);
    }
  };

  // Handle text input
  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInputValue.trim()) {
      onVoiceInput(textInputValue.trim());
      setTextInputValue('');
      setShowTextInput(false);
    }
  };

  // Toggle text input
  const toggleTextInput = () => {
    setShowTextInput(!showTextInput);
    if (!showTextInput && textInputRef.current) {
      setTimeout(() => textInputRef.current?.focus(), 100);
    }
  };

  // Get confidence color
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-green-500';
    if (conf >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get quality color
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`max-w-md mx-auto p-6 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 shadow-lg ${className}`}>
      {/* Main Voice Input Container */}
      <div className="flex items-center justify-center gap-3 mb-4">
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
            focus:outline-none focus:ring-2 focus:ring-yellow-300
          `}
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Main Microphone Button */}
        <div className="relative">
          <button
            onClick={handleMicClick}
            disabled={!isSupported || isProcessing}
            className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
              ${isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                : 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:from-blue-600 hover:to-green-600'
              }
              ${(!isSupported || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-4 focus:ring-blue-300
              shadow-lg hover:shadow-xl transform hover:scale-105
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
          
          {/* Confidence indicator */}
          {showQualityIndicator && confidence > 0 && (
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getConfidenceColor(confidence)}`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Text Input Toggle */}
        <button
          onClick={toggleTextInput}
          className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Toggle text input"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Voice Output Toggle */}
        {onVoiceToggle && (
          <button
            onClick={handleVoiceToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 ${
              voiceEnabled 
                ? 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-300' 
                : 'bg-gray-400 hover:bg-gray-500 text-white focus:ring-gray-300'
            }`}
            aria-label={voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={handleSettingsClick}
          disabled={!isSupported}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
            bg-gray-200 text-gray-600 hover:bg-gray-300
            ${!isSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-gray-300
          `}
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Current Transcript Display */}
      {currentTranscript && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">Listening:</span>
            {showQualityIndicator && (
              <span className={`text-xs font-medium ${getQualityColor(speechQuality)}`}>
                {speechQuality} ({Math.round(confidence * 100)}%)
              </span>
            )}
          </div>
          <p className="text-gray-800 italic">{currentTranscript}</p>
        </div>
      )}

      {/* Alternatives Display */}
      {showAlternatives && alternatives.length > 1 && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-2">Alternatives:</div>
          <div className="space-y-1">
            {alternatives.slice(0, 3).map((alt, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{alt.transcript}</span>
                <span className="text-gray-500">{Math.round(alt.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status and Error Messages */}
      <div className="text-center mb-4">
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-500 text-sm mb-2" role="alert">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        {!isSupported && (
          <div className="text-gray-500 text-sm">
            <p>Enhanced voice features not supported</p>
            <p className="text-xs mt-1">Please use Chrome or Edge for best experience</p>
          </div>
        )}
        
        {isSupported && !isInitialized && (
          <p className="text-yellow-600 text-sm">
            Initializing enhanced speech recognition...
          </p>
        )}
        
        {isSupported && isInitialized && (
          <div className="text-gray-600 text-sm">
            {isProcessing && <p>Processing speech...</p>}
            {isListening && <p>Listening... Speak naturally</p>}
            {!isListening && !isProcessing && <p>Tap microphone to start speaking with Margaret</p>}
            {retryCount > 0 && (
              <p className="text-blue-600 text-xs mt-1">
                Attempt {retryCount}/3 - Keep speaking
              </p>
            )}
            {confidence > 0 && confidence < 0.5 && (
              <p className="text-green-600 text-xs mt-1">
                Good - Keep going (detected: {Math.round(confidence * 100)}%)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Text Input Fallback */}
      {showTextInput && (
        <form onSubmit={handleTextInputSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              ref={textInputRef}
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!textInputValue.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Send
            </button>
          </div>
        </form>
      )}

      {/* Settings Panel */}
      {showSettings && isSupported && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Voice Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Confidence Threshold: {Math.round((speechManagerRef.current?.getSettings().confidenceThreshold || 0.5) * 100)}%
              </label>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.1"
                value={speechManagerRef.current?.getSettings().confidenceThreshold || 0.5}
                onChange={(e) => {
                  if (speechManagerRef.current) {
                    speechManagerRef.current.updateSettings({
                      confidenceThreshold: parseFloat(e.target.value)
                    });
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Elderly Optimized</span>
              <input
                type="checkbox"
                checked={speechManagerRef.current?.getSettings().elderlyOptimized || false}
                onChange={(e) => {
                  if (speechManagerRef.current) {
                    speechManagerRef.current.updateSettings({
                      elderlyOptimized: e.target.checked
                    });
                  }
                }}
                className="rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Noise Reduction</span>
              <input
                type="checkbox"
                checked={speechManagerRef.current?.getSettings().noiseReduction || false}
                onChange={(e) => {
                  if (speechManagerRef.current) {
                    speechManagerRef.current.updateSettings({
                      noiseReduction: e.target.checked
                    });
                  }
                }}
                className="rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          {isSupported 
            ? "💡 Try: 'Hello Margaret, how are you today?' or 'Tell me about your day'"
            : "Voice input not available. Please use the text input option."
          }
        </p>
        {retryCount > 0 && (
          <p className="text-xs text-blue-600 mt-1">
            Keep trying! The system learns from your voice pattern.
          </p>
        )}
        {!showTextInput && isSupported && (
          <button
            onClick={toggleTextInput}
            className="text-xs text-blue-500 hover:text-blue-700 mt-2 underline"
          >
            Use text input instead
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedVoiceInput;
