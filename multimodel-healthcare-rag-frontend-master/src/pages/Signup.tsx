import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Stethoscope, 
  KeyRound, 
  Mail, 
  AlertCircle, 
  User as UserIcon, 
  Shield,
  ArrowRight,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HealthScene from '../components/HealthScene';

const ChevronDown = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    
    try {
      await register(fullName, email, role, password);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed early. Please contact system admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-overlay scale-110"
        style={{ 
          backgroundImage: 'url("/medical_bg_hero.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-secondary/10 z-0" />

      {/* 3D Scene Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-20 pointer-events-none z-0">
        <HealthScene type="dna" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl z-10"
      >
        <div className="flex items-center gap-5 mb-10">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30">
            <Stethoscope size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-current tracking-tighter">ClinicalAssist</h1>
            <p className="text-text-muted font-bold text-[10px] uppercase tracking-widest mt-1">Multi-role Secure Access Control</p>
          </div>
        </div>

        <div className="glass-panel rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="signup-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-black text-current">Join the Registry 🧬</h2>
                  <p className="text-text-muted text-sm mt-1 font-medium">Provision clinical permissions securely.</p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 shadow-sm"
                  >
                    <AlertCircle size={18} />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="Jane Doe"
                        className="w-full bg-surface/50 border border-subtle rounded-2xl px-4 py-3.5 pl-12 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-text-muted/30 shadow-sm"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Clinical Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        type="email"
                        required
                        placeholder="jane@clinical.local"
                        className="w-full bg-surface/50 border border-subtle rounded-2xl px-4 py-3.5 pl-12 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-text-muted/30 shadow-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Secure Password</label>
                      <div className="relative group">
                        <KeyRound className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          className="w-full bg-surface/50 border border-subtle rounded-2xl px-4 py-3.5 pl-12 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-text-muted/30 shadow-sm"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">System Role</label>
                      <div className="relative group">
                        <Shield className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                        <select
                          className="w-full bg-surface/50 border border-subtle rounded-2xl px-4 py-3.5 pl-12 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold appearance-none cursor-pointer shadow-sm"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                        >
                          <option value="doctor">Doctor</option>
                          <option value="nurse">Nurse</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-4 text-text-muted pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 group disabled:opacity-50 mt-4 px-6"
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Request Access
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform font-black" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="pt-6 border-t border-subtle text-center">
                  <p className="text-sm text-text-muted font-medium">
                    Already within the registry? <Link to="/login" className="text-primary font-black hover:text-primary/70 ml-1">Sign in</Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success-message"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center text-center space-y-8"
              >
                <div className="w-24 h-24 bg-green-500/20 rounded-3xl flex items-center justify-center border-2 border-green-500/50 text-green-500 shadow-2xl shadow-green-500/20">
                  <CheckCircle2 size={56} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-current">Application Logged</h3>
                  <p className="text-text-muted mt-3 font-medium max-w-sm">
                    Your clinical access request has been sent to system administration for validation.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-6 py-3 rounded-full border border-primary/20 shadow-sm animate-pulse">
                  <Activity size={14} />
                  Redirecting to Vault...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 blur-[60px] rounded-full" />
        </div>

        <div className="mt-10 flex items-center justify-center gap-8 text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-60">
           <span className="flex items-center gap-2"><Shield size={14} /> Encrypted Storage</span>
           <span className="flex items-center gap-2"><Activity size={14} /> Full Audit Trail</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
