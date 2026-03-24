/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Plus, 
  History, 
  Trash2, 
  Menu, 
  X, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from './lib/utils';

// Types
interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export default function App() {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('nexus_chat_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        setCurrentSessionId(parsed[0].id);
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('nexus_chat_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isLoading]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput('');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
      if (updated.length === 0) createNewSession();
    }
  };

  const clearCurrentChat = () => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId ? { ...s, messages: [], title: 'New Chat' } : s
    ));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    // Update session with user message
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const newMessages = [...s.messages, userMessage];
        // Auto-title if it's the first message
        const newTitle = s.messages.length === 0 ? userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : '') : s.title;
        return { ...s, messages: newMessages, title: newTitle, updatedAt: Date.now() };
      }
      return s;
    }));

    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are Chatbot Development, a helpful and intelligent assistant. Provide clear, concise, and accurate responses. Use markdown for formatting when appropriate.",
        },
        // Pass history to maintain context
        history: currentSession?.messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })) || []
      });

      const result = await chat.sendMessage({ message: userMessage.content });
      const response: GenerateContentResponse = result;
      
      const aiMessage: Message = {
        role: 'model',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now(),
      };

      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: [...s.messages, aiMessage], updatedAt: Date.now() } 
          : s
      ));
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage: Message = {
        role: 'model',
        content: "⚠️ Error: Failed to connect to AI. Please check your connection or try again later.",
        timestamp: Date.now(),
      };
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: [...s.messages, errorMessage], updatedAt: Date.now() } 
          : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#111] border-r border-[#262626] flex flex-col relative z-20"
      >
        <div className="p-4 flex flex-col h-full">
          <button 
            onClick={createNewSession}
            className="flex items-center gap-3 w-full p-3 rounded-lg border border-[#262626] hover:bg-[#1a1a1a] transition-colors mb-6 text-sm font-medium"
          >
            <Plus size={18} />
            New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              <History size={14} />
              History
            </div>
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-lg text-left text-sm transition-all group",
                  currentSessionId === session.id ? "bg-[#1a1a1a] text-white" : "text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200"
                )}
              >
                <Bot size={16} className={currentSessionId === session.id ? "text-blue-500" : "text-gray-500"} />
                <span className="flex-1 truncate">{session.title}</span>
                <Trash2 
                  size={14} 
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                  onClick={(e) => deleteSession(session.id, e)}
                />
              </button>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-[#262626]">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a]">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Guest User</p>
                <p className="text-[10px] text-gray-500 truncate">Free Plan</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-14 border-b border-[#262626] flex items-center justify-between px-4 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="text-blue-500" size={20} />
              <h1 className="font-semibold text-lg">Chatbot Development</h1>
            </div>
          </div>
          <button 
            onClick={clearCurrentChat}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} />
            Clear Chat
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6 pb-32">
            {currentSession?.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-4">
                  <Bot size={32} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold">How can I help you today?</h2>
                <p className="text-gray-500 max-w-sm">
                  I'm Chatbot Development, your intelligent AI assistant. Ask me anything from coding to creative writing.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 w-full max-w-lg">
                  {[
                    "Explain quantum computing",
                    "Write a Python script for data analysis",
                    "Help me plan a 3-day trip to Tokyo",
                    "What are the best practices for React?"
                  ].map((suggestion, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="p-3 text-sm text-left rounded-xl border border-[#262626] hover:bg-[#1a1a1a] transition-all flex items-center justify-between group"
                    >
                      {suggestion}
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {currentSession?.messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 p-4 rounded-2xl transition-colors",
                    msg.role === 'user' ? "bg-[#1a1a1a]/50 ml-auto max-w-[85%]" : "bg-transparent mr-auto max-w-[95%]"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-gray-700 order-last" : "bg-blue-600"
                  )}>
                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="prose prose-invert prose-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 p-4 mr-auto"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Bot size={18} />
                </div>
                <div className="flex items-center gap-1 bg-[#1a1a1a] px-4 py-3 rounded-2xl">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative flex items-end gap-2 bg-[#1a1a1a] border border-[#262626] rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Chatbot Development..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm max-h-40"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-xl transition-all shrink-0",
                  input.trim() && !isLoading 
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20" 
                    : "bg-[#262626] text-gray-500 cursor-not-allowed"
                )}
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-500 mt-3">
              Chatbot Development can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
