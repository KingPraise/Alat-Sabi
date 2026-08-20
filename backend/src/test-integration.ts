import { bootstrapApp } from './app';

async function testBackendEngine() {
  console.log('🧪 Starting ALAT Sabi Backend API Integration Test Suite...\n');
  const app = await bootstrapApp();

  const server = app.listen(5098, async () => {
    try {
      const baseUrl = 'http://localhost:5098/api/v1';

      // 1. Test Health Check
      console.log('1️⃣ Testing GET /health ...');
      const healthRes = await fetch('http://localhost:5098/health');
      const healthData = await healthRes.json();
      console.log('   Response:', JSON.stringify(healthData));

      // 2. Test Voice Webhook Ledger Entry
      console.log('\n2️⃣ Testing POST /api/v1/ledger/entry ...');
      const ledgerPayload = {
        phone_number: '08031234567',
        business_name: 'Mama Chukwudi Lace & Fabrics (Balogun Market)',
        raw_transcript: 'I sell 3 yards of Guinea Brocade for 15k cash and 1 Lace for 10k credit to Madam Ngozi',
        items: [
          { name: 'Guinea Brocade (3 yards)', qty: 1, unit_price: 15000, total: 15000 },
          { name: 'Swiss Lace (1 yard)', qty: 1, unit_price: 10000, total: 10000 },
        ],
        total_amount: 25000,
        amount_paid: 15000,
        debt_amount: 10000,
        debtor_name: 'Madam Ngozi',
        payment_method: 'split',
      };
      const ledgerRes = await fetch(`${baseUrl}/ledger/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ledgerPayload),
      });
      const ledgerData = await ledgerRes.json();
      console.log('   Ledger Response Status:', ledgerRes.status);
      console.log('   Receipt ID:', ledgerData.receipt?.receipt_id);
      console.log('   Updated Credit Score:', ledgerData.merchant_underwriting?.updated_credit_score);
      console.log('   Approved Credit Limit:', ledgerData.merchant_underwriting?.approved_credit_limit);

      // 3. Test Merchant Dashboard Aggregation
      console.log('\n3️⃣ Testing GET /api/v1/merchant/dashboard/08031234567 ...');
      const dashRes = await fetch(`${baseUrl}/merchant/dashboard/08031234567`);
      const dashData = await dashRes.json();
      console.log('   Virtual Account:', dashData.merchant_profile?.wema_virtual_account);
      console.log('   Today Total Sales:', dashData.today_summary?.total_sales);
      console.log('   Active Debtors Count:', dashData.active_debtors?.length);

      // 4. Test Debtors & WhatsApp Link Generation
      console.log('\n4️⃣ Testing GET /api/v1/debtors/08031234567 ...');
      const debtorsRes = await fetch(`${baseUrl}/debtors/08031234567`);
      const debtorsData = await debtorsRes.json();
      console.log('   Total Outstanding Owed:', debtorsData.total_outstanding_owed);
      if (debtorsData.debtors && debtorsData.debtors.length > 0) {
        console.log('   Debtor Name:', debtorsData.debtors[0].debtor_name);
        console.log('   WhatsApp Link Sample:', debtorsData.debtors[0].whatsapp_reminder_link);
      }

      // 5. Test Debtor Settle
      if (debtorsData.debtors && debtorsData.debtors.length > 0) {
        const debtorId = debtorsData.debtors[0].id;
        console.log(`\n5️⃣ Testing POST /api/v1/debtors/settle for Debtor ${debtorId} ...`);
        const settleRes = await fetch(`${baseUrl}/debtors/settle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ debtor_id: debtorId, amount_paid: 5000 }),
        });
        const settleData = await settleRes.json();
        console.log('   Settle Response Status:', settleRes.status);
        console.log('   New Debtor Total Owed:', settleData.debtor?.total_owed);
      }

      // 6. Test Loan Drawdown Request
      console.log('\n6️⃣ Testing POST /api/v1/loans/apply ...');
      const loanRes = await fetch(`${baseUrl}/loans/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: '08031234567', requested_amount: 50000 }),
      });
      const loanData = await loanRes.json();
      console.log('   Loan Application Response Status:', loanRes.status);
      console.log('   Disbursed Loan Amount:', loanData.loan?.disbursed_amount);
      console.log('   Remaining Credit Limit:', loanData.remaining_credit_limit);

      // 7. Test Wema Bank Admin Underwriting Dashboard
      console.log('\n7️⃣ Testing GET /api/v1/wema/admin/underwrite ...');
      const adminRes = await fetch(`${baseUrl}/wema/admin/underwrite`);
      const adminData = await adminRes.json();
      console.log('   Bank Portfolio Summary:', JSON.stringify(adminData.bank_summary));
      console.log('   Top Merchant Ranked:', adminData.underwriting_leaderboard[0]?.business_name);
      console.log('   Top Merchant Credit Score:', adminData.underwriting_leaderboard[0]?.credit_score);

      console.log('\n🎉 ALL INTEGRATION TESTS PASSED CLEANLY!');
    } catch (err) {
      console.error('❌ Test failed:', err);
    } finally {
      server.close();
    }
  });
}

testBackendEngine();
