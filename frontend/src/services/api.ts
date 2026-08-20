const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://alat-sabi-api.onrender.com/api/v1';

export async function fetchMerchantDashboard(phone: string) {
  const res = await fetch(`${API_BASE_URL}/merchant/dashboard/${phone}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
  return res.json();
}

export async function uploadVoiceAudio(phone: string, businessName: string, audioBlob: Blob) {
  const formData = new FormData();
  formData.append('phone_number', phone);
  formData.append('business_name', businessName);
  formData.append('audio', audioBlob, 'voice_note.webm');

  const res = await fetch(`${API_BASE_URL}/ledger/voice-upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Voice parsing upload failed');
  }
  return res.json();
}

export async function applyLoan(phone: string, requestedAmount: number) {
  const res = await fetch(`${API_BASE_URL}/loans/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phone, requested_amount: requestedAmount }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Loan drawdown application failed');
  }
  return res.json();
}

export async function fetchMerchantDebtors(phone: string) {
  const res = await fetch(`${API_BASE_URL}/debtors/${phone}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch active debtors list');
  return res.json();
}

export async function settleDebtor(debtorId: string, amountPaid: number) {
  const res = await fetch(`${API_BASE_URL}/debtors/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ debtor_id: debtorId, amount_paid: amountPaid }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Debtor settlement failed');
  }
  return res.json();
}

export async function fetchWemaAdminUnderwrite() {
  const res = await fetch(`${API_BASE_URL}/wema/admin/underwrite`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch bank underwriter leaderboard');
  return res.json();
}
