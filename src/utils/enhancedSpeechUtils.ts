// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    SpeechGrammarList: any;
    webkitSpeechGrammarList: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onspeechstart: ((event: Event) => void) | null;
  onspeechend: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechGrammarList {
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  length: number;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

export interface VoiceSettings {
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  confidenceThreshold: number;
  maxAlternatives: number;
  interimResults: boolean;
  continuous: boolean;
  noiseReduction: boolean;
  elderlyOptimized: boolean;
}

export const defaultVoiceSettings: VoiceSettings = {
  language: 'en-US',
  rate: 0.8,
  pitch: 1,
  volume: 0.8,
  confidenceThreshold: 0.6, // Lower threshold for elderly voices
  maxAlternatives: 3, // More alternatives for better accuracy
  interimResults: true,
  continuous: false,
  noiseReduction: true,
  elderlyOptimized: true
};

export const elderlyOptimizedSettings: VoiceSettings = {
  ...defaultVoiceSettings,
  confidenceThreshold: 0.5, // Even lower for elderly speech patterns
  maxAlternatives: 5,
  rate: 0.7, // Slower speech rate
  language: 'en-US',
  elderlyOptimized: true
};

export const supportedLanguages = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' }
];

export interface SpeechResult {
  transcript: string;
  confidence: number;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
  isFinal: boolean;
  timestamp: number;
}

export interface SpeechError {
  error: string;
  message: string;
  recoverable: boolean;
  suggestion: string;
}

export class EnhancedSpeechManager {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private settings: VoiceSettings;
  private isListening: boolean = false;
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private lastResult: string = '';
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private noiseGate: GainNode | null = null;

  constructor(settings: VoiceSettings = elderlyOptimizedSettings) {
    this.settings = settings;
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
    this.initializeAudioProcessing();
  }

