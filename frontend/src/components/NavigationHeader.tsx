'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMerchant } from '@/context/MerchantContext';
import { 
  Building2, 
  ChevronDown, 
  Layers, 
  BookOpen, 
  ShieldCheck, 
  Check,
  UserCheck
} from 'lucide-react';

export function NavigationHeader() {
  const pathname = usePathname();
  const { currentMerchant, setCurrentMerchant, allMerchants } = useMerchant();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#800040] to-[#500028] border border-pink-500/30 flex items-center justify-center font-bold text-white shadow-sm">
            <span className="text-sm font-black tracking-tight">W</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-pink-400 transition-colors">
                ALAT Sabi
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Conversational MSME Underwriting</p>
          </div>
        </Link>

        {/* Global Merchant Demo Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl text-left transition-all text-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-pink-900/60 border border-pink-600/40 text-pink-300 font-bold flex items-center justify-center text-[10px]">
              {currentMerchant.avatar}
            </div>
            <div className="hidden md:block">
              <p className="font-bold text-slate-200 leading-none">{currentMerchant.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{currentMerchant.market}</p>
            </div>
            <span className={`hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${currentMerchant.tierColor}`}>
              {currentMerchant.riskTier.split('•')[0].trim()}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div 
              className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                <span>Select Demo Trader</span>
                <UserCheck className="w-3 h-3 text-pink-400" />
              </div>
              <div className="space-y-1 mt-1">
                {allMerchants.map((merchant) => {
                  const isSelected = merchant.phone === currentMerchant.phone;
                  return (
                    <button
                      key={merchant.phone}
                      onClick={() => {
                        setCurrentMerchant(merchant);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'bg-pink-950/40 border border-pink-500/30 text-white' 
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs">
                          {merchant.avatar}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{merchant.name}</p>
                          <p className="text-[10px] text-slate-400">{merchant.market}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-pink-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              pathname === '/' 
                ? 'bg-[#800040] text-white font-semibold shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ledger</span>
          </Link>
          <Link
            href="/debts"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              pathname === '/debts' 
                ? 'bg-[#800040] text-white font-semibold shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Book of Debts</span>
          </Link>
          <Link
            href="/admin"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              pathname === '/admin' 
                ? 'bg-slate-700 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Underwriting</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
