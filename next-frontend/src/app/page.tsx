'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  History, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  LogOut, 
  Briefcase, 
  AlertCircle,
  HelpCircle,
  Eye,
  Send,
  Lock,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types & Views
import { User, Lead, SPK, HistoryLog, Toast } from './types';
import { ToastContainer } from './components/ToastContainer';
import { LeadsView } from './components/LeadsView';
import { SpksView } from './components/SpksView';
import { HistoryView } from './components/HistoryView';
import { UsersView } from './components/UsersView';

const NEST_API_BASE_URL = 'http://localhost:3333';

export default function NextFrontendCrmPage() {
  // Auth state
  const [token, setToken] = useState<string | null>(typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Connection settings to live NestJS & PostgreSQL Backend
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [usingLiveBackend, setUsingLiveBackend] = useState<boolean>(false);

  // Layout tabs
  const [activeTab, setActiveTab] = useState<'leads' | 'spks' | 'history' | 'users'>('leads');

  // Core Data sets (Client Side local persistent cache fallback)
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

  // Raw Fetch caller for Live Backend directly
  const rawApiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const localToken = localStorage.getItem('crm_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(localToken ? { 'Authorization': `Bearer ${localToken}` } : {}),
      ...options.headers,
    };

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${NEST_API_BASE_URL}${path}`, {
      ...options,
      headers
    });
    
    if (response.status === 401 || response.status === 403) {
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }
      if (endpoint.includes('/auth/login')) {
        throw new Error(data.message || 'Invalid email or password');
      }
      // Let caller decide how to handle unauthorized responses (don't auto-logout here)
      throw new Error(data.message || 'Unauthorized');
    }
    
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      throw new Error(data.message || 'Error koneksi ke NestJS backend.');
    }
    return data;
  };

  // Mock Offline mode fetch
  const mockApiFetch = async (endpoint: string, options: RequestInit = {}) => {
    // Simulated mock delay for professional look
    await new Promise(resolve => setTimeout(resolve, 300));
    const normalized = endpoint.replace(/^\/api/, '');
    
    // Read from localStorage caches
    const cachedLeads = localStorage.getItem('mock_leads');
    const cachedSpks = localStorage.getItem('mock_spks');
    const cachedUsers = localStorage.getItem('mock_users');
    const cachedHistory = localStorage.getItem('mock_history');

    let leadsList: Lead[] = cachedLeads ? JSON.parse(cachedLeads) : getMockLeadsInitial();
    let spksList: SPK[] = cachedSpks ? JSON.parse(cachedSpks) : getMockSpksInitial();
    let usersList: User[] = cachedUsers ? JSON.parse(cachedUsers) : getMockUsersInitial();
    let logsList: HistoryLog[] = cachedHistory ? JSON.parse(cachedHistory) : getMockLogsInitial();

    if (normalized.includes('/auth/login')) {
      const { email, password } = JSON.parse(options.body as string);
      const user = usersList.find(u => u.email === email);
      if (user) {
        return {
          token: 'mock-user-token-' + user.id,
          user: { id: user.id, email: user.email, name: user.name, role: user.role }
        };
      }
      throw new Error('Email atau password tidak terdaftar.');
    }

    if (normalized.includes('/auth/me')) {
      const adminUser = usersList[0];
      return { user: adminUser };
    }

    if (normalized.startsWith('/leads')) {
      if (options.method === 'POST') {
        const bodyObj = JSON.parse(options.body as string);
        const newL: Lead = {
          id: 'lead-' + Date.now(),
          ...bodyObj,
          salesName: currentUser?.name || 'Administrator',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        leadsList.push(newL);
        // Add log
        logsList.push({
          id: 'log-' + Date.now(),
          entityType: 'lead',
          entityId: newL.id,
          previousStatus: '-',
          newStatus: newL.status,
          userId: currentUser?.id || 'admin',
          userName: currentUser?.name || 'Admin',
          userRole: currentUser?.role || 'Admin',
          notes: `Membuat lead baru untuk ${newL.companyName}`,
          timestamp: new Date().toISOString()
        });
        saveMockCache(leadsList, spksList, usersList, logsList);
        return newL;
      }

      if (options.method === 'PUT') {
        const id = normalized.split('/').pop();
        const bodyObj = JSON.parse(options.body as string);
        const lIdx = leadsList.findIndex(l => l.id === id);
        if (lIdx !== -1) {
          const oldStatus = leadsList[lIdx].status;
          leadsList[lIdx] = { ...leadsList[lIdx], ...bodyObj, updatedAt: new Date().toISOString() };
          if (oldStatus !== bodyObj.status) {
            logsList.push({
              id: 'log-' + Date.now(),
              entityType: 'lead',
              entityId: id!,
              previousStatus: oldStatus,
              newStatus: bodyObj.status,
              userId: currentUser?.id || 'admin',
              userName: currentUser?.name || 'Admin',
              userRole: currentUser?.role || 'Admin',
              notes: bodyObj.notes || `Mengubah status lead menjadi ${bodyObj.status}`,
              timestamp: new Date().toISOString()
            });
          }
          saveMockCache(leadsList, spksList, usersList, logsList);
          return leadsList[lIdx];
        }
      }

      if (options.method === 'DELETE') {
        const id = normalized.split('/').pop();
        leadsList = leadsList.filter(l => l.id !== id);
        spksList = spksList.filter(s => s.leadId !== id);
        saveMockCache(leadsList, spksList, usersList, logsList);
        return { success: true };
      }

      // Filter array
      let filtered = [...leadsList];
      if (leadsSearch) {
        const t = leadsSearch.toLowerCase();
        filtered = filtered.filter(l => l.companyName.toLowerCase().includes(t) || l.contactName.toLowerCase().includes(t));
      }
      if (statusFilter && statusFilter !== 'All') {
        filtered = filtered.filter(l => l.status === statusFilter);
      }
      if (currentUser?.role === 'Sales') {
        filtered = filtered.filter(l => l.salesId === currentUser.id);
      }

      filtered.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const start = (leadsPage - 1) * leadsLimit;
      return {
        leads: filtered.slice(start, start + leadsLimit),
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / leadsLimit)
      };
    }

    if (normalized.startsWith('/spks')) {
      if (options.method === 'POST') {
        // Convert Lead
        const match = normalized.match(/\/leads\/(.+)\/convert/);
        let targetLeadId = '';
        let spkDetails = JSON.parse(options.body as string);
        if (match) {
          targetLeadId = match[1];
        } else {
          targetLeadId = spkDetails.leadId;
        }

        const leadObj = leadsList.find(l => l.id === targetLeadId);
        if (leadObj) {
          leadObj.status = 'Negotiation';
          const newSpk: SPK = {
            id: 'spk-' + Date.now(),
            spkNumber: 'SPK-' + new Date().toISOString().substring(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000),
            leadId: targetLeadId,
            leadCompany: leadObj.companyName,
            projectName: spkDetails.projectName || spkDetails.title,
            contractValue: Number(spkDetails.contractValue || spkDetails.value),
            startDate: spkDetails.startDate || new Date().toISOString().substring(0,10),
            endDate: spkDetails.endDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().substring(0,10),
            salesStatus: 'Sent',
            financeStatus: 'Pending',
            financeNotes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          spksList.push(newSpk);
          logsList.push({
            id: 'log-' + Date.now(),
            entityType: 'spk',
            entityId: newSpk.id,
            previousStatus: '-',
            newStatus: 'Pending',
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Admin',
            userRole: currentUser?.role || 'Admin',
            notes: `Menerbitkan SPK ${newSpk.spkNumber} untuk ${newSpk.leadCompany}`,
            timestamp: new Date().toISOString()
          });
          saveMockCache(leadsList, spksList, usersList, logsList);
          return newSpk;
        }
      }

      if (options.method === 'PUT') {
        const id = normalized.split('/').pop()?.replace('/verify', '')?.replace('/review', '');
        const bodyObj = JSON.parse(options.body as string);
        const sIdx = spksList.findIndex(s => s.id === id);
        if (sIdx !== -1) {
          const oldSpk = spksList[sIdx];
          spksList[sIdx] = { ...oldSpk, ...bodyObj, updatedAt: new Date().toISOString() };
          
          if (bodyObj.salesStatus === 'Sent' && oldSpk.salesStatus !== 'Sent') {
            logsList.push({
              id: 'log-' + Date.now(),
              entityType: 'spk',
              entityId: id!,
              previousStatus: oldSpk.financeStatus,
              newStatus: 'Pending',
              userId: currentUser?.id || 'admin',
              userName: currentUser?.name || 'Admin',
              userRole: currentUser?.role || 'Admin',
              notes: 'Mengirimkan dokumen SPK ke Finance',
              timestamp: new Date().toISOString()
            });
          }
          saveMockCache(leadsList, spksList, usersList, logsList);
          return spksList[sIdx];
        }
      }

      // Verify/review SPK
      if (normalized.includes('/verify') || normalized.includes('/review')) {
        const id = normalized.split('/').pop()?.replace('/verify', '')?.replace('/review', '');
        const { financeStatus, status, notes, financeNotes } = JSON.parse(options.body as string);
        const sIdx = spksList.findIndex(s => s.id === id);
        if (sIdx !== -1) {
          const fStatus = financeStatus || (status === 'APPROVED' ? 'Approved' : 'Rejected');
          const oldSpk = spksList[sIdx];
          spksList[sIdx] = { 
            ...oldSpk, 
            financeStatus: fStatus, 
            financeNotes: notes || financeNotes || '',
            financeVerifiedBy: currentUser?.name || 'Finance Auditor',
            financeVerifiedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const statusUpper = fStatus.toUpperCase();
          const targetLead = leadsList.find(l => l.id === oldSpk.leadId);
          if (targetLead) {
            targetLead.status = statusUpper === 'APPROVED' ? 'Won' : 'Lost';
          }

          logsList.push({
            id: 'log-' + Date.now(),
            entityType: 'spk',
            entityId: id!,
            previousStatus: oldSpk.financeStatus,
            newStatus: fStatus,
            userId: currentUser?.id || 'admin',
            userName: currentUser?.name || 'Admin',
            userRole: currentUser?.role || 'Admin',
            notes: notes || financeNotes || `Verifikasi berkas SPK: ${fStatus}`,
            timestamp: new Date().toISOString()
          });

          saveMockCache(leadsList, spksList, usersList, logsList);
          return spksList[sIdx];
        }
      }

      let filteredSpks = [...spksList];
      if (currentUser?.role === 'Sales') {
        const myLeads = leadsList.filter(l => l.salesId === currentUser.id).map(l => l.id);
        filteredSpks = filteredSpks.filter(s => myLeads.includes(s.leadId));
      } else if (currentUser?.role === 'Finance') {
        filteredSpks = filteredSpks.filter(s => s.salesStatus === 'Sent');
      }
      return { spks: filteredSpks };
    }

    if (normalized.startsWith('/history')) {
      return { history: logsList };
    }

    if (normalized.startsWith('/users')) {
      if (options.method === 'POST') {
        const bodyObj = JSON.parse(options.body as string);
        const newU: User = { id: 'u-' + Date.now(), ...bodyObj };
        usersList.push(newU);
        saveMockCache(leadsList, spksList, usersList, logsList);
        return newU;
      }
      if (options.method === 'PUT') {
        const id = normalized.split('/').pop();
        const bodyObj = JSON.parse(options.body as string);
        const uIdx = usersList.findIndex(u => u.id === id);
        if (uIdx !== -1) {
          usersList[uIdx] = { ...usersList[uIdx], ...bodyObj };
          saveMockCache(leadsList, spksList, usersList, logsList);
          return usersList[uIdx];
        }
      }
      if (options.method === 'DELETE') {
        const id = normalized.split('/').pop();
        usersList = usersList.filter(u => u.id !== id);
        saveMockCache(leadsList, spksList, usersList, logsList);
        return { success: true };
      }
      return { users: usersList };
    }

    return {};
  };

  const saveMockCache = (l: Lead[], s: SPK[], u: User[], h: HistoryLog[]) => {
    localStorage.setItem('mock_leads', JSON.stringify(l));
    localStorage.setItem('mock_spks', JSON.stringify(s));
    localStorage.setItem('mock_users', JSON.stringify(u));
    localStorage.setItem('mock_history', JSON.stringify(h));
  };

  // Perform fetching depending on toggle selection
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    if (usingLiveBackend) {
      return rawApiFetch(endpoint.replace(/^\/api/, ''), options);
    } else {
      return mockApiFetch(endpoint, options);
    }
  };

  // Auto-ping the NestJS backend from client to see if it is started and responsive
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${NEST_API_BASE_URL}/health`);
        if (res.ok) {
          setBackendConnected(true);
          // Only auto switch to live connection if we are not currently logged in with a local mock session
          const localToken = localStorage.getItem('crm_token');
          if (!localToken || !localToken.startsWith('mock-')) {
            setUsingLiveBackend(true);
          }
        } else {
          setBackendConnected(false);
        }
      } catch {
        setBackendConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 8000);
    return () => clearInterval(interval);
  }, []);

  // Initialize and check current logon user
  useEffect(() => {
    if (token) {
      localStorage.setItem('crm_token', token);

      // Try to set current user from token payload immediately (optimistic), then verify with backend in background
      try {
        const payload = token.split('.')[1];
        if (payload) {
          const decoded: any = JSON.parse(atob(payload));
          const mappedRole: 'Admin' | 'Sales' | 'Finance' = (decoded.role === 'ADMIN' || decoded.role === 'Admin') ? 'Admin' : (decoded.role === 'FINANCE' || decoded.role === 'Finance') ? 'Finance' : 'Sales';
          setCurrentUser({ id: decoded.id, name: decoded.name, email: decoded.email, role: mappedRole });
        }
      } catch {
        // ignore decode errors
      }

      // Verify session with backend but don't forcibly logout on temporary failures
      apiFetch('/api/auth/me')
        .then(res => {
          let u = res.user;
          let mappedRole: 'Admin' | 'Sales' | 'Finance' = 'Sales';
          if (u.role === 'ADMIN' || u.role === 'Admin') mappedRole = 'Admin';
          else if (u.role === 'FINANCE' || u.role === 'Finance') mappedRole = 'Finance';

          const sessionUser = {
            id: u.id,
            name: u.name,
            email: u.email,
            role: mappedRole
          };

          setCurrentUser(sessionUser);
          if (mappedRole === 'Finance') setActiveTab('spks'); else setActiveTab('leads');
        })
        .catch((err: any) => {
          addToast('Verifikasi sesi live gagal — Anda tetap masuk secara lokal.', 'info');
          // do not auto logout; allow user to continue with local session or re-login
        });
    } else {
      localStorage.removeItem('crm_token');
      setCurrentUser(null);
    }
  }, [token, usingLiveBackend]);

  // Handle data fetching when tab/filters change
  useEffect(() => {
    if (!currentUser) return;

    fetchCurrentTabData();
  }, [currentUser, activeTab, leadsPage, leadsSearch, statusFilter, usingLiveBackend]);

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
        // Support array conversion
        const leadsArray = Array.isArray(data) ? data : (data.leads || []);
        const totalCount = Array.isArray(data) ? data.length : (data.total || data.length);
        const pagesCount = Array.isArray(data) ? 1 : (data.totalPages || 1);

        const mappedLeads = leadsArray.map(mapLiveLeadToMock);
        setLeads(mappedLeads);
        setLeadsTotal(totalCount);
        setLeadsTotalPages(pagesCount);
      } else if (activeTab === 'spks') {
        const data = await apiFetch('/api/spks');
        const spksArray = Array.isArray(data) ? data : (data.spks || []);
        const mappedSpks = spksArray.map(mapLiveSpkToMock);
        setSpks(mappedSpks);
      } else if (activeTab === 'history') {
        if (usingLiveBackend) {
          try {
            // NestJS retrieves logs via GET /logs
            const rawData = await rawApiFetch('/logs');
            const logsArray = Array.isArray(rawData) ? rawData : [];
            const mappedLogs = logsArray.map((l: any, idx: number) => ({
              id: l.id || `log-${idx}`,
              entityType: l.action?.toLowerCase().includes('spk') ? 'spk' : 'lead',
              entityId: l.entityId ? String(l.entityId) : '',
              previousStatus: l.previousStatus || '',
              newStatus: l.newStatus || '',
              userId: l.userId || (l.user && l.user.email) || 'system',
              userName: (l.user && l.user.name) || 'Administrator',
              userRole: (l.user && l.user.role) || 'System',
              notes: l.details || l.note || '',
              timestamp: l.timestamp || new Date().toISOString()
            }));
            setHistory(mappedLogs);
          } catch {
            setHistory([]);
          }
        } else {
          const data = await apiFetch('/api/history');
          setHistory(data.history || []);
        }
      } else if (activeTab === 'users' && currentUser?.role === 'Admin') {
        if (usingLiveBackend) {
          // Static visual helper users for display in live DB mode
          setAdminUsers([
            { id: '1', name: 'Amanda (System)', email: 'admin@crm.com', role: 'Admin' },
            { id: '2', name: 'Sidiq Pantai', email: 'sales1@crm.com', role: 'Sales' },
            { id: '3', name: 'Budi Kota', email: 'sales2@crm.com', role: 'Sales' },
            { id: '4', name: 'Fiona Manager', email: 'finance@crm.com', role: 'Finance' },
          ]);
        } else {
          const data = await apiFetch('/api/users');
          setAdminUsers(data.users || []);
        }
      }
    } catch {
      // Handled inside toasts
    } finally {
      setLoading(false);
    }
  };

  const mapLiveLeadToMock = (l: any): Lead => {
    let statusMapped: Lead['status'] = 'New';
    const s = String(l.status).toUpperCase();
    if (s === 'NEW') statusMapped = 'New';
    else if (s === 'CONTACTED') statusMapped = 'Contacted';
    else if (s === 'QUALIFIED') statusMapped = 'Qualified';
    else if (s === 'NEGOTIATION') statusMapped = 'Negotiation';
    else if (s === 'WON') statusMapped = 'Won';
    else if (s === 'LOST') statusMapped = 'Lost';

    return {
      id: l.id,
      companyName: l.companyName,
      contactName: l.contactName,
      phone: l.phone,
      email: l.email,
      source: l.source,
      estimatedValue: Number(l.estimatedValue) || 0,
      status: statusMapped,
      salesId: l.salesId,
      salesName: l.sales?.name || 'Sales Representative',
      notes: l.notes || '',
      createdAt: l.createdAt,
      updatedAt: l.updatedAt || l.createdAt
    };
  };

  const mapLiveSpkToMock = (s: any): SPK => {
    let financeStatusMapped: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
    const statusUpper = String(s.status).toUpperCase();
    if (statusUpper === 'APPROVED') financeStatusMapped = 'Approved';
    else if (statusUpper === 'REJECTED') financeStatusMapped = 'Rejected';

    return {
      id: s.id,
      spkNumber: s.spkNumber,
      leadId: s.leadId,
      leadCompany: s.lead?.companyName || 'Lead Company',
      projectName: s.title,
      contractValue: Number(s.value) || 0,
      startDate: s.createdAt,
      endDate: s.createdAt,
      salesStatus: 'Sent',
      financeStatus: financeStatusMapped,
      financeVerifiedBy: s.approvedBy?.name || '',
      financeVerifiedAt: s.updatedAt,
      financeNotes: s.financeNotes || '',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      addToast('Harap isi email dan password Anda.', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      let data;
      if (backendConnected) {
        try {
          data = await rawApiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: authEmail, password: authPassword })
          });
        } catch (err: any) {
          // Dyn-register preset user on PostgreSQL database if first login attempt
          if (err.message && (err.message.includes('Invalid') || err.message.includes('Unauthorized') || err.message.includes('not found') || err.message.includes('failed'))) {
            let name = 'User';
            let role = 'SALES';
            if (authEmail === 'admin@crm.com') { name = 'Amanda'; role = 'ADMIN'; }
            else if (authEmail === 'sales1@crm.com') { name = 'Sidiq Pantai'; role = 'SALES'; }
            else if (authEmail === 'sales2@crm.com') { name = 'Budi Kota'; role = 'SALES'; }
            else if (authEmail === 'finance@crm.com') { name = 'Fiona'; role = 'FINANCE'; }

            await rawApiFetch('/auth/register', {
              method: 'POST',
              body: JSON.stringify({ email: authEmail, password: authPassword, name, role })
            });
            // Try again
            data = await rawApiFetch('/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: authEmail, password: authPassword })
            });
          } else {
            throw err;
          }
        }
      } else {
        data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: authEmail, password: authPassword })
        });
      }

      setToken(data.token);
      let u = data.user;
      let mappedRole: 'Admin' | 'Sales' | 'Finance' = 'Sales';
      if (u.role === 'ADMIN' || u.role === 'Admin') mappedRole = 'Admin';
      else if (u.role === 'FINANCE' || u.role === 'Finance') mappedRole = 'Finance';

      const sessionUser = { id: u.id, name: u.name, email: u.email, role: mappedRole };
      setCurrentUser(sessionUser);
      localStorage.setItem('crm_user', JSON.stringify(sessionUser));
      localStorage.setItem('crm_token', data.token);

      addToast(`Selamat datang kembali, ${data.user.name}!`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Otentikasi kredensial ditolak.', 'error');
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
        if (usingLiveBackend) {
          await rawApiFetch(`/leads/${editingLead.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              companyName: leadForm.companyName,
              contactName: leadForm.contactName,
              phone: leadForm.phone,
              email: leadForm.email,
              source: leadForm.source,
              estimatedValue: Number(leadForm.estimatedValue),
              status: leadForm.status.toUpperCase(),
              notes: leadForm.notes
            })
          });
        } else {
          await apiFetch(`/api/leads/${editingLead.id}`, {
            method: 'PUT',
            body: JSON.stringify(leadForm)
          });
        }
        addToast('Data Lead berhasil diperbarui.', 'success');
      } else {
        if (usingLiveBackend) {
          await rawApiFetch('/leads', {
            method: 'POST',
            body: JSON.stringify({
              companyName: leadForm.companyName,
              contactName: leadForm.contactName,
              phone: leadForm.phone,
              email: leadForm.email,
              source: leadForm.source,
              estimatedValue: Number(leadForm.estimatedValue),
              status: leadForm.status.toUpperCase(),
              notes: leadForm.notes
            })
          });
        } else {
          await apiFetch('/api/leads', {
            method: 'POST',
            body: JSON.stringify(leadForm)
          });
        }
        addToast('Lead baru berhasil ditambahkan.', 'success');
      }
      setShowAddLeadModal(false);
      setLeadsPage(1);
      fetchCurrentTabData();
    } catch {
      // Caught in rawApiFetch error handler
    }
  };

  const handleDeleteLead = (leadId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Lead',
      message: 'Apakah Anda yakin ingin menghapus data Lead ini? Informasi SPK terkait juga akan terhapus secara permanen.',
      confirmText: 'Hapus Permanen',
      cancelText: 'Batalkan',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/api/leads/${leadId}`, { method: 'DELETE' });
          addToast('Lead berhasil dihapus dari database.', 'success');
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
      // Frontend guard: require lead to be Won before conversion (backend enforces too)
      if (convertingLead.status !== 'Won') {
        addToast('Lead harus berstatus Won sebelum dapat dikonversi menjadi SPK.', 'error');
        return;
      }
      if (usingLiveBackend) {
        await rawApiFetch('/spks', {
          method: 'POST',
          body: JSON.stringify({
            leadId: convertingLead.id,
            title: spkForm.projectName,
            description: `Dikerjakan mulai: ${spkForm.startDate} s/d ${spkForm.endDate}`,
            value: Number(spkForm.contractValue)
          })
        });
      } else {
        await apiFetch(`/api/leads/${convertingLead.id}/convert`, {
          method: 'POST',
          body: JSON.stringify(spkForm)
        });
      }
      addToast('Lead berhasil dikonversi menjadi SPK! Menunggu verifikasi Finance.', 'success');
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
      // Map UI fields to backend DTO: title, description, value
      const bodyLive = {
        title: spkForm.projectName,
        description: `Perubahan jadwal: ${spkForm.startDate} s/d ${spkForm.endDate}`,
        value: Number(spkForm.contractValue)
      };

      if (usingLiveBackend) {
        await rawApiFetch(`/spks/${editingSpk.id}`, {
          method: 'PUT',
          body: JSON.stringify(bodyLive)
        });
      } else {
        await apiFetch(`/api/spks/${editingSpk.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            projectName: spkForm.projectName,
            contractValue: spkForm.contractValue,
            startDate: spkForm.startDate,
            endDate: spkForm.endDate
          })
        });
      }
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
      message: `Apakah Anda yakin ingin mengirimankan ${spk.projectName} (${spk.spkNumber}) ke tim Finance untuk otentikasi verifikasi kelayakan dana?`,
      confirmText: 'Kirim Sekarang',
      cancelText: 'Batalkan',
      isDanger: false,
      onConfirm: async () => {
        try {
          if (usingLiveBackend) {
            // Backend update endpoint requires title/description/value; send current values to trigger activity log
            await rawApiFetch(`/spks/${spk.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                title: spk.projectName,
                description: `Dikirim ke Finance oleh ${currentUser?.name}`,
                value: Number(spk.contractValue)
              })
            });
          } else {
            await apiFetch(`/api/spks/${spk.id}`, {
              method: 'PUT',
              body: JSON.stringify({ salesStatus: 'Sent' })
            });
          }
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
      if (usingLiveBackend) {
        await rawApiFetch(`/spks/${verifyingSpk.id}/review`, {
          method: 'PUT',
          body: JSON.stringify({
            status: status === 'Approved' ? 'APPROVED' : 'REJECTED',
            financeNotes: verificationNotes
          })
        });
      } else {
        await apiFetch(`/api/spks/${verifyingSpk.id}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            financeStatus: status,
            notes: verificationNotes
          })
        });
      }
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
      password: ''
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
        addToast('Informasi proofil user berhasil diperbarui.', 'success');
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

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-850 antialiased flex flex-col selection:bg-indigo-150">
      
      {/* Toast Alert Layer */}
      <ToastContainer toasts={toasts} />

      {!currentUser ? (
        /* Login Screen visual identity */
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-indigo-50/30 to-slate-100/50 min-h-screen">
          <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-200/20 rounded-full blur-3xl -z-10 animate-pulse duration-[8000ms]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-100/10 rounded-full blur-3xl -z-10 animate-pulse duration-[6000ms]"></div>

          {/* Connection Mode Controls Card removed per request */}

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="w-full max-w-md bg-white border border-slate-200/80 shadow-[0_25px_60px_rgba(15,23,42,0.06)] rounded-[32px] p-8 md:p-10"
            id="login-card"
          >
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-gradient-to-tr from-indigo-100 to-indigo-50 text-indigo-800 rounded-2xl mb-4 shadow-sm">
                <Building2 className="w-7 h-7 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-extrabold font-display tracking-tight text-indigo-700">Sinergi CRM</h1>
              <p className="text-slate-405 mt-2 text-xs font-bold uppercase tracking-widest">
                Enterprise Workspace Portal
              </p>
              <p className="text-slate-500 mt-1.5 text-xs max-w-xs mx-auto leading-relaxed font-semibold">
                Sistem pencatatan lead, integrasi konversi SPK terpadu, serta validasi instan tim keuangan.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" id="login-form">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-2">Email Address</label>
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
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-700 mb-2">Password</label>
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
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 uppercase tracking-widest cursor-pointer hover:shadow-lg"
              >
                {authLoading ? 'Mengotentikasi Sesi...' : 'Masuk Aplikasi CRM'}
              </button>
            </form>

            {/* Preset staff quick-access removed for a cleaner login UI */}
          </motion.div>
        </div>
      ) : (
        /* Authenticated workspace */
        <>
          {/* Top Navbar */}
          <nav className="bg-white text-slate-900 shadow px-6 md:px-8 py-5 flex items-center justify-between border-b border-slate-200" id="main-nav">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-inner">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black font-display tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">Sinergi CRM</span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono mt-1">Enterprise Hub</span>
              </div>
            </div>

            {/* Profile badge with custom rings */}
            <div className="flex items-center gap-4">
              {backendConnected && (
                <div className="hidden lg:flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl font-bold">
                  <Database className={`w-3.5 h-3.5 ${usingLiveBackend ? 'text-emerald-500 animate-pulse' : 'text-indigo-400'}`} />
                  <span className={usingLiveBackend ? 'text-emerald-600' : 'text-indigo-600'}>
                    {usingLiveBackend ? 'Penyimpanan: POSTGRES' : 'Penyimpanan: LOCAL SIM'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-700">{currentUser.name}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 text-center self-end border ${
                    currentUser.role === 'Admin'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      : currentUser.role === 'Finance'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-700 ring-2 ring-indigo-200/40 hover:ring-indigo-300 transition flex items-center justify-center font-extrabold text-xs text-white shadow-md">
                  {getInitials(currentUser.name)}
                </div>
              </div>

              <button
                id="btn-logout"
                onClick={handleLogout}
                className="p-2.5 bg-slate-50 border border-slate-200 hover:text-rose-600 hover:bg-slate-100 text-slate-700 rounded-xl transition cursor-pointer"
                title="Keluar Aplikasi"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>

          {/* Tab Navigation Segmented Controls */}
          <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-6 md:px-8 py-2 flex justify-between items-center" id="tab-nav">
            <div className="flex gap-1 overflow-x-auto -mb-px no-scrollbar">
              {(currentUser.role === 'Admin' || currentUser.role === 'Sales') && (
                <button
                  id="tab-leads"
                  onClick={() => { setActiveTab('leads'); setLeadsPage(1); }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'leads'
                      ? 'bg-indigo-700 text-white shadow-md'
                      : 'text-slate-500 hover:text-indigo-700 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Daftar Leads
                </button>
              )}
              
              <button
                id="tab-spks"
                onClick={() => setActiveTab('spks')}
                className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'spks'
                    ? 'bg-indigo-700 text-white shadow-md'
                    : 'text-slate-500 hover:text-indigo-700 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Surat Perintah Kerja (SPK)
              </button>

              <button
                id="tab-history"
                onClick={() => setActiveTab('history')}
                className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-indigo-700 text-white shadow-md'
                    : 'text-slate-500 hover:text-indigo-700 hover:bg-slate-50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Riwayat Status
              </button>

              {currentUser.role === 'Admin' && (
                <button
                  id="tab-users"
                  onClick={() => setActiveTab('users')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-indigo-700 text-white shadow-md'
                      : 'text-slate-500 hover:text-indigo-700 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Mengelola User
                </button>
              )}
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-450 font-bold bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Sesi Aktif: <strong className="text-slate-750 font-bold">{currentUser.name}</strong></span>
            </div>
          </div>

          {/* Main workspace arena */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
            {activeTab === 'leads' && (currentUser.role === 'Admin' || currentUser.role === 'Sales') && (
              <LeadsView
                leads={leads}
                leadsTotal={leadsTotal}
                leadsPage={leadsPage}
                leadsTotalPages={leadsTotalPages}
                setLeadsPage={setLeadsPage}
                leadsSearch={leadsSearch}
                setLeadsSearch={setLeadsSearch}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                currentUser={currentUser}
                openNewLead={openNewLead}
                openEditLead={openEditLead}
                handleDeleteLead={handleDeleteLead}
                openConvertLead={openConvertLead}
                setViewingLeadDetail={setViewingLeadDetail}
                loading={loading}
              />
            )}

            {activeTab === 'spks' && (
              <SpksView
                spks={spks}
                currentUser={currentUser}
                openEditSpk={openEditSpk}
                handleSendSpkToFinance={handleSendSpkToFinance}
                openVerifySpk={openVerifySpk}
                setViewingSpkDetail={setViewingSpkDetail}
                loading={loading}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                history={history}
                loading={loading}
              />
            )}

            {activeTab === 'users' && currentUser.role === 'Admin' && (
              <UsersView
                adminUsers={adminUsers}
                openNewUser={openNewUser}
                openEditUser={openEditUser}
                handleDeleteUser={handleDeleteUser}
                loading={loading}
              />
            )}
          </main>
        </>
      )}

      {/* MODAL SHEET: Add / Edit Lead */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm shadow-xl" id="modal-lead-form">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white border border-slate-200/80 shadow-2xl rounded-3xl p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black font-display text-slate-900 tracking-tight">
                  {editingLead ? 'Edit Berkas Calon Lead' : 'Tambah Lead CRM Baru'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Tandai kolom dengan tanda bintang (*) wajib diisi.</p>
              </div>
              <button 
                onClick={() => setShowAddLeadModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4" id="lead-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Perusahaan Calon Klien *</label>
                  <input
                    id="field-lead-company"
                    type="text"
                    required
                    value={leadForm.companyName}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="e.g. PT Sinergi Sukses Mandiri"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Kontak Representatif *</label>
                  <input
                    id="field-lead-contact"
                    type="text"
                    required
                    value={leadForm.contactName}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="e.g. Ibu Amanda Putri"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nomor Telepon Handphone *</label>
                  <input
                    id="field-lead-phone"
                    type="text"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 081234567890"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Alamat Surat Elektronik (Email) *</label>
                  <input
                    id="field-lead-email"
                    type="email"
                    required
                    value={leadForm.email}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. amanda.putri@klien.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sumber Lead Pemasaran</label>
                  <select
                    id="field-lead-source"
                    value={leadForm.source}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition text-sm font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="Website">Website</option>
                    <option value="Iklan Sosmed">Iklan Sosmed</option>
                    <option value="Pameran">Pameran</option>
                    <option value="Rujukan Klien">Rujukan Klien</option>
                    <option value="Cold Call">Cold Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nilai Estimasi Pekerjaan (IDR) *</label>
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition text-sm font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Catatan Tambahan (Buku Harian Log) *</label>
                <textarea
                  id="field-lead-notes"
                  rows={3}
                  required={editingLead?.status !== leadForm.status}
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Sejarah atau pembaruan penting mengenai interaksi draf Lead ini..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  id="btn-lead-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-slate-100 hover:bg-indigo-800 hover:text-white text-slate-900 rounded-xl text-sm font-bold transition shadow-sm cursor-pointer"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DIALOG: Lead Detail Modal */}
      {viewingLeadDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" id="modal-lead-detail">
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

            <div className="space-y-4 text-sm font-semibold text-slate-705">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Nama Kontak</span>
                  <strong className="text-slate-800 font-bold">{viewingLeadDetail.contactName}</strong>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Sumber Acuan</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 rounded text-slate-600 mt-0.5 inline-block">{viewingLeadDetail.source}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Nomor Handphone</span>
                  <span className="text-slate-800 font-mono font-bold">{viewingLeadDetail.phone}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Alamat Email</span>
                  <span className="text-slate-800 font-sans mt-0.5 inline-block font-bold">{viewingLeadDetail.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Status Saat Ini</span>
                  <span className="inline-block text-xs font-bold rounded-full border bg-slate-50 px-2.5 py-0.5 mt-0.5 text-slate-700 border-slate-200">
                    {viewingLeadDetail.status}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Estimasi Nilai Usaha</span>
                  <strong className="text-slate-900 font-mono font-bold">Rp {viewingLeadDetail.estimatedValue.toLocaleString('id-ID')}</strong>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-3">
                <span className="block text-xs font-semibold text-slate-400">Sales Penanggung Jawab</span>
                <span className="text-slate-800 font-bold">{viewingLeadDetail.salesName} (ID: {viewingLeadDetail.salesId})</span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400">Keterangan / Deskripsi</span>
                <p className="text-slate-600 italic bg-slate-50 p-3 rounded-xl mt-1 text-xs leading-relaxed font-semibold">
                  "{viewingLeadDetail.notes || 'Tidak ada catatan tambahan.'}"
                </p>
              </div>

              <div className="pt-4 flex justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingLeadDetail(null)}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Tutup Jendela
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* DIALOG: Convert Lead to SPK Modal */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" id="modal-convert-spk">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black font-display text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-6 h-6 text-emerald-600 shrink-0" />
                  Konversi Lead jadi SPK
                </h3>
                <p className="text-xs text-slate-450 mt-1 font-semibold">
                  Menerbitkan Surat Perintah Kerja (SPK) resmi dari Lead terpilih <strong className="text-slate-800 font-bold">{convertingLead.companyName}</strong>.
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-bold text-slate-700"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Sesuai aturan operasional, draf SPK awal berstatus <strong>"Draft"</strong>, dan wajib Anda kirimkan ke departemen Finance agar diverifikasi.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  id="btn-convert-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold shadow-md inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Terbitkan SPK
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DIALOG: Edit SPK Modal */}
      {editingSpk && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" id="modal-edit-spk">
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-bold text-slate-700"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSpk(null)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  id="btn-edit-spk-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DIALOG: SPK Detail Modal Sheet */}
      {viewingSpkDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" id="modal-spk-detail">
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

            <div className="space-y-4 text-sm font-semibold text-slate-700">
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

              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3 font-semibold">
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
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 mt-1">
                    {viewingSpkDetail.salesStatus}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Status Kelayakan Finance</span>
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 border rounded mt-1 bg-blue-50 text-blue-700 border-blue-200">
                    {viewingSpkDetail.financeStatus}
                  </span>
                </div>
              </div>

              {viewingSpkDetail.financeVerifiedBy && (
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3 text-xs text-slate-500 font-bold uppercase">
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
                  <span className="block text-xs font-bold text-slate-600">Buku Catatan Auditor Finance:</span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed italic font-semibold">
                    "{viewingSpkDetail.financeNotes}"
                  </p>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingSpkDetail(null)}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* DIALOG: Verify SPK (Finance Action Dialog) */}
      {verifyingSpk && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" id="modal-finance-verify">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-3xl p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black font-display text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-605 shrink-0" />
                  Verifikasi Berkas Kerja SPK
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
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

            <div className="space-y-4 font-sans text-sm font-semibold text-slate-700">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Tautan Klien</span>
                  <strong className="text-slate-800 font-bold">{verifyingSpk.leadCompany}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Volume Nilai Kontrak</span>
                  <strong className="text-slate-900 font-mono font-bold">Rp {verifyingSpk.contractValue.toLocaleString('id-ID')}</strong>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyingSpk(null)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-extrabold mr-auto whitespace-nowrap cursor-pointer"
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
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                  Setujui SPK (Lunas)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* DIALOG: Create/Edit User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm shadow-xl" id="modal-user-form">
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
                <p className="text-xs text-slate-400 mt-1 font-semibold">Registrasi akses log Sinergi CRM terenkripsi.</p>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-semibold"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm disabled:bg-slate-100 disabled:opacity-70 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Hak Akses Jabatan (Role) *</label>
                <select
                  id="field-user-role"
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white transition text-sm font-semibold text-slate-700 cursor-pointer"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition text-sm font-mono font-medium font-semibold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  id="btn-user-submit"
                  type="submit"
                  className="px-6 py-2.5 bg-slate-100 hover:bg-indigo-800 hover:text-white text-slate-900 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {editingUser ? 'Perbarui Akses' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DIALOG: Global Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" id="modal-confirm-dialog">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl ${confirmDialog.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50/70 text-indigo-600'} shrink-0`}>
                <AlertCircle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-bold">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition active:scale-95 text-center"
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
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/10' 
                    : 'bg-indigo-700 hover:bg-indigo-800 shadow-indigo-900/10'
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

// Initial Data Generators for Local Sandbox
function getMockLeadsInitial(): Lead[] {
  return [
    {
      id: 'lead-1',
      companyName: 'PT Teknologi Nusantara',
      contactName: 'Diana Putri',
      phone: '081234567890',
      email: 'diana@teknus.co.id',
      source: 'Website',
      estimatedValue: 45000000,
      status: 'Negotiation',
      salesId: 'sales1',
      salesName: 'Sidiq Pantai',
      notes: 'Tertarik dengan paket enterprise. Sudah review file proposal pertama.',
      createdAt: '2026-06-18T10:30:00Z',
      updatedAt: '2026-06-18T10:30:00Z'
    },
    {
      id: 'lead-2',
      companyName: 'CV Makmur Sejahtera',
      contactName: 'Hendra Wijaya',
      phone: '085678901234',
      email: 'hendra@makmursejahtera.com',
      source: 'Pameran',
      estimatedValue: 125000000,
      status: 'Won',
      salesId: 'sales2',
      salesName: 'Budi Kota',
      notes: 'Klien menyetujui penawaran harga. Draf SPK sedang dipreparasi.',
      createdAt: '2026-06-15T14:15:00Z',
      updatedAt: '2026-06-15T14:15:00Z'
    },
    {
      id: 'lead-3',
      companyName: 'Kopi Kenangan Rakyat',
      contactName: 'Bapak Rio',
      phone: '087812930412',
      email: 'rio@kopikarak.net',
      source: 'Iklan Sosmed',
      estimatedValue: 18000000,
      status: 'New',
      salesId: 'sales1',
      salesName: 'Sidiq Pantai',
      notes: 'Menanyakan perihal lisensi CRM untuk 10 user pemasaran.',
      createdAt: '2026-06-20T08:00:00Z',
      updatedAt: '2026-06-20T08:00:00Z'
    }
  ];
}

function getMockSpksInitial(): SPK[] {
  return [
    {
      id: 'spk-1',
      spkNumber: 'SPK-20260615-1029',
      leadId: 'lead-2',
      leadCompany: 'CV Makmur Sejahtera',
      projectName: 'Pembangunan Infrastruktur CRM Enterprise',
      contractValue: 125000000,
      startDate: '2026-06-20',
      endDate: '2026-09-20',
      salesStatus: 'Sent',
      financeStatus: 'Pending',
      financeNotes: '',
      createdAt: '2026-06-16T09:00:00Z',
      updatedAt: '2026-06-16T09:00:00Z'
    }
  ];
}

function getMockUsersInitial(): User[] {
  return [
    { id: 'admin', email: 'admin@crm.com', name: 'Amanda', role: 'Admin' },
    { id: 'sales1', email: 'sales1@crm.com', name: 'Sidiq Pantai', role: 'Sales' },
    { id: 'sales2', email: 'sales2@crm.com', name: 'Budi Kota', role: 'Sales' },
    { id: 'finance', email: 'finance@crm.com', name: 'Fiona', role: 'Finance' }
  ];
}

function getMockLogsInitial(): HistoryLog[] {
  return [
    {
      id: 'log-1',
      entityType: 'lead',
      entityId: 'lead-2',
      previousStatus: 'Negotiation',
      newStatus: 'Won',
      userId: 'sales2',
      userName: 'Budi Kota',
      userRole: 'Sales',
      notes: 'Klien deal harga khusus volume besar.',
      timestamp: '2026-06-15T14:15:00Z'
    }
  ];
}
