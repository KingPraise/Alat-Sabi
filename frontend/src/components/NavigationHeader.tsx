'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, BookOpenCheck, ShieldAlert, Sparkles } from 'lucide-react';

export function NavigationHeader() {
  return (
    <header className="bg-wema-purple text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-wema-red flex items-center justify-center font-bold text-white shadow-inner">
            W
          </div>
          <div>
            <h1 className="font-extrabold tracking-tight text-lg leading-tight flex items-center gap-1">
              ALAT <span className="text-wema-pink">Sabi</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            </h1>
            <p className="text-[10px] text-purple-200">Voice-to-Ledger Engine</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 bg-wema-darkPurple/60 p-1 rounded-xl text-xs">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-wema-purple transition-all"
          >
            <LayoutDashboard className="w-4 h-4 text-wema-pink" />
            <span className="hidden sm:inline">Ledger</span>
          </Link>
          <Link
            href="/debts"
            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-wema-purple transition-all"
          >
            <BookOpenCheck className="w-4 h-4 text-yellow-400" />
            <span className="hidden sm:inline">Debts</span>
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-wema-purple transition-all border border-wema-red/40"
          >
            <ShieldAlert className="w-4 h-4 text-wema-red" />
            <span className="hidden sm:inline">Bank Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
