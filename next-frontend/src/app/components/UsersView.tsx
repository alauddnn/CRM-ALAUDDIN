'use client';

import React from 'react';
import { Users, Plus, Edit3, Trash2 } from 'lucide-react';
import { User } from '../types';

interface UsersViewProps {
  adminUsers: User[];
  openNewUser: () => void;
  openEditUser: (user: User) => void;
  handleDeleteUser: (id: string) => void;
  loading: boolean;
}

export function UsersView({
  adminUsers,
  openNewUser,
  openEditUser,
  handleDeleteUser,
  loading
}: UsersViewProps) {
  return (
    <div id="view-users" className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-905">Mengelola Staff Kantor</h3>
          <p className="text-xs text-slate-400 mt-0.5">Daftarkan dan konfigurasikan tingkat akses akun staff pemasaran dan keuangan.</p>
        </div>
        <button
          id="btn-add-user"
          onClick={openNewUser}
          className="w-full md:w-auto px-5 py-2.5 bg-slate-950 hover:bg-slate-850 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          Daftarkan Staff Baru
        </button>
      </div>

      {/* Table list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-400 font-medium">
          <div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full mx-auto mb-4"></div>
          Memperbarui Kredensial Staff...
        </div>
      ) : adminUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-850">Belum Ada Staff Terdaftar</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
            Gunakan tombol tambah staff diatas untuk mendaftarkan akun baru.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="users-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-500 font-bold">
                  <th className="py-4 px-6 font-semibold">Nama Lengkap</th>
                  <th className="py-4 px-6 font-semibold">Email Kredensial</th>
                  <th className="py-4 px-6 font-semibold">Hak Akses Jabatan</th>
                  <th className="py-4 px-6 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {adminUsers.map(u => {
                  const roleColors = {
                    'Admin': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    'Finance': 'bg-amber-55 bg-opacity-10 text-amber-750 border-amber-200',
                    'Sales': 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }[u.role] || 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-bold text-slate-900 font-display">
                        {u.name}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600">
                        {u.email}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${roleColors}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1.5 justify-end">
                          <button
                            onClick={() => openEditUser(u)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                            title="Edit Akun"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer"
                            title="Hapus Akun"
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
        </div>
      )}
    </div>
  );
}
