import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext.tsx';

interface Message {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    lawReferences?: Array<{
      article: string;
      law: string;
      section: string;
      relevanceScore: number;
    }>;
    confidence?: number;
    processingTime?: number;
    tokens?: number;
  };
}

interface ChatSession {
  _id: string;
  title: string;
  category: string;
  messages: Message[];
  status: 'active' | 'archived' | 'deleted';
  tags: string[];
  summary?: string;
  legalContext: {
    primaryLaws: string[];
    jurisdiction: string;
    complexity: 'simple' | 'moderate' | 'complex';
  };
  analytics: {
    totalMessages: number;
    totalTokens: number;
    averageResponseTime: number;
    userSatisfaction?: {
      rating: number;
      feedback: string;
    };
  };
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  loading: boolean;
  error: string | null;
  sendMessage: (message: string, sessionId?: string, category?: string) => Promise<any>;
  createSession: (title: string, category?: string) => Promise<ChatSession>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  archiveSession: (sessionId: string) => Promise<void>;
  clearCurrentSession: () => void;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  rateSession: (sessionId: string, rating: number, feedback?: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      loadSessions();
    }
  }, [user, token, loadSessions]);

  const handleError = (error: any, defaultMessage: string) => {
    const message = error.response?.data?.message || error.message || defaultMessage;
    setError(message);
    console.error(defaultMessage, error);
    // Don't throw error to prevent uncaught runtime errors
    // The error state will be handled by the UI components
  };

  const sendMessage = async (
    message: string, 
    sessionId?: string, 
    category?: string
  ): Promise<any> => {
    try {
      setLoading(true);
      setError(null);

      const payload: any = { message };
      if (sessionId) payload.sessionId = sessionId;
      if (category) payload.category = category;

      const response = await axios.post('/chat/message', payload);

      if (response.data.success) {
        const { message: aiResponse, sessionId: newSessionId, metadata, usage } = response.data;

        // If this is a new session, load it
        if (!sessionId && newSessionId) {
          await loadSession(newSessionId);
        } else if (currentSession) {
          // Update current session with new messages
          const updatedSession = {
            ...currentSession,
            messages: [
              ...currentSession.messages,
              {
                _id: Date.now().toString() + '_user',
                role: 'user' as const,
                content: message,
                timestamp: new Date().toISOString()
              },
              {
                _id: Date.now().toString() + '_assistant',
                role: 'assistant' as const,
                content: aiResponse,
                timestamp: new Date().toISOString(),
                metadata
              }
            ],
            analytics: {
              ...currentSession.analytics,
              totalMessages: currentSession.analytics.totalMessages + 2,
              totalTokens: currentSession.analytics.totalTokens + (metadata?.tokens || 0)
            },
            lastActivity: new Date().toISOString()
          };
          setCurrentSession(updatedSession);
          
          // Update sessions list
          setSessions(prev => 
            prev.map(session => 
              session && session._id && currentSession && currentSession._id && session._id === currentSession._id ? updatedSession : session
            )
          );
        }

        return {
          message: aiResponse,
          sessionId: newSessionId || sessionId,
          metadata,
          usage
        };
      } else {
        handleError(new Error(response.data.message || 'Failed to send message'), 'Failed to send message');
        return null;
      }
    } catch (error: any) {
      handleError(error, 'Failed to send message');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (title: string, category?: string): Promise<ChatSession> => {
    try {
      setLoading(true);
      setError(null);

      // Sessions are now created automatically by the backend when sending the first message
      // This function is kept for compatibility but doesn't create actual sessions
      const tempSession: ChatSession = {
        _id: 'temp_' + Date.now(),
        title,
        category: category || 'General Inquiry',
        messages: [],
        status: 'active',
        tags: [],
        legalContext: {
          primaryLaws: [],
          jurisdiction: 'Jordan',
          complexity: 'simple'
        },
        analytics: {
          totalMessages: 0,
          totalTokens: 0,
          averageResponseTime: 0
        },
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentSession(tempSession);
      return tempSession;
    } catch (error: any) {
      handleError(error, 'Failed to create session');
      // Return a basic session object even on error
      const errorSession: ChatSession = {
        _id: 'error_' + Date.now(),
        title: 'Error Session',
        category: 'General Inquiry',
        messages: [],
        status: 'active',
        tags: [],
        legalContext: {
          primaryLaws: [],
          jurisdiction: 'Jordan',
          complexity: 'simple'
        },
        analytics: {
          totalMessages: 0,
          totalTokens: 0,
          averageResponseTime: 0
        },
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return errorSession;
    } finally {
      setLoading(false);
    }
  };

  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/chat/sessions/${sessionId}`);

      if (response.data.success) {
        const session = response.data.data;
        if (session && session._id) {
          setCurrentSession(session);
          
          // Update sessions list if this session isn't already there
          setSessions(prev => {
            const exists = prev.find(s => s && s._id && s._id === session._id);
            if (!exists) {
              return [session, ...prev];
            }
            return prev.map(s => s && s._id && s._id === session._id ? session : s);
          });
        } else {
          handleError(new Error('Invalid session data received'), 'Failed to load session');
        }
      } else {
        handleError(new Error(response.data.message || 'Failed to load session'), 'Failed to load session');
      }
    } catch (error: any) {
      handleError(error, 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/chat/sessions');

      if (response.data.success) {
        const sessionsData = response.data.data;
        if (Array.isArray(sessionsData)) {
          // Filter out any invalid sessions
          const validSessions = sessionsData.filter(session => session && session._id);
          setSessions(validSessions);
        } else {
          setSessions([]);
        }
      } else {
        handleError(new Error(response.data.message || 'Failed to load sessions'), 'Failed to load sessions');
      }
    } catch (error: any) {
      handleError(error, 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.delete(`/chat/sessions/${sessionId}`);

      if (response.data.success) {
        setSessions(prev => prev.filter(session => session && session._id && session._id !== sessionId));
        
        if (currentSession?._id === sessionId) {
          setCurrentSession(null);
        }
      } else {
        handleError(new Error(response.data.message || 'Failed to delete session'), 'Failed to delete session');
      }
    } catch (error: any) {
      handleError(error, 'Failed to delete session');
    } finally {
      setLoading(false);
    }
  };

  const archiveSession = async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Update session status locally
      setSessions(prev => 
        prev.map(session => 
          session && session._id && session._id === sessionId 
            ? { ...session, status: 'archived' as const }
            : session
        )
      );

      if (currentSession?._id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, status: 'archived' } : null);
      }
    } catch (error: any) {
      handleError(error, 'Failed to archive session');
    } finally {
      setLoading(false);
    }
  };

  const clearCurrentSession = useCallback((): void => {
    setCurrentSession(null);
  }, []);

  const updateSessionTitle = async (sessionId: string, title: string): Promise<void> => {
    try {
      // Update locally first for immediate feedback
      setSessions(prev => 
        prev.map(session => 
          session && session._id && session._id === sessionId ? { ...session, title } : session
        )
      );

      if (currentSession?._id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, title } : null);
      }

      // Note: You might want to add an API endpoint for this
      // await axios.put(`/chat/sessions/${sessionId}`, { title });
    } catch (error: any) {
      handleError(error, 'Failed to update session title');
    }
  };

  const rateSession = async (
    sessionId: string, 
    rating: number, 
    feedback?: string
  ): Promise<void> => {
    try {
      const userSatisfaction = { rating, feedback: feedback || '' };
      
      // Update locally
      setSessions(prev => 
        prev.map(session => 
          session && session._id && session._id === sessionId 
            ? { 
                ...session, 
                analytics: { 
                  ...session.analytics, 
                  userSatisfaction 
                }
              }
            : session
        )
      );

      if (currentSession?._id === sessionId) {
        setCurrentSession(prev => 
          prev ? {
            ...prev,
            analytics: {
              ...prev.analytics,
              userSatisfaction
            }
          } : null
        );
      }

      // Note: You might want to add an API endpoint for this
      // await axios.post(`/chat/sessions/${sessionId}/rate`, { rating, feedback });
    } catch (error: any) {
      handleError(error, 'Failed to rate session');
    }
  };

  const value: ChatContextType = {
    sessions,
    currentSession,
    loading,
    error,
    sendMessage,
    createSession,
    loadSession,
    loadSessions,
    deleteSession,
    archiveSession,
    clearCurrentSession,
    updateSessionTitle,
    rateSession,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export type { ChatSession, Message };