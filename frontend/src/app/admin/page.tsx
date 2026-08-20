'use client';

import { useState, useEffect } from 'react';
import { NavigationHeader } from '@/components/NavigationHeader';
import { fetchWemaAdminUnderwrite } from '@/services/api';
import { AdminUnderwriteResponse } from '@/types';
import {
  ShieldAlert,
  Users,
  TrendingUp,
  Banknote,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Building2,
  Filter,
} from 'lucide-react';

export default function WemaAdminUnderwriterPage() {
  const [data, setData] = useState<AdminUnderwriteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  const loadUnderwritingData = async () => {
    setLoading(true);
    try {
      const res = await fetchWemaAdminUnderwrite();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin underwriting dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnderwritingData();
  }, []);

  const filteredMerchants = data?.underwriting_leaderboard.filter((m) => {
    if (filterRisk === 'ALL') return true;
    return m.risk_level === filterRisk;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      <NavigationHeader />

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Top Bank Admin Header */}
        <div className="bg-wema-darkPurple text-white rounded-3xl p-6 shadow-xl border border-wema-purple/50 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-wema-red/30 text-wema-pink text-xs font-bold border border-wema-red/40">
              <ShieldAlert className="w-3.5 h-3.5" /> Wema Bank Credit Officer Portal
            </div>
            <h2 className="text-2xl font-black tracking-tight">MSME Cashflow Underwriting Leaderboard</h2>
            <p className="text-xs text-purple-200">Real-time credit scoring & automated loan default risk assessment</p>
          </div>

          <button
            onClick={loadUnderwritingData}
            className="bg-wema-purple text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-wema-lightPurple transition-all shadow border border-white/10"
          >
            Refresh Bank Data
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-wema-purple" />
            <p className="text-sm font-semibold text-slate-500">Loading Wema Credit Portfolio Metrics...</p>
          </div>
        ) : data ? (
          <>
            {/* Top Portfolio Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Merchants</span>
                  <Users className="w-4 h-4 text-wema-purple" />
                </div>
                <p className="text-2xl font-black text-slate-900">{data.bank_summary.total_merchants_onboarded}</p>
                <p className="text-[11px] text-slate-500">Wema Virtual Accounts Active</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Disbursed Loans</span>
                  <Banknote className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-slate-900">
                  ₦{data.bank_summary.total_credit_portfolio_disbursed.toLocaleString('en-NG')}
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold">9% Interest Working Capital</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Low Risk Traders</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-emerald-700">{data.bank_summary.risk_breakdown.low_risk}</p>
                <p className="text-[11px] text-slate-500">Score &gt; 700 & Liquidity &gt; 80%</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold uppercase tracking-wider">Medium / High Risk</span>
                  <AlertTriangle className="w-4 h-4 text-wema-red" />
                </div>
                <p className="text-2xl font-black text-wema-red">
                  {data.bank_summary.risk_breakdown.medium_risk + data.bank_summary.risk_breakdown.high_risk}
                </p>
                <p className="text-[11px] text-slate-500">Monitored for Debt Collections</p>
              </div>
            </div>

            {/* Leaderboard Table & Filter */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-black text-slate-900">Merchant Credit Risk Leaderboard</h3>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span>Filter Tier:</span>
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value)}
                    className="bg-slate-100 border border-slate-300 font-bold px-3 py-1.5 rounded-xl text-wema-purple focus:outline-none"
                  >
                    <option value="ALL">All Risk Tiers</option>
                    <option value="LOW">LOW Risk Tier</option>
                    <option value="MEDIUM">MEDIUM Risk Tier</option>
                    <option value="HIGH">HIGH Risk Tier</option>
                  </select>
                </div>
              </div>

              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase border-b border-slate-200">
                      <th className="p-3">Rank / Merchant</th>
                      <th className="p-3">Wema Virtual Acc</th>
                      <th className="p-3 text-center">Credit Score</th>
                      <th className="p-3 text-right">ADV (Daily Vol)</th>
                      <th className="p-3 text-right">Approved Loan Limit</th>
                      <th className="p-3 text-center">Liquidity Ratio</th>
                      <th className="p-3 text-center">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMerchants?.map((merchant, index) => (
                      <tr key={merchant.merchant_id} className="hover:bg-purple-50/50 transition-all">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-wema-purple text-white flex items-center justify-center font-bold text-[11px]">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">{merchant.business_name}</p>
                              <p className="text-[10px] text-slate-500">{merchant.phone_number}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-700">
                            <Building2 className="w-3.5 h-3.5 text-wema-purple" />
                            <span>{merchant.wema_virtual_account}</span>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <span className="inline-block font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                            {merchant.credit_score} / 850
                          </span>
                        </td>

                        <td className="p-3 text-right font-bold text-slate-900">
                          ₦{merchant.adv.toLocaleString('en-NG')}
                        </td>

                        <td className="p-3 text-right font-black text-emerald-700">
                          ₦{merchant.approved_credit_limit.toLocaleString('en-NG')}
                        </td>

                        <td className="p-3 text-center font-bold text-slate-700">
                          {(merchant.liquidity_ratio * 100).toFixed(0)}%
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              merchant.risk_level === 'LOW'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : merchant.risk_level === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {merchant.risk_level} RISK
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
