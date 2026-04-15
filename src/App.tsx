/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check,
  Hash,
  Send
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  serverTimestamp, 
  getDoc,
  Timestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { cn, isValidUrl } from './lib/utils';

// --- Persistent Sender ID ---
const getSenderId = () => {
  let id = localStorage.getItem('linkpass_sender_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('linkpass_sender_id', id);
  }
  return id;
};

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-zinc-400 text-sm">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Home Page ---
function Home() {
  const [code, setCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const handleJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length === 4) {
      navigate(`/${code}`);
    }
  };

  const generateRandomRoom = async () => {
    setIsGenerating(true);
    try {
      let randomCode = '';
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        const roomDoc = await getDoc(doc(db, 'rooms', randomCode));
        
        if (!roomDoc.exists()) {
          isUnique = true;
        } else {
          const data = roomDoc.data();
          const updatedAt = data?.updatedAt as Timestamp;
          if (updatedAt && Date.now() - updatedAt.toMillis() > 10 * 60 * 1000) {
            isUnique = true;
          }
        }
        attempts++;
      }

      setCode(randomCode);
    } catch (error) {
      console.error("Error generating room:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[320px] glass-panel rounded-2xl p-8 shadow-2xl space-y-8"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-white rounded-[4px]" />
            <span className="font-bold text-xl tracking-tight">LinkPass</span>
          </div>
          <p className="text-muted text-xs uppercase tracking-widest font-medium">輸入存取代碼</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-8">
          <div className="grid grid-cols-4 gap-3 relative">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className={cn(
                  "aspect-square border border-border rounded-lg flex items-center justify-center text-2xl font-medium transition-all",
                  code.length === i && "border-white ring-1 ring-white",
                  code[i] && "border-white/40"
                )}
              >
                {code[i] || ""}
              </div>
            ))}
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="absolute inset-0 opacity-0 cursor-default"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={code.length !== 4}
              className={cn(
                "w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2",
                code.length === 4 
                  ? "bg-white text-black hover:bg-zinc-200" 
                  : "bg-zinc-900 text-zinc-600 cursor-not-allowed"
              )}
            >
              進入房間
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              onClick={generateRandomRoom}
              disabled={isGenerating}
              className="w-full py-3 border border-border rounded-lg text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
              {isGenerating ? "生成中..." : "生成隨機房間"}
            </button>
          </div>
        </form>
      </motion.div>
      
      <p className="mt-8 text-muted text-[10px] uppercase tracking-[0.2em]">v1.0.4 • Minimalist Sync Tool</p>
    </div>
  );
}

// --- Room Page ---
interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
}

function Room() {
  const { code } = useParams<{ code: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const senderId = getSenderId();

  useEffect(() => {
    if (!code || !code.match(/^[0-9]{4}$/)) {
      navigate('/');
      return;
    }

    // Ensure room exists
    setDoc(doc(db, 'rooms', code), { updatedAt: serverTimestamp() }, { merge: true });

    const q = query(
      collection(db, 'rooms', code, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [code, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code || !inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await addDoc(collection(db, 'rooms', code, 'messages'), {
        text,
        senderId,
        createdAt: serverTimestamp()
      });
      await setDoc(doc(db, 'rooms', code), { updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error("Send error:", error);
      setInputText(text); // Restore text on error
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp?: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-accent font-sans max-h-screen overflow-hidden">
      {/* Navigation */}
      <nav className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg/80 backdrop-blur-xl z-20">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          <div className="w-5 h-5 bg-white rounded-[4px]" />
          <span className="font-bold text-lg tracking-tight">LinkPass</span>
        </div>
        <div className="bg-glass border border-border px-3 py-1 rounded-md text-xs font-mono text-muted">
          ROOM: {code}
        </div>
      </nav>

      {/* Warning Box */}
      <div className="bg-yellow-500/5 border-b border-yellow-500/20 text-warning p-2 text-[11px] flex items-center justify-center gap-2 shrink-0">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        <span>這是一個公開空間，請勿分享敏感資料。</span>
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg) => {
          const isMe = msg.senderId === senderId;
          const isUrl = isValidUrl(msg.text.trim());

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col max-w-[85%] md:max-w-[70%]",
                isMe ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm break-words relative group",
                  isMe 
                    ? "bg-white text-black rounded-tr-none" 
                    : "bg-zinc-900 text-white rounded-tl-none border border-border"
                )}
              >
                <div className="flex flex-col gap-1">
                  <span>{msg.text}</span>
                  
                  {isUrl && (
                    <button
                      onClick={() => window.open(msg.text.trim().startsWith('http') ? msg.text.trim() : `https://${msg.text.trim()}`, '_blank')}
                      className={cn(
                        "mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                        isMe ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200"
                      )}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Launch Link
                    </button>
                  )}

                  <div className="flex items-center justify-between gap-4 mt-1">
                    <button 
                      onClick={() => copyToClipboard(msg.text)}
                      className={cn(
                        "text-[9px] uppercase tracking-wider font-bold opacity-0 group-hover:opacity-100 transition-opacity",
                        isMe ? "text-black/60" : "text-white/60"
                      )}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <div className={cn(
                      "text-[10px] opacity-40",
                      isMe ? "text-black" : "text-white"
                    )}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="p-4 border-t border-border bg-bg/80 backdrop-blur-xl">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-end gap-2">
          <div className="flex-1 glass-panel rounded-2xl px-4 py-2 flex items-center min-h-[44px]">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="輸入訊息或連結..."
              className="flex-1 bg-transparent border-none resize-none text-sm focus:outline-none placeholder:text-zinc-700 max-h-32 py-1"
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0",
              inputText.trim() && !isSending
                ? "bg-white text-black hover:scale-105 active:scale-95"
                : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:code" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
