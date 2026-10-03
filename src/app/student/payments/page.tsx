import { CreditCard, Download } from 'lucide-react';
import { formatPLN } from '@/lib/currency';

export default function StudentPayments() {
  const payments = [
    { id: 'INV-1002', desc: 'Rent - October 2026', amount: 400, status: 'Pending', due: 'Oct 1, 2026' },
    { id: 'INV-1001', desc: 'Rent - September 2026', amount: 400, status: 'Paid', due: 'Sep 1, 2026' },
    { id: 'INV-1000', desc: 'Security Deposit', amount: 400, status: 'Paid', due: 'Aug 25, 2026' },
  ];

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="font-display text-3xl font-medium mb-1">Payments</h1>
        <p className="text-muted-foreground text-sm">Track your rent, deposits, and outstanding balances.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Outstanding Balance</h3>
          <p className="text-3xl font-display text-orange-600 font-semibold">{formatPLN(400, { decimals: true })}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-secondary/5 px-6 py-4 border-b border-border">
          <h2 className="font-medium text-lg">Payment History</h2>
        </div>
        <div className="divide-y divide-border">
          {payments.map((payment) => (
            <div key={payment.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  payment.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{payment.desc}</h3>
                  <p className="text-xs text-muted-foreground">{payment.id} · Due: {payment.due}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className="font-semibold text-lg">{formatPLN(payment.amount, { decimals: true })}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  payment.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {payment.status}
                </span>
                <button className="text-muted-foreground hover:text-primary p-2">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
