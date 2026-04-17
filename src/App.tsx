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
  Monitor,
  Paperclip,
  FileUp,
  Download,
  Loader2,
  FileText,
  Trash2,
  History,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  serverTimestamp, 
  getDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  Timestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  auth,
  db, 
  storage 
} from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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
  const [preGeneratedCode, setPreGeneratedCode] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-generate a code in the background to make the first click instant
  useEffect(() => {
    const preWarm = async () => {
      try {
        let randomCode = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 3) {
          randomCode = Math.floor(1000 + Math.random() * 9000).toString();
          const roomDoc = await getDoc(doc(db, 'rooms', randomCode));
          if (!roomDoc.exists()) {
            isUnique = true;
          } else {
            const data = roomDoc.data();
            const lastActivity = data?.lastActivity as Timestamp;
            if (lastActivity && Date.now() - lastActivity.toMillis() > 60 * 60 * 1000) {
              isUnique = true;
            }
          }
          attempts++;
        }
        setPreGeneratedCode(randomCode);
      } catch (e) {
        console.error("Pre-warm failed", e);
      }
    };
    preWarm();
  }, []);

  const handleJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length === 4) {
      navigate(`/${code}`);
    }
  };

  const generateRandomRoom = async () => {
    if (isGenerating) return;
    
    // If we have a pre-generated code, use it immediately
    if (preGeneratedCode) {
      setCode(preGeneratedCode);
      setPreGeneratedCode(null);
      // Background: prepare the next one
      setTimeout(() => {
        const nextCode = Math.floor(1000 + Math.random() * 9000).toString();
        setPreGeneratedCode(nextCode);
      }, 0);
      return;
    }

    // If no pre-generated code (e.g., cold start), show a code IMMEDIATELY
    // and verify it in the background. If it's taken, we'll update it.
    const instantCode = Math.floor(1000 + Math.random() * 9000).toString();
    setCode(instantCode);
    setIsGenerating(true);

    try {
      // Background verification for the instant code
      const roomDoc = await getDoc(doc(db, 'rooms', instantCode));
      if (roomDoc.exists()) {
        const data = roomDoc.data();
        const lastActivity = data?.lastActivity as Timestamp;
        // If it's actually taken and active, generate a new one
        if (!lastActivity || Date.now() - lastActivity.toMillis() <= 60 * 60 * 1000) {
          let randomCode = '';
          let isUnique = false;
          let attempts = 0;
          while (!isUnique && attempts < 3) {
            randomCode = Math.floor(1000 + Math.random() * 9000).toString();
            const checkDoc = await getDoc(doc(db, 'rooms', randomCode));
            if (!checkDoc.exists()) isUnique = true;
            attempts++;
          }
          if (randomCode) setCode(randomCode);
        }
      }
    } catch (error) {
      console.error("Verification error:", error);
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
          {/* Badge & History Button */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-white/80"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              非營利 / 開源專案 • 無需註冊，即用即走
            </motion.div>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setShowHistory(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-muted hover:text-white hover:bg-white/10 transition-all"
            >
              <History className="w-3 h-3" />
              更新歷史
            </motion.button>
          </div>

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
                <div 
                  className="grid grid-cols-4 gap-3 relative cursor-text"
                  onClick={() => inputRef.current?.focus()}
                >
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
                    ref={inputRef}
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

            </div>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-muted text-[9px] uppercase tracking-[0.3em] font-bold">v1.0.5 • Secure P2P Sync</p>
            <p className="text-zinc-800 text-[8px] uppercase tracking-widest">Designed for Professional Efficiency</p>
          </div>
        </motion.div>
      </div>

      {/* Update History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-md rounded-3xl p-8 border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">更新歷史</h3>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">Changelog & Evolution</p>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                <div className="space-y-4">
                  <HistoryItem 
                    title="功能優化與穩定性提升" 
                    content={[
                      "新增匿名登入機制，全面優化文件上傳穩定性",
                      "修復 4 位數房間代碼生成延遲，實現 0 秒瞬間響應",
                      "優化文件上傳錯誤處理與 UI 狀態強制重置",
                      "修復房間自毀按鈕在某些環境下的失效問題"
                    ]}
                  />
                  <HistoryItem 
                    title="演算法與架構更新" 
                    content={[
                      "Room Algorithm Update: 引入背景預生成機制",
                      "Internet Update: 全局身份預連線優化",
                      "Random Number Update: 批量碰撞檢查演算法",
                      "File Upload: 支援 PDF, JPG, PNG 異步上傳"
                    ]}
                  />
                  <HistoryItem 
                    title="介面設計 (UI/UX)" 
                    content={[
                      "移除冗餘的分享工具區塊，回歸簡約設計",
                      "新增「更新歷史」模組，實時同步開發進度",
                      "優化移動端適應性與觸控體驗"
                    ]}
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted font-bold">
                  “LinkPass: Have an idea of creating the fastest file bridge.”
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryItem({ title, content }: { title: string, content: string[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-widest text-white/60">{title}</h4>
      <ul className="space-y-1.5">
        {content.map((item, i) => (
          <li key={i} className="text-sm flex gap-3 text-muted leading-relaxed">
            <span className="text-white/20 font-mono mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Room Page ---
interface Message {
  id: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  senderId: string;
  createdAt: Timestamp;
}

function Room() {
  const { code } = useParams<{ code: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const senderId = getSenderId();

  const hasExisted = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthStatus(user ? 'authenticated' : 'unauthenticated');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!code || !code.match(/^[0-9]{4}$/)) {
      navigate('/');
      return;
    }

    // Initialize room or check expiry
    const initRoom = async () => {
      const roomRef = doc(db, 'rooms', code);
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        const createdAt = data?.createdAt as Timestamp;
        if (createdAt && Date.now() - createdAt.toMillis() > 60 * 60 * 1000) {
          setIsExpired(true);
          await deleteDoc(roomRef);
          return;
        }
        // Update activity
        await setDoc(roomRef, { lastActivity: serverTimestamp() }, { merge: true });
      } else {
        // Create new room
        await setDoc(roomRef, { 
          createdAt: serverTimestamp(),
          lastActivity: serverTimestamp()
        });
      }
    };

    initRoom();

    // Listen for room deletion (Self-Destruct)
    const roomUnsubscribe = onSnapshot(doc(db, 'rooms', code), (snapshot) => {
      if (snapshot.exists()) {
        hasExisted.current = true;
      } else if (hasExisted.current) {
        // Room was deleted after it existed, redirect to home
        navigate('/', { replace: true });
      }
    });

    const q = query(
      collection(db, 'rooms', code, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const messagesUnsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => {
      roomUnsubscribe();
      messagesUnsubscribe();
    };
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
      await setDoc(doc(db, 'rooms', code), { lastActivity: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error("Send error:", error);
      setInputText(text); // Restore text on error
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !code) return;

    if (authStatus !== 'authenticated') {
      setErrorMessage('正在檢查身份驗證，請稍後重試。如果問題持續，請確保您已在 Firebase Console 中啟用了「匿名登入」。');
      setTimeout(() => setErrorMessage(null), 8000);
      // Try to sign in again if not authenticated
      signInAnonymously(auth).catch(() => {});
      return;
    }

    // Allowed types: PDF, JPG, PNG
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('僅支持 PDF, JPG, PNG 格式。');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // Max size 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('文件大小不能超過 10MB。');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    let storageRef;
    try {
      storageRef = ref(storage, `rooms/${code}/${Date.now()}_${file.name}`);
    } catch (err) {
      console.error("Storage Ref Error:", err);
      setErrorMessage('無法初始化 Storage，請檢查 Firebase 設定。');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setIsSending(true); // Don't allow other sends while starting upload
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error details:", error);
        setUploadProgress(null);
        setIsSending(false);
        let msg = `上傳失敗: ${error.message}`;
        if (error.code === 'storage/retry-limit-exceeded') {
          msg = '上傳超時。請確認您已在 Firebase Console 啟用了 Storage 服務，並檢查網路連接。';
        } else if (error.code === 'storage/unauthorized') {
          msg = '權限不足。請確認您已啟用「匿名登入」，並在 Firebase 中設置了正確的 Storage 規則。';
        } else if (error.code === 'storage/unknown') {
          msg = '未知錯誤。可能是 Storage 存儲桶未完全初始化，或者 CORS 設置問題。';
        }
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 8000);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'rooms', code, 'messages'), {
            fileUrl: downloadURL,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            senderId,
            createdAt: serverTimestamp()
          });
          await setDoc(doc(db, 'rooms', code), { lastActivity: serverTimestamp() }, { merge: true });
        } catch (error) {
          console.error("Error saving file info to Firestore:", error);
          setErrorMessage('文件已上傳但無法儲存紀錄，請檢查網路。');
          setTimeout(() => setErrorMessage(null), 5000);
        } finally {
          setIsSending(false);
          setUploadProgress(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
  };

  const destroyRoom = async () => {
    if (!code || isDestroying) return;
    
    if (!confirmDestroy) {
      setConfirmDestroy(true);
      setTimeout(() => setConfirmDestroy(false), 3000); // 3 seconds to confirm
      return;
    }

    setIsDestroying(true);
    try {
      // Delete all messages first (batch delete)
      const messagesRef = collection(db, 'rooms', code, 'messages');
      const messagesSnap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      messagesSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete the room document
      await deleteDoc(doc(db, 'rooms', code));
      
      // Navigation is handled by the onSnapshot listener
    } catch (error) {
      console.error("Destroy error:", error);
      setIsDestroying(false);
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-accent font-sans max-h-screen overflow-hidden relative">
      <AnimatePresence>
        {isExpired && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-center"
          >
            <div className="max-w-sm space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">房間已過期並銷毀</h2>
                <p className="text-muted text-sm leading-relaxed">
                  為了保護您的隱私，LinkPass 房間在建立 60 分鐘後會自動銷毀內容。
                </p>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors"
              >
                回到首頁
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          const isUrl = msg.text && isValidUrl(msg.text.trim());
          const isFile = !!msg.fileUrl;

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
                  {isFile ? (
                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          isMe ? "bg-black/5" : "bg-white/5"
                        )}>
                          {msg.fileType?.includes('image') ? (
                            <ImageIcon className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{msg.fileName}</p>
                          <p className="text-[10px] opacity-60">{formatFileSize(msg.fileSize)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(msg.fileUrl, '_blank')}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                          isMe ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200"
                        )}
                      >
                        <Download className="w-3 h-3" />
                        下載文件
                      </button>
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                  
                  {isUrl && (
                    <button
                      onClick={() => window.open(msg.text!.trim().startsWith('http') ? msg.text!.trim() : `https://${msg.text!.trim()}`, '_blank')}
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
                    {!isFile && (
                      <button 
                        onClick={() => copyToClipboard(msg.text || '')}
                        className={cn(
                          "text-[9px] uppercase tracking-wider font-bold opacity-0 group-hover:opacity-100 transition-opacity",
                          isMe ? "text-black/60" : "text-white/60"
                        )}
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    )}
                    <div className={cn(
                      "text-[10px] opacity-40 ml-auto",
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
        
        {/* Self-Destruct Button */}
        <div className="pt-8 pb-4 flex flex-col items-center gap-4">
          <button
            onClick={destroyRoom}
            disabled={isDestroying}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full transition-all group relative overflow-hidden",
              confirmDestroy 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20 ring-4 ring-red-500/10" 
                : "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
            )}
          >
            {isDestroying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className={cn("w-4 h-4 transition-transform", confirmDestroy ? "scale-110" : "group-hover:scale-110")} />
            )}
            <span className="text-xs font-bold uppercase tracking-widest">
              {isDestroying ? "正在銷毀..." : confirmDestroy ? "再次點擊確認銷毀" : "結束簡報並銷毀內容"}
            </span>
          </button>
          
          {confirmDestroy && (
            <p className="text-[9px] text-red-500/60 uppercase tracking-widest font-bold">
              此操作將永久刪除所有訊息與文件
            </p>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 border-t border-border bg-bg/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto space-y-2 relative">
          {/* Floating Error Bar for Input Area */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-14 left-0 right-0 px-4 py-2 rounded-xl bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest border border-red-500/30 backdrop-blur-md z-30"
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {uploadProgress !== null && (
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || uploadProgress !== null}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-zinc-900 text-white hover:bg-zinc-800 transition-all shrink-0 border border-border"
            >
              {uploadProgress !== null ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

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
              disabled={!inputText.trim() || isSending || uploadProgress !== null}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0",
                inputText.trim() && !isSending && uploadProgress === null
                  ? "bg-white text-black hover:scale-105 active:scale-95"
                  : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Global anonymous sign-in to pre-warm connection and satisfy rules
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(err => {
          if (err.code === 'auth/admin-restricted-operation') {
            console.warn("【LinkPass 提醒】匿名登入未啟用。請前往 Firebase Console -> Authentication -> Sign-in method 啟用 'Anonymous' 供應商，否則文件上傳功能可能受限。");
          } else {
            console.error("Global auth error:", err);
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

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
