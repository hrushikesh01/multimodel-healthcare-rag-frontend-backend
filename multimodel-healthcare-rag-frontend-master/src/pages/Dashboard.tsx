import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { 
  Users, 
  FileText, 
  Activity, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import HealthScene from '../components/HealthScene';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, patientsRes, trendsRes] = await Promise.all([
          api.get('/api/admin/stats').catch(() => ({ data: { total_patients: 0, total_users: 0, total_documents: 0, active_sessions: 0 } })),
          api.get('/api/patients/'),
          api.get('/api/admin/trends').catch(() => ({ data: [] }))
        ]);
        setStats(statsRes.data);
        setRecentPatients(patientsRes.data.slice(0, 3));
        setTrendsData(trendsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const isPatient = user?.role === 'patient';

  const statCards = [
    { 
      name: isPatient ? 'My Records' : 'Total Patients', 
      value: stats?.total_patients || 0, 
      icon: Users, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      border: 'hover:border-blue-500/30'
    },
    { 
      name: isPatient ? 'My Documents' : 'Clinical Notes', 
      value: stats?.total_documents || 0, 
      icon: FileText, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10',
      border: 'hover:border-purple-500/30'
    },
    { 
      name: 'Active Sessions', 
      value: stats?.active_sessions || 0, 
      icon: Activity, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      border: 'hover:border-emerald-500/30'
    },
    { 
      name: 'System Health', 
      value: '99.9%', 
      icon: ShieldCheck, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10',
      border: 'hover:border-rose-500/30'
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 md:p-10 space-y-10 relative overflow-hidden bg-background min-h-screen text-text-main shadow-inner">
      {/* Background Hero Asset */}
      <div 
        className="absolute top-0 right-0 w-[600px] h-[600px] -mr-40 -mt-20 opacity-30 pointer-events-none mix-blend-screen grayscale-[0.5]"
        style={{ 
          backgroundImage: 'url("/dashboard_hero.png")',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Mesh Background */}
      <div className="absolute inset-0 bg-mesh opacity-50 z-0" />

      <motion.header 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6"
      >
        <div className="flex items-center gap-6">
           <div className="p-4 bg-primary rounded-3xl shadow-2xl shadow-primary/20">
              <LayoutDashboard size={32} className="text-white" />
           </div>
           <div>
              <h1 className="text-4xl font-black tracking-tighter mb-1 text-text-main">
                {isPatient ? 'Patient Portal' : 'Clinical Overview'}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-text-muted font-bold text-sm">Welcome back, <span className="text-primary">{user?.full_name || 'Staff'}</span></span>
                <span className="w-1 h-1 rounded-full bg-text-muted/20" />
                <span className="px-3 py-1 bg-surface border border-subtle rounded-full text-[10px] font-black uppercase tracking-widest text-text-muted shadow-sm">{user?.role}</span>
              </div>
           </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 bg-surface border border-subtle px-6 py-3 rounded-2xl shadow-sm">
           <Clock size={16} className="text-primary" />
           <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Real-time Telemetry Active</span>
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </motion.header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10"
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.name}
            variants={item}
            className={cn(
              "group relative overflow-hidden bg-surface border border-subtle rounded-[2.5rem] p-8 transition-all duration-500 shadow-xl",
              stat.border
            )}
          >
            <div className="flex items-center justify-between mb-8">
              <div className={cn("p-5 rounded-2xl shadow-inner", stat.bg)}>
                <stat.icon className={stat.color} size={32} />
              </div>
              <div className="flex items-center gap-1.5 text-green-500 text-[10px] font-black bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                <TrendingUp size={14} />
                +14.2%
              </div>
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mb-2">{stat.name}</p>
              <h3 className="text-4xl font-black tracking-tight tabular-nums">
                {loading ? <span className="animate-pulse opacity-30 text-2xl">SYST::LOAD</span> : stat.value}
              </h3>
            </div>
            <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
               <stat.icon size={80} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 space-y-10"
        >
          {!isPatient && (
            <div className="bg-surface border border-subtle rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                      <Activity size={24} className="text-primary" />
                    </div>
                    Clinical Velocity
                  </h2>
                  <p className="text-text-muted text-sm mt-1 font-bold italic">Daily admission throughput & engagement</p>
                </div>
                <div className="hidden sm:flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Visits</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-secondary shadow-lg shadow-secondary/40" />
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Registry</span>
                  </div>
                </div>
              </div>
              <div className="h-[380px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.03} vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="currentColor" 
                        opacity={0.3}
                        fontSize={10} 
                        fontWeight={900}
                        tickLine={false} 
                        axisLine={false} 
                        dy={20}
                      />
                      <YAxis 
                        stroke="currentColor" 
                        opacity={0.3}
                        fontSize={10} 
                        fontWeight={900}
                        tickLine={false} 
                        axisLine={false} 
                        dx={-20}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--surface)', 
                          border: '1px solid var(--glass-border)', 
                          borderRadius: '24px',
                          backdropFilter: 'blur(20px)',
                          padding: '20px 24px',
                          boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="visits" 
                        stroke="var(--color-primary)" 
                        fillOpacity={1} 
                        fill="url(#colorVisits)" 
                        strokeWidth={4} 
                        animationDuration={2500}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="patients" 
                        stroke="var(--color-secondary)" 
                        fillOpacity={1} 
                        fill="url(#colorPatients)" 
                        strokeWidth={4} 
                        animationDuration={2500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          <div className="bg-surface border border-subtle rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="p-10 border-b border-subtle flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-text-main">{isPatient ? 'Your Medical Summary' : 'Recent Case Updates'}</h2>
                <p className="text-text-muted text-sm mt-1 font-bold">
                  {isPatient ? 'Real-time synchronization with your clinical record' : 'Latest diagnostic and telemetry events'}
                </p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/patients')}
                className="group p-2 bg-primary/10 hover:bg-primary rounded-2xl transition-all border border-primary/20 shadow-lg"
              >
                <div className="flex items-center gap-3 px-4 py-2">
                  <span className="text-xs font-black uppercase tracking-widest group-hover:text-white">View All</span>
                  <ChevronRight size={18} className="group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </motion.button>
            </div>
            <div className="divide-y divide-subtle">
              {recentPatients.length > 0 ? recentPatients.map((patient, idx) => (
                <motion.div 
                  key={patient.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (idx * 0.1) }}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="p-8 flex items-center justify-between hover:bg-primary/5 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-black border border-white/10 text-2xl shadow-xl transition-transform group-hover:rotate-12 group-hover:scale-110">
                      {(patient.full_name || '?').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight text-text-main">{patient.full_name}</h4>
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em] mt-1.5 flex items-center gap-2">
                        <span className="text-primary/70">{patient.external_id || 'ID::UNSET'}</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted/30" />
                        <span className="text-text-muted">{patient.condition || 'GENERAL_CARE'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Health Status</p>
                    <span className="px-5 py-2 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full border border-green-500/20 uppercase tracking-[0.15em] shadow-sm">
                      Stable
                    </span>
                  </div>
                </motion.div>
              )) : (
                <div className="p-20 text-center text-text-muted font-black uppercase tracking-[0.3em] text-sm italic opacity-50">
                  Waiting for telemetry...
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-10 relative z-10"
        >
          <div className="bg-surface border border-subtle rounded-[3rem] p-10 shadow-2xl">
            <h2 className="text-2xl font-black mb-10 flex items-center gap-3">
               <Zap size={24} className="text-primary" />
               Pulse Actions
            </h2>
            <div className="space-y-5">
              {!isPatient && (
                <button 
                  onClick={() => navigate('/patients', { state: { openAddModal: true } })}
                  className="w-full flex items-center justify-between p-6 bg-primary hover:bg-primary/90 text-white rounded-[2rem] transition-all font-black shadow-2xl shadow-primary/30 group"
                >
                  <span className="uppercase tracking-widest">New Clinical Chart</span>
                  <ArrowUpRight size={26} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              )}
              <button 
                onClick={() => navigate('/patients')}
                className="w-full flex items-center justify-between p-6 bg-surface hover:bg-primary/10 border border-subtle rounded-[2rem] transition-all font-black group"
              >
                <span className="text-text-main group-hover:text-primary uppercase tracking-widest">{isPatient ? 'Lab Results' : 'Ingest Documents'}</span>
                <FileText size={26} className="text-text-muted group-hover:text-primary transition-colors" />
              </button>
              {isAdmin && (
                <button 
                  onClick={() => navigate('/audit')}
                  className="w-full flex items-center justify-between p-6 bg-surface hover:bg-primary/10 border border-subtle rounded-[2rem] transition-all font-black group"
                >
                  <span className="text-text-main group-hover:text-primary uppercase tracking-widest">Global Audit</span>
                  <ShieldCheck size={26} className="text-text-muted group-hover:text-emerald-500 transition-colors" />
                </button>
              )}
            </div>
          </div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/assistant')}
            className="bg-gradient-to-br from-primary via-secondary to-accent rounded-[3.5rem] p-10 text-white relative overflow-hidden shadow-2xl group cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-full h-full opacity-20 group-hover:opacity-40 transition-opacity">
              <HealthScene type="heart" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl">
                  <Zap size={28} className="text-white fill-white animate-pulse" />
                </div>
                <h3 className="text-3xl font-black italic tracking-tighter">Med-Gemini</h3>
              </div>
              <p className="text-base text-white mb-10 font-bold leading-relaxed">
                Context-aware clinical reasoning via modern RAG. 
                Full RBAC protected telemetry analysis.
              </p>
              <button className="bg-white text-primary px-10 py-4 rounded-2xl text-xs font-black shadow-2xl transition-all hover:scale-105 uppercase tracking-widest">
                Start Session
              </button>
            </div>
          </motion.div>

          <div className="bg-surface border border-subtle rounded-[3rem] p-10 shadow-2xl">
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] mb-10">Infrastructure Status</h3>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                   <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                   <span className="text-xs font-black tracking-widest text-text-main uppercase">API Node</span>
                </div>
                <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                   <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                   <span className="text-xs font-black tracking-widest text-text-main uppercase">Logic Engine</span>
                </div>
                <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Synched</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-4 items-center">
                   <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                   <span className="text-xs font-black tracking-widest text-text-main uppercase">Neural Core</span>
                </div>
                <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Online</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* 3D Flow Decoration */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-32 opacity-10 pointer-events-none z-0">
          <HealthScene type="dna" />
      </div>
    </div>
  );
};

export default Dashboard;
