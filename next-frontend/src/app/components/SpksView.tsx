'use client';

import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  BadgeAlert, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Send, 
  CheckCircle 
} from 'lucide-react';
import { User, SPK } from '../types';

interface SpksViewProps {
  spks: SPK[];
  currentUser: User;
  openEditSpk: (spk: SPK) => void;
  handleSendSpkToFinance: (spk: SPK) => void;
  openVerifySpk: (spk: SPK) => void;
  setViewingSpkDetail: (spk: SPK | null) => void;
  loading: boolean;
}

export function SpksView({
  spks,
  currentUser,
  openEditSpk,
  handleSendSpkToFinance,
  openVerifySpk,
  setViewingSpkDetail,
  loading
}: SpksViewProps) {
  return (
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
        <div className="bg-indigo-50/70 border border-indigo-100 text-indigo-950 px-6 py-4 rounded-2xl flex items-start gap-3 backdrop-blur-sm shadow-sm md:animate-pulse">
          <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold leading-relaxed">
            <strong>Hak Verifikasi Finance Aktif:</strong> Anda dapat memeriksa detail kelayakan nilai kredit dan menyetujui (Approved) atau merevisi (Rejected) draf SPK yang telah dikirimkan oleh perwakilan tim Sales.
          </div>
        </div>
      )}

      {/* Table list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-400 font-medium shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          Memproses data SPK...
        </div>
      ) : spks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm" id="spks-empty-state">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-bounce-slow" />
          <h3 className="text-lg font-bold text-slate-850">Belum Ada Dokumen SPK</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            {currentUser.role === 'Finance' 
              ? 'Belum ada draf Surat Perintah Kerja (SPK) yang dikirimkan oleh tim Sales untuk diverifikasi.' 
              : 'Belum ada draf Surat Perintah Kerja yang diterbitkan. Konversikan Lead berstatus "Won" menjadi SPK.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="spks-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500 font-bold">
                  <th className="py-4 px-6 font-semibold">Nomor SPK</th>
                  <th className="py-4 px-6 font-semibold">Nama Proyek</th>
                  <th className="py-4 px-6 font-semibold">Klien Perusahaan</th>
                  <th className="py-4 px-6 font-semibold text-right">Nilai Kontrak</th>
                  <th className="py-4 px-6 font-semibold text-center">Status Sales</th>
                  <th className="py-4 px-6 font-semibold text-center">Validasi Finance</th>
                  <th className="py-4 px-6 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {spks.map(spk => {
                  const financeColors = {
                    'Pending': 'bg-blue-50 text-blue-700 border-blue-200',
                    'Approved': 'bg-emerald-50 text-emerald-800 border-emerald-250',
                    'Rejected': 'bg-rose-55 bg-opacity-10 text-rose-700 border-rose-200'
                  }[spk.financeStatus] || 'bg-slate-50 text-slate-700';

                  const salesColors = {
                    'Draft': 'bg-slate-100 text-slate-650',
                    'Sent': 'bg-purple-50 text-purple-750 border-purple-200'
                  }[spk.salesStatus] || 'bg-slate-50 text-slate-750';

                  return (
                    <tr key={spk.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {spk.spkNumber}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-950 font-display line-clamp-1">{spk.projectName}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">Terbit: {new Date(spk.createdAt).toLocaleDateString('id-ID')}</div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {spk.leadCompany}
                      </td>
                      <td className="py-4 px-6 text-right font-bold font-mono text-slate-950 whitespace-nowrap">
                        Rp {spk.contractValue.toLocaleString('id-ID')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${salesColors}`}>
                          {spk.salesStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${financeColors}`}>
                          {spk.financeStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5 justify-end">
                          <button
                            onClick={() => setViewingSpkDetail(spk)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition cursor-pointer"
                            title="Rincian Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Present edit only if Draft and currentUser is Sales/Admin */}
                          {spk.salesStatus === 'Draft' && (currentUser.role === 'Admin' || currentUser.role === 'Sales') && (
                            <>
                              <button
                                onClick={() => openEditSpk(spk)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                                title="Edit SPK"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSendSpkToFinance(spk)}
                                className="p-1.5 bg-indigo-50/70 hover:bg-indigo-600 hover:text-white rounded-lg text-indigo-700 transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Kirim ke Finance"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Show verify button if Sent and currentUser is Finance / Admin */}
                          {spk.salesStatus === 'Sent' && (currentUser.role === 'Finance' || currentUser.role === 'Admin') && (
                            <button
                              onClick={() => openVerifySpk(spk)}
                              className="p-1.5 bg-emerald-580 bg-opacity-10 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                              title="Verifikasi SPK"
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-600 hover:text-white" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
