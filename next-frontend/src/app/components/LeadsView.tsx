'use client';

import React from 'react';
import { 
  Briefcase, 
  CheckCircle, 
  TrendingUp, 
  XCircle, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  ArrowRightLeft, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { User, Lead } from '../types';

interface LeadsViewProps {
  leads: Lead[];
  leadsTotal: number;
  leadsPage: number;
  leadsTotalPages: number;
  setLeadsPage: React.Dispatch<React.SetStateAction<number>>;
  leadsSearch: string;
  setLeadsSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  currentUser: User;
  openNewLead: () => void;
  openEditLead: (lead: Lead) => void;
  handleDeleteLead: (id: string) => void;
  openConvertLead: (lead: Lead) => void;
  setViewingLeadDetail: (lead: Lead | null) => void;
  loading: boolean;
}

export function LeadsView({
  leads,
  leadsTotal,
  leadsPage,
  leadsTotalPages,
  setLeadsPage,
  leadsSearch,
  setLeadsSearch,
  statusFilter,
  setStatusFilter,
  currentUser,
  openNewLead,
  openEditLead,
  handleDeleteLead,
  openConvertLead,
  setViewingLeadDetail,
  loading
}: LeadsViewProps) {
  return (
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

      {/* Filter and controls bar */}
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
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-800 transition bg-white/50 font-medium"
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
        <div className="w-full md:w-auto self-stretch md:self-auto shrink-0 animate-fade-in">
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
        <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-400 font-medium shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          Memproses data Leads...
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm" id="leads-empty-state">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-bounce-slow" />
          <h3 className="text-lg font-bold text-slate-850">Belum Ada Leads</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            Belum ada Lead terdaftar yang sesuai filter. Mulailah dengan menambahkan draf calon pembeli baru.
          </p>
          <button 
            onClick={openNewLead}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
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
              <tbody className="divide-y divide-slate-100 font-medium">
                {leads.map(lead => {
                  const badgeColors = {
                    'New': 'bg-blue-50 text-blue-700 border-blue-200',
                    'Contacted': 'bg-cyan-50 text-cyan-700 border-cyan-200',
                    'Qualified': 'bg-purple-50 text-purple-700 border-purple-200',
                    'Negotiation': 'bg-amber-50 text-amber-700 border-amber-200',
                    'Won': 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    'Lost': 'bg-rose-50 text-rose-700 border-rose-200'
                  }[lead.status] || 'bg-slate-50 text-slate-700';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 font-display text-base">{lead.companyName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{lead.contactName}</div>
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell whitespace-nowrap">
                        <div className="text-xs font-mono">{lead.phone}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{lead.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                          {lead.source}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold font-mono text-slate-950 whitespace-nowrap">
                        Rp {lead.estimatedValue.toLocaleString('id-ID')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColors}`}>
                          {lead.status}
                        </span>
                      </td>
                      {currentUser.role === 'Admin' && (
                        <td className="py-4 px-6 text-xs font-semibold text-slate-700">
                          {lead.salesName}
                        </td>
                      )}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5 justify-end">
                          <button
                            onClick={() => setViewingLeadDetail(lead)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition cursor-pointer"
                            title="Rincian Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {lead.status === 'Won' && (
                            <button
                              onClick={() => openConvertLead(lead)}
                              className="p-1.5 hover:bg-slate-900 rounded-lg text-emerald-600 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                              title="Konversi ke SPK"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => openEditLead(lead)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Edit Lead"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
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
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition rounded-lg disabled:opacity-50 cursor-pointer"
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
                className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
