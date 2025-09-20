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
    <div 
      ref={scrollRef}
      className={`overflow-y-auto space-y-4 p-4 ${className}`}
    >
      {conversation.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Bot className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500">Start speaking to begin your training session...</p>
        </div>
      ) : (
        conversation.map((entry, index) => (
          <div
            key={index}
            className={`flex items-start space-x-3 ${
              entry.speaker === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              entry.speaker === 'user' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-amber-100 text-amber-600'
            }`}>
              {entry.speaker === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            <div className={`max-w-xs lg:max-w-md ${
              entry.speaker === 'user' ? 'text-right' : 'text-left'
            }`}>
              <div className={`px-4 py-3 rounded-2xl ${
                entry.speaker === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="text-sm leading-relaxed">{entry.text}</p>
              </div>
              <div className={`flex items-center mt-1 space-x-2 ${
                entry.speaker === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                <p className={`text-xs ${
                  entry.speaker === 'user' ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {entry.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
                {entry.emotion && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    entry.speaker === 'user' 
                      ? 'bg-blue-200 text-blue-700' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {entry.emotion}
                  </span>
                )}
                {entry.confidence && (
                  <span className="text-xs text-gray-400">
                    {Math.round(entry.confidence * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}