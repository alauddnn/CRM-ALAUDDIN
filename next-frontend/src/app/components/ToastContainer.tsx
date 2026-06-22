'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  return (
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
  );
}
