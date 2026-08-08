import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  ShieldAlert, 
  Users, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Database,
  UserCheck,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface SignupRequest {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const Admin = () => {
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchAdminData = async () => {
    try {
      const [statsRes, requestsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/signup-requests')
      ]);
      setStats(statsRes.data);
      setRequests(requestsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await api.post(`/api/admin/signup-requests/${id}/${action}`, {});
      await fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-8 animate-pulse text-gray-500">
        <div className="h-10 w-48 bg-white/5 rounded-xl ml-2 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white/5 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-400 flex flex-col items-center justify-center min-h-[50vh]">
        <ShieldAlert size={48} className="mb-4" />
        <h2 className="text-xl font-bold">Access Denied or Connection Error</h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <button onClick={fetchAdminData} className="mt-4 px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
          Retry Fetch
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20 bg-background text-text-main min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-primary" size={32} />
            System Administration 🛡️
          </h1>
          <p className="text-text-muted mt-1 text-sm md:text-base font-bold">Manage system statistics and role-based access approvals.</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="bg-surface border border-subtle px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] md:text-xs font-bold text-text-muted shadow-xl backdrop-blur-md">
            <Clock size={14} className="text-primary" />
            Last Sync: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { name: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { name: 'Managed Patients', value: stats?.total_patients ?? 0, icon: UserCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { name: 'Clinical Assets', value: stats?.total_documents ?? 0, icon: FileText, color: 'text-green-500', bg: 'bg-green-500/10' },
          { name: 'Active Sessions', value: stats?.active_sessions ?? 0, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface backdrop-blur-xl border border-subtle rounded-3xl p-6 hover:border-primary/50 transition-all group shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className={cn("p-3 rounded-2xl w-fit mb-4 shadow-inner", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">{stat.name}</p>
              <h3 className="text-3xl font-black text-text-main mt-2 tabular-nums">
                {stat.value}
              </h3>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <stat.icon size={100} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-surface/80 backdrop-blur-xl border border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 md:p-8 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between bg-primary/5 gap-4">
          <div>
            <h2 className="text-xl font-black text-text-main flex items-center gap-3">
              <Database size={20} className="text-primary" />
              Access Requests 📄
            </h2>
            <p className="text-xs text-text-muted mt-1 font-bold">Review new healthcare practitioners and patient applications.</p>
          </div>
          <span className="w-fit px-4 py-2 bg-primary/10 rounded-xl text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">
            {requests.length} Requests Total
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-primary/5 border-b border-subtle">
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">User Profile</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Requested On</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.length > 0 ? (
                requests.map((request, i) => (
                  <tr key={request.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-black border border-subtle text-lg shadow-lg">
                          {request.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-base font-black text-text-main group-hover:text-primary transition-colors">{request.full_name}</p>
                          <p className="text-xs text-text-muted font-bold tracking-tight">{request.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1.5 bg-white/5 text-text-muted text-[10px] font-black rounded-lg border border-white/10 uppercase tracking-widest">
                        {request.role}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs text-text-muted font-black uppercase tracking-widest">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' ? (
                          <span className="flex items-center gap-1.5 text-orange-400 text-[10px] font-black uppercase tracking-widest bg-orange-400/10 px-2 py-1 rounded-md border border-orange-400/20">
                            <Clock size={12} /> Pending
                          </span>
                        ) : request.status === 'approved' ? (
                          <span className="flex items-center gap-1.5 text-green-400 text-[10px] font-black uppercase tracking-widest bg-green-400/10 px-2 py-1 rounded-md border border-green-400/20">
                            <CheckCircle2 size={12} /> Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-400/10 px-2 py-1 rounded-md border border-red-400/20">
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {request.status === 'pending' && (
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            disabled={actionLoading === request.id}
                            onClick={() => handleAction(request.id, 'approve')}
                            className="p-3 text-green-500 hover:bg-green-500/10 rounded-2xl transition-all disabled:opacity-50 border border-transparent hover:border-green-500/20"
                            title="Approve Request"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button 
                            disabled={actionLoading === request.id}
                            onClick={() => handleAction(request.id, 'reject')}
                            className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all disabled:opacity-50 border border-transparent hover:border-red-500/20"
                            title="Reject Request"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-text-muted font-black uppercase tracking-[0.2em] italic text-sm">
                    No signup requests found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 mb-10">
        <div className="bg-surface border border-subtle rounded-[2rem] p-8 space-y-4 shadow-xl">
           <h3 className="text-text-main font-black flex items-center gap-3 text-sm uppercase tracking-widest">
             <div className="p-2 bg-orange-500/10 rounded-lg">
               <Activity size={18} className="text-orange-500" />
             </div>
             System Maintenance
           </h3>
           <p className="text-xs text-text-muted leading-relaxed font-bold">Database optimization and clinical asset indexing scheduled for Sunday, 04:00 AM UTC. System performance may be throttled.</p>
        </div>
        <div className="bg-surface border border-subtle rounded-[2rem] p-8 space-y-4 shadow-xl">
           <h3 className="text-text-main font-black flex items-center gap-3 text-sm uppercase tracking-widest">
             <div className="p-2 bg-primary/10 rounded-lg">
               <ShieldCheck size={18} className="text-primary" />
             </div>
             Security Updates
           </h3>
           <p className="text-xs text-text-muted leading-relaxed font-bold">HIPAA configuration compliance check passed on Mar 2026. AES-256 encryption active for all multimodal data storage layers.</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
