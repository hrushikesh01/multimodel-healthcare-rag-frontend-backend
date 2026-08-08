import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { Activity, Shield, Lock, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const token = res.data.access_token;
      const userRes = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      login(token, userRes.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogins = [
    { role: 'Admin', email: 'admin@demo.local', pass: 'admin123!' },
    { role: 'Doctor', email: 'doctor@demo.local', pass: 'doctor123!' },
    { role: 'Patient', email: 'patient@demo.local', pass: 'patient123!' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Dynamic Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"
        style={{ 
          backgroundImage: 'url("/medical_bg_hero.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-primary/10 z-0" />
      
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg glass-panel rounded-[2.5rem] p-10 relative z-10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/30"
          >
            <Activity size={40} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-black text-current tracking-tighter mb-2">ClinicalAssist</h1>
          <p className="text-text-muted font-bold text-xs uppercase tracking-[0.3em]">Precision Healthcare Retrieval</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Clinical Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface/50 border border-subtle rounded-2xl px-4 py-4 pl-12 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-text-muted/30"
                placeholder="doctor@demo.local"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Secure Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface/50 border border-subtle rounded-2xl px-4 py-4 pl-12 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-text-muted/30"
                placeholder="••••••••"
              />
            </div>
          </motion.div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-xs font-bold flex items-center gap-3"
            >
              <Shield size={18} />
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Continue to Registry
                <ArrowRight size={20} />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-10 pt-8 border-t border-subtle">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-subtle" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Demo Portals</span>
            <div className="h-px flex-1 bg-subtle" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {demoLogins.map((demo) => (
              <button
                key={demo.role}
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.pass);
                }}
                className="px-2 py-3 bg-surface/50 hover:bg-primary text-[10px] font-black text-text-muted hover:text-white border border-subtle rounded-xl transition-all shadow-sm"
              >
                {demo.role}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-text-muted font-bold">
            New here?{' '}
            <Link to="/signup" className="text-primary hover:underline ml-1">
              Create an account
            </Link>
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-text-muted uppercase tracking-[0.2em] font-black opacity-60">
            <ShieldCheck size={14} className="text-green-500" /> AES-256 Secured · HIPAA Ready
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
