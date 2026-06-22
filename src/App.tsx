import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  History, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  LogOut, 
  Briefcase, 
  BadgeAlert, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Filter, 
  UserPlus, 
  AlertCircle,
  HelpCircle,
  Eye,
  Send,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces mapping backend models
interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Sales' | 'Finance';
}

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  estimatedValue: number;
  status: 'New' | 'Contacted' | 'Qualified' | 'Negotiation' | 'Won' | 'Lost';
  salesId: string;
  salesName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface SPK {
  id: string;
  spkNumber: string;
  leadId: string;
  leadCompany: string;
  projectName: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  salesStatus: 'Draft' | 'Sent';
  financeStatus: 'Pending' | 'Approved' | 'Rejected';
  financeNotes: string;
  financeVerifiedAt?: string;
  financeVerifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface HistoryLog {
  id: string;
  entityType: 'lead' | 'spk';
  entityId: string;
  previousStatus: string;
  newStatus: string;
  userId: string;
  userName: string;
  userRole: string;
  notes: string;
  timestamp: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('crm_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Layout tabs
  const [activeTab, setActiveTab] = useState<'leads' | 'spks' | 'history' | 'users'>('leads');

  // Core Data sets
  const [leads, setLeads] = useState<Lead[]>([]);
  const [spks, setSpks] = useState<SPK[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);

  // Search, filters, and pagination states
  const [leadsSearch, setLeadsSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotalPages, setLeadsTotalPages] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const leadsLimit = 6;

  // General state flags
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals / Drawers states
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLeadDetail, setViewingLeadDetail] = useState<Lead | null>(null);
  
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [editingSpk, setEditingSpk] = useState<SPK | null>(null);
  const [viewingSpkDetail, setViewingSpkDetail] = useState<SPK | null>(null);
  const [verifyingSpk, setVerifyingSpk] = useState<SPK | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Form Field temporary buffers
  const [leadForm, setLeadForm] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    source: 'Website',
    estimatedValue: 0,
    status: 'New' as Lead['status'],
    salesId: '',
    notes: ''
  });

  const [spkForm, setSpkForm] = useState({
    projectName: '',
    contractValue: 0,
    startDate: '',
    endDate: ''
  });

  const [userForm, setUserForm] = useState({
    email: '',
    name: '',
    role: 'Sales' as User['role'],
    password: ''
  });

  // Toast notifier
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Central Request Handler
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(endpoint, { ...options, headers });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Terjadi kesalahan sistem.');
      }
      return data;
    } catch (err: any) {
      addToast(err.message || 'Koneksi ke backend gagal.', 'error');
      throw err;
    }
  };

  // Initialize and check current logon user
  useEffect(() => {
    if (token) {
      localStorage.setItem('crm_token', token);
      apiFetch('/api/auth/me')
        .then(res => {
          setCurrentUser(res.user);
          // Set initial tab based on role
          if (res.user.role === 'Finance') {
            setActiveTab('spks');
          } else {
            setActiveTab('leads');
          }
        })
        .catch(() => {
          handleLogout();
        });
    } else {
      localStorage.removeItem('crm_token');
      setCurrentUser(null);
    }
  }, [token]);

  // Handle data fetching when tab/filters change
  useEffect(() => {
    if (!currentUser) return;

    fetchCurrentTabData();
  }, [currentUser, activeTab, leadsPage, leadsSearch, statusFilter]);

  const fetchCurrentTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'leads' && (currentUser?.role === 'Admin' || currentUser?.role === 'Sales')) {
        const query = new URLSearchParams({
          page: leadsPage.toString(),
          limit: leadsLimit.toString(),
          search: leadsSearch,
          status: statusFilter
        }).toString();
        
        const data = await apiFetch(`/api/leads?${query}`);
        setLeads(data.leads);
        setLeadsTotal(data.total);
        setLeadsTotalPages(data.totalPages);
      } else if (activeTab === 'spks') {
        const data = await apiFetch('/api/spks');
        setSpks(data.spks);
      } else if (activeTab === 'history') {
        const data = await apiFetch('/api/history');
        setHistory(data.history);
      } else if (activeTab === 'users' && currentUser?.role === 'Admin') {
        const data = await apiFetch('/api/users');
        setAdminUsers(data.users);
      }
    } catch {
      // Handled in apiFetch toasts
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      addToast('Harap isi email dan password Anda.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      setToken(data.token);
      addToast(`Selamat datang kembali, ${data.user.name}!`, 'success');
    } catch {
      // Handled in apiFetch toasts
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setLeads([]);
    setSpks([]);
    setHistory([]);
    setAdminUsers([]);
    localStorage.removeItem('crm_token');
    addToast('Anda telah logout dengan aman.', 'info');
  };

  // Lead Actions
  const openNewLead = () => {
    setEditingLead(null);
    setLeadForm({
      companyName: '',
      contactName: '',
      phone: '',
      email: '',
      source: 'Website',
      estimatedValue: 0,
      status: 'New',
      salesId: '',
      notes: ''
    });
    setShowAddLeadModal(true);
  };

  const openEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      companyName: lead.companyName,
      contactName: lead.contactName,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      estimatedValue: lead.estimatedValue,
      status: lead.status,
      salesId: lead.salesId,
      notes: lead.notes || ''
    });
    setShowAddLeadModal(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.companyName || !leadForm.contactName || !leadForm.phone || !leadForm.email) {
      addToast('Harap lengkapi semua kolom bertanda bintang.', 'error');
      return;
    }

    try {
      if (editingLead) {
        await apiFetch(`/api/leads/${editingLead.id}`, {
          method: 'PUT',
          body: JSON.stringify(leadForm)
        });
        addToast('Data Lead berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/leads', {
          method: 'POST',
          body: JSON.stringify(leadForm)
        });
        addToast('Lead baru berhasil ditambahkan.', 'success');
      }
      setShowAddLeadModal(false);
      setLeadsPage(1);
      fetchCurrentTabData();
    } catch {
      // Error is caught and displayed by apiFetch
    }
  };

  const handleDeleteLead = (leadId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Lead',
      message: 'Apakah Anda yakin ingin menghapus data Lead ini? Informasi SPK terkait juga akan terhapus.',
      confirmText: 'Hapus Permanen',
      cancelText: 'Batalkan',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/leads/${leadId}`, { method: 'DELETE' });
          addToast('Lead berhasil dihapus.', 'success');
          fetchCurrentTabData();
        } catch {
          // Handled
        }
      }
    });
  };

  const openConvertLead = (lead: Lead) => {
    setConvertingLead(lead);
    setSpkForm({
      projectName: `Proyek Pengadaan ${lead.companyName}`,
      contractValue: lead.estimatedValue,
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    });
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    if (!spkForm.projectName || !spkForm.contractValue || !spkForm.startDate || !spkForm.endDate) {
      addToast('Semua kolom proyek wajib diisi untuk draf SPK.', 'error');
      return;
    }

    try {
      await apiFetch(`/api/leads/${convertingLead.id}/convert`, {
        method: 'POST',
        body: JSON.stringify(spkForm)
      });
      addToast('Lead berhasil dikonversi menjadi SPK! Akses tab SPK untuk meninjau.', 'success');
      setConvertingLead(null);
      fetchCurrentTabData();
    } catch {
      // Handled
    }
  };

  // SPK Actions
  const openEditSpk = (spk: SPK) => {
    setEditingSpk(spk);
    setSpkForm({
      projectName: spk.projectName,
      contractValue: spk.contractValue,
      startDate: spk.startDate.substring(0, 10),
      endDate: spk.endDate.substring(0, 10)
    });
  };

  const handleUpdateSpk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpk) return;

    try {
      await apiFetch(`/api/spks/${editingSpk.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          projectName: spkForm.projectName,
          contractValue: spkForm.contractValue,
          startDate: spkForm.startDate,
          endDate: spkForm.endDate
        })
      });
      addToast('Detail SPK berhasil diperbarui.', 'success');
      setEditingSpk(null);
      fetchCurrentTabData();
    } catch {
      // Handled
    }
  };

  const handleSendSpkToFinance = (spk: SPK) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Kirim SPK ke Finance',
      message: `Apakah Anda yakin ingin mengirimkan ${spk.projectName} (${spk.spkNumber}) ke Finance untuk verifikasi dan persetujuan?`,
      confirmText: 'Kirim Sekarang',
      cancelText: 'Batalkan',
      isDanger: false,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/spks/${spk.id}`, {
            method: 'PUT',
            body: JSON.stringify({ salesStatus: 'Sent' })
          });
          addToast('Dokumen SPK telah berhasil dikirimkan ke Departemen Finance.', 'success');
          fetchCurrentTabData();
        } catch {
          // Handled
        }
      }
    });
  };

  const openVerifySpk = (spk: SPK) => {
    setVerifyingSpk(spk);
    setVerificationNotes('');
  };

  const handleVerifySpkSubmit = async (status: 'Approved' | 'Rejected') => {
    if (!verifyingSpk) return;

    if (status === 'Rejected' && !verificationNotes.trim()) {
      addToast('Catatan verifikasi wajib diisi apabila menolak SPK.', 'error');
      return;
    }

    try {
      await apiFetch(`/api/spks/${verifyingSpk.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          financeStatus: status,
          notes: verificationNotes
        })
      });
      addToast(`Dokumen SPK telah ${status === 'Approved' ? 'disetujui' : 'ditolak'} dengan sukses.`, 'success');
      setVerifyingSpk(null);
      fetchCurrentTabData();
    } catch {
      // Handled
    }
  };

  // User Administration
  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({
      email: '',
      name: '',
      role: 'Sales',
      password: ''
    });
    setShowAddUserModal(true);
  };

  const openEditUser = (usr: User) => {
    setEditingUser(usr);
    setUserForm({
      email: usr.email,
      name: usr.name,
      role: usr.role,
      password: '' // Let blank for no change
    });
    setShowAddUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email || !userForm.name) {
      addToast('Nama lengkap dan alamat email wajib diisi.', 'error');
      return;
    }
    if (!editingUser && !userForm.password) {
      addToast('Password wajib diisi untuk user baru.', 'error');
      return;
    }

    try {
      if (editingUser) {
        await apiFetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: userForm.name,
            role: userForm.role,
            ...(userForm.password ? { password: userForm.password } : {})
          })
        });
        addToast('Informasi profil user berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(userForm)
        });
        addToast('Akun user baru berhasil dibuat.', 'success');
      }
      setShowAddUserModal(false);
      fetchCurrentTabData();
    } catch {
      // Handled
    }
  };

  const handleDeleteUser = (uId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Akun Staff',
      message: 'Apakah Anda yakin ingin menghapus akun user ini dari database? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus Permanen',
      cancelText: 'Batalkan',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/users/${uId}`, { method: 'DELETE' });
          addToast('Akun user berhasil dihapus dari sistem.', 'success');
          fetchCurrentTabData();
        } catch {
          // Handled
        }
      }
    });
  };

  // Utility to convert user role dropdown representation or stats helper
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 antialiased flex flex-col selection:bg-indigo-100">
      
      {/* Toast Alert View Layer with sleek shadow and glass blur */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              id={`toast-${t.id}`}
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-4 rounded-2xl shadow-[0_12px_32px_rgba(15,23,42,0.08)] border flex items-start gap-3 backdrop-blur-md transition-all ${
                t.type === 'success' 
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-emerald-900/5' 
                  : t.type === 'error'
                  ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-rose-900/5'
                  : 'bg-indigo-50/90 border-indigo-200 text-indigo-950 shadow-indigo-900/5'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {t.type === 'info' && <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />}
              <div className="text-sm font-semibold leading-relaxed">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!currentUser ? (
        /* Login screen with dynamic high-contrast radial space layout */
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-indigo-50/30 to-slate-100/50">
          <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-200/20 rounded-full blur-3xl -z-10 animate-pulse duration-[8000ms]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-100/10 rounded-full blur-3xl -z-10 animate-pulse duration-[6000ms]"></div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="w-full max-w-md bg-white border border-slate-200/80 shadow-[0_25px_60px_rgba(15,23,42,0.06)] rounded-[32px] p-8 md:p-10"
            id="login-card"
          >
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-tr from-slate-950 to-indigo-950 text-white rounded-2xl mb-4 shadow-xl shadow-slate-950/10">
                <Building2 className="w-7 h-7 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-extrabold font-display tracking-tight text-slate-900 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 bg-clip-text text-transparent">Sinergi CRM</h1>
              <p className="text-slate-400 mt-2 text-xs font-bold uppercase tracking-widest">
                Enterprise Workspace Portal
              </p>
              <p className="text-slate-500 mt-1.5 text-xs max-w-xs mx-auto leading-relaxed">
                Sistem pencatatan lead, integrasi konversi SPK terpadu, serta validasi instan tim keuangan.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" id="login-form">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-450 mb-2">Email Address</label>
                <input 
                  id="login-email"
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="nama@sinergiapps.com"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-950 transition-all text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-450 mb-2">Password</label>
                <input 
                  id="login-password"
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-950 transition-all text-sm font-semibold text-slate-800"
                />
              </div>

              <button
                id="btn-login"
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 bg-gradient-to-r from-slate-950 to-indigo-950 hover:from-slate-900 hover:to-indigo-900 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 uppercase tracking-widest cursor-pointer hover:shadow-lg"
              >
                {authLoading ? 'Mengotentikasi Sesi...' : 'Masuk Aplikasi CRM'}
              </button>
            </form>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/70"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-widest">
                <span className="bg-white px-4 text-slate-400 font-bold">Akses Instan Akun Staff</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs" id="role-helpers">
              <button 
                id="btn-preset-admin"
                onClick={() => { setAuthEmail('admin@crm.com'); setAuthPassword('admin123'); }}
                className="p-3 border border-indigo-100 rounded-2xl bg-white hover:border-indigo-400 hover:bg-slate-50 transition-all text-left cursor-pointer flex flex-col justify-between hover:shadow-sm"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-slate-900">Amanda</span>
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded">ADM</span>
                </div>
                <span className="text-slate-450 mt-1 font-medium text-[11px]">Administrator CRM</span>
              </button>
              <button 
                id="btn-preset-sales1"
                onClick={() => { setAuthEmail('sales1@crm.com'); setAuthPassword('sales123'); }}
                className="p-3 border border-emerald-100 rounded-2xl bg-white hover:border-emerald-400 hover:bg-slate-50 transition-all text-left cursor-pointer flex flex-col justify-between hover:shadow-sm"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-slate-900 font-sans">Sidiq</span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">SLS</span>
                </div>
                <span className="text-slate-450 mt-1 font-medium text-[11px]">Sales Pantai</span>
              </button>
              <button 
                id="btn-preset-sales2"
                onClick={() => { setAuthEmail('sales2@crm.com'); setAuthPassword('sales123'); }}
                className="p-3 border border-emerald-100 rounded-2xl bg-white hover:border-emerald-400 hover:bg-slate-50 transition-all text-left cursor-pointer flex flex-col justify-between hover:shadow-sm"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-slate-900">Budi</span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">SLS</span>
                </div>
                <span className="text-slate-450 mt-1 font-medium text-[11px]">Sales Kota</span>
              </button>
              <button 
                id="btn-preset-finance"
                onClick={() => { setAuthEmail('finance@crm.com'); setAuthPassword('finance123'); }}
                className="p-3 border border-amber-100 rounded-2xl bg-white hover:border-amber-400 hover:bg-slate-50 transition-all text-left cursor-pointer flex flex-col justify-between hover:shadow-sm"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-slate-900">Fiona</span>
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded">FIN</span>
                </div>
                <span className="text-slate-450 mt-1 font-medium text-[11px]">Finance Director</span>
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Authenticated Main App */
        <>
          {/* Top Navbar */}
          <nav className="bg-slate-950 text-white shadow-xl px-6 md:px-8 py-5 flex items-center justify-between border-b border-slate-800" id="main-nav">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-650 to-indigo-700 text-white rounded-xl shadow-inner">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black font-display tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">Sinergi CRM</span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono mt-1">Enterprise Hub</span>
              </div>
            </div>

            {/* Profile badge with custom rings */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 border-l border-slate-800 pl-4.5">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 text-center self-end border ${
                    currentUser.role === 'Admin'
                      ? 'bg-indigo-950 text-indigo-300 border-indigo-900'
                      : currentUser.role === 'Finance'
                      ? 'bg-amber-950 text-amber-300 border-amber-900'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-900'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 ring-2 ring-indigo-500/20 hover:ring-indigo-500/40 hover:bg-slate-850 transition flex items-center justify-center font-extrabold text-xs text-indigo-300 shadow-lg">
                  {getInitials(currentUser.name)}
                </div>
              </div>

              <button
                id="btn-logout"
                onClick={handleLogout}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:text-rose-400 hover:bg-slate-850 hover:border-slate-750 text-slate-400 rounded-xl transition cursor-pointer"
                title="Keluar Aplikasi"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>

          {/* Sub Navigation Bar Tab structured like floating Segmented Controls */}
          <div className="bg-white border-b border-sidebar/10 border-slate-100 sticky top-0 z-10 px-6 md:px-8 py-2 flex justify-between items-center" id="tab-nav">
            <div className="flex gap-1 overflow-x-auto -mb-px no-scrollbar">
              {(currentUser.role === 'Admin' || currentUser.role === 'Sales') && (
                <button
                  id="tab-leads"
                  onClick={() => { setActiveTab('leads'); setLeadsPage(1); }}
                  className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'leads'
                      ? 'bg-slate-950 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Daftar Leads
                </button>
              )}
              
              <button
                id="tab-spks"
                onClick={() => setActiveTab('spks')}
                className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'spks'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Surat Perintah Kerja (SPK)
              </button>

              <button
                id="tab-history"
                onClick={() => setActiveTab('history')}
                className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-slate-950 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Riwayat Status
              </button>

              {currentUser.role === 'Admin' && (
                <button
                  id="tab-users"
                  onClick={() => setActiveTab('users')}
                  className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-slate-950 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Mengelola User
                </button>
              )}
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-450 font-semibold bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span>Sesi Aktif: <strong className="text-slate-700 font-bold">{currentUser.name}</strong></span>
            </div>
          </div>

          {/* Main workspace arena */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
            
            {/* View - Leads Dashboard */}
            {activeTab === 'leads' && (currentUser.role === 'Admin' || currentUser.role === 'Sales') && (
              <div id="view-leads" className="space-y-6">
                
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="leads-stats-grid">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Leads Anda</span>
                      <span className="block text-3xl font-extrabold font-display text-slate-900 mt-1">{leadsTotal}</span>
                    </div>
                    <div className="p-3 bg-indigo-50/70 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform">
                      <Briefcase className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status: Won</span>
                      {/* Count Won in loaded leads */}
                      <span className="block text-3xl font-extrabold font-display text-emerald-600 mt-1">
                        {leads.filter(l => l.status === 'Won').length}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      <CheckCircle className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status: Negotiation</span>
                      <span className="block text-3xl font-extrabold font-display text-amber-600 mt-1">
                        {leads.filter(l => l.status === 'Negotiation').length}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      <TrendingUp className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status: Lost</span>
                      <span className="block text-3xl font-extrabold font-display text-rose-600 mt-1">
                        {leads.filter(l => l.status === 'Lost').length}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      <XCircle className="w-5.5 h-5.5" />
                    </div>
                  </div>
                </div>

                {/* Filter and controls bar with clean modern input boundaries */}
                <div className="bg-white/85 p-4 rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                    {/* Search Field */}
                    <div className="relative flex-1 sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input 
                        id="leads-search-input"
                        type="text"
                        placeholder="Cari nama perusahaan atau kontak person..."
                        value={leadsSearch}
                        onChange={(e) => { setLeadsSearch(e.target.value); setLeadsPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-800 transition bg-white/50"
                      />
                    </div>

                    {/* Status filter dropdown */}
                    <div className="relative flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                      <select
                        id="leads-status-filter"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setLeadsPage(1); }}
                        className="px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-800 bg-white font-bold text-slate-700 min-w-[150px] cursor-pointer"
                      >
                        <option value="All">Semua Status</option>
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>

                  {/* Add dialog button */}
                  <div className="w-full md:w-auto self-stretch md:self-auto shrink-0">
                    <button
                      id="btn-add-lead"
                      onClick={openNewLead}
                      className="w-full sm:w-auto px-6 py-2.5 bg-slate-950 hover:bg-slate-850 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      Tambah Lead Baru
                    </button>
                  </div>
                </div>

                {/* Table list */}
                {loading ? (
                  <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-400 font-medium">
                    <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Memproses data Leads...
                  </div>
                ) : leads.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center" id="leads-empty-state">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-850">Belum Ada Leads</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                      Belum ada Lead terdaftar yang sesuai filter. Mulailah dengan menambahkan draf calon pembeli baru.
                    </p>
                    <button 
                      onClick={openNewLead}
                      className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Buat Lead Pertama
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="leads-table-container">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500 font-bold">
                            <th className="py-4 px-6 font-semibold">Perusahaan / Kontak</th>
                            <th className="py-4 px-6 font-semibold hidden md:table-cell">Kontak Detail</th>
                            <th className="py-4 px-6 font-semibold">Sumber</th>
                            <th className="py-4 px-6 font-semibold text-right">Estimasi Nilai</th>
                            <th className="py-4 px-6 font-semibold text-center">Status</th>
                            {currentUser.role === 'Admin' && <th className="py-4 px-6 font-semibold">Penanggung Jawab</th>}
                            <th className="py-4 px-6 font-semibold text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {leads.map(lead => {
                            // Render nice badge status matching technical specifications
                            const badgeColors = {
                              'New': 'bg-blue-50 text-blue-700 border-blue-200',
                              'Contacted': 'bg-cyan-50 text-cyan-700 border-cyan-200',
                              'Qualified': 'bg-purple-50 text-purple-700 border-purple-200',
                              'Negotiation': 'bg-amber-50 text-amber-705 border-amber-200',
                              'Won': 'bg-emerald-55 bg-opacity-10 text-emerald-800 border-emerald-200',
                              'Lost': 'bg-rose-50 text-rose-700 border-rose-200'
                            }[lead.status] || 'bg-slate-50 text-slate-700';

                            return (
                              <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-4 px-6">
                                  <div className="font-bold text-slate-900 font-display">{lead.companyName}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{lead.contactName}</div>
                                </td>
                                <td className="py-4 px-6 hidden md:table-cell">
                                  <div className="text-xs font-mono">{lead.phone}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">{lead.email}</div>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                    {lead.source}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right font-semibold font-mono text-slate-950">
                                  Rp {lead.estimatedValue.toLocaleString('id-ID')}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColors}`}>
                                    {lead.status}
                                  </span>
                                </td>
                                {currentUser.role === 'Admin' && (
                                  <td className="py-4 px-6">
                                    <div className="text-xs font-semibold text-slate-700">{lead.salesName}</div>
                                  </td>
                                )}
                                <td className="py-4 px-6 text-right">
                                  <div className="inline-flex gap-1.5 justify-end">
                                    {/* Action - Detail */}
                                    <button
                                      onClick={() => setViewingLeadDetail(lead)}
                                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
                                      title="Rincian Detail"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {/* Action - Convert to SPK (only if status is 'Won') */}
                                    {lead.status === 'Won' && (
                                      <button
                                        onClick={() => openConvertLead(lead)}
                                        className="p-1.5 hover:bg-slate-900 rounded-lg text-emerald-600 hover:text-white transition flex items-center justify-center gap-1"
                                        title="Konversi ke SPK"
                                      >
                                        <ArrowRightLeft className="w-4 h-4" />
                                      </button>
                                    )}

                                    {/* Edit & Delete Action blocks */}
                                    <button
                                      onClick={() => openEditLead(lead)}
                                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition"
                                      title="Edit Lead"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteLead(lead.id)}
                                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600 transition border-0 cursor-pointer"
                                      title="Hapus Lead"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination bar */}
                    <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-150">
                      <span className="text-xs text-slate-550 font-medium">
                        Menampilkan <strong className="text-slate-800 font-semibold">{leads.length}</strong> dari <strong className="text-slate-800 font-semibold">{leadsTotal}</strong> Leads
                      </span>
                      
                      <div className="flex gap-1">
                        <button
                          id="btn-leads-prev-page"
                          onClick={() => setLeadsPage(p => Math.max(p - 1, 1))}
                          disabled={leadsPage === 1}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition rounded-lg disabled:opacity-50"
                        >
                          Sebelumnya
                        </button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 border border-transparent rounded-lg">
                          Halaman {leadsPage} dari {leadsTotalPages || 1}
                        </span>
                        <button
                          id="btn-leads-next-page"
                          onClick={() => setLeadsPage(p => Math.min(p + 1, leadsTotalPages))}
                          disabled={leadsPage === leadsTotalPages || leadsTotalPages === 0}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition rounded-lg disabled:opacity-50"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View - SPK Dashboard */}
            {activeTab === 'spks' && (
              <div id="view-spks" className="space-y-6">
                
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="spks-stats-grid">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total SPK Terbit</span>
                      <span className="block text-3xl font-extrabold font-display text-slate-900 mt-1">{spks.length}</span>
                    </div>
                    <div className="p-3 bg-indigo-50/70 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      <FileText className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Approved (Disetujui)</span>
                      <span className="block text-3xl font-extrabold font-display text-emerald-600 mt-1">
                        {spks.filter(s => s.financeStatus === 'Approved').length}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      <CheckCircle2 className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Pending Verifikasi</span>
                      <span className="block text-3xl font-extrabold font-display text-blue-600 mt-1">
                        {spks.filter(s => s.salesStatus === 'Sent' && s.financeStatus === 'Pending').length}
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      <Clock className="w-5.5 h-5.5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center justify-between group hover:border-slate-300 hover:shadow-md transition-all duration-300">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Rejected (Ditolak)</span>
                      <span className="block text-3xl font-extrabold font-display text-rose-600 mt-1">
                        {spks.filter(s => s.financeStatus === 'Rejected').length}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-105 transition-transform duration-300">
                      <BadgeAlert className="w-5.5 h-5.5" />
                    </div>
                  </div>
                </div>

                {currentUser.role === 'Finance' && (
                  <div className="bg-indigo-50/70 border border-indigo-100 text-indigo-950 px-6 py-4 rounded-2xl flex items-start gap-3 backdrop-blur-sm shadow-sm">
                    <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 animate-bounce-slow" />
                    <div>
                      <h4 className="text-sm font-extrabold text-indigo-950">Portal Verifikasi Finance Terbuka</h4>
                      <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                        Anda dapat melihat Surat Perintah Kerja (SPK) yang dikirimkan oleh tim Sales. Pilih ikon verifikasi untuk menyetujui dokumen, atau menolak dokumen dengan memberikan catatan formal yang wajib diisi.
                      </p>
                    </div>
                  </div>
                )}

                {/* Grid List SPKs */}
                {loading ? (
                  <div className="bg-white rounded-2xl p-12 border border-slate-200/70 text-center text-slate-400 font-medium">
                    <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Menarik data SPK dari database server...
                  </div>
                ) : spks.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200/70 shadow-sm text-center" id="spks-empty-state">
                    <div className="w-16 h-16 bg-slate-50 text-slate-350 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850">Belum Ada SPK Terbit</h3>
                    <p className="text-slate-405 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                      SPK otomatis terbit apabila Sales mengonversi Lead yang berstatus <strong className="text-emerald-700">"Won"</strong>.
                    </p>
                    {currentUser.role === 'Sales' && (
                      <button 
                        onClick={() => setActiveTab('leads')}
                        className="mt-5 px-5 py-2.5 bg-slate-950 hover:bg-slate-850 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md hover:shadow-lg transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Buka Leads &amp; Konversi
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="spks-grid">
                    {spks.map(spk => {
                      const salesBadgeColors = spk.salesStatus === 'Draft' 
                        ? 'bg-slate-100 text-slate-700' 
                        : 'bg-indigo-100 text-indigo-700';

                      const financeBadgeColors = {
                        'Pending': 'bg-blue-50 text-blue-700 border-blue-200',
                        'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-250',
                        'Rejected': 'bg-rose-50 text-rose-700 border-rose-250'
                      }[spk.financeStatus];

                      return (
                        <div key={spk.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                          <div>
                            {/* Head block inside SPK card */}
                            <div className="flex justify-between items-start mb-4">
                              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg">
                                {spk.spkNumber}
                              </span>
                              <div className="flex flex-col gap-1 items-end">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${salesBadgeColors}`}>
                                  Sales: {spk.salesStatus}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${financeBadgeColors}`}>
                                  Finance: {spk.financeStatus}
                                </span>
                              </div>
                            </div>

                            <h3 className="font-bold text-lg text-slate-900 leading-snug font-display inline-block hover:text-slate-700 transition" onClick={() => setViewingSpkDetail(spk)}>
                              {spk.projectName}
                            </h3>
                            <p className="text-xs text-slate-450 font-semibold mt-1">Lead: <span className="text-slate-800">{spk.leadCompany}</span></p>

                            <div className="my-4 border-t border-b border-dashed border-slate-150 py-3 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">Volume Nilai</span>
                                <strong className="font-mono text-slate-900">IDR {spk.contractValue.toLocaleString('id-ID')}</strong>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">Tanggal Mulai</span>
                                <strong className="font-medium text-slate-800">{new Date(spk.startDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400 font-semibold">Est. Selesai</span>
                                <strong className="font-medium text-slate-800">{new Date(spk.endDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                              </div>
                            </div>

                            {spk.financeNotes && (
                              <div className={`p-3 rounded-xl text-xs mb-4 ${spk.financeStatus === 'Rejected' ? 'bg-rose-50 text-rose-900' : 'bg-slate-50 text-slate-600'}`}>
                                <strong className="block mb-0.5">Catatan Verifikasi Finance:</strong>
                                <span className="italic">"{spk.financeNotes}"</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                            <button
                              onClick={() => setViewingSpkDetail(spk)}
                              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Detail SPK
                            </button>

                            <div className="flex gap-1.5">
                              {/* Edit Action if allowed */}
                              {currentUser.role === 'Sales' && spk.financeStatus !== 'Approved' && (
                                <button
                                  onClick={() => openEditSpk(spk)}
                                  className="px-2.5 py-1.5 border border-slate-200 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg text-xs font-semibold"
                                  title="Edit SPK"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Action - Sales: Kirim SPK ke Finance */}
                              {currentUser.role === 'Sales' && spk.salesStatus === 'Draft' && (
                                <button
                                  onClick={() => handleSendSpkToFinance(spk)}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  Kirim Finance
                                </button>
                              )}

                              {/* Action - Finance/Admin: Verifikasi SPK */}
                              {(currentUser.role === 'Finance' || currentUser.role === 'Admin') && spk.salesStatus === 'Sent' && (
                                <button
                                  onClick={() => openVerifySpk(spk)}
                                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-indigo-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shrink-0"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  Verifikasi
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View - Riwayat Timeline */}
            {activeTab === 'history' && (
              <div id="view-history" className="space-y-6">
                <div className="bg-white/85 border border-slate-200/70 p-5 rounded-2xl flex items-center justify-between shadow-sm backdrop-blur-md">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-950 text-white rounded-2xl shadow-md shadow-slate-950/5">
                      <History className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold font-display text-slate-900 leading-tight">Jurnal Riwayat Log Status</h2>
                      <p className="text-[11px] text-slate-450 mt-1 leading-relaxed max-w-xl">
                        Audit trail otomatis mencatatkan silsilah siklus hidup Leads hingga verifikasi dokumen kerja (SPK).
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={fetchCurrentTabData}
                    className="p-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition active:scale-95"
                    title="Segarkan Log"
                  >
                    <Clock className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                {loading ? (
                  <div className="bg-white rounded-2xl p-12 border border-slate-250 text-center text-slate-400 font-medium">
                    <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Mengunduh runtun riwayat...
                  </div>
                ) : history.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-md font-bold text-slate-850">Belum Ada Riwayat Status</h3>
                    <p className="text-slate-404 text-xs mt-1 leading-relaxed">
                      Setiap pembaruan status Leads atau persetujuan SPK akan terekam otomatis di timeline ini.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200/70 rounded-3xl shadow-sm p-6 md:p-8" id="history-timeline-box">
                    <div className="relative pl-6 border-l-2 border-slate-950/10 w-full space-y-8 py-2">
                      {history.map(log => {
                        const isSpk = log.entityType === 'spk';
                        const changeBadgeColors = isSpk ? 'bg-indigo-50 border border-indigo-150 text-indigo-700' : 'bg-blue-50 border border-blue-150 text-blue-700';

                        return (
                          <div key={log.id} className="relative group transition-all">
                            {/* Marker dot */}
                            <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-slate-950 ring-2 ring-slate-950/10 group-hover:bg-slate-800 transition-colors"></span>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${changeBadgeColors}`}>
                                    {log.entityType}
                                  </span>
                                  <strong className="text-slate-900 text-sm font-semibold">{log.userName}</strong>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                                    {log.userRole}
                                  </span>
                                </div>
                                
                                <p className="text-sm font-semibold text-slate-700 italic mt-1 leading-relaxed">
                                  "{log.notes}"
                                </p>

                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">UID Data: {log.entityId}</span>
                                  <span className="text-slate-300 text-xs shrink-0 font-medium">|</span>
                                  <span className="text-xs text-slate-600 font-semibold shrink-0">
                                    Transisi: <span className="text-slate-400 font-normal">{log.previousStatus}</span> &rarr; <span className="text-slate-900 font-extrabold px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">{log.newStatus}</span>
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-xs text-slate-450 font-semibold shrink-0 font-mono text-left sm:text-right">
                                {new Date(log.timestamp).toLocaleDateString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric' })} 
                                <span className="ml-1 text-slate-350 font-mono">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View - Admin User Management */}
            {activeTab === 'users' && currentUser.role === 'Admin' && (
              <div id="view-users" className="space-y-6">
                <div className="bg-white/85 p-5 border border-slate-200/70 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md animate-fade-in">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-slate-950 text-white rounded-2xl shadow-lg shadow-slate-950/10">
                      <Users className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold font-display text-slate-900 leading-tight">Pengendali Database User</h2>
                      <p className="text-xs text-slate-450 mt-1 max-w-xl leading-relaxed">
                        Registrasikan, edit, atau hapus kredensial staff Sales dan Finance yang beroperasi pada sistem secara real-time.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    id="btn-add-user"
                    onClick={openNewUser}
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-950 hover:bg-slate-850 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    Tambah Akun Staff
                  </button>
                </div>

                {loading ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-450 font-medium">
                    <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Memanggil metadata user...
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden" id="users-table-box">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold">
                            <th className="py-4.5 px-6 font-extrabold text-[11px] uppercase tracking-wider">Nama Staff</th>
                            <th className="py-4.5 px-6 font-extrabold text-[11px] uppercase tracking-wider">Alamat Email</th>
                            <th className="py-4.5 px-6 font-extrabold text-[11px] uppercase tracking-wider text-center">Hak Akses Role</th>
                            <th className="py-4.5 px-6 font-extrabold text-[11px] uppercase tracking-wider text-right">Aksi Manajemen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adminUsers.map(usr => (
                            <tr key={usr.id} className="hover:bg-slate-50/30 transition">
                              <td className="py-4 px-6 font-extrabold text-slate-900 font-display">
                                {usr.name}
                              </td>
                              <td className="py-4 px-6 font-mono font-medium text-xs text-slate-600">
                                {usr.email}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  usr.role === 'Admin' 
                                    ? 'bg-purple-50 border-purple-200 text-purple-750' 
                                    : usr.role === 'Finance'
                                    ? 'bg-amber-50 border-amber-250 text-amber-750'
                                    : 'bg-emerald-50 border-emerald-250 text-emerald-750'
                                }`}>
                                  {usr.role}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <div className="inline-flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => openEditUser(usr)}
                                    className="p-1.5 text-slate-450 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition"
                                    title="Edit Profil"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(usr.id)}
                                    disabled={usr.id === currentUser.id}
                                    className="p-1.5 text-slate-450 hover:bg-slate-100 hover:text-rose-600 rounded-lg transition disabled:opacity-30 cursor-pointer"
                                    title="Hapus Staff"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Core Footer */}
          <footer className="mt-auto bg-slate-900 text-slate-500 py-6 border-t border-slate-800 text-center text-xs" id="footer-branding">
            <div className="max-w-7xl w-full mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span>&copy; {new Date().getFullYear()} Sinergi CRM - Sistem Pencatatan Leads &amp; SPK Terpadu</span>
              <span className="font-mono text-[10px] uppercase text-slate-600 tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                Authorized Session: Secured Backend Validation
              </span>
            </div>
          </footer>
        </>
      )}

      {/* MODAL WINDOWS - LAYER INJECTIONS */}

      {/* Dialog: Create/Edit Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-lead-form">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold font-display text-slate-900">
                  {editingLead ? 'Edit Data Lead' : 'Tambah Lead Baru'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Isi formulir data di bawah untuk dicatatkan ke dalam database CRM.</p>
              </div>
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-5" id="lead-form-fields">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Perusahaan *</label>
                  <input
                    id="field-lead-company"
                    type="text"
                    required
                    value={leadForm.companyName}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="PT Telekomunikasi Indonesia"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Kontak Person *</label>
                  <input
                    id="field-lead-contact"
                    type="text"
                    required
                    value={leadForm.contactName}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Budi Setiawan"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nomor Telepon Kontak *</label>
                  <input
                    id="field-lead-phone"
                    type="text"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="0812XXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Email Kontak Pribadi *</label>
                  <input
                    id="field-lead-email"
                    type="email"
                    required
                    value={leadForm.email}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="budi@telkom.co.id"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sumber Acuan Lead *</label>
                  <select
                    id="field-lead-source"
                    value={leadForm.source}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition text-sm font-semibold text-slate-700"
                  >
                    <option value="Website">Website</option>
                    <option value="Iklan Sosial Media">Iklan Sosial Media</option>
                    <option value="Event Pameran">Event Pameran</option>
                    <option value="Rekomendasi">Rekomendasi</option>
                    <option value="Darat / Outbound">Darat / Outbound</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Estimasi Nilai Kontrak (Rp) *</label>
                  <input
                    id="field-lead-value"
                    type="number"
                    min="1"
                    required
                    value={leadForm.estimatedValue}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, estimatedValue: Number(e.target.value) }))}
                    placeholder="Estimasi draf Rp"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Status Penjualan Lead *</label>
                  <select
                    id="field-lead-status"
                    value={leadForm.status}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, status: e.target.value as Lead['status'] }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition text-sm font-semibold text-slate-700"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                {currentUser.role === 'Admin' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Re-assign Sales Penanggung Jawab</label>
                    <input
                      id="field-lead-sales"
                      type="text"
                      value={leadForm.salesId}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, salesId: e.target.value }))}
                      placeholder="Masukkan ID user Sales (e.g. u-2)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Catatan Tambahan (Buku Harian Log) *</label>
                <textarea
                  id="field-lead-notes"
                  rows={3}
                  required={editingLead?.status !== leadForm.status} // require notes if status changes
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Sejarah atau pembaruan penting mengenai interaksi draf Lead ini..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-sm font-semibold transition"
                >
                  Batalkan
                </button>
                <button
                  id="btn-lead-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-bold transition shadow-md"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dialog: Lead Detail Modal */}
      {viewingLeadDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-lead-detail">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase py-0.5 px-2.5 bg-slate-100 rounded text-slate-500">RINCIAN DETAIL LEAD</span>
                <h3 className="text-2xl font-bold font-display text-slate-900 mt-2">{viewingLeadDetail.companyName}</h3>
              </div>
              <button 
                onClick={() => setViewingLeadDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-850 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Nama Kontak</span>
                  <strong className="text-slate-800 font-medium">{viewingLeadDetail.contactName}</strong>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Sumber Acuan</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 rounded text-slate-600 mt-0.5 inline-block">{viewingLeadDetail.source}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Nomor Handphone</span>
                  <span className="text-slate-800 font-mono font-semibold">{viewingLeadDetail.phone}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Alamat Email</span>
                  <span className="text-slate-800 font-sans mt-0.5 inline-block font-medium">{viewingLeadDetail.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Status Saat Ini</span>
                  <span className="inline-block text-xs font-bold rounded-full border bg-slate-50 px-2.5 py-0.5 mt-0.5 text-slate-700">
                    {viewingLeadDetail.status}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Estimasi Nilai Usaha</span>
                  <strong className="text-slate-900 font-mono">Rp {viewingLeadDetail.estimatedValue.toLocaleString('id-ID')}</strong>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-3">
                <span className="block text-xs font-semibold text-slate-400">Sales Penanggung Jawab</span>
                <span className="text-slate-800 font-medium">{viewingLeadDetail.salesName} (ID: {viewingLeadDetail.salesId})</span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400">Keterangan / Deskripsi</span>
                <p className="text-slate-600 italic bg-slate-50 p-3 rounded-xl mt-1 text-xs leading-relaxed">
                  "{viewingLeadDetail.notes || 'Tidak ada catatan tambahan.'}"
                </p>
              </div>

              <div className="pt-4 flex justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingLeadDetail(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-semibold transition"
                >
                  Tutup Jendela
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dialog: Convert Lead to SPK Modal */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-convert-spk">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-6 h-6 text-emerald-580" />
                  Konversi Lead jadi SPK
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Menerbitkan Surat Perintah Kerja (SPK) resmi dari Lead terpilih <strong className="text-slate-800 font-semibold">{convertingLead.companyName}</strong>.
                </p>
              </div>
              <button 
                onClick={() => setConvertingLead(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-4" id="convert-spk-form">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Proyek Pekerjaan *</label>
                <input
                  id="field-convert-project"
                  type="text"
                  required
                  value={spkForm.projectName}
                  onChange={(e) => setSpkForm(prev => ({ ...prev, projectName: e.target.value }))}
                  placeholder="e.g. Implementasi Kustom Aplikasi Web"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nilai Kontrakan Pekerjaan (Rp) *</label>
                <input
                  id="field-convert-value"
                  type="number"
                  required
                  value={spkForm.contractValue}
                  onChange={(e) => setSpkForm(prev => ({ ...prev, contractValue: Number(e.target.value) }))}
                  placeholder="Nilai Kontrak Rp"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tanggal Mulai *</label>
                  <input
                    id="field-convert-start"
                    type="date"
                    required
                    value={spkForm.startDate}
                    onChange={(e) => setSpkForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Estimasi Selesai *</label>
                  <input
                    id="field-convert-end"
                    type="date"
                    required
                    value={spkForm.endDate}
                    onChange={(e) => setSpkForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Sesuai aturan operasional, nomor SPK unik akan dicatatkan otomatis oleh sistem backend. Draf SPK awal berstatus <strong>"Draft"</strong>, dan wajib Anda kirimkan ke Finance agar diverifikasi.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold whitespace-nowrap"
                >
                  Kembali
                </button>
                <button
                  id="btn-convert-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-bold shadow-md inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Terbitkan SPK
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dialog: Edit SPK Modal */}
      {editingSpk && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-edit-spk">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold font-display text-slate-900">Edit Berkas SPK</h3>
                <p className="text-xs text-slate-400 mt-1">Sesuaikan kembali informasi proyek pekerjaan untuk {editingSpk.spkNumber}.</p>
              </div>
              <button 
                onClick={() => setEditingSpk(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSpk} className="space-y-4" id="edit-spk-form">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Proyek Pekerjaan *</label>
                <input
                  id="field-edit-spk-project"
                  type="text"
                  required
                  value={spkForm.projectName}
                  onChange={(e) => setSpkForm(prev => ({ ...prev, projectName: e.target.value }))}
                  placeholder="e.g. Implementasi Kustom Jaringan Kantor"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nilai Kontrakan Pekerjaan (Rp) *</label>
                <input
                  id="field-edit-spk-value"
                  type="number"
                  required
                  value={spkForm.contractValue}
                  onChange={(e) => setSpkForm(prev => ({ ...prev, contractValue: Number(e.target.value) }))}
                  placeholder="Nilai Kontrak Rp"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tanggal Mulai *</label>
                  <input
                    id="field-edit-spk-start"
                    type="date"
                    required
                    value={spkForm.startDate}
                    onChange={(e) => setSpkForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Estimasi Selesai *</label>
                  <input
                    id="field-edit-spk-end"
                    type="date"
                    required
                    value={spkForm.endDate}
                    onChange={(e) => setSpkForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSpk(null)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold"
                >
                  Batalkan
                </button>
                <button
                  id="btn-edit-spk-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dialog: SPK Detail Modal Sheet */}
      {viewingSpkDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-spk-detail">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider py-0.5 px-2.5 bg-indigo-50 text-indigo-700 rounded-md">RINCIAN SPK FORMAL</span>
                <h3 className="text-xl font-bold font-display text-slate-900 mt-2">{viewingSpkDetail.projectName}</h3>
              </div>
              <button 
                onClick={() => setViewingSpkDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-850 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Nomor Registrasi SPK</span>
                  <span className="text-slate-800 font-mono font-bold mt-1 inline-block">{viewingSpkDetail.spkNumber}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Tautan Perusahaan</span>
                  <strong className="text-slate-850 block mt-1">{viewingSpkDetail.leadCompany}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3 font-medium">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Tanggal Mulai Kerja</span>
                  <span>{new Date(viewingSpkDetail.startDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Estimasi Tenggat Selesai</span>
                  <span>{new Date(viewingSpkDetail.endDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Nilai Kontrak Project</span>
                  <strong className="text-slate-950 font-mono text-sm block mt-0.5">Rp {viewingSpkDetail.contractValue.toLocaleString('id-ID')}</strong>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Waktu Terbit SPK</span>
                  <span className="text-slate-700 text-xs shrink-0">{new Date(viewingSpkDetail.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Status Koordinasi Sales</span>
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 bg-slate-100 border border-transparent rounded text-slate-700 mt-1">
                    {viewingSpkDetail.salesStatus}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Status Kelayakan Finance</span>
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 border rounded mt-1 bg-blue-50 text-blue-700">
                    {viewingSpkDetail.financeStatus}
                  </span>
                </div>
              </div>

              {viewingSpkDetail.financeVerifiedBy && (
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3 text-xs text-slate-500 font-semibold uppercase">
                  <div>
                    <span className="block text-[10px] text-slate-400">Diverifikasi Oleh</span>
                    <span>{viewingSpkDetail.financeVerifiedBy}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Waktu Verifikasi</span>
                    <span>{new Date(viewingSpkDetail.financeVerifiedAt || '').toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              )}

              {viewingSpkDetail.financeNotes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-xs font-bold text-slate-650">Buku Catatan Auditor Finance:</span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed italic">
                    "{viewingSpkDetail.financeNotes}"
                  </p>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingSpkDetail(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dialog: Verify SPK (Finance Action Dialog) */}
      {verifyingSpk && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-finance-verify">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-3xl p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold font-display text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  Verifikasi Berkas Kerja SPK
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Harap periksa dokumen bernomor <strong>{verifyingSpk.spkNumber}</strong> untuk proyek {verifyingSpk.projectName}.
                </p>
              </div>
              <button 
                onClick={() => setVerifyingSpk(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-sans text-sm">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Tautan Klien</span>
                  <strong className="text-slate-800">{verifyingSpk.leadCompany}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Volume Nilai Kontrak</span>
                  <strong className="text-slate-900 font-mono">Rp {verifyingSpk.contractValue.toLocaleString('id-ID')}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Catatan Verifikasi Auditor (Finance) *</label>
                <textarea
                  id="field-verify-notes"
                  rows={3}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Mandat atau detail pemeriksaan berkas. WAJIB diisi bila Anda menolak SPK ini!"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyingSpk(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold mr-auto whitespace-nowrap"
                >
                  Kembalikan
                </button>
                <button
                  id="btn-verify-reject"
                  type="button"
                  onClick={() => handleVerifySpkSubmit('Rejected')}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Tolak SPK (Review)
                </button>
                <button
                  id="btn-verify-approve"
                  type="button"
                  onClick={() => handleVerifySpkSubmit('Approved')}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Setujui SPK (Lunas)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dialog: Create/Edit User Modal (Admin only) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-user-form">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold font-display text-slate-900">
                  {editingUser ? 'Edit Profil User' : 'Daftarkan Staff Baru'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Registrasi akses log Sinergi CRM terenkripsi.</p>
              </div>
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4" id="user-form-fields">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Lengkap Staff *</label>
                <input
                  id="field-user-name"
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sidiq Nurrahman"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Alamat Email Kredensial *</label>
                <input
                  id="field-user-email"
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="username@crm.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm disabled:bg-slate-100 disabled:opacity-70"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Hak Akses Jabatan (Role) *</label>
                <select
                  id="field-user-role"
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition text-sm font-semibold text-slate-700"
                >
                  <option value="Sales">Sales</option>
                  <option value="Finance">Finance</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {editingUser ? 'Ubah Password (Kosongkan bila tidak ingin diganti)' : 'Kunci Password Akun *'}
                </label>
                <input
                  id="field-user-password"
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="password123"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-mono font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold"
                >
                  Batalkan
                </button>
                <button
                  id="btn-user-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingUser ? 'Perbarui Akses' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dialog: Global Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" id="modal-confirm-dialog">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${confirmDialog.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50/70 text-indigo-600'} shrink-0`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition active:scale-95"
              >
                {confirmDialog.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                  confirmDialog.onConfirm();
                }}
                className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition active:scale-95 ${
                  confirmDialog.isDanger 
                    ? 'bg-rose-600 hover:bg-rose-750 shadow-rose-900/10' 
                    : 'bg-slate-950 hover:bg-slate-850 shadow-slate-950/10'
                }`}
              >
                {confirmDialog.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
