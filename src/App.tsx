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
  Send,
  Shield,
  Zap,
  Globe,
  QrCode,
  Smartphone,
  Monitor
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
    <div className="min-h-screen bg-bg text-accent flex flex-col md:flex-row overflow-x-hidden">
      {/* Left Section: Promotion (60%) */}
      <div className="w-full md:w-[60%] p-8 md:p-16 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-border">
        {/* Background Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
        
        <div className="relative z-10 space-y-12">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-white/80"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            非營利 / 開源專案 • 無需註冊，即用即走
          </motion.div>

          {/* Hero Text */}
          <div className="space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-7xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent"
            >
              LinkPass
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl md:text-2xl text-muted max-w-xl leading-relaxed"
            >
              為徹底解決 <span className="text-white font-medium">麻煩登錄程序而生</span>。<br />
              不會再在講台上尷尬讓聽衆等待：10秒内從手機同步到大螢幕。
            </motion.p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6 rounded-2xl space-y-3 group hover:border-white/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">為什麼用 LinkPass？</h3>
              <p className="text-sm text-muted leading-relaxed">
                無需浪費時間登入個人 WhatsApp 或 Email，為效率而設。
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6 rounded-2xl space-y-3 group hover:border-white/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">如何使用？</h3>
              <p className="text-sm text-muted leading-relaxed">
                自定一組 4 位數代碼或者讓網頁爲你生成, 多個裝置同時輸入相同代碼。跨設備同步從未如此簡單。
              </p>
            </motion.div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 md:mt-0 flex items-center gap-6 text-[10px] uppercase tracking-widest text-muted font-bold">
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3" />
            Global Edge Sync
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-3 h-3" />
            Mobile First
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="w-3 h-3" />
            Desktop Ready
          </div>
        </div>
      </div>

      {/* Right Section: Functionality (40%) */}
      <div className="w-full md:w-[40%] p-8 md:p-12 flex items-center justify-center bg-black/40 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[360px] space-y-8"
        >
          {/* Tech Container */}
          <div className="relative group">
            {/* Animated border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-transparent rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            
            <div className="relative glass-panel rounded-3xl p-8 shadow-2xl space-y-8 border-white/10">
              <div className="space-y-2">
                <p className="text-muted text-[10px] uppercase tracking-[0.2em] font-bold">Access Terminal</p>
                <h2 className="text-2xl font-bold tracking-tight">進入房間</h2>
              </div>

              <form onSubmit={handleJoin} className="space-y-8">
                <div className="grid grid-cols-4 gap-3 relative">
                  {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={i}
                      className={cn(
                        "aspect-square border border-border rounded-xl flex items-center justify-center text-3xl font-bold transition-all bg-white/5",
                        code.length === i && "border-white ring-2 ring-white/20 scale-105",
                        code[i] && "border-white/40 text-white"
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

                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={code.length !== 4}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest",
                      code.length === 4 
                        ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
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
                    className="w-full py-4 border border-border rounded-xl text-[11px] uppercase tracking-widest font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-muted hover:text-white"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                    {isGenerating ? "Generating..." : "生成隨機房間"}
                  </button>
                </div>
              </form>

              {/* Quick Actions Placeholder */}
              <div className="pt-6 border-t border-border space-y-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-muted font-bold text-center">快速分享工具</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-border bg-white/5 flex flex-col items-center gap-2 opacity-40 cursor-not-allowed group">
                    <Copy className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">複製連結</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-white/5 flex flex-col items-center gap-2 opacity-40 cursor-not-allowed group">
                    <QrCode className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">QR Code</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-muted text-[9px] uppercase tracking-[0.3em] font-bold">v1.0.5 • Secure P2P Sync</p>
            <p className="text-zinc-800 text-[8px] uppercase tracking-widest">Designed for Professional Efficiency</p>
          </div>
        </motion.div>
      </div>
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
        <span>這是一個公開空間，有一定機會有人剛好使用同一個房間號碼，請注意有關風險。</span>
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
