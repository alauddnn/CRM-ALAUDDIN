import { Router, Request, Response, NextFunction } from 'express';
import { db, User, Lead, SPK } from './db.js';

export const apiRouter = Router();

// Simple Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function requireAuth(allowedRoles?: ('Admin' | 'Sales' | 'Finance')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Akses ditolak. Token otentikasi tidak ditemukan.' });
    }

    const userId = authHeader.split(' ')[1];
    const user = db.getUserById(userId);

    if (!user) {
      return res.status(401).json({ message: 'Pengguna tidak dikenali. Silakan login kembali.' });
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: `Akses ditolak. Peran Anda (${user.role}) tidak diizinkan untuk aksi ini.` });
    }

    req.user = user;
    next();
  };
}

// Auth Handlers
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  const user = db.getUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  // Generate simple token: just user ID for simplicity in testing and robust verification
  const token = user.id;
  res.json({
    message: 'Login berhasil.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

apiRouter.get('/auth/me', requireAuth(), (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Admin User Management Handlers (Mengelola User)
apiRouter.get('/users', requireAuth(['Admin']), (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsersFull().map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role }));
  res.json({ users });
});

apiRouter.post('/users', requireAuth(['Admin']), (req: AuthenticatedRequest, res: Response) => {
  const { email, name, role, password } = req.body;
  if (!email || !name || !role || !password) {
    return res.status(400).json({ message: 'Semua bidang data user wajib diisi.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ message: 'Email user sudah digunakan.' });
  }

  const newUser = db.createUser({ email, name, role, password });
  res.json({ message: 'User berhasil ditambahkan.', user: newUser });
});

apiRouter.put('/users/:id', requireAuth(['Admin']), (req: AuthenticatedRequest, res: Response) => {
  const { name, role, password } = req.body;
  const targetUser = db.getUserById(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ message: 'User tidak ditemukan.' });
  }

  const updates: Partial<User> = {};
  if (name) updates.name = name;
  if (role) updates.role = role;
  if (password) updates.password = password;

  const updated = db.updateUser(req.params.id, updates);
  res.json({ message: 'User berhasil diperbarui.', user: updated });
});

apiRouter.delete('/users/:id', requireAuth(['Admin']), (req: AuthenticatedRequest, res: Response) => {
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
  }

  const success = db.deleteUser(req.params.id);
  if (!success) {
    return res.status(404).json({ message: 'User tidak ditemukan.' });
  }
  res.json({ message: 'User berhasil dihapus.' });
});

// Leads List with Search, Filter & Pagination
apiRouter.get('/leads', requireAuth(['Admin', 'Sales']), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let leads = db.getLeads();

  // Sales can only view their own leads
  if (user.role === 'Sales') {
    leads = leads.filter(l => l.salesId === user.id);
  }

  // Filter by Search (nama perusahaan atau kontak)
  const search = req.query.search as string;
  if (search) {
    const term = search.toLowerCase();
    leads = leads.filter(l => 
      l.companyName.toLowerCase().includes(term) || 
      l.contactName.toLowerCase().includes(term)
    );
  }

  // Filter by Status
  const status = req.query.status as string;
  if (status && status !== 'All') {
    leads = leads.filter(l => l.status === status);
  }

  // Pagination
  const page = parseInt(req.query.page as string || '1');
  const limit = parseInt(req.query.limit as string || '10');
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // Sorting: Newest first
  leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const paginatedLeads = leads.slice(startIndex, endIndex);

  res.json({
    leads: paginatedLeads,
    total: leads.length,
    page,
    limit,
    totalPages: Math.ceil(leads.length / limit)
  });
});

// Single Lead
apiRouter.get('/leads/:id', requireAuth(['Admin', 'Sales']), (req: AuthenticatedRequest, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ message: 'Lead tidak ditemukan.' });
  }

  // Role validation: Sales can only view their own lead
  if (req.user!.role === 'Sales' && lead.salesId !== req.user!.id) {
    return res.status(403).json({ message: 'Akses ditolak. Anda hanya dapat melihat lead Anda sendiri.' });
  }

  res.json({ lead });
});

// Create Lead
apiRouter.post('/leads', requireAuth(['Admin', 'Sales']), (req: AuthenticatedRequest, res: Response) => {
  const { companyName, contactName, phone, email, source, estimatedValue, status, salesId, notes } = req.body;

  if (!companyName || !contactName || !phone || !email || !source || estimatedValue === undefined || !status) {
    return res.status(400).json({ message: 'Semua kolom bertanda bintang wajib diisi.' });
  }

  const user = req.user!;
  try {
    const newLead = db.createLead({
      companyName,
      contactName,
      phone,
      email,
      source,
      estimatedValue: Number(estimatedValue),
      status,
      salesId: user.role === 'Admin' ? salesId || user.id : user.id,
      salesName: '', // Auto-assigned by createLead based on salesId
      notes: notes || ''
    }, user.id);

    res.status(201).json({ message: 'Lead berhasil dibuat.', lead: newLead });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Gagal menyimpan Lead baru.' });
  }
});

