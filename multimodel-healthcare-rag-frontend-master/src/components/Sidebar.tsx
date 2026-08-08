import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  ShieldCheck, 
  LogOut, 
  Activity,
  Settings,
  ShieldAlert,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard, roles: ['admin', 'doctor', 'nurse'] },
    { name: 'My Care', path: `/patients/${user?.patient_profile_id || 1}`, icon: Activity, roles: ['patient'] }, 
    { name: 'Patients', path: '/patients', icon: Users, roles: ['admin', 'doctor'] },
    { name: 'Assistant', path: '/assistant', icon: MessageSquare, roles: ['admin', 'doctor', 'nurse', 'patient'] },
    { name: 'Audit Logs', path: '/audit', icon: ShieldCheck, roles: ['admin'] },
    { name: 'Admin Panel', path: '/admin', icon: ShieldAlert, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['doctor', 'nurse', 'patient'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const NavContent = () => (
    <>
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Activity size={24} className="text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter text-text-main">ClinicalAssist</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-text-muted hover:text-primary transition-colors">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden font-bold text-sm tracking-wide",
              location.pathname === item.path 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-text-muted hover:bg-primary/5 hover:text-primary"
            )}
          >
            <item.icon size={20} className={cn(
              "transition-transform duration-300 group-hover:scale-110",
              location.pathname === item.path ? "text-white" : "text-text-muted group-hover:text-primary"
            )} />
            <span>{item.name}</span>
            {location.pathname === item.path && (
              <motion.div 
                layoutId="active-pill"
                className="absolute left-0 w-1 h-6 bg-white rounded-full"
              />
            )}
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-subtle bg-surface/30 space-y-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface/50 border border-subtle hover:bg-primary/10 hover:border-primary/20 transition-all duration-300 group"
        >
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted group-hover:text-primary">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </div>
          <div className="w-8 h-4 bg-subtle rounded-full relative transition-colors shadow-inner">
            <motion.div 
              animate={{ x: theme === 'dark' ? 16 : 2 }}
              className="absolute top-1 w-2 h-2 bg-text-main rounded-full shadow-sm"
            />
          </div>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface/50 border border-subtle">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-black text-white shadow-inner">
            {user?.full_name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-black truncate text-text-main uppercase tracking-tighter">{user?.full_name}</p>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mt-1">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-widest border border-transparent hover:border-red-500/20"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Hamburger Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-3 bg-surface border border-subtle rounded-xl text-text-main shadow-2xl"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar UI */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-surface text-text-main flex flex-col border-r border-subtle shadow-2xl z-50 transition-transform duration-300 lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <NavContent />
      </aside>
    </>
  );
};

export default Sidebar;
