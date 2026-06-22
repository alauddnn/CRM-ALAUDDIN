import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'Admin' | 'Sales' | 'Finance';
}

export interface Lead {
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

export interface SPK {
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

export interface HistoryLog {
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

interface DatabaseSchema {
  users: User[];
  leads: Lead[];
  spks: SPK[];
  history: HistoryLog[];
  nextSpkCounter: number;
}

const seedUsers: User[] = [
  { id: 'u-1', email: 'admin@crm.com', password: 'admin123', name: 'Amanda (Admin)', role: 'Admin' },
  { id: 'u-2', email: 'sales1@crm.com', password: 'sales123', name: 'Sidiq (Sales Pantai)', role: 'Sales' },
  { id: 'u-3', email: 'sales2@crm.com', password: 'sales123', name: 'Budi (Sales Kota)', role: 'Sales' },
  { id: 'u-4', email: 'finance@crm.com', password: 'finance123', name: 'Fiona (Finance)', role: 'Finance' }
];

const seedLeads: Lead[] = [
  {
    id: 'lead-1',
    companyName: 'PT Teknologi Digital',
    contactName: 'Andi Wijaya',
    phone: '08123456789',
    email: 'andi@teknologidigital.co.id',
    source: 'Website',
    estimatedValue: 150000000,
    status: 'New',
    salesId: 'u-2',
    salesName: 'Sidiq (Sales Pantai)',
    notes: 'Tertarik dengan layanan Enterprise Resource Planning.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-2',
    companyName: 'CV Maju Bersama',
    contactName: 'Bambang S',
    phone: '087788990011',
    email: 'bambang@majubersama.com',
    source: 'Event Pameran',
    estimatedValue: 75000000,
    status: 'Negotiation',
    salesId: 'u-3',
    salesName: 'Budi (Sales Kota)',
    notes: 'Proses penawaran harga untuk instalasi jaringan kantor cabang.',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-3',
    companyName: 'PT Nusa Indah Sejahtera',
    contactName: 'Siti Aminah',
    phone: '082123456789',
    email: 'siti.aminah@nusaindah.com',
    source: 'Rekomendasi',
    estimatedValue: 240000000,
    status: 'Won',
    salesId: 'u-2',
    salesName: 'Sidiq (Sales Pantai)',
    notes: 'Penawaran disetujui. Siap dikonversi menjadi SPK pekerjaan pengembangan web core.',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'lead-4',
    companyName: 'Toko Berkah Abadi',
    contactName: 'Pak Joko',
    phone: '089900112233',
    email: 'joko@berkahabadi.id',
    source: 'Iklan Sosial Media',
    estimatedValue: 20000000,
    status: 'Lost',
    salesId: 'u-3',
    salesName: 'Budi (Sales Kota)',
    notes: 'Budget tidak mencukupi untuk pengembangan aplikasi kustom.',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const seedHistory: HistoryLog[] = [
  {
    id: 'h-1',
    entityType: 'lead',
    entityId: 'lead-1',
    previousStatus: '-',
    newStatus: 'New',
    userId: 'u-2',
    userName: 'Sidiq (Sales Pantai)',
    userRole: 'Sales',
    notes: 'Lead baru berhasil dibuat.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'h-2',
    entityType: 'lead',
    entityId: 'lead-2',
    previousStatus: 'New',
    newStatus: 'Contacted',
    userId: 'u-3',
    userName: 'Budi (Sales Kota)',
    userRole: 'Sales',
    notes: 'Melakukan panggilan perkenalan dengan Pak Bambang.',
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'h-3',
    entityType: 'lead',
    entityId: 'lead-2',
    previousStatus: 'Contacted',
    newStatus: 'Negotiation',
    userId: 'u-3',
    userName: 'Budi (Sales Kota)',
    userRole: 'Sales',
    notes: 'Mengirim draf proposal harga dan negosiasi detail pengerjaan.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'h-4',
    entityType: 'lead',
    entityId: 'lead-3',
    previousStatus: 'New',
    newStatus: 'Won',
    userId: 'u-2',
    userName: 'Sidiq (Sales Pantai)',
    userRole: 'Sales',
    notes: 'Kontrak disepakati oleh kedua belah pihak.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [],
      leads: [],
      spks: [],
      history: [],
      nextSpkCounter: 1
    };
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log('Database loaded successfully from file.');
      } catch (err) {
        console.error('Failed to load database. Reinitializing with seed.', err);
        this.reseed();
      }
    } else {
      this.reseed();
    }
  }