  private async initializeAudioProcessing() {
    if (!this.settings.noiseReduction) return;

    try {
      // Initialize Web Audio API for noise reduction
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create noise gate for basic noise reduction
      this.noiseGate = this.audioContext.createGain();
      this.noiseGate.gain.value = 0.8; // Reduce background noise
      
      console.log('Audio processing initialized for noise reduction');
    } catch (error) {
      console.warn('Audio processing initialization failed:', error);
    }
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      if (this.recognition) {
        // Optimize for elderly speech patterns
        this.recognition.continuous = this.settings.continuous;
        this.recognition.interimResults = this.settings.interimResults;
        this.recognition.lang = this.settings.language;
        this.recognition.maxAlternatives = this.settings.maxAlternatives;
        
        // Add elderly-specific optimizations
        if (this.settings.elderlyOptimized) {
          // These settings help with slower, less clear speech
          (this.recognition as any).serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
          (this.recognition as any).grammars = this.createElderlyGrammar();
        }
      }
    }
  }

  private createElderlyGrammar(): SpeechGrammarList | null {
    try {
      if ('webkitSpeechGrammarList' in window || 'SpeechGrammarList' in window) {
        const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
        const grammarList = new SpeechGrammarList();
        
        // Common phrases and words used in elderly care
        const elderlyGrammar = `
          #JSGF V1.0;
          grammar elderlycare;
          public <elderlycare> = 
            (help | assistance | pain | medication | doctor | nurse | family | 
             tired | confused | worried | scared | lonely | hungry | thirsty |
             bathroom | bed | chair | walker | glasses | hearing aid |
             yes | no | please | thank you | sorry | excuse me |
             morning | afternoon | evening | night | today | yesterday | tomorrow |
             good | bad | better | worse | fine | okay | alright);
        `;
        
        grammarList.addFromString(elderlyGrammar, 1);
        return grammarList;
      }
    } catch (error) {
      console.warn('Grammar creation failed:', error);
    }
    return null;
  }

  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return !!(this.recognition && this.synthesis);
  }

  public async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Optimize for elderly listeners
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = this.settings.volume;
      utterance.lang = this.settings.language;

      // Choose appropriate voice for elderly users
      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang === this.settings.language && 
        (voice.name.includes('Female') || voice.name.includes('Natural'))
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synthesis.speak(utterance);
    });
  }

  public async startListening(
    onResult: (result: SpeechResult) => void,
    onError: (error: SpeechError) => void,
    onEnd?: () => void
  ): Promise<void> {
    if (!this.recognition) {
      onError({
        error: 'not-supported',
        message: 'Speech recognition not supported',
        recoverable: false,
        suggestion: 'Please use text input instead'
      });
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    try {
      // Request microphone access with noise reduction if available
      if (this.settings.noiseReduction) {
        await this.setupAudioStream();
      }

      this.isListening = true;
      this.retryCount = 0;
      this.lastResult = '';

      this.recognition.onstart = () => {
        console.log('Enhanced speech recognition started');
        this.startSilenceDetection();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        this.clearTimeouts();
        
        let interimTranscript = '';
        let finalTranscript = '';
        let bestConfidence = 0;
        let alternatives: Array<{transcript: string; confidence: number}> = [];

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          // Collect alternatives for better accuracy
          for (let j = 0; j < result.length; j++) {
            const alternative = result[j];
            alternatives.push({
              transcript: alternative.transcript,
              confidence: alternative.confidence
            });
          }

          const transcript = result[0].transcript;
          const confidence = result[0].confidence;

          if (result.isFinal) {
            finalTranscript += transcript;
            bestConfidence = Math.max(bestConfidence, confidence);
          } else {
            interimTranscript += transcript;
          }
        }

        // Filter results by confidence threshold
        const filteredAlternatives = alternatives.filter(alt => 
          alt.confidence >= this.settings.confidenceThreshold
        );

        if (finalTranscript || interimTranscript) {
          const speechResult: SpeechResult = {
            transcript: finalTranscript || interimTranscript,
            confidence: bestConfidence,
            alternatives: filteredAlternatives,
            isFinal: !!finalTranscript,
            timestamp: Date.now()
          };

          // Avoid duplicate results
          if (speechResult.transcript !== this.lastResult || speechResult.isFinal) {
            onResult(speechResult);
            if (speechResult.isFinal) {
              this.lastResult = speechResult.transcript;
            }
          }
        }

        // Restart silence detection
        this.startSilenceDetection();
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Enhanced speech recognition error:', event.error);
        this.clearTimeouts();
        this.isListening = false;

        const speechError: SpeechError = this.categorizeError(event.error);
        
        // Attempt recovery for recoverable errors
        if (speechError.recoverable && this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`Attempting recovery (${this.retryCount}/${this.maxRetries})`);
          
          setTimeout(() => {
            this.startListening(onResult, onError, onEnd);
          }, 1000 * this.retryCount); // Exponential backoff
        } else {
          onError(speechError);
        }
      };

      this.recognition.onend = () => {
        console.log('Enhanced speech recognition ended');
        this.clearTimeouts();
        this.isListening = false;
        this.cleanupAudioStream();
        
        if (onEnd) {
          onEnd();
        }
      };

      // Set overall timeout
      this.recognitionTimeout = setTimeout(() => {
        if (this.isListening) {
          console.log('Recognition timeout reached');
          this.stopListening();
        }
      }, 30000); // 30 second timeout

      this.recognition.start();

    } catch (error) {
      console.error('Failed to start enhanced speech recognition:', error);
      this.isListening = false;
      onError({
        error: 'initialization-failed',
        message: 'Failed to initialize speech recognition',
        recoverable: true,
        suggestion: 'Please try again or check microphone permissions'
      });
    }
  }

  private async setupAudioStream(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimize for speech
        }
      });

      if (this.audioContext && this.noiseGate) {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.noiseGate);
        this.noiseGate.connect(this.audioContext.destination);
      }
    } catch (error) {
      console.warn('Audio stream setup failed:', error);
    }
  }

  private cleanupAudioStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  private startSilenceDetection(): void {
    this.clearTimeouts();
    
    // Detect silence and auto-stop
    this.silenceTimeout = setTimeout(() => {
      if (this.isListening) {
        console.log('Silence detected, stopping recognition');
        this.stopListening();
      }
    }, 5000); // 5 seconds of silence
  }

  private clearTimeouts(): void {
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private categorizeError(error: string): SpeechError {
    const errorMap: Record<string, SpeechError> = {
      'not-allowed': {
        error: 'not-allowed',
        message: 'Microphone permission denied',
        recoverable: false,
        suggestion: 'Please allow microphone access in browser settings'
      },
      'no-speech': {
        error: 'no-speech',
        message: 'No speech detected',
        recoverable: true,
        suggestion: 'Please speak clearly and try again'
      },
      'audio-capture': {
        error: 'audio-capture',
        message: 'No microphone found',
        recoverable: false,
        suggestion: 'Please check your microphone connection'
      },
      'network': {
        error: 'network',
        message: 'Network error occurred',
        recoverable: true,
        suggestion: 'Please check your internet connection'
      },
      'aborted': {
        error: 'aborted',
        message: 'Recognition was aborted',
        recoverable: true,
        suggestion: 'Recognition was stopped, you can try again'
      }
    };

    return errorMap[error] || {
      error: 'unknown',
      message: `Unknown error: ${error}`,
      recoverable: true,
      suggestion: 'Please try again'
    };
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.clearTimeouts();
    this.cleanupAudioStream();
    this.isListening = false;
  }

  public updateSettings(settings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    if (this.recognition) {
      this.recognition.lang = this.settings.language;
      this.recognition.maxAlternatives = this.settings.maxAlternatives;
      this.recognition.continuous = this.settings.continuous;
      this.recognition.interimResults = this.settings.interimResults;
    }
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public getRetryCount(): number {
    return this.retryCount;
  }

  public resetRetryCount(): void {
    this.retryCount = 0;
  }
}

export const createEnhancedSpeechManager = (settings?: VoiceSettings) => {
  return new EnhancedSpeechManager(settings);
};

// Utility functions for speech processing
export const preprocessSpeechText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
    .toLowerCase();
};

export const calculateSpeechQuality = (result: SpeechResult): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (result.confidence >= 0.9) return 'excellent';
  if (result.confidence >= 0.7) return 'good';
  if (result.confidence >= 0.5) return 'fair';
  return 'poor';
};

export const getBestAlternative = (alternatives: Array<{transcript: string; confidence: number}>): string => {
  if (alternatives.length === 0) return '';
  
  // Sort by confidence and return the best one
  const sorted = alternatives.sort((a, b) => b.confidence - a.confidence);
  return sorted[0].transcript;
};