// Edit Lead
apiRouter.put('/leads/:id', requireAuth(['Admin', 'Sales']), (req: AuthenticatedRequest, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ message: 'Lead tidak ditemukan.' });
  }

  const user = req.user!;
  // Sales can only edit their own leads
  if (user.role === 'Sales' && lead.salesId !== user.id) {
    return res.status(403).json({ message: 'Akses ditolak. Anda hanya dapat mengubah lead milik Anda.' });
  }

  const { companyName, contactName, phone, email, source, estimatedValue, status, notes, salesId } = req.body;

  const updates: Partial<Lead> = {};
  if (companyName) updates.companyName = companyName;
  if (contactName) updates.contactName = contactName;
  if (phone) updates.phone = phone;
  if (email) updates.email = email;
  if (source) updates.source = source;
  if (estimatedValue !== undefined) updates.estimatedValue = Number(estimatedValue);
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (user.role === 'Admin' && salesId) updates.salesId = salesId;

  try {
    const updatedLead = db.updateLead(req.params.id, updates, user.id);
    res.json({ message: 'Lead berhasil diperbarui.', lead: updatedLead });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Gagal memperbarui data Lead.' });
  }
});

// Delete Lead
apiRouter.delete('/leads/:id', requireAuth(['Admin', 'Sales']), (req: AuthenticatedRequest, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ message: 'Lead tidak ditemukan.' });
  }

  const user = req.user!;
  // Sales can only delete their own leads
  if (user.role === 'Sales' && lead.salesId !== user.id) {
    return res.status(403).json({ message: 'Akses ditolak. Anda hanya dapat menghapus lead milik Anda.' });
  }

  const success = db.deleteLead(req.params.id);
  if (success) {
    // Delete status history is automatically done in deleteLead
    res.json({ message: 'Lead berhasil dihapus.' });
  } else {
    res.status(500).json({ message: 'Gagal menghapus Lead.' });
  }
});

// Convert Lead to SPK
apiRouter.post('/leads/:id/convert', requireAuth(['Admin', 'Sales']), (req: AuthenticatedRequest, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ message: 'Lead tidak ditemukan.' });
  }

  const user = req.user!;
  if (user.role === 'Sales' && lead.salesId !== user.id) {
    return res.status(403).json({ message: 'Akses ditolak. Hanya Sales penanggung jawab yang dapat mengonversi lead ini.' });
  }

  // Rule: Hanya Lead berstatus Won yang dapat dikonversi
  if (lead.status !== 'Won') {
    return res.status(400).json({ message: 'Hanya Lead dengan status "Won" yang dapat dikonversi ke SPK.' });
  }

  // Rule: Satu Lead hanya boleh memiliki satu SPK
  const existingSpk = db.getSPKByLeadId(req.params.id);
  if (existingSpk) {
    return res.status(400).json({ message: 'Lead ini sudah memiliki SPK yang terdaftar.', spk: existingSpk });
  }

  const { projectName, contractValue, startDate, endDate } = req.body;
  if (!projectName || !contractValue || !startDate || !endDate) {
    return res.status(400).json({ message: 'Nama proyek, nilai kontrak, tanggal mulai dan tanggal selesai wajib diisi.' });
  }

  try {
    const newSpk = db.createSPK({
      leadId: lead.id,
      leadCompany: lead.companyName,
      projectName,
      contractValue: Number(contractValue),
      startDate,
      endDate
    }, user.id);

    res.status(201).json({ message: 'Lead berhasil dikonversi menjadi SPK (Surat Perintah Kerja).', spk: newSpk });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Gagal mengonversi Lead menjadi SPK.' });
  }
});

// SPKs List with Filters
apiRouter.get('/spks', requireAuth(['Admin', 'Sales', 'Finance']), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let spks = db.getSPKs();

  if (user.role === 'Sales') {
    // Sales can only view SPK associated with their own leads
    const myLeads = db.getLeads().filter(l => l.salesId === user.id).map(l => l.id);
    spks = spks.filter(s => myLeads.includes(s.leadId));
  } else if (user.role === 'Finance') {
    // Finance can ONLY see SPKs that have been sent by Sales to Finance
    spks = spks.filter(s => s.salesStatus === 'Sent');
  }

  // Sort newest first
  spks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ spks });
});

