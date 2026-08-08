import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  FileText, 
  Search,
  ChevronDown,
  Loader2,
  AlertCircle,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  excerpts?: { filename: string; content: string }[];
}

const Assistant = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/api/patients/');
        setPatients(res.data);
        if (res.data.length > 0) {
          if (user?.role === 'patient') {
            setSelectedPatientId(user.patient_profile_id || res.data[0].id);
          } else {
            setSelectedPatientId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPatients();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedPatientId || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/chat/message', {
        patient_id: selectedPatientId,
        message: input
      });
      
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.answer,
        excerpts: res.data.excerpts
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your request. Please ensure you have clinical AI consent for this patient. ⚠️' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] mx-2 my-2 md:m-4 bg-surface rounded-3xl border border-subtle overflow-hidden shadow-2xl relative z-10 pb-20 md:pb-0">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-text-main">Clinical Assistant 🤖</h2>
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">RAG-Powered Insights</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="hidden sm:block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Context:</label>
          <div className="relative group/dropdown">
            <button
               onClick={() => user?.role !== 'patient' && setIsDropdownOpen(!isDropdownOpen)}
               className={cn(
                 "bg-background/50 border border-subtle rounded-xl px-4 py-2 pr-10 text-xs md:text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium flex items-center gap-2 w-full sm:w-auto min-w-[150px]",
                 user?.role === 'patient' ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/5 hover:border-primary/20"
               )}
            >
              <span className="truncate max-w-[120px] md:max-w-none">
                {selectedPatient ? `${selectedPatient.full_name}` : "Select Patient"}
              </span>
              <ChevronDown className={cn("absolute right-3 top-2.5 text-gray-500 transition-transform", isDropdownOpen && "rotate-180")} size={16} />
            </button>
            
            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden z-50 py-2"
                  >
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                      {patients.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setIsDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm transition-colors flex flex-col gap-0.5",
                            selectedPatientId === p.id 
                              ? "bg-blue-600 text-white" 
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <span className="font-bold">{p.full_name}</span>
                          <span className={cn("text-[10px] uppercase font-bold", selectedPatientId === p.id ? "text-white/70" : "text-gray-500")}>
                            Record: {p.external_id}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
              <MessageSquare size={48} className="text-gray-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-text-main tracking-tight">How can I help you today? 👋</h3>
              <p className="text-text-muted max-w-sm mx-auto mt-2 text-sm font-medium">
                Ask about {selectedPatient?.full_name}'s history, lab results, or recent clinical notes.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              {['Summarize history 📝', 'Check lab trends 📈', 'Recent medications 💊', 'Risk factors ⚠️'].map(q => (
                <button 
                  key={q}
                  onClick={() => setInput(q.replace(/[^a-zA-Z ]/g, "").trim())}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all hover:border-white/20"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-3xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg",
                msg.role === 'user' ? "bg-blue-600 shadow-blue-600/20" : "bg-purple-600 shadow-purple-600/20"
              )}>
                {msg.role === 'user' ? <UserIcon size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
              </div>
              <div className="space-y-3">
                <div className={cn(
                  "p-5 rounded-2xl text-sm leading-relaxed shadow-xl",
                  msg.role === 'user' 
                    ? "bg-primary text-white rounded-tr-none" 
                    : "bg-surface border border-subtle text-text-main rounded-tl-none"
                )}>
                  {msg.content}
                </div>
                
                {msg.excerpts && msg.excerpts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={12} /> Sources Used 📚
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.excerpts.map((exc, j) => (
                        <div key={j} className="bg-black/40 border border-white/5 rounded-xl p-3 text-[11px] text-text-muted max-w-[250px] shadow-lg">
                          <span className="font-bold text-blue-400 block mb-1 truncate">{exc.filename}</span>
                          <span className="line-clamp-2 italic leading-relaxed">"{exc.content}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <div className="flex gap-4 max-w-3xl">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-600/20">
              <Bot size={20} className="text-white" />
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-xl">
              <Loader2 className="animate-spin text-blue-400" size={18} />
              <span className="text-sm text-gray-400 italic">Analyzing clinical context... 🧠</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-black/20 border-t border-white/10">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${selectedPatient?.full_name || 'patient'}...`}
            className="w-full bg-surface border border-subtle rounded-2xl px-5 py-4 md:px-6 md:py-5 pr-14 md:pr-16 text-sm md:text-base text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted/30 font-medium shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 md:right-3 md:top-3 w-10 h-10 md:w-12 md:h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            <Send size={20} className="md:w-6 md:h-6" />
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[9px] md:text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center">
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> HIPAA Compliant</span>
          <span className="flex items-center gap-1.5"><AlertCircle size={14} /> AI Generated Response</span>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
