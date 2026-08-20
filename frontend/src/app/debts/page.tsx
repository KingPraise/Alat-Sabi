'use client';

import { useState, useEffect } from 'react';
import { NavigationHeader } from '@/components/NavigationHeader';
import { fetchMerchantDebtors, settleDebtor } from '@/services/api';
import { DebtorListResponse } from '@/types';
import { useMerchant } from '@/context/MerchantContext';
import {
  BookOpenCheck,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wallet,
  Calendar,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function DebtorsBookPage() {
  const { currentMerchant } = useMerchant();
  const [data, setData] = useState<DebtorListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadDebtors = async (phoneNumber: string) => {
    setLoading(true);
    try {
      const res = await fetchMerchantDebtors(phoneNumber);
      setData(res);
    } catch (err) {
      console.error('Failed to load debtors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebtors(currentMerchant.phone);
  }, [currentMerchant.phone]);

  const handleSettle = async (debtorId: string, fullAmount: number) => {
    const amountStr = prompt('Enter repayment amount to deduct (Naira):', fullAmount.toString());
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    setSettlingId(debtorId);
    try {
      const res = await settleDebtor(debtorId, amount);
      setToastMessage(res.message || 'Debt settlement recorded!');
      setTimeout(() => setToastMessage(null), 4000);
      loadDebtors(currentMerchant.phone);
    } catch (err: any) {
      alert(err.message || 'Settlement failed');
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-pink-500 selection:text-white">
      <NavigationHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Toast */}
        {toastMessage && (
          <div className="bg-emerald-600/90 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur border border-emerald-400/30 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-pink-900/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  Book of Debts (Owo Ilu)
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">{data?.merchant_business_name || currentMerchant.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Automated debt collection, WhatsApp reminder dispatch, and credit recovery
              </p>
            </div>

            <div className="bg-slate-950/80 px-5 py-3 rounded-2xl border border-slate-800 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Outstanding Balance</span>
              <p className="text-2xl font-black text-rose-400 mt-0.5">
                ₦{data?.total_outstanding_owed ? data.total_outstanding_owed.toLocaleString('en-NG') : '0'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
            <p className="text-xs font-medium text-slate-400">Loading active credit balances...</p>
          </div>
        ) : data ? (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Active Debtors ({data.total_active_debtors})</span>
              <span className="text-[11px] text-slate-500">Sorted by outstanding balance</span>
            </div>

            {data.debtors.length === 0 ? (
              <div className="bg-slate-900 p-10 rounded-3xl text-center border border-slate-800 text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="font-bold text-white text-sm">All customer accounts settled!</p>
                <p className="text-xs text-slate-400">No unpaid debts in the ledger for this merchant profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.debtors.map((debtor) => {
                  const createdDate = new Date(debtor.created_at);
                  const daysAgo = Math.max(1, Math.ceil((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div key={debtor.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-extrabold text-white text-base">{debtor.debtor_name}</h3>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Phone: {debtor.debtor_phone || 'No phone attached'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {daysAgo} days outstanding
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xl font-black text-rose-400">
                            ₦{Number(debtor.total_owed).toLocaleString('en-NG')}
                          </span>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-950 text-rose-300 border border-rose-800/40 mt-1">
                              {debtor.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                        {debtor.whatsapp_reminder_link ? (
                          <a
                            href={debtor.whatsapp_reminder_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                            <span>WhatsApp Reminder</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No phone attached</span>
                        )}

                        <button
                          onClick={() => handleSettle(debtor.id, debtor.total_owed)}
                          disabled={settlingId === debtor.id}
                          className="inline-flex items-center gap-1.5 bg-[#800040] hover:bg-[#900048] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border border-pink-500/30"
                        >
                          {settlingId === debtor.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wallet className="w-4 h-4" />
                          )}
                          <span>Record Settle</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
