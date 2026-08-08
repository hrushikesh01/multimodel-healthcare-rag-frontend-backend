import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  Activity, 
  Clock, 
  Filter, 
  Search, 
  ShieldCheck, 
  AlertCircle,
  Database,
  ArrowRight,
  User as UserIcon,
  Tag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  details: any;
  created_at: string;
}

const Audit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/api/audit/?limit=50');
        setLogs(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch audit logs');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 animate-pulse text-gray-500">
        <div className="h-10 w-48 bg-white/5 rounded-xl ml-2 mb-4" />
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 h-screen md:h-[calc(100vh-2rem)] flex flex-col pb-24 md:pb-0 bg-background text-text-main">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <Activity className="text-primary" size={32} />
            Security Audit Logs 🔍
          </h1>
          <p className="text-text-muted mt-1 text-sm font-bold">Real-time tracking of all system actions and data access events.</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <ShieldCheck size={14} className="text-green-500" />
            Compliance Status: Healthy
          </div>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />
          <input
            type="text"
            placeholder="Search activity logs..."
            className="w-full bg-surface border border-subtle rounded-2xl pl-12 pr-4 py-3.5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-text-muted/30 shadow-inner"
          />
        </div>
        <button className="bg-surface border border-subtle text-text-muted p-3.5 rounded-2xl hover:text-primary hover:border-primary/20 transition-all shadow-md">
          <Filter size={20} />
        </button>
      </div>

      <div className="bg-surface/80 backdrop-blur-xl border border-subtle rounded-3xl overflow-hidden flex-1 flex flex-col shadow-xl min-h-0">
        <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-white/10 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="bg-primary/5 border-b border-subtle">
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Action Event</th>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Resource Type</th>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Trace ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    key={log.id} 
                    className="hover:bg-white/5 transition-colors group cursor-default"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-white/5">
                          <Activity size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-main group-hover:text-primary transition-colors uppercase tracking-tight">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          {log.details?.email && (
                           <p className="text-[10px] text-text-muted font-mono">{log.details.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag size={12} className="text-gray-500" />
                        <span className="text-xs text-text-muted group-hover:text-text-main transition-colors">
                          {log.resource_type} {log.resource_id ? `(#${log.resource_id})` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-text-muted group-hover:text-text-main transition-colors">
                        <Clock size={12} />
                        <span className="text-[11px] font-medium">{formatTime(log.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 opacity-30 group-hover:opacity-100 transition-all">
                        <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 bg-black/40 rounded-md border border-white/5">
                          EVT-9512-{log.id}
                        </span>
                        <ArrowRight size={10} className="text-primary" />
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center ">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <AlertCircle size={48} className="text-gray-500" />
                      <p className="text-sm italic font-medium">No activity records found in the audit vault.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-black/20 border-t border-white/10 text-center">
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest flex items-center justify-center gap-2">
               <Database size={10} /> Showing latest 50 security events from encrypted logs
            </p>
        </div>
      </div>
    </div>
  );
};

export default Audit;
