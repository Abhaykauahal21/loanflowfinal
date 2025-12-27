import React, { useMemo, useState } from 'react';
import { generateEmiSchedule } from '../utils/emi';

/**
 * PaymentForm
 *
 * A lightweight component to preview EMI and the amortization schedule.
 * Accepts optional props to prefill values. If not provided, uses local state.
 */
const PaymentForm = ({
  defaultAmount = 100000,
  defaultAnnualRate = 12,
  defaultMonths = 12,
  defaultApprovalDate = '2025-11-15',
}) => {
  const [loanAmount, setLoanAmount] = useState(defaultAmount);
  const [annualInterestRate, setAnnualInterestRate] = useState(defaultAnnualRate);
  const [loanTenureMonths, setLoanTenureMonths] = useState(defaultMonths);
  const [approvalDate, setApprovalDate] = useState(defaultApprovalDate);
  const [error, setError] = useState('');

  const result = useMemo(() => {
    try {
      setError('');
      return generateEmiSchedule({
        loanAmount: Number(loanAmount),
        annualInterestRate: Number(annualInterestRate),
        loanTenureMonths: Number(loanTenureMonths),
        approvalDate,
      });
    } catch (e) {
      setError(e.message || 'Failed to calculate schedule');
      return null;
    }
  }, [loanAmount, annualInterestRate, loanTenureMonths, approvalDate]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Loan Amount</label>
          <input
            type="number"
            min={1}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Annual Interest Rate (%)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={annualInterestRate}
            onChange={(e) => setAnnualInterestRate(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Tenure (months)</label>
          <input
            type="number"
            min={1}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={loanTenureMonths}
            onChange={(e) => setLoanTenureMonths(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Approval Date</label>
          <input
            type="date"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={approvalDate}
            onChange={(e) => setApprovalDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Monthly EMI</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">${result.emi.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Last EMI auto-adjusts for rounding</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Total Interest</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">${result.totalInterest.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600">Total Payable</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">${result.totalPayable.toLocaleString()}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Principal</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EMI</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {result.schedule.map((item) => (
                  <tr key={item.month} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{item.month}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{item.date}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">${item.principal.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">${item.interest.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">${(item.emi ?? result.emi).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">${item.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
