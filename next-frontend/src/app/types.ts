export interface User {
  id: string;
  email: string;
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

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
