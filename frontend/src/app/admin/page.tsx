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
  ArrowUpDown,
  FileSpreadsheet
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-pink-500 selection:text-white">
      <NavigationHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-pink-900/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-950/80 text-pink-300 text-xs font-bold border border-pink-500/30">
              <ShieldAlert className="w-3.5 h-3.5" /> Wema Bank Credit Officer Portal
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">MSME Cashflow Underwriting Leaderboard</h2>
            <p className="text-xs text-slate-400 font-medium">Real-time credit scoring, ADV cashflow metrics, and risk tier evaluation</p>
          </div>

          <button
            onClick={loadUnderwritingData}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow border border-slate-700"
          >
            Refresh Bank Data
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
            <p className="text-xs font-medium text-slate-400">Loading Wema MSME credit portfolio...</p>
          </div>
        ) : data ? (
          <>
            {/* Top Portfolio Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Merchants</span>
                  <Users className="w-4 h-4 text-pink-400" />
                </div>
                <p className="text-2xl font-black text-white">{data.bank_summary.total_merchants_onboarded}</p>
                <p className="text-[11px] text-slate-500">Live Wema Virtual Accounts</p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Disbursed Working Capital</span>
                  <Banknote className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-emerald-400">
                  ₦{data.bank_summary.total_credit_portfolio_disbursed.toLocaleString('en-NG')}
                </p>
                <p className="text-[11px] text-emerald-500/80 font-semibold">9% Working Capital Restock</p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Low Risk Volume</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white">{data.bank_summary.risk_breakdown.low_risk} Traders</p>
                <p className="text-[11px] text-slate-500">Score &gt; 700 & Liquidity &gt; 80%</p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Monitored Accounts</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-2xl font-black text-rose-400">
                  {data.bank_summary.risk_breakdown.medium_risk + data.bank_summary.risk_breakdown.high_risk} Traders
                </p>
                <p className="text-[11px] text-slate-500">Active Debt Recovery Tracking</p>
              </div>
            </div>

            {/* Leaderboard Table & Filters */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-white">Merchant Credit Risk Leaderboard</h3>
                  <p className="text-xs text-slate-400">Ranked by turnover velocity and debt settlement consistency</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Filter Risk:</span>
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value)}
                    className="bg-slate-950 border border-slate-800 font-bold px-3 py-1.5 rounded-xl text-pink-300 focus:outline-none focus:border-pink-500"
                  >
                    <option value="ALL">All Tiers (3)</option>
                    <option value="LOW">LOW Risk Tier</option>
                    <option value="MEDIUM">MEDIUM Risk Tier</option>
                    <option value="HIGH">HIGH Risk Tier</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <th className="p-3.5">Rank & Merchant</th>
                      <th className="p-3.5">Wema Virtual Acc</th>
                      <th className="p-3.5 text-center">Score</th>
                      <th className="p-3.5 text-right">ADV (Daily Vol)</th>
                      <th className="p-3.5 text-right">Approved Limit</th>
                      <th className="p-3.5 text-center">Liquidity Ratio</th>
                      <th className="p-3.5 text-center">Risk Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredMerchants?.map((merchant, index) => (
                      <tr key={merchant.merchant_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-pink-300 flex items-center justify-center font-bold text-xs border border-slate-700">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-extrabold text-white text-xs">{merchant.business_name}</p>
                              <p className="text-[10px] text-slate-500">{merchant.phone_number}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-pink-400" />
                            <span>{merchant.wema_virtual_account}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="inline-block font-black text-xs text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            {merchant.credit_score} / 850
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-bold text-slate-200">
                          ₦{merchant.adv.toLocaleString('en-NG')}
                        </td>

                        <td className="p-3.5 text-right font-black text-emerald-400">
                          ₦{merchant.approved_credit_limit.toLocaleString('en-NG')}
                        </td>

                        <td className="p-3.5 text-center font-bold text-slate-300">
                          {(merchant.liquidity_ratio * 100).toFixed(0)}%
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              merchant.risk_level === 'LOW'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                                : merchant.risk_level === 'MEDIUM'
                                ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                                : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                            }`}
                          >
                            {merchant.risk_level}
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
