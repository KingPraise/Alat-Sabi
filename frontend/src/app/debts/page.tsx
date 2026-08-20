'use client';

import { useState, useEffect } from 'react';
import { NavigationHeader } from '@/components/NavigationHeader';
import { fetchMerchantDebtors, settleDebtor } from '@/services/api';
import { DebtorListResponse } from '@/types';
import {
  BookOpenCheck,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PhoneCall,
  Sparkles,
  Wallet,
} from 'lucide-react';

export default function DebtorsBookPage() {
  const [phone, setPhone] = useState('08031234567');
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
    loadDebtors(phone);
  }, [phone]);

  const handleSettle = async (debtorId: string, fullAmount: number) => {
    const amountStr = prompt('Enter payment amount to deduct (Naira):', fullAmount.toString());
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    setSettlingId(debtorId);
    try {
      const res = await settleDebtor(debtorId, amount);
      setToastMessage(res.message || 'Payment recorded!');
      setTimeout(() => setToastMessage(null), 4000);
      loadDebtors(phone);
    } catch (err: any) {
      alert(err.message || 'Settlement failed');
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <NavigationHeader />

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">
        {/* Merchant Switcher */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-wema-purple" /> Merchant Ledger Book:
          </span>
          <select
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-slate-100 font-bold text-wema-purple px-3 py-1.5 rounded-xl border border-slate-300 focus:outline-none"
          >
            <option value="08031234567">08031234567 (Mama Chukwudi - Fabrics)</option>
            <option value="08059876543">08059876543 (Ifeanyi Tech - Electronics)</option>
            <option value="08021112233">08021112233 (Alhaji Tanko - Produce)</option>
          </select>
        </div>

        {/* Global Toast */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-bounce">
            <Sparkles className="w-5 h-5 text-yellow-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-wema-purple to-wema-darkPurple text-white rounded-3xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-yellow-300 font-extrabold text-xs uppercase tracking-wider">
            <BookOpenCheck className="w-4 h-4" /> Book of Debts (Owo Ilu)
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">{data?.merchant_business_name || 'Merchant Ledger'}</h2>
              <p className="text-xs text-purple-200 mt-0.5">Automated Debt Collection & Reminder Dispatch</p>
            </div>

            <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/15">
              <span className="text-[10px] uppercase font-bold text-purple-200">Total Uncollected Debt</span>
              <p className="text-xl font-black text-wema-pink">
                ₦{data?.total_outstanding_owed ? data.total_outstanding_owed.toLocaleString('en-NG') : '0'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-wema-purple" />
            <p className="text-sm font-semibold text-slate-500">Fetching Active Debt Book...</p>
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Active Credit Buyers ({data.total_active_debtors})</span>
              <span>Sorted by Most Recent</span>
            </div>

            {data.debtors.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-400 text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700">No active outstanding debts!</p>
                <p>All credit buyers have settled their balances.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.debtors.map((debtor) => {
                  const createdDate = new Date(debtor.created_at);
                  const daysAgo = Math.max(1, Math.ceil((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div key={debtor.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-black text-slate-900 text-base">{debtor.debtor_name}</h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Phone: {debtor.debtor_phone || 'Not attached'} • {daysAgo} days outstanding
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black text-wema-red">
                            ₦{Number(debtor.total_owed).toLocaleString('en-NG')}
                          </span>
                          <div className="mt-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-800">
                              {debtor.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        {debtor.whatsapp_reminder_link ? (
                          <a
                            href={debtor.whatsapp_reminder_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-emerald-700 transition-all shadow-sm"
                          >
                            <MessageCircle className="w-4 h-4 fill-current text-white" />
                            <span>WhatsApp Reminder Link</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No phone attached for WhatsApp</span>
                        )}

                        <button
                          onClick={() => handleSettle(debtor.id, debtor.total_owed)}
                          disabled={settlingId === debtor.id}
                          className="inline-flex items-center gap-1.5 bg-wema-purple text-white px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-wema-darkPurple disabled:opacity-50 transition-all shadow-sm"
                        >
                          {settlingId === debtor.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wallet className="w-4 h-4" />
                          )}
                          <span>Record Payment</span>
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
