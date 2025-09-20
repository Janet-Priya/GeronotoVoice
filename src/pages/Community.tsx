import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Users, 
  Send,
  Smile,
  ThumbsUp,
  Lightbulb,
  Star,
  Trophy,
  Sparkles
} from 'lucide-react';
import { CommunityMessage } from '../types';
import { getCommunityMessages } from '../services/api';

interface CommunityProps {
  onNavigate: (page: string) => void;
}

const Community: React.FC<CommunityProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [animatedReactions, setAnimatedReactions] = useState<{ id: string; emoji: string }[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableReactions = ['❤️', '👍', '😊', '🤗', '💙', '🌟', '💪', '🎉', '💡', '⭐', '🏆'];

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const data = await getCommunityMessages();
        setMessages(data);
      } catch (error) {
        console.error('Failed to load community messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          // Increment existing reaction
          return {
            ...msg,
            reactions: msg.reactions.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1, users: [...r.users, 'current_user'] }
                : r
            )
          };
        } else {
          // Add new reaction
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, count: 1, users: ['current_user'] }]
          };
        }
      }
      return msg;
    }));

    // Trigger animation
    setAnimatedReactions(prev => [...prev, { id: `${messageId}_${Date.now()}`, emoji }]);
    
    // Remove animation after 2 seconds
    setTimeout(() => {
      setAnimatedReactions(prev => prev.filter(r => r.id !== `${messageId}_${Date.now()}`));
    }, 2000);

    setShowReactionPicker(null);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: CommunityMessage = {
        id: `msg_${Date.now()}`,
        author: 'You',
        avatar: 'YO',
        content: newMessage,
        timestamp: new Date(),
        reactions: [],
        isOwnMessage: true
      };
      
      setMessages(prev => [message, ...prev]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getAvatarColor = (avatar: string) => {
    const colors = [
      'bg-amber-200 text-amber-800',
      'bg-rose-200 text-rose-800',
      'bg-orange-200 text-orange-800',
      'bg-yellow-200 text-yellow-800',
      'bg-pink-200 text-pink-800',
      'bg-amber-300 text-amber-900',
      'bg-rose-300 text-rose-900',
      'bg-orange-300 text-orange-900'
    ];
    
    const index = avatar.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-amber-700">Loading community messages...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative container mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-blue-200"
        >
          <div className="flex items-center">
            <button
              onClick={() => onNavigate('home')}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-blue-800">Caregiver Community</h1>
              <p className="text-blue-600">Share experiences and support each other</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-blue-600">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">{messages.length} members</span>
            </div>
            <div className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Active</span>
            </div>
          </div>
        </motion.div>

        {/* Chat Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-blue-200 overflow-hidden"
        >
          {/* Messages List */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start space-x-3 ${
                  message.isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                  getAvatarColor(message.avatar)
                }`}>
                  {message.avatar}
                </div>

                {/* Message Content */}
                <div className={`max-w-xs lg:max-w-md ${
                  message.isOwnMessage ? 'text-right' : 'text-left'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-blue-800">{message.author}</span>
                    <span className="text-xs text-blue-500">{formatTimeAgo(message.timestamp)}</span>
                  </div>
                  
                  <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                    message.isOwnMessage
                      ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white'
                      : 'bg-blue-50 border border-blue-200 text-blue-800'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>

                  {/* Reactions */}
                  {message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.reactions.map((reaction, reactionIndex) => (
                        <motion.button
                          key={reactionIndex}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReaction(message.id, reaction.emoji)}
                          className="flex items-center space-x-1 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs hover:bg-blue-100 transition-colors border border-blue-200"
                          aria-label={`React with ${reaction.emoji}`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-blue-600 font-medium">{reaction.count}</span>
                        </motion.button>
                      ))}
                      
                      {/* Add Reaction Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                        className="flex items-center justify-center w-6 h-6 bg-blue-100 hover:bg-blue-200 rounded-full text-blue-600 transition-colors"
                        aria-label="Add reaction"
                      >
                        <Smile className="h-3 w-3" />
                      </motion.button>
                    </div>
                  )}

                  {/* Reaction Picker */}
                  <AnimatePresence>
                    {showReactionPicker === message.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute mt-2 p-2 bg-white rounded-lg shadow-lg border border-blue-200 z-10"
                      >
                        <div className="flex space-x-1">
                          {availableReactions.map((emoji) => (
                            <motion.button
                              key={emoji}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleReaction(message.id, emoji)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-blue-100 rounded-lg transition-colors"
                              aria-label={`React with ${emoji}`}
                            >
                              {emoji}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-blue-200 p-4 bg-blue-50/50">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Share your experience..."
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-white/90 backdrop-blur-sm text-blue-800 placeholder-blue-400"
                  aria-label="Type your message"
                />
                <button
                  onClick={() => setShowReactionPicker('input')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-blue-500 hover:text-blue-600 transition-colors"
                  aria-label="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  newMessage.trim()
                    ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg hover:shadow-xl'
                    : 'bg-blue-200 text-blue-400 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{messages.length}</div>
            <div className="text-sm text-blue-500">Messages</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <div className="text-sm text-blue-500">Active Today</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">156</div>
            <div className="text-sm text-blue-500">Total Members</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">98%</div>
            <div className="text-sm text-blue-500">Satisfaction</div>
          </div>
        </motion.div>

        {/* Animated Reactions */}
        <AnimatePresence>
          {animatedReactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -50, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="fixed pointer-events-none z-50"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <span className="text-2xl">{reaction.emoji}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-amber-200 px-4 py-3">
          <div className="flex justify-around max-w-md mx-auto">
            <button 
              onClick={() => onNavigate('home')}
              className="flex flex-col items-center py-2 px-4 text-amber-400 hover:text-amber-600 transition-colors"
            >
              <Heart className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button 
              onClick={() => onNavigate('progress')}
              className="flex flex-col items-center py-2 px-4 text-amber-400 hover:text-amber-600 transition-colors"
            >
              <Trophy className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Progress</span>
            </button>
            <button className="flex flex-col items-center py-2 px-4 text-amber-600">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mb-1">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium">Community</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
