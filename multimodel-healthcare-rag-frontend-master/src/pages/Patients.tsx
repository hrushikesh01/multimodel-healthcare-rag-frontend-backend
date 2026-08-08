import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  ChevronRight,
  UserPlus,
  X,
  FileText,
  Fingerprint,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import HealthScene from '../components/HealthScene';

const Patients = () => {
  const { isMedicalStaff, isAdmin } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [condition, setCondition] = useState('');
  const [gender, setGender] = useState('Other');
  const [dob, setDob] = useState('');
  const [notes, setNotes] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/patients/');
      setPatients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    if (location.state?.openAddModal && isMedicalStaff) {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location, isMedicalStaff]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await api.post('/api/patients/', {
        full_name: fullName.trim(),
        external_id: externalId.trim() || `P-${Math.floor(Math.random() * 10000)}`,
        condition: condition.trim() || 'General Observation',
        gender,
        dob,
        notes: notes.trim()
      });
      setIsAddModalOpen(false);
      setFullName('');
      setExternalId('');
      setCondition('');
      setDob('');
      setNotes('');
      await fetchPatients();
      navigate(`/patients/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create patient record');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.external_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 space-y-10 relative overflow-hidden pb-20 bg-background text-text-main min-h-screen"
    >
      <div className="absolute top-0 right-0 w-[400px] h-[400px] -mr-32 -mt-20 opacity-10 pointer-events-none">
        <HealthScene type="dna" />
      </div>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-text-main">Patient Registry 🗂️</h1>
          <p className="text-text-muted mt-1 text-sm font-bold">Synthesized clinical charts for authorized staff.</p>
        </div>
        {isMedicalStaff && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-[2rem] font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20"
          >
            <UserPlus size={22} />
            Draft Chart
          </motion.button>
        )}
      </header>

      <div className="flex items-center gap-6 relative z-10">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={22} />
          <input
            type="text"
            placeholder="Filter by name or system sequence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-subtle rounded-[2rem] pl-14 pr-6 py-4 text-current focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-bold placeholder:text-text-muted/30 shadow-sm"
          />
        </div>
        <button className="bg-surface border border-subtle text-text-muted p-4 rounded-2xl hover:text-primary hover:border-primary/30 transition-all shadow-sm">
          <Filter size={22} />
        </button>
      </div>

      <div className="bg-surface/50 backdrop-blur-3xl border border-subtle rounded-[3rem] overflow-hidden shadow-2xl relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-primary/5 border-b border-subtle">
              <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Identity</th>
              <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Sequence ID</th>
              {isAdmin ? (
                <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Attending Physician</th>
              ) : (
                <>
                  <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Diagnostic Path</th>
                  <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Demographics</th>
                  <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Temporal Info</th>
                  <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em] text-right">Ops</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={isAdmin ? 3 : 6} className="px-8 py-10 bg-surface/30"></td>
                </tr>
              ))
            ) : filteredPatients.length > 0 ? (
              filteredPatients.map((patient, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={patient.id} 
                  className="hover:bg-primary/5 transition-colors group cursor-default"
                >
                  <td className="px-8 py-5">
                    <Link to={`/patients/${patient.id}`} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-black border border-primary/10 shadow-sm group-hover:scale-110 transition-transform">
                        {(patient.full_name || '?').charAt(0)}
                      </div>
                      <span className="font-black tracking-tight group-hover:text-primary transition-colors text-lg text-text-main">
                        {patient.full_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{patient.external_id}</span>
                       {!isAdmin && patient.can_write && (
                         <span className="px-2 py-1 bg-primary/10 text-primary text-[8px] font-black rounded-lg border border-primary/20 uppercase tracking-widest animate-pulse">
                           RWX ACCESS
                         </span>
                       )}
                    </div>
                  </td>
                  {isAdmin ? (
                    <td className="px-8 py-5">
                      <span className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black rounded-full border border-primary/20 uppercase tracking-widest">
                        {patient.doctor_assigned || 'QUEUE::EMPTY'}
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-8 py-5">
                        <span className="px-4 py-2 bg-secondary/10 text-secondary text-[10px] font-black rounded-full border border-secondary/20 uppercase tracking-widest">
                          {patient.condition || 'GENERAL_CARE'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-text-muted italic">{patient.gender}</td>
                      <td className="px-8 py-5 text-sm font-bold text-text-muted italic">{patient.dob}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            to={`/patients/${patient.id}`}
                            className="p-3 text-text-muted hover:text-primary hover:bg-primary/10 rounded-2xl transition-all shadow-sm"
                          >
                            <ChevronRight size={20} />
                          </Link>
                          <button className="p-3 text-text-muted hover:text-current hover:bg-surface rounded-2xl transition-all shadow-sm">
                            <MoreHorizontal size={20} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 3 : 6} className="px-8 py-20 text-center text-text-muted font-black uppercase tracking-[0.4em] text-sm opacity-40">
                  NO SEQUENCING DATA DETECTED
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-2xl glass-panel rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.2)] border border-primary/20"
            >
              <div className="p-10 border-b border-subtle flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                    <UserPlus size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-text-main">Provision Chart</h2>
                    <p className="text-[10px] text-text-muted uppercase tracking-[0.3em] font-black mt-1">Telemetry Initialization</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-3 text-text-muted hover:text-current hover:bg-surface rounded-2xl transition-all border border-transparent hover:border-subtle shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddPatient} className="p-12 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Full Legal Clinical Name</label>
                    <div className="relative group">
                      <UserPlus className="absolute left-5 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={20} />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Johnathan Doe"
                        className="w-full bg-surface/50 border border-subtle rounded-2xl px-6 py-4 pl-14 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black placeholder:text-text-muted/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Sequence / MRN UID</label>
                    <div className="relative group">
                      <Fingerprint className="absolute left-5 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={20} />
                      <input
                        type="text"
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                        placeholder="P-SEQUENCE (Auto)"
                        className="w-full bg-surface/50 border border-subtle rounded-2xl px-6 py-4 pl-14 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black placeholder:text-text-muted/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Diagnostic Path</label>
                    <div className="relative group">
                      <Activity className="absolute left-5 top-4 text-text-muted group-focus-within:text-primary transition-colors" size={20} />
                      <input
                        type="text"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        placeholder="Hypertension / Core"
                        className="w-full bg-surface/50 border border-subtle rounded-2xl px-6 py-4 pl-14 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black placeholder:text-text-muted/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Temporal Birth Origin</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-surface/50 border border-subtle rounded-2xl px-6 py-4 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Biological Marker</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-surface/50 border border-subtle rounded-2xl px-6 py-4 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black appearance-none cursor-pointer"
                    >
                      <option value="Male">Male Origin</option>
                      <option value="Female">Female Origin</option>
                      <option value="Other">Non-binary / Other</option>
                    </select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Synthesized Clinical Notes</label>
                    <div className="relative group">
                      <FileText className="absolute left-5 top-5 text-text-muted group-focus-within:text-primary transition-colors" size={20} />
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Neural observations & orientation history..."
                        rows={3}
                        className="w-full bg-surface/50 border border-subtle rounded-2xl px-6 py-5 pl-14 text-current focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-black resize-none placeholder:text-text-muted/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-8">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-8 py-5 rounded-[2.5rem] bg-surface border border-subtle text-text-muted font-black hover:bg-primary/5 transition-all shadow-sm uppercase tracking-widest text-xs"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !fullName.trim()}
                    className="flex-[2] bg-primary hover:bg-primary/90 text-white px-8 py-5 rounded-[2.5rem] font-black flex items-center justify-center gap-3 transition-all shadow-2xl shadow-primary/30 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                        Writing to Chain...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={24} />
                        COMMIT CHART
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

export default Patients;
