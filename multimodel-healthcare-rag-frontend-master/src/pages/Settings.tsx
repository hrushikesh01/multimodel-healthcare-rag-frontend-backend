import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  User, 
  Mail, 
  Shield, 
  Lock, 
  Bell, 
  Moon, 
  Smartphone,
  Globe,
  Save,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const Settings = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 pb-20 max-w-4xl mx-auto bg-background text-text-main min-h-screen">
      <header>
        <h1 className="text-3xl font-black text-text-main tracking-tight">System Settings ⚙️</h1>
        <p className="text-text-muted mt-2 font-bold">Manage your clinical profile and application preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Tabs (Visual) */}
        <div className="space-y-2">
          {[
            { name: 'Profile', icon: User, active: true },
            { name: 'Security', icon: Lock, active: false },
            { name: 'Notifications', icon: Bell, active: false },
            { name: 'Appearance', icon: Moon, active: false },
          ].map((tab) => (
            <button
              key={tab.name}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black transition-all text-sm uppercase tracking-widest",
                tab.active 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-text-muted hover:bg-primary/5 hover:text-primary"
              )}
            >
              <tab.icon size={18} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-8">
          <motion.form 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleSave}
            className="bg-surface border border-subtle rounded-[2.5rem] p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-xl">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-black text-text-main">Clinical Profile</h3>
                <p className="text-xs text-text-muted font-black uppercase tracking-widest mt-1">Basic Identity Information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background border border-subtle rounded-2xl px-4 py-3.5 pl-12 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-3.5 text-gray-600" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl px-4 py-3.5 pl-12 text-gray-500 cursor-not-allowed font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Assigned Role</label>
                <div className="relative group">
                  <Shield size={18} className="absolute left-4 top-3.5 text-gray-600" />
                  <input
                    type="text"
                    disabled
                    value={user?.role?.toUpperCase() || ''}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl px-4 py-3.5 pl-12 text-gray-500 cursor-not-allowed font-bold tracking-widest"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                Changes persist across all clinical endpoints.
              </p>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : showSuccess ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Save size={18} />
                )}
                {isSaving ? 'Syncing...' : showSuccess ? 'Profile Updated' : 'Save Profile'}
              </button>
            </div>
          </motion.form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-surface border border-subtle rounded-[2rem] p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-xl">
                  <Smartphone size={20} className="text-orange-400" />
                </div>
                <h4 className="text-text-main font-black text-sm">Device Access</h4>
              </div>
              <p className="text-xs text-text-muted font-bold">Currently active on this Chrome browser session.</p>
              <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70">Remote Sign Out</button>
            </div>
            
            <div className="bg-surface border border-subtle rounded-[2rem] p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-xl">
                  <Globe size={20} className="text-secondary" />
                </div>
                <h4 className="text-text-main font-black text-sm">Locale & Time</h4>
              </div>
              <p className="text-xs text-text-muted font-bold">UTC+05:30 (Asia/Kolkata) based on clinical location.</p>
              <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70">Sync with GPS</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
