import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import {
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
  ArchiveBoxIcon,
  StarIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const Chat: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentSession,
    sessions,
    loading,
    sendMessage,
    loadSession,
    deleteSession,
    archiveSession,
    clearCurrentSession,
    rateSession,
  } = useChat();

  const [message, setMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('General Inquiry');
  const [isTyping, setIsTyping] = useState(false);
  const [showRating, setShowRating] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const categories = [
    'Civil Law',
    'Criminal Law',
    'Commercial Law',
    'Family Law',
    'Administrative Law',
    'Constitutional Law',
    'Labor Law',
    'Tax Law',
    'Real Estate Law',
    'Intellectual Property',
    'General Inquiry'
  ];

  useEffect(() => {
    if (sessionId && sessionId !== currentSession?._id) {
      loadSession(sessionId);
    } else if (!sessionId) {
      clearCurrentSession();
    }
  }, [sessionId, currentSession?._id, loadSession, clearCurrentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(true);

    try {
      let targetSessionId = currentSession?._id;
      
      // If no current session or it's a temporary session, don't pass sessionId
      if (!currentSession || currentSession._id.startsWith('temp_')) {
        targetSessionId = undefined;
      }

      const response = await sendMessage(messageText, targetSessionId, selectedCategory);
      
      // Navigate to the new session if one was created
      if (response?.sessionId && !sessionId) {
        navigate(`/app/chat/${response.sessionId}`);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = async () => {
    clearCurrentSession();
    navigate('/app/chat');
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      await deleteSession(id);
      if (id === sessionId) {
        navigate('/app/chat');
      }
    }
  };

  const handleArchiveSession = async (id: string) => {
    await archiveSession(id);
    if (id === sessionId) {
      navigate('/app/chat');
    }
  };

  const handleRateSession = async (sessionId: string, newRating: number) => {
    setRating(newRating);
    await rateSession(sessionId, newRating, feedback);
    setShowRating(null);
    setRating(0);
    setFeedback('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  const canSendMessage = user?.subscription.plan === 'enterprise' || 
    (user?.usage?.queriesThisMonth || 0) < (
      user?.subscription.plan === 'basic' ? 100 :
      user?.subscription.plan === 'pro' ? 500 : 10
    );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Sidebar with chat sessions */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewChat}
            className="w-full btn btn-primary flex items-center justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions?.filter(s => s && s.status === 'active').map((session) => (
            <div
              key={session._id}
              className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                session._id === sessionId
                  ? 'bg-primary-50 border border-primary-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
              onClick={() => navigate(`/app/chat/${session._id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {session.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {session.category} • {session.analytics.totalMessages} messages
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(session.lastActivity).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRating(session._id);
                    }}
                    className="p-1 text-gray-400 hover:text-yellow-500"
                    title="Rate session"
                  >
                    <StarIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveSession(session._id);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500"
                    title="Archive"
                  >
                    <ArchiveBoxIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session._id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        {currentSession && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentSession.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {currentSession.category} • {currentSession.analytics.totalMessages} messages
                </p>
              </div>
              {currentSession.analytics.userSatisfaction && (
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIconSolid
                      key={star}
                      className={`h-4 w-4 ${
                        star <= currentSession.analytics.userSatisfaction!.rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-container">
          {!currentSession && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Start a new conversation</h3>
              <p className="mt-2 text-gray-500">Ask me anything about Jordanian law and legal procedures.</p>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Legal Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input max-w-xs mx-auto"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentSession?.messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              <div className={`chat-bubble ${msg.role}`}>
                <div 
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
                
                {msg.role === 'assistant' && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {msg.metadata?.lawReferences && msg.metadata.lawReferences.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.metadata.lawReferences.slice(0, 3).map((ref, i) => (
                            <span key={i} className="legal-reference">
                              {ref.law} Art. {ref.article}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(msg.content)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copy message"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {msg.metadata?.confidence && (
                  <div className="mt-2 text-xs text-gray-500">
                    Confidence: {Math.round(msg.metadata.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-message assistant">
              <div className="chat-bubble assistant">
                <div className="typing-indicator flex space-x-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full" style={{'--delay': 0} as any}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full" style={{'--delay': 1} as any}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full" style={{'--delay': 2} as any}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="p-4 border-t border-gray-200">
          {!canSendMessage && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                You've reached your monthly query limit. 
                <button className="ml-1 font-medium underline hover:no-underline">
                  Upgrade your plan
                </button> to continue.
              </p>
            </div>
          )}
          
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about Jordanian law..."
                disabled={!canSendMessage || loading}
                className="input resize-none min-h-[44px] max-h-32"
                rows={1}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || !canSendMessage || loading}
              className="btn btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rating modal */}
      {showRating && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rate this session</h3>
            <div className="flex items-center space-x-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`h-8 w-8 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400`}
                >
                  <StarIconSolid className="h-full w-full" />
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional feedback..."
              className="input w-full mb-4"
              rows={3}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRating(null);
                  setRating(0);
                  setFeedback('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRateSession(showRating, rating)}
                disabled={rating === 0}
                className="btn btn-primary disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;