  private reseed() {
    this.data = {
      users: seedUsers,
      leads: seedLeads,
      spks: [],
      history: seedHistory,
      nextSpkCounter: 1
    };
    this.save();
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save to database file', err);
    }
  }

  // Users operation
  getUsers(): User[] {
    return this.data.users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role }));
  }

  getUsersFull(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      ...user,
      id: `u-${Date.now()}`
    };
    this.data.users.push(newUser);
    this.save();
    return { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    const updated = this.data.users[index];
    return { id: updated.id, email: updated.email, name: updated.name, role: updated.role };
  }

  deleteUser(id: string): boolean {
    const originalLength = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== originalLength) {
      this.save();
      return true;
    }
    return false;
  }

  // Leads operations
  getLeads(): Lead[] {
    return this.data.leads;
  }

  getLeadById(id: string): Lead | undefined {
    return this.data.leads.find(l => l.id === id);
  }

  createLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>, currentUserId: string): Lead {
    const creator = this.getUserById(currentUserId);
    const newLead: Lead = {
      ...lead,
      id: `lead-${Date.now()}`,
      salesId: creator?.role === 'Admin' ? lead.salesId || currentUserId : currentUserId,
      salesName: creator?.role === 'Admin' 
        ? (this.getUserById(lead.salesId)?.name || lead.salesName || creator.name) 
        : (creator?.name || 'Sales'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.leads.push(newLead);
    this.save();

    // Log history
    this.addLog({
      entityType: 'lead',
      entityId: newLead.id,
      previousStatus: '-',
      newStatus: newLead.status,
      userId: currentUserId,
      userName: creator?.name || 'System',
      userRole: creator?.role || 'Sales',
      notes: lead.notes || 'Lead baru dicatatkan oleh Sales.'
    });

    return newLead;
  }

  updateLead(id: string, updates: Partial<Lead>, currentUserId: string): Lead | undefined {
    const index = this.data.leads.findIndex(l => l.id === id);
    if (index === -1) return undefined;

    const original = this.data.leads[index];
    const updater = this.getUserById(currentUserId);

    // Track status change
    const isStatusChanged = updates.status !== undefined && updates.status !== original.status;
    const previousStatus = original.status;

    // Admin can reassign sales
    let salesName = original.salesName;
    if (updates.salesId && updates.salesId !== original.salesId) {
      salesName = this.getUserById(updates.salesId)?.name || original.salesName;
    }

    const updatedLead: Lead = {
      ...original,
      ...updates,
      salesName,
      updatedAt: new Date().toISOString()
    };

    this.data.leads[index] = updatedLead;
    this.save();

    if (isStatusChanged) {
      this.addLog({
        entityType: 'lead',
        entityId: id,
        previousStatus,
        newStatus: updatedLead.status,
        userId: currentUserId,
        userName: updater?.name || 'System',
        userRole: updater?.role || 'Sales',
        notes: updates.notes || `Mengubah status lead dari ${previousStatus} menjadi ${updatedLead.status}.`
      });
    }

    return updatedLead;
  }

  deleteLead(id: string): boolean {
    const originalLength = this.data.leads.length;
    this.data.leads = this.data.leads.filter(l => l.id !== id);
    if (this.data.leads.length !== originalLength) {
      // Also delete associated SPKs
      this.data.spks = this.data.spks.filter(s => s.leadId !== id);
      // Clean history log
      this.data.history = this.data.history.filter(h => !(h.entityType === 'lead' && h.entityId === id));
      this.save();
      return true;
    }
    return false;
  }

  // SPK operations
  getSPKs(): SPK[] {
    return this.data.spks;
  }

  getSPKById(id: string): SPK | undefined {
    return this.data.spks.find(s => s.id === id);
  }

  getSPKByLeadId(leadId: string): SPK | undefined {
    return this.data.spks.find(s => s.leadId === leadId);
  }

  generateSpkNumber(): string {
    const pad = (num: number, size: number) => {
      let s = num + "";
      while (s.length < size) s = "0" + s;
      return s;
    };
    const year = new Date().getFullYear();
    const month = pad(new Date().getMonth() + 1, 2);
    const counter = this.data.nextSpkCounter;
    this.data.nextSpkCounter++;
    this.save();
    return `SPK/${year}/${month}/${pad(counter, 4)}`;
  }

  createSPK(spkData: Omit<SPK, 'id' | 'spkNumber' | 'salesStatus' | 'financeStatus' | 'financeNotes' | 'createdAt' | 'updatedAt'>, currentUserId: string): SPK {
    const updater = this.getUserById(currentUserId);
    const lead = this.getLeadById(spkData.leadId);
    if (!lead) {
      throw new Error('Lead tidak ditemukan');
    }

    // Generate unique SPK number
    const spkNumber = this.generateSpkNumber();
    const newSpk: SPK = {
      ...spkData,
      id: `spk-${Date.now()}`,
      spkNumber,
      salesStatus: 'Draft',
      financeStatus: 'Pending',
      financeNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.spks.push(newSpk);
    this.save();

    // Log history of SPK Creation
    this.addLog({
      entityType: 'spk',
      entityId: newSpk.id,
      previousStatus: '-',
      newStatus: 'Draft',
      userId: currentUserId,
      userName: updater?.name || 'System',
      userRole: updater?.role || 'Sales',
      notes: `Membuat draf Surat Perintah Kerja (SPK) untuk proyek "${newSpk.projectName}" bernilai Rp ${newSpk.contractValue.toLocaleString('id-ID')}`
    });

    return newSpk;
  }

  updateSPK(id: string, updates: Partial<SPK>, currentUserId: string): SPK | undefined {
    const index = this.data.spks.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const original = this.data.spks[index];
    const updater = this.getUserById(currentUserId);

    // If already approved, Sales can't edit
    if (original.financeStatus === 'Approved' && updater?.role === 'Sales') {
      throw new Error('SPK yang sudah disetujui Finance tidak dapat diubah oleh Sales.');
    }

    const previousSalesStatus = original.salesStatus;
    const isSalesStatusChanged = updates.salesStatus !== undefined && updates.salesStatus !== original.salesStatus;

    const updatedSpk: SPK = {
      ...original,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.data.spks[index] = updatedSpk;
    this.save();

    if (isSalesStatusChanged) {
      this.addLog({
        entityType: 'spk',
        entityId: id,
        previousStatus: previousSalesStatus,
        newStatus: updatedSpk.salesStatus,
        userId: currentUserId,
        userName: updater?.name || 'System',
        userRole: updater?.role || 'Sales',
        notes: updatedSpk.salesStatus === 'Sent' 
          ? `Mengirimkan SPK bermeterai ke Finance untuk proses verifikasi.` 
          : `Mengembalikan SPK status draf.`
      });
    } else if (updater?.role === 'Sales') {
      this.addLog({
        entityType: 'spk',
        entityId: id,
        previousStatus: original.salesStatus,
        newStatus: updatedSpk.salesStatus,
        userId: currentUserId,
        userName: updater?.name || 'System',
        userRole: updater?.role || 'Sales',
        notes: `Melakukan perbaruan informasi draf SPK.`
      });
    }

    return updatedSpk;
  }

  verifySPK(id: string, financeStatus: 'Approved' | 'Rejected', notes: string, currentUserId: string): SPK | undefined {
    const index = this.data.spks.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    const original = this.data.spks[index];
    if (original.salesStatus !== 'Sent') {
      throw new Error('Hanya SPK yang sudah dikirim ke Finance yang dapat diverifikasi.');
    }

    if (financeStatus === 'Rejected' && !notes.trim()) {
      throw new Error('Catatan verifikasi Finance wajib diisi jika menolak SPK.');
    }

    const updater = this.getUserById(currentUserId);
    const previousFinanceStatus = original.financeStatus;

    const updatedSpk: SPK = {
      ...original,
      financeStatus,
      financeNotes: notes,
      financeVerifiedAt: new Date().toISOString(),
      financeVerifiedBy: updater?.name || 'Finance Staff',
      updatedAt: new Date().toISOString()
    };

    this.data.spks[index] = updatedSpk;
    this.save();

    // Log history
    this.addLog({
      entityType: 'spk',
      entityId: id,
      previousStatus: previousFinanceStatus,
      newStatus: financeStatus,
      userId: currentUserId,
      userName: updater?.name || 'Finance Staff',
      userRole: updater?.role || 'Finance',
      notes: financeStatus === 'Approved' 
        ? `Menyetujui dokumen SPK. Catatan Finance: ${notes || 'Berkas valid dan disetujui.'}` 
        : `Menolak dokumen SPK. Catatan Finance: ${notes}`
    });

    return updatedSpk;
  }

  // History operations
  getHistory(): HistoryLog[] {
    return this.data.history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  addLog(log: Omit<HistoryLog, 'id' | 'timestamp'>): HistoryLog {
    const newLog: HistoryLog = {
      ...log,
      id: `h-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.data.history.push(newLog);
    this.save();
    return newLog;
  }
}

export const db = new Database();
