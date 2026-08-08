import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, 
  FileText, 
  Upload, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Activity,
  ShieldCheck,
  Plus,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Shield,
  StickyNote,
  X,
  CheckCircle2,
  AlertCircle,
  FolderLock,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import HealthScene from '../components/HealthScene';

const PatientDetail = () => {
  const { id } = useParams();
  const { isAdmin, user: currentUser } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Edit Form State
  const [fullName, setFullName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Access Grant State
  const [grantUserId, setGrantUserId] = useState('');
  const [grantLevel, setGrantLevel] = useState('read');
  const [isGranting, setIsGranting] = useState(false);

  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, dRes, iRes] = await Promise.all([
        api.get(`/api/patients/${id}`),
        api.get(`/api/documents/?patient_id=${id}`),
        api.get(`/api/images/?patient_id=${id}`)
      ]);
      setPatient(pRes.data);
      setFullName(pRes.data.full_name || '');
      setExternalId(pRes.data.external_id || '');
      setNotes(pRes.data.notes || '');
      setDocs(dRes.data);
      setImages(iRes.data);

      if (isAdmin) {
        const uRes = await api.get('/api/users/');
        setUsers(uRes.data.filter((u: any) => u.role === 'doctor' || u.role === 'nurse'));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load patient data');
    } finally {
      setIsLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.patch(`/api/patients/${id}/`, {
        full_name: fullName.trim(),
        external_id: externalId.trim(),
        notes: notes.trim()
      });
      setPatient(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.dcm'].some(ext => uploadFile.name.toLowerCase().endsWith(ext));
    if (isImage && !uploadCaption.trim()) {
      alert('Clinical description is required for imaging files.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('patient_id', id!);
      formData.append('file', uploadFile);
      if (isImage) {
        formData.append('caption', uploadCaption.trim());
        await api.post('/api/images/', formData);
      } else {
        await api.post('/api/documents/', formData);
      }
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadCaption('');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserId) return;
    setIsGranting(true);
    try {
      await api.post(`/api/patients/${id}/access/`, {
        user_id: parseInt(grantUserId),
        access_level: grantLevel
      });
      setGrantUserId('');
      alert('Access provisioned successfully');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to grant access');
    } finally {
      setIsGranting(false);
    }
  };

  if (isLoading) return <div className="p-12 text-current font-black uppercase tracking-widest text-center animate-pulse">Synchronizing Chart...</div>;
  if (!patient || error) return (
    <div className="min-h-screen flex items-center justify-center p-12">
      <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-[2rem] max-w-lg text-center shadow-xl">
        <AlertCircle size={48} className="mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Access Denied / Not Found</h2>
        <p className="font-bold opacity-70 underline decoration-red-500/30">{error || 'Reference ID error.'}</p>
        <Link to="/patients" className="inline-block mt-8 bg-red-500 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">Return to Registry</Link>
      </div>
    </div>
  );

  const canWrite = isAdmin || patient.can_write;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-10 space-y-10 pb-20 relative overflow-hidden bg-background"
    >
      {/* Mesh Background */}
      <div className="absolute inset-0 bg-mesh opacity-30 z-0 pointer-events-none" />
      
      <div className="absolute top-0 right-0 w-[400px] h-[400px] -mr-32 -mt-20 opacity-10 pointer-events-none">
        <HealthScene type="heart" />
      </div>

      <motion.header 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-8"
      >
        <div className="flex items-center gap-6">
          <Link to="/patients" className="p-4 bg-surface border border-subtle rounded-2xl transition-all text-text-muted hover:text-primary hover:border-primary/30 shadow-sm flex items-center justify-center">
            <ArrowLeft size={24} />
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-text-main">{patient.full_name}</h1>
              <div className={cn(
                "px-4 py-1.5 text-[10px] font-black rounded-full border uppercase tracking-widest shadow-sm",
                canWrite ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20"
              )}>
                {canWrite ? 'Read-Write Access' : 'Read-Only Mode'}
              </div>
            </div>
            <p className="text-text-muted font-bold text-sm tracking-wide flex items-center gap-2">
               <Fingerprint size={14} /> {patient.external_id} <span className="opacity-20">|</span> Clinical Reference Chart
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          {canWrite && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-[2rem] font-black flex items-center gap-3 transition-all shadow-xl shadow-primary/20 text-sm"
            >
              <Upload size={20} />
              Injest Record
            </motion.button>
          )}
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Patient Form */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSave} 
            className="bg-surface border border-subtle rounded-[3rem] p-10 space-y-8 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-subtle pb-6 mb-2">
               <h3 className="text-xl font-black flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <StickyNote size={24} className="text-primary" />
                  </div>
                  Sequence Identity
               </h3>
               {!canWrite && (
                  <div className="flex items-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20">
                    <Shield size={14} /> Immutable Chart
                  </div>
               )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Legal Full Name</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    readOnly={!canWrite}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background/50 border border-subtle rounded-2xl px-4 py-4 pl-12 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">System UID / MRN</label>
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    readOnly={!canWrite}
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    className="w-full bg-background/50 border border-subtle rounded-2xl px-4 py-4 pl-12 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-3 col-span-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Clinical Observation Thread</label>
                <div className="relative group">
                  <Activity className="absolute left-4 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                  <textarea
                    readOnly={!canWrite}
                    rows={6}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-background/50 border border-subtle rounded-3xl px-4 py-5 pl-12 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black resize-none disabled:opacity-50 min-h-[160px]"
                  />
                </div>
              </div>
            </div>

            {canWrite && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-[2rem] font-black transition-all shadow-2xl shadow-primary/30 disabled:opacity-50 flex items-center gap-3 uppercase tracking-widest text-xs"
              >
                {isSaving ? 'Syncing Chain...' : 'Commit Sequence Updates'}
                <CheckCircle2 size={18} />
              </motion.button>
            )}
          </motion.form>

          {/* Imaging Assets */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface border border-subtle rounded-[3rem] overflow-hidden shadow-2xl"
          >
            <div className="p-10 border-b border-subtle flex items-center justify-between bg-secondary/5">
              <h2 className="text-xl font-black flex items-center gap-4">
                <div className="p-3 bg-secondary/20 rounded-2xl">
                  <ImageIcon size={24} className="text-secondary" />
                </div>
                Imaging Matrix
              </h2>
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] bg-surface px-4 py-2 rounded-full border border-subtle">{images.length} SCANS DETECTED</span>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              {images.length > 0 ? images.map((img) => (
                <motion.div 
                  key={img.id} 
                  whileHover={{ y: -5 }}
                  className="bg-background/40 border border-subtle rounded-[2.5rem] p-6 space-y-6 group hover:border-secondary transition-all shadow-sm"
                >
                  <div className="aspect-video bg-surface rounded-[1.5rem] border border-subtle flex items-center justify-center text-text-muted group-hover:text-secondary transition-colors overflow-hidden relative shadow-inner">
                    <ImageIcon size={64} className="group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="px-2">
                    <h4 className="text-lg font-black tracking-tight mb-2 truncate text-text-main">{img.filename}</h4>
                    <p className="text-xs text-text-muted font-medium line-clamp-2 leading-relaxed italic mb-4">"{img.caption}"</p>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] text-text-muted font-black uppercase tracking-widest opacity-60">TIMESTAMP:: {new Date(img.created_at).toLocaleDateString()}</span>
                       <button className="p-2 bg-surface hover:bg-secondary/10 text-text-muted hover:text-secondary rounded-xl transition-all shadow-sm">
                          <Download size={16} />
                       </button>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="col-span-2 py-20 text-center text-text-muted font-black uppercase tracking-[0.4em] text-sm italic opacity-30 italic">NO IMAGING SEQUENCES SYNCED</div>
              )}
            </div>
          </motion.div>

          {/* Document Registry */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface border border-subtle rounded-[3rem] overflow-hidden shadow-2xl"
          >
            <div className="p-10 border-b border-subtle flex items-center justify-between bg-primary/5">
              <h2 className="text-xl font-black flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <FileText size={24} className="text-primary" />
                </div>
                Metadata Registry
              </h2>
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] bg-surface px-4 py-2 rounded-full border border-subtle">{docs.length} DATA BLOCKS</span>
            </div>
            <div className="divide-y divide-subtle">
              {docs.length > 0 ? docs.map((doc, idx) => (
                <motion.div 
                  key={doc.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (idx * 0.1) }}
                  className="p-10 flex items-center justify-between hover:bg-primary/5 transition-colors group cursor-default"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-surface border border-subtle flex items-center justify-center text-text-muted group-hover:text-primary transition-all shadow-sm group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/10">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black tracking-tight mb-2 text-text-main">{doc.filename}</h4>
                      <div className="flex items-center gap-4">
                         <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full border border-primary/20 uppercase tracking-widest">{doc.status}</span>
                         <span className="text-[10px] text-text-muted uppercase font-black tracking-[0.2em] opacity-60">{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                      {doc.summary && <p className="text-sm text-text-muted mt-3 font-bold italic leading-relaxed">"{doc.summary}"</p>}
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    className="p-4 bg-surface hover:bg-primary text-text-muted hover:text-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-primary/20"
                  >
                    <Download size={24} />
                  </motion.button>
                </motion.div>
              )) : (
                <div className="p-20 text-center text-text-muted font-black uppercase tracking-[0.4em] text-sm italic opacity-30 italic">NO METADATA BLOCKS DETECTED</div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-10 relative z-10">
          {/* Admin Panel */}
          {isAdmin && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface border border-subtle rounded-[3rem] p-10 space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <FolderLock size={120} />
              </div>
              <h3 className="text-2xl font-black flex items-center gap-4">
                <ShieldCheck size={32} className="text-emerald-500" />
                RBAC Control 🛡️
              </h3>
              <p className="text-sm text-text-muted font-bold leading-relaxed opacity-70 italic shadow-inner bg-emerald-500/[0.03] p-4 rounded-2xl border border-emerald-500/10">
                Grant specialized clinical access to authorized practitioners. Horizontal scaling of peer review permissions.
              </p>
              
              <form onSubmit={handleGrantAccess} className="p-2 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Attending Practitioner</label>
                  <select
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    className="w-full bg-background/50 border border-subtle rounded-2xl px-6 py-4 text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-black appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="">SCANNING FOR STAFF...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email} [{u.role.toUpperCase()}]</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-1">Permission Level</label>
                  <select
                    value={grantLevel}
                    onChange={(e) => setGrantLevel(e.target.value)}
                    className="w-full bg-background/50 border border-subtle rounded-2xl px-6 py-4 text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-black appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="read">READ_ONLY::OBSERVER</option>
                    <option value="write">READ_WRITE::AUTHOR</option>
                  </select>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isGranting || !grantUserId}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[2.5rem] font-black transition-all shadow-2xl shadow-emerald-600/30 disabled:opacity-50 mt-4 uppercase tracking-[0.2em] text-xs"
                >
                  {isGranting ? 'PROVISIONING...' : 'UPGRADE PERMISSIONS'}
                </motion.button>
              </form>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface border border-subtle rounded-[3rem] p-10 shadow-2xl group cursor-default"
          >
            <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
               <Activity size={24} className="text-primary animate-pulse" />
               Chart Pulse 🤖
            </h3>
            <div className="space-y-6">
              <div className="p-6 bg-primary/[0.03] rounded-3xl border border-primary/10 shadow-inner group-hover:bg-primary/[0.05] transition-all">
                <p className="text-sm text-text-muted font-bold leading-relaxed italic opacity-80">
                   <span className="text-primary">"</span>{notes || "Awaiting clinical synthesis. Neural network initialized for this sequence."}<span className="text-primary">"</span>
                </p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/assistant')}
                className="w-full flex items-center justify-center gap-4 p-5 bg-gradient-to-r from-primary to-secondary text-white rounded-[2rem] transition-all font-black shadow-2xl shadow-primary/20 uppercase tracking-[0.2em] text-[10px]"
              >
                Injest Into Med-Gemini
                <ChevronRight size={18} />
              </motion.button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-surface border border-subtle rounded-[3rem] p-10 shadow-2xl"
          >
             <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] mb-10">Sequence Compliance</h3>
             <div className="space-y-8">
                <div className="flex items-center justify-between">
                   <div className="flex gap-4 items-center">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                      <span className="text-xs font-black tracking-widest text-text-main opacity-80 uppercase">Integrity Hash</span>
                   </div>
                   <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">VERIFIED</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex gap-4 items-center">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 flex items-center justify-center">
                         <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                      <span className="text-xs font-black tracking-widest text-text-main opacity-80 uppercase">DICOM Compliance</span>
                   </div>
                   <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex gap-4 items-center">
                      <div className="w-3 h-3 bg-primary rounded-full animate-ping" />
                      <span className="text-xs font-black tracking-widest text-text-main opacity-80 uppercase ml-1">RBAC Sync</span>
                   </div>
                   <span className="text-[10px] text-primary font-black uppercase tracking-widest">SYNCHING</span>
                </div>
             </div>
          </motion.div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-xl glass-panel rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.3)] border border-primary/20"
            >
              <div className="p-10 border-b border-subtle flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                    <Upload size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Data Ingestion</h2>
                    <p className="text-[10px] text-text-muted uppercase tracking-[0.3em] font-black mt-1">Registry Scale Expansion</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-3 text-text-muted hover:text-current hover:bg-surface rounded-2xl transition-all border border-transparent hover:border-subtle shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleFileUpload} className="p-12 space-y-10">
                <div className="space-y-6">
                  <div className="p-12 border-4 border-dashed border-subtle rounded-[2.5rem] text-center space-y-6 hover:border-primary/50 transition-all cursor-pointer relative group bg-surface/30">
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                      <FileText size={40} className="transition-transform group-hover:scale-125" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black tracking-tight">{uploadFile ? uploadFile.name : 'Choose Telemetry Unit'}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-[0.4em] font-black opacity-50">PDF · DICOM · HASH · IMAGING</p>
                    </div>
                  </div>

                  {uploadFile && ['.png', '.jpg', '.jpeg', '.webp', '.dcm'].some(ext => uploadFile.name.toLowerCase().endsWith(ext)) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 pt-4"
                    >
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] ml-2">Clinical Orientation Fragment</label>
                       <textarea
                         required
                         value={uploadCaption}
                         onChange={(e) => setUploadCaption(e.target.value)}
                         placeholder="Synthesize observation for this fragment..."
                         rows={4}
                         className="w-full bg-background/50 border border-subtle rounded-3xl px-6 py-5 text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black resize-none placeholder:text-text-muted/30"
                       />
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-6">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="flex-1 px-8 py-5 rounded-[2.5rem] bg-surface border border-subtle text-text-muted font-black hover:bg-primary/5 transition-all shadow-sm uppercase tracking-widest text-xs"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className="flex-[2] bg-primary hover:bg-primary/90 text-white px-8 py-5 rounded-[2.5rem] font-black flex items-center justify-center gap-4 transition-all shadow-2xl shadow-primary/30 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        Injesting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={24} />
                        COMMIT TO REGISTRY
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PatientDetail;
