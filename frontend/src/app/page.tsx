'use client';

import { useState, useEffect } from 'react';
import { NavigationHeader } from '@/components/NavigationHeader';
import { VoiceRecorderWidget } from '@/components/VoiceRecorderWidget';
import { fetchMerchantDashboard, applyLoan } from '@/services/api';
import { DashboardResponse } from '@/types';
import {
  Copy,
  Check,
  Building2,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Receipt,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  PhoneCall,
  Loader2,
} from 'lucide-react';

export default function MerchantDashboardPage() {
  const [phone, setPhone] = useState('08031234567');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loanAmount, setLoanAmount] = useState<number>(50000);
  const [applyingLoan, setApplyingLoan] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadDashboard = async (phoneNumber: string) => {
    setLoading(true);
    try {
      const res = await fetchMerchantDashboard(phoneNumber);
      setData(res);
    } catch (err) {
      console.error('Failed to load merchant dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(phone);
  }, [phone]);

  const copyVirtualAccount = () => {
    if (data?.merchant_profile.wema_virtual_account) {
      navigator.clipboard.writeText(data.merchant_profile.wema_virtual_account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVoiceSuccess = (res: any) => {
    setToastMessage(`Voice parsed! ${res.receipt?.items?.length || 0} items ledgered`);
    setTimeout(() => setToastMessage(null), 4000);
    loadDashboard(phone);
  };

  const handleLoanDrawdown = async () => {
    if (!loanAmount || loanAmount <= 0) return;
    setApplyingLoan(true);
    try {
      const res = await applyLoan(phone, loanAmount);
      setToastMessage(res.message || 'Wema Micro-Loan Disbursed!');
      setTimeout(() => setToastMessage(null), 4000);
      loadDashboard(phone);
    } catch (err: any) {
      alert(err.message || 'Loan drawdown failed');
    } finally {
      setApplyingLoan(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <NavigationHeader />

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">
        {/* Merchant Selector for Demo */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-wema-purple" /> Switch Merchant Demo:
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

        {/* Global Toast Banner */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-bounce">
            <Sparkles className="w-5 h-5 text-yellow-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-wema-purple" />
            <p className="text-sm font-semibold text-slate-500">Fetching ALAT Sabi Merchant Cashflows...</p>
          </div>
        ) : data ? (
          <>
            {/* Header Card: Merchant Profile & Virtual Account */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{data.merchant_profile.business_name}</h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified MSME
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Phone: {data.merchant_profile.phone_number}</p>
                </div>

                {/* Credit Score Badge */}
                <div className="bg-gradient-to-br from-wema-purple to-wema-darkPurple text-white px-4 py-2.5 rounded-2xl shadow flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Wema Credit Score</span>
                    <div className="text-xl font-black text-yellow-300">{data.merchant_profile.credit_score} <span className="text-xs text-purple-200 font-normal">/ 850</span></div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-yellow-300 font-bold border border-white/20">
                    🏆
                  </div>
                </div>
              </div>

              {/* Wema Virtual Account Strip */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-wema-purple text-white flex items-center justify-center font-black">
                    <Building2 className="w-5 h-5 text-wema-pink" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-extrabold text-wema-purple tracking-wider">Wema Virtual Bank Account</p>
                    <p className="text-lg font-black tracking-widest text-slate-900">{data.merchant_profile.wema_virtual_account}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{data.merchant_profile.wema_account_name}</p>
                  </div>
                </div>

                <button
                  onClick={copyVirtualAccount}
                  className="inline-flex items-center gap-1.5 bg-wema-purple text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-wema-darkPurple transition-all shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Account'}</span>
                </button>
              </div>
            </div>

            {/* Daily Metrics Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today Sales</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-lg font-black text-slate-900">₦{data.today_summary.total_sales.toLocaleString('en-NG')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cash Collected</span>
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-lg font-black text-slate-900">₦{data.today_summary.cash_collected.toLocaleString('en-NG')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unpaid Debts</span>
                  <AlertTriangle className="w-4 h-4 text-wema-red" />
                </div>
                <p className="text-lg font-black text-wema-red">₦{data.today_summary.unpaid_debts.toLocaleString('en-NG')}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Txn Count</span>
                  <Receipt className="w-4 h-4 text-wema-purple" />
                </div>
                <p className="text-lg font-black text-slate-900">{data.today_summary.transaction_count} sales</p>
              </div>
            </div>

            {/* Voice Input Widget */}
            <VoiceRecorderWidget
              phoneNumber={data.merchant_profile.phone_number}
              businessName={data.merchant_profile.business_name}
              onSuccess={handleVoiceSuccess}
            />

            {/* Wema Working Capital Drawdown Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-wema-pink" /> Wema MSME Working Capital Loan
                  </h3>
                  <p className="text-xs text-slate-500">9% Interest • 5% Daily Sales Split Repayment</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-wema-purple border border-purple-200">
                  Pre-Approved
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Approved Limit Available</span>
                  <span className="text-emerald-700">₦{data.merchant_profile.approved_credit_limit.toLocaleString('en-NG')}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-wema-purple to-wema-pink rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (data.merchant_profile.approved_credit_limit / 1000000) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  placeholder="Enter drawdown amount"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-wema-purple"
                />
                <button
                  onClick={handleLoanDrawdown}
                  disabled={applyingLoan || data.merchant_profile.approved_credit_limit <= 0}
                  className="bg-wema-purple text-white px-5 py-2.5 rounded-xl text-xs font-extrabold hover:bg-wema-darkPurple disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md"
                >
                  {applyingLoan ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>Drawdown Funds</span>
                </button>
              </div>
            </div>

            {/* Live Ledger Sales Feed */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center justify-between">
                <span>Recent Ledger Transactions</span>
                <span className="text-xs font-medium text-slate-500">{data.recent_transactions.length} recorded</span>
              </h3>

              {data.recent_transactions.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-400 text-xs">
                  No sales recorded yet today. Tap the mic above to speak your first sale!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.recent_transactions.map((txn) => (
                    <div key={txn.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              txn.payment_method === 'cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : txn.payment_method === 'transfer'
                                ? 'bg-blue-100 text-blue-800'
                                : txn.payment_method === 'credit'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {txn.payment_method}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <span className="text-base font-black text-slate-900">
                          ₦{Number(txn.total_amount).toLocaleString('en-NG')}
                        </span>
                      </div>

                      {txn.raw_transcript && (
                        <p className="text-xs italic text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          "{txn.raw_transcript}"
                        </p>
                      )}

                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        {txn.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-700 font-medium">
                            <span>
                              {item.qty}x {item.name} @ ₦{Number(item.unit_price).toLocaleString('en-NG')}
                            </span>
                            <span className="font-bold">₦{Number(item.total).toLocaleString('en-NG')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
