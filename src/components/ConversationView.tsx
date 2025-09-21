import React, { useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';

interface ConversationEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
  emotion?: string;
  confidence?: number;
}

interface ConversationViewProps {
  conversation: ConversationEntry[];
  className?: string;
}

export default function ConversationView({ conversation, className = '' }: ConversationViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  return (
    <div className={`conversation-bg min-h-screen flex flex-col items-center justify-center ${className}`}>
      <div className="conversation-card w-full max-w-2xl mx-auto rounded-3xl shadow-2xl p-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg flex flex-col" style={{ minHeight: '400px' }}>
        <div 
          ref={scrollRef}
          className="overflow-y-auto flex flex-col gap-6 px-6 py-8"
          style={{
            maxHeight: 'calc(100vh - 260px)',
            minHeight: '320px'
          }}
        >
          {conversation.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-20 h-20 bg-white/80 dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg mb-6">
                <Bot className="h-10 w-10 text-indigo-500" />
              </div>
              <p className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Ready to chat?</p>
              <p className="text-gray-500 dark:text-gray-400 text-base">Choose a persona and tap the mic to start.</p>
            </div>
          ) : (
            conversation.map((entry, index) => (
              <div
                key={index}
                className={`flex items-end w-full ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {entry.speaker === 'ai' && (
                  <div className="mr-3 flex-shrink-0">
                    <Bot className="h-10 w-10 text-amber-400 bg-white dark:bg-gray-800 rounded-full shadow-lg" />
                  </div>
                )}
                <div className={`relative max-w-[70%]`}>
                  <div className={`px-6 py-4 rounded-3xl shadow-lg ${
                    entry.speaker === 'user'
                      ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 text-white'
                      : 'bg-gradient-to-br from-white to-green-100 dark:from-gray-800 dark:to-gray-700 text-gray-800 dark:text-gray-100'
                  }`}>
                    <p className="text-base leading-relaxed">{entry.text}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 ml-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {entry.emotion && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {entry.emotion}
                      </span>
                    )}
                    {entry.confidence && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(entry.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                {entry.speaker === 'user' && (
                  <div className="ml-3 flex-shrink-0">
                    <User className="h-10 w-10 text-indigo-500 bg-white dark:bg-gray-800 rounded-full shadow-lg" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        {/* Optimized mic/pause container */}
        <div className="w-full flex justify-center items-center pb-4">
          <div className="
            mic-pause-container
            max-w-md w-full
            p-3
            bg-gradient-to-r from-white via-blue-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
            rounded-xl
            shadow-xl
            overflow-auto
            flex flex-col items-center
            transition-all
            sm:max-w-lg
            md:p-4
          ">
            {/* VoiceButton will be rendered here by parent component */}
            {/* Example transcript display for demo */}
            <div className="w-full text-center text-gray-700 dark:text-gray-200 text-base font-medium">
              <span className="block mb-1">🎤 Tap microphone to speak</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Try: "How are you, Margaret?"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add these styles to your micPulseAnimation string
const micPulseAnimation = `
.conversation-bg {
  background: linear-gradient(135deg, #eaf0fb 0%, #f7fdf7 100%);
  min-height: 100vh;
  width: 100vw;
}

.conversation-card {
  box-shadow: 0 8px 32px 0 rgba(60, 80, 180, 0.12);
  border-radius: 2rem;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

@keyframes breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.mic-button-listening {
  animation: pulse 2s infinite;
}

.mic-pause-container {
  animation: breathe 4s ease-in-out infinite;
  background: rgba(255,255,255,0.95);
  border-radius: 1rem;
  box-shadow: 0 4px 24px 0 rgba(60, 80, 180, 0.10);
  backdrop-filter: blur(6px);
  margin-top: 0;
  transition: all 0.2s;
}

@media (max-width: 768px) {
  .conversation-card {
    padding: 0.5rem;
    border-radius: 1.2rem;
  }
  .mic-pause-container {
    margin: 0.5rem 0.25rem;
    padding: 0.75rem;
    max-width: 98vw;
  }
}

@media (max-width: 480px) {
  .conversation-card {
    padding: 0.25rem;
    border-radius: 1rem;
  }
  .mic-pause-container {
    margin: 0.25rem 0.1rem;
    padding: 0.5rem;
    max-width: 99vw;
  }
}
`;

// Add the animation styles to the document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = micPulseAnimation;
  document.head.appendChild(styleElement);
}