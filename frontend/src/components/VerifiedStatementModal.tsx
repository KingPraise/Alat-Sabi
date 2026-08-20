'use client';

import React from 'react';
import { 
  Building2, 
  X, 
  Printer, 
  ShieldCheck, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Download
} from 'lucide-react';
import { DashboardResponse } from '@/types';

interface StatementModalProps {
  data: DashboardResponse;
  onClose: () => void;
}

export function VerifiedStatementModal({ data, onClose }: StatementModalProps) {
  const merchant = data.merchant_profile;
  const metrics = data.underwriting_metrics;
  const today = new Date().toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="sticky top-0 bg-white/90 backdrop-blur px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Official Wema Underwriting Document
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div className="p-8 space-y-8 print:p-0">
          
          {/* Bank Letterhead */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#800040] text-white font-black flex items-center justify-center text-sm">
                  W
                </div>
                <div>
                  <h2 className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                    WEMA BANK PLC
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">ALAT MSME Credit Assessment Division</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-medium">
                RC No: 5747 • 54 Marina, Lagos Island, Lagos, Nigeria
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> VERIFIED STATEMENT
              </span>
              <p className="text-xs text-slate-500 flex items-center justify-end gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" /> {today}
              </p>
            </div>
          </div>

          {/* Account Profile Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Business Name</p>
              <p className="font-black text-slate-900 text-sm mt-0.5">{merchant.business_name}</p>
              <p className="text-slate-500 mt-1">Merchant ID: {merchant.id.slice(0, 8)}</p>
              <p className="text-slate-500">Phone: {merchant.phone_number}</p>
            </div>

            <div className="sm:text-right">
              <p className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Wema Virtual Account</p>
              <p className="font-mono font-black text-slate-900 text-base mt-0.5 tracking-wider">
                {merchant.wema_virtual_account}
              </p>
              <p className="text-slate-500 mt-1">{merchant.wema_account_name}</p>
              <p className="text-emerald-600 font-semibold">Settlement: Automated Direct Float</p>
            </div>
          </div>

          {/* Core Underwriting Assessment Metrics */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
              Cashflow & Underwriting Scorecard
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                <p className="text-slate-400 font-semibold text-[10px] uppercase">Wema Credit Score</p>
                <p className="text-lg font-black text-[#800040]">{merchant.credit_score} / 850</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Tier 1 Rating</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                <p className="text-slate-400 font-semibold text-[10px] uppercase">Average Daily Volume</p>
                <p className="text-lg font-black text-slate-900">₦{metrics.adv.toLocaleString('en-NG')}</p>
                <p className="text-[10px] text-slate-500">7-Day Rolling Cashflow</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                <p className="text-slate-400 font-semibold text-[10px] uppercase">Liquidity Ratio</p>
                <p className="text-lg font-black text-slate-900">{(metrics.liquidity_ratio * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-slate-500">Cash/Transfer Settlements</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                <p className="text-slate-400 font-semibold text-[10px] uppercase">Pre-Approved Limit</p>
                <p className="text-lg font-black text-emerald-700">₦{merchant.approved_credit_limit.toLocaleString('en-NG')}</p>
                <p className="text-[10px] text-slate-500">9.0% Working Capital</p>
              </div>
            </div>
          </div>

          {/* Recent Audited Ingestion Records */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
              Verified Voice Transaction Ledger Entries
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Date / Time</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-right">Items</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_transactions.slice(0, 5).map((txn) => (
                    <tr key={txn.id}>
                      <td className="p-3 font-medium text-slate-600">
                        {new Date(txn.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {txn.payment_method}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-600">
                        {txn.items.length} items
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        ₦{Number(txn.total_amount).toLocaleString('en-NG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signoff Certification */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-end justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Digitally Certified by ALAT Sabi Engine</span>
              </div>
              <p className="text-slate-400 text-[10px]">Valid for Wema Restock Loan & Anchor Supplier Financing</p>
            </div>

            <div className="text-right">
              <div className="font-serif italic font-bold text-slate-800 text-sm">Wema Credit Risk Committee</div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Authorized Bank Signature</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
