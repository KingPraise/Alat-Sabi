'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MerchantOption {
  phone: string;
  name: string;
  market: string;
  riskTier: string;
  tierColor: string;
  avatar: string;
}

export const DEMO_MERCHANTS: MerchantOption[] = [
  {
    phone: '08031234567',
    name: 'Mama Chukwudi',
    market: 'Balogun Textile Market',
    riskTier: 'Tier 1 • Prime Underwriting',
    tierColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    avatar: 'MC',
  },
  {
    phone: '08059876543',
    name: 'Baba Tunde',
    market: 'Computer Village Ikeja',
    riskTier: 'Tier 2 • Growth Restock',
    tierColor: 'bg-amber-50 text-amber-700 border-amber-200',
    avatar: 'BT',
  },
  {
    phone: '08021112233',
    name: 'Iya Moria',
    market: 'Mile 12 Produce Market',
    riskTier: 'Tier 3 • High Velocity',
    tierColor: 'bg-purple-50 text-purple-700 border-purple-200',
    avatar: 'IM',
  },
];

interface MerchantContextType {
  currentMerchant: MerchantOption;
  setCurrentMerchant: (m: MerchantOption) => void;
  allMerchants: MerchantOption[];
}

const MerchantContext = createContext<MerchantContextType>({
  currentMerchant: DEMO_MERCHANTS[0],
  setCurrentMerchant: () => {},
  allMerchants: DEMO_MERCHANTS,
});

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [currentMerchant, setCurrentMerchant] = useState<MerchantOption>(DEMO_MERCHANTS[0]);

  return (
    <MerchantContext.Provider value={{ currentMerchant, setCurrentMerchant, allMerchants: DEMO_MERCHANTS }}>
      {children}
    </MerchantContext.Provider>
  );
}

export const useMerchant = () => useContext(MerchantContext);