// Single SPK
apiRouter.get('/spks/:id', requireAuth(['Admin', 'Sales', 'Finance']), (req: AuthenticatedRequest, res: Response) => {
  const spk = db.getSPKById(req.params.id);
  if (!spk) {
    return res.status(404).json({ message: 'SPK tidak ditemukan.' });
  }

  const user = req.user!;
  if (user.role === 'Sales') {
    const lead = db.getLeadById(spk.leadId);
    if (!lead || lead.salesId !== user.id) {
      return res.status(403).json({ message: 'Akses ditolak. Anda hanya dapat melihat SPK milik lead Anda.' });
    }
  } else if (user.role === 'Finance') {
    if (spk.salesStatus !== 'Sent') {
      return res.status(403).json({ message: 'Akses ditolak. SPK ini belum dikirim oleh Sales ke Finance.' });
    }
  }

  res.json({ spk });
});

// Update SPK (Sales edit Draft SPK / Kirim SPK ke Finance)
apiRouter.put('/spks/:id', requireAuth(['Admin', 'Sales']), (req: AuthenticatedRequest, res: Response) => {
  const spk = db.getSPKById(req.params.id);
  if (!spk) {
    return res.status(404).json({ message: 'SPK tidak ditemukan.' });
  }

  const user = req.user!;
  if (user.role === 'Sales') {
    const lead = db.getLeadById(spk.leadId);
    if (!lead || lead.salesId !== user.id) {
      return res.status(403).json({ message: 'Akses ditolak. Anda hanya dapat mengubah SPK dari lead Anda.' });
    }

    // Rule: SPK yang sudah disetujui tidak dapat diubah Sales
    if (spk.financeStatus === 'Approved') {
      return res.status(400).json({ message: 'SPK yang sudah disetujui oleh Finance tidak dapat diubah lagi.' });
    }
  }

  const { projectName, contractValue, startDate, endDate, salesStatus } = req.body;

  const updates: Partial<SPK> = {};
  if (projectName) updates.projectName = projectName;
  if (contractValue !== undefined) updates.contractValue = Number(contractValue);
  if (startDate) updates.startDate = startDate;
  if (endDate) updates.endDate = endDate;
  if (salesStatus) updates.salesStatus = salesStatus;

  try {
    const updatedSpk = db.updateSPK(req.params.id, updates, user.id);
    res.json({ message: 'SPK berhasil diperbarui.', spk: updatedSpk });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Gagal memperbarui data SPK.' });
  }
});

// Verify SPK (Finance Approve/Reject SPK)
apiRouter.post('/spks/:id/verify', requireAuth(['Admin', 'Finance']), (req: AuthenticatedRequest, res: Response) => {
  const { financeStatus, notes } = req.body;
  if (!financeStatus || !['Approved', 'Rejected'].includes(financeStatus)) {
    return res.status(400).json({ message: 'Status verifikasi harus "Approved" atau "Rejected".' });
  }

  // Rule: Finance wajib memberikan catatan jika menolak
  if (financeStatus === 'Rejected' && (!notes || !notes.trim())) {
    return res.status(400).json({ message: 'Catatan verifikasi Finance wajib diisi apabila menolak SPK.' });
  }

  try {
    const verified = db.verifySPK(req.params.id, financeStatus, notes || '', req.user!.id);
    res.json({ message: `SPK berhasil ${financeStatus === 'Approved' ? 'disetujui' : 'ditolak'}.`, spk: verified });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Gagal memverifikasi SPK.' });
  }
});

// Logs/History of status changes
apiRouter.get('/history', requireAuth(['Admin', 'Sales', 'Finance']), (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let history = db.getHistory();

  // Filter history based on permissions
  if (user.role === 'Sales') {
    const myLeads = db.getLeads().filter(l => l.salesId === user.id).map(l => l.id);
    const mySpks = db.getSPKs().filter(s => myLeads.includes(s.leadId)).map(s => s.id);
    
    // Only see logs relating to their own leads or spks
    history = history.filter(h => 
      (h.entityType === 'lead' && myLeads.includes(h.entityId)) ||
      (h.entityType === 'spk' && mySpks.includes(h.entityId))
    );
  } else if (user.role === 'Finance') {
    // Only see logs for SPK status transitions (not lead status actions)
    const submittedSpks = db.getSPKs().filter(s => s.salesStatus === 'Sent').map(s => s.id);
    history = history.filter(h => h.entityType === 'spk' && submittedSpks.includes(h.entityId));
  }

  res.json({ history });
});
