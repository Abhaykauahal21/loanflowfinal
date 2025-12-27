import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { FaDownload, FaMoneyBillWave } from 'react-icons/fa';
import { generateEmiSchedule } from '../utils/emi';

const LoanEMIDetails = ({ loanId, useMockData = false }) => {
  const [loanData, setLoanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLoanEMIDetails = async () => {
      if (useMockData) {
        const loanAmount = 100000;
        const interestRate = 12;
        const tenureMonths = 12;
        const result = generateEmiSchedule({
          loanAmount,
          annualInterestRate: interestRate,
          loanTenureMonths: tenureMonths,
          approvalDate: new Date(),
        });

        setLoanData({
          loanId,
          loanAmount,
          interestRate,
          tenureMonths,
          monthlyEmi: result.emi,
          totalInterest: result.totalInterest,
          totalPayable: result.totalPayable,
          schedule: result.schedule.map((item) => ({
            month: item.month,
            principal: item.principal,
            interest: item.interest,
            balance: item.balance,
            total: item.principal + item.interest,
          })),
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [loanResponse, emisResponse] = await Promise.all([
          axios.get(`/loans/${loanId}`),
          axios.get(`/loans/${loanId}/emis`),
        ]);

        const loanDetails = loanResponse.data;
        const emiDetails = emisResponse.data;

        const loanAmount = Number(loanDetails?.amount || 0);
        const tenureMonths = Number(loanDetails?.tenureMonths || 0);
        const interestRate = Number(loanDetails?.interestRate || 0);

        setLoanData({
          loanId: emiDetails.loanId,
          loanAmount,
          tenureMonths,
          interestRate,
          monthlyEmi: emiDetails.monthlyEMI,
          totalInterest: emiDetails.totalInterest,
          totalPayable: loanAmount + emiDetails.totalInterest,
          schedule: (emiDetails.schedule || []).map((item) => ({
            ...item,
            total: item.principal + item.interest,
          })),
        });

        setError(null);
      } catch (err) {
        const isNetworkError = err?.isAxiosError && !err?.response;

        if (isNetworkError) {
          try {
            const loanResponse = await axios.get(`/loans/${loanId}`);
            const loanDetails = loanResponse.data;
            const amount = Number(loanDetails.amount);
            const interestRate = Number(loanDetails.interestRate || 12);
            const tenureMonths = Number(loanDetails.tenureMonths);

            const result = generateEmiSchedule({
              loanAmount: amount,
              annualInterestRate: interestRate,
              loanTenureMonths: tenureMonths,
              approvalDate: loanDetails.createdAt || new Date(),
            });

            setLoanData({
              loanId,
              loanAmount: amount,
              tenureMonths,
              interestRate,
              monthlyEmi: result.emi,
              totalInterest: result.totalInterest,
              totalPayable: result.totalPayable,
              schedule: result.schedule.map((item) => ({
                month: item.month,
                principal: item.principal,
                interest: item.interest,
                balance: item.balance,
                total: item.principal + item.interest,
              })),
            });
            setError('Server unreachable. Showing locally calculated EMI schedule.');
          } catch (fallbackErr) {
            setError(fallbackErr?.response?.data?.message || fallbackErr?.message || 'Failed to load EMI details');
            setLoanData(null);
          }
        } else {
          setError(err?.response?.data?.message || err?.message || 'Failed to load EMI details');
          setLoanData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLoanEMIDetails();
  }, [loanId, useMockData]);

  const handleDownloadSchedule = () => {
    return;
  };

  const handleEarlyPayment = () => {
    return;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-12 h-12 rounded-full border-b-2 border-blue-500 animate-spin"></div>
      </div>
    );
  }

  if (error && !loanData) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      {/* Loan Summary Card */}
      <div className="overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Loan Summary</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Loan Amount</p>
              <p className="text-xl font-semibold text-gray-900">${loanData.loanAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Interest Rate</p>
              <p className="text-xl font-semibold text-gray-900">{loanData.interestRate || '—'}{loanData.interestRate ? '%' : ''}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tenure</p>
              <p className="text-xl font-semibold text-gray-900">{loanData.tenureMonths} months</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly EMI</p>
              <p className="text-xl font-semibold text-gray-900">${loanData.monthlyEmi.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Interest</p>
              <p className="text-xl font-semibold text-gray-900">${loanData.totalInterest.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Payable</p>
              <p className="text-xl font-semibold text-gray-900">${loanData.totalPayable.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button 
          onClick={handleDownloadSchedule}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
        >
          <FaDownload className="mr-2" />
          Download Schedule (PDF)
        </button>
        <button 
          onClick={handleEarlyPayment}
          className="flex items-center px-4 py-2 text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
        >
          <FaMoneyBillWave className="mr-2" />
          Make Early Payment
        </button>
      </div>

      {/* EMI Schedule Table */}
      <div className="overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">EMI Schedule</h2>
        </div>
        <div className="sm:hidden">
          <div className="divide-y divide-gray-200">
            {loanData.schedule.map((emi) => (
              <div key={emi.month} className="p-4">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-gray-900">Month {emi.month}</p>
                  <p className="text-sm font-semibold text-gray-900">${emi.total.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-gray-500">Principal</p>
                    <p className="font-medium text-gray-900">${emi.principal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Interest</p>
                    <p className="font-medium text-gray-900">${emi.interest.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Balance</p>
                    <p className="font-medium text-gray-900">${emi.balance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Principal</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Interest</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loanData.schedule.map((emi) => (
                <tr key={emi.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{emi.month}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">${emi.principal.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">${emi.interest.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">${emi.total.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">${emi.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LoanEMIDetails;
