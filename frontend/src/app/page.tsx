'use client';

import { useState, useEffect } from 'react';
import { NavigationHeader } from '@/components/NavigationHeader';
import { VoiceRecorderWidget } from '@/components/VoiceRecorderWidget';
import { VerifiedStatementModal } from '@/components/VerifiedStatementModal';
import { fetchMerchantDashboard, applyLoan } from '@/services/api';
import { DashboardResponse } from '@/types';
import { useMerchant } from '@/context/MerchantContext';
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
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function MerchantDashboardPage() {
  const { currentMerchant } = useMerchant();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loanAmount, setLoanAmount] = useState<number>(50000);
  const [applyingLoan, setApplyingLoan] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

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
    loadDashboard(currentMerchant.phone);
  }, [currentMerchant.phone]);

  const copyVirtualAccount = () => {
    if (data?.merchant_profile.wema_virtual_account) {
      navigator.clipboard.writeText(data.merchant_profile.wema_virtual_account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVoiceSuccess = (res: any) => {
    setToastMessage(`Voice note processed! ${res.receipt?.items?.length || 0} items added to double-entry ledger.`);
    setTimeout(() => setToastMessage(null), 4000);
    loadDashboard(currentMerchant.phone);
  };

  const handleLoanDrawdown = async () => {
    if (!loanAmount || loanAmount <= 0) return;
    setApplyingLoan(true);
    try {
      const res = await applyLoan(currentMerchant.phone, loanAmount);
      setToastMessage(res.message || 'Wema Micro-Loan Disbursed!');
      setTimeout(() => setToastMessage(null), 4000);
      loadDashboard(currentMerchant.phone);
    } catch (err: any) {
      alert(err.message || 'Loan drawdown failed');
    } finally {
      setApplyingLoan(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-pink-500 selection:text-white">
      <NavigationHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-600/90 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur border border-emerald-400/30 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
            <p className="text-xs font-medium text-slate-400 tracking-wide">Syncing ALAT Sabi Ledger & Underwriting Metrics...</p>
          </div>
        ) : data ? (
          <>
            {/* Top Row: Merchant Profile & Virtual Account Card + Credit Score Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Profile & Virtual Account (2 Cols) */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-white tracking-tight">{data.merchant_profile.business_name}</h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> Live Merchant
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">
                      Phone: {data.merchant_profile.phone_number} • {currentMerchant.market}
                    </p>
                  </div>

                  <button
                    onClick={() => setIsStatementOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-pink-400" />
                    <span>Export Statement</span>
                  </button>
                </div>

                {/* Virtual Account Strip */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#800040] to-[#500028] text-white flex items-center justify-center font-black border border-pink-500/30 shadow">
                      <Building2 className="w-5 h-5 text-pink-200" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-pink-400 tracking-wider">Dedicated Wema Virtual Account</p>
                      <p className="text-lg font-mono font-black tracking-widest text-white">{data.merchant_profile.wema_virtual_account}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{data.merchant_profile.wema_account_name}</p>
                    </div>
                  </div>

                  <button
                    onClick={copyVirtualAccount}
                    className="inline-flex items-center gap-1.5 bg-[#800040] hover:bg-[#900048] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border border-pink-500/30"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy Number'}</span>
                  </button>
                </div>
              </div>

              {/* Credit Underwriting Score Card (1 Col) */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-[#300018] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400">Wema Underwriting</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    Real-time
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">{data.merchant_profile.credit_score}</span>
                    <span className="text-xs text-slate-400 font-medium">/ 850 Max Score</span>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold">{currentMerchant.riskTier}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Calculated from turnover velocity, debt settlement speed, and liquidity ratio.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Liquidity Ratio:</span>
                  <span className="font-bold text-slate-200">{(data.underwriting_metrics.liquidity_ratio * 100).toFixed(0)}%</span>
                </div>
              </div>

            </div>

            {/* Daily Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Today Sales</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-lg font-black text-white">₦{data.today_summary.total_sales.toLocaleString('en-NG')}</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Cash Collected</span>
                  <Wallet className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-lg font-black text-white">₦{data.today_summary.cash_collected.toLocaleString('en-NG')}</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Unpaid Debts</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-lg font-black text-rose-400">₦{data.today_summary.unpaid_debts.toLocaleString('en-NG')}</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Txn Velocity</span>
                  <Receipt className="w-4 h-4 text-pink-400" />
                </div>
                <p className="text-lg font-black text-white">{data.today_summary.transaction_count} sales</p>
              </div>
            </div>

            {/* Voice Input Widget with Quick Test Chips */}
            <VoiceRecorderWidget
              phoneNumber={data.merchant_profile.phone_number}
              businessName={data.merchant_profile.business_name}
              onSuccess={handleVoiceSuccess}
            />

            {/* Working Capital Drawdown Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400" /> Wema MSME Restock Micro-Loan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">9.0% Flat Rate • 5.0% Daily Sales Deduction Repayment</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  Pre-Approved Working Capital
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Approved Credit Limit</span>
                  <span className="text-emerald-400 font-extrabold text-sm">₦{data.merchant_profile.approved_credit_limit.toLocaleString('en-NG')}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-600 to-emerald-500 rounded-full transition-all duration-500"
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
                  placeholder="Enter loan drawdown amount"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                />
                <button
                  onClick={handleLoanDrawdown}
                  disabled={applyingLoan || data.merchant_profile.approved_credit_limit <= 0}
                  className="bg-[#800040] hover:bg-[#900048] border border-pink-500/30 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold disabled:opacity-50 transition-all flex items-center gap-1.5 shadow"
                >
                  {applyingLoan ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>Drawdown Restock Funds</span>
                </button>
              </div>
            </div>

            {/* Live Ledger Sales Feed */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                  Live Ledger Transactions ({data.recent_transactions.length})
                </h3>
                <span className="text-xs text-slate-400">Auto-audited double-entry records</span>
              </div>

              {data.recent_transactions.length === 0 ? (
                <div className="bg-slate-900 p-8 rounded-2xl text-center border border-slate-800 text-slate-500 text-xs">
                  No sales recorded yet. Speak a trade note or click a test chip above!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.recent_transactions.map((txn) => (
                    <div key={txn.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              txn.payment_method === 'cash'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                : txn.payment_method === 'transfer'
                                ? 'bg-blue-950 text-blue-300 border border-blue-700/50'
                                : txn.payment_method === 'credit'
                                ? 'bg-rose-950 text-rose-300 border border-rose-700/50'
                                : 'bg-purple-950 text-purple-300 border border-purple-700/50'
                            }`}
                          >
                            {txn.payment_method}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <span className="text-sm font-black text-white">
                          ₦{Number(txn.total_amount).toLocaleString('en-NG')}
                        </span>
                      </div>

                      {txn.raw_transcript && (
                        <p className="text-xs italic text-slate-300 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                          &quot;{txn.raw_transcript}&quot;
                        </p>
                      )}

                      <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                        {txn.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-300 font-medium">
                            <span>
                              {item.qty}x {item.name} @ ₦{Number(item.unit_price).toLocaleString('en-NG')}
                            </span>
                            <span className="font-bold text-slate-200">₦{Number(item.total).toLocaleString('en-NG')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Statement Modal */}
            {isStatementOpen && (
              <VerifiedStatementModal data={data} onClose={() => setIsStatementOpen(false)} />
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
