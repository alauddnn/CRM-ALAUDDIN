'use client';

import React from 'react';
import { History, AlertCircle } from 'lucide-react';
import { HistoryLog } from '../types';

interface HistoryViewProps {
  history: HistoryLog[];
  loading: boolean;
}

export function HistoryView({ history, loading }: HistoryViewProps) {
  return (
    <div id="view-history" className="space-y-6">
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-400 font-medium">
          <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          Memperbarui Riwayat Aktivitas...
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm" id="history-empty-state">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-850">Belum Ada Riwayat Kerja</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            Semua aktivitas perubahan status Lead dan penerbitan SPK akan terekam secara otomatis di sini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="history-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500 font-bold">
                  <th className="py-4 px-6 font-semibold">Waktu Pembaruan</th>
                  <th className="py-4 px-6 font-semibold">Tipe Entitas</th>
                  <th className="py-4 px-6 font-semibold">Status Awal</th>
                  <th className="py-4 px-6 font-semibold">Status Baru</th>
                  <th className="py-4 px-6 font-semibold">Diperbarui Oleh</th>
                  <th className="py-4 px-6 font-semibold">Catatan Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {history.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-6 text-xs whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                        log.entityType === 'lead' 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {log.previousStatus}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {log.newStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="text-slate-905 font-bold">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{log.userRole}</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600 italic font-normal max-w-xs leading-relaxed">
                      "{log.notes || 'Tidak ada catatan khusus.'}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
