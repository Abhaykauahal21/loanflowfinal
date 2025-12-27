import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoanCard from '../components/LoanCard';
import axios from '../api/axios';
import { FaFileUpload, FaMoneyBillWave, FaChartLine, FaFileInvoiceDollar, FaBell, FaCreditCard, FaShieldAlt, FaPiggyBank } from 'react-icons/fa';
import { getErrorMessage } from '../utils/errorHandling';
import { io } from 'socket.io-client';

// Lazy load components
const PaymentForm = lazy(() => import('../components/PaymentForm'));
const AnalyticsChart = lazy(() => import('../components/AnalyticsChart'));

const PieChart = ({ loans }) => {
  const total = loans?.total || 0;
  const approved = loans?.approved || 0;
  const pending = loans?.pending || 0;
  const rejected = loans?.rejected || 0;

  const calculatePercent = (value) => ((value / total) * 100).toFixed(1);

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">Loan Portfolio</h3>
      {total > 0 ? (
        <>
          <div className="flex relative justify-center items-center mb-6 h-48">
            <div className="flex absolute inset-0 justify-center items-center">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#F3F4F6"
                  strokeWidth="16"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="16"
                  strokeDasharray={`${(approved/total) * 440} 440`}
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="16"
                  strokeDasharray={`${(pending/total) * 440} 440`}
                  strokeDashoffset={`${-((approved/total) * 440)}`}
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="16"
                  strokeDasharray={`${(rejected/total) * 440} 440`}
                  strokeDashoffset={`${-(((approved + pending)/total) * 440)}`}
                />
              </svg>
            </div>
            <div className="z-10 text-center">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500">Total Loans</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="mr-3 w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Approved</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{calculatePercent(approved)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="mr-3 w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Pending</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{calculatePercent(pending)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="mr-3 w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Rejected</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{calculatePercent(rejected)}%</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col justify-center items-center h-48 bg-gray-50 rounded-xl">
          <FaPiggyBank className="mb-4 text-3xl text-gray-400" />
          <p className="font-medium text-gray-500">No active loans</p>
          <p className="mt-1 text-sm text-gray-400">Start your first application</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, change, icon, color = 'blue', isCurrency = false }) => {
  const colorConfig = {
    blue: { bg: 'from-blue-500 to-blue-600', text: 'text-blue-600' },
    green: { bg: 'from-green-500 to-green-600', text: 'text-green-600' },
    purple: { bg: 'from-purple-500 to-purple-600', text: 'text-purple-600' },
    orange: { bg: 'from-orange-500 to-orange-600', text: 'text-orange-600' }
  };

  const formattedValue = isCurrency 
    ? `$${Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}` 
    : value;

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 group hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="mb-2 text-sm font-medium text-gray-600">{title}</p>
          <p className="mb-2 text-2xl font-bold text-gray-900">{formattedValue}</p>
          {change !== undefined && (
            <p className={`text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↗' : '↘'} {Math.abs(change)}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorConfig[color].bg} transform group-hover:scale-110 transition-transform duration-300`}>
          <div className="text-xl text-white">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

const UserDashboard = () => {
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [, setShowPaymentModal] = useState(false);
  const [stats, setStats] = useState({
    totalLoans: 0,
    activeLoans: 0,
    totalBorrowed: 0,
    pendingApplications: 0
  });
  const { user, logout } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const [loansRes, statsRes, paymentsRes] = await Promise.allSettled([
        axios.get('/loans/my'),
        axios.get('/loans/dashboard-stats'),
        axios.get(`/payments/user/${userId}`),
      ]);

      const loansData = loansRes.status === 'fulfilled' ? loansRes.value.data : [];
      const statsData = statsRes.status === 'fulfilled' ? statsRes.value.data : null;
      const paymentsData = paymentsRes.status === 'fulfilled' ? paymentsRes.value.data : [];

      const firstError =
        loansRes.status === 'rejected'
          ? loansRes.reason
          : statsRes.status === 'rejected'
          ? statsRes.reason
          : paymentsRes.status === 'rejected'
          ? paymentsRes.reason
          : null;
      if (firstError) {
        setError(getErrorMessage(firstError));
      }

      setLoans(loansData || []);
      setPayments(paymentsData || []);

      if (statsData) {
        const { loans = {}, amounts = {} } = statsData;
        
        setStats({
          totalLoans: loans.total || 0,
          activeLoans: loans.approved || 0,
          totalBorrowed: amounts.total || 0,
          pendingApplications: loans.pending || 0
        });
        
        setDashboardData({
          loans,
          amounts,
          monthlyStats: statsData.monthlyStats || []
        });
  } else {
        const calculatedStats = {
          totalLoans: loansData.length,
          activeLoans: loansData.filter(loan => loan.status === 'Approved').length,
          totalBorrowed: loansData.filter(loan => loan.status === 'Approved')
            .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0),
          pendingApplications: loansData.filter(loan => loan.status === 'Pending').length,
          rejectedLoans: loansData.filter(loan => loan.status === 'Rejected').length
        };
        
        setStats(calculatedStats);
        setDashboardData({
          loans: {
            total: calculatedStats.totalLoans,
            approved: calculatedStats.activeLoans,
            pending: calculatedStats.pendingApplications,
            rejected: calculatedStats.rejectedLoans
          },
          amounts: {
            total: calculatedStats.totalBorrowed,
            average: calculatedStats.totalLoans > 0 ? calculatedStats.totalBorrowed / calculatedStats.activeLoans : 0
          },
          monthlyStats: []
        });
      }
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    setError(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
  }, [user]);

  useEffect(() => {
    if (user && (user._id || user.id)) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchDashboardData]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = user?._id || user?.id;
    if (!token || !userId) return;

    const socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const onLoanStatusChanged = (payload) => {
      if (payload?.userId && payload.userId !== userId) return;
      fetchDashboardData();
    };

    socket.on('loan:statusChanged', onLoanStatusChanged);

    return () => {
      socket.off('loan:statusChanged', onLoanStatusChanged);
      socket.disconnect();
    };
  }, [user, fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br to-blue-50 from-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-blue-500 animate-spin border-t-transparent"></div>
          <p className="font-medium text-gray-600">Loading your banking portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br to-blue-50 from-slate-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 mx-auto max-w-7xl">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                  <FaCreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold text-gray-900">LoanFlow</span>
                  <span className="px-2 py-1 ml-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">Portal</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-500 transition-colors duration-200 hover:text-gray-700">
                <FaBell className="w-5 h-5" />
                <span className="flex absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Premium Banking</p>
              </div>
              <div className="flex justify-center items-center w-10 h-10 text-sm font-semibold text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-6 py-8 mx-auto max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome back, {user.name}</h1>
              <p className="text-gray-600">Here's your financial overview for today</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center px-4 py-2 bg-green-50 rounded-full">
                <div className="mr-2 w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">Active</span>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-xl border border-gray-300 transition-colors duration-200 hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center p-4 mb-6 bg-red-50 rounded-2xl border border-red-200">
            <svg className="mr-3 w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-700">{error}</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to="/apply"
              className="flex items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="flex justify-center items-center mr-4 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Apply for Loan</h3>
                <p className="text-sm text-gray-500">Start new application</p>
              </div>
            </Link>
            
            <button className="flex items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md group">
              <div className="flex justify-center items-center mr-4 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Statements</h3>
                <p className="text-sm text-gray-500">Download reports</p>
              </div>
            </button>
            
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="flex justify-center items-center mr-4 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Make Payment</h3>
                <p className="text-sm text-gray-500">Pay loan installment</p>
              </div>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Loans"
            value={stats.totalLoans}
            change={12}
            icon={<FaFileInvoiceDollar />}
            color="blue"
          />
          <StatCard
            title="Active Loans"
            value={stats.activeLoans}
            change={8}
            icon={<FaChartLine />}
            color="green"
          />
          <StatCard
            title="Total Borrowed"
            value={stats.totalBorrowed}
            change={15}
            icon={<FaMoneyBillWave />}
            color="purple"
            isCurrency={true}
          />
          <StatCard
            title="Pending Applications"
            value={stats.pendingApplications}
            change={-5}
            icon={<FaFileUpload />}
            color="orange"
          />
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Financial Overview</h3>
              <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-4 border-blue-500 animate-spin border-t-transparent"></div></div>}>
                <AnalyticsChart data={dashboardData} />
              </Suspense>
            </div>
          </div>
          <div>
            <PieChart loans={dashboardData?.loans} />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Loans Section */}
          <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Loan Applications</h2>
                <span className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
                  {loans.length} total
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {loans.length === 0 ? (
                <div className="py-12 text-center">
                  <FaFileInvoiceDollar className="mx-auto mb-4 text-4xl text-gray-400" />
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No loan applications</h3>
                  <p className="mb-6 text-gray-500">Start your first loan application to get started</p>
                  <Link
                    to="/apply"
                    className="inline-flex items-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl transition-all duration-200 hover:shadow-lg"
                  >
                    Apply for Loan
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans.slice(0, 3).map((loan) => (
                    <LoanCard
                      key={loan._id}
                      loan={loan}
                      isAdmin={false}
                    />
                  ))}
                  {loans.length > 3 && (
                    <Link
                      to="/loans"
                      className="block py-3 w-full font-medium text-center text-blue-600 bg-blue-50 rounded-xl transition-colors duration-200 hover:bg-blue-100"
                    >
                      View All Loans ({loans.length})
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* KYC Section */}
          <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">KYC Verification</h2>
                <FaShieldAlt className="text-green-500" />
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {['ID Proof', 'Address Proof', 'Income Proof'].map((docType) => (
                  <div key={docType} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="flex justify-center items-center mr-4 w-10 h-10 bg-white rounded-lg border border-gray-200">
                        <FaFileUpload className="text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{docType}</h3>
                        <p className="text-sm text-gray-500">Required for verification</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg transition-colors duration-200 hover:bg-blue-100">
                      Upload
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 mt-6 bg-blue-50 rounded-xl">
                <div className="flex items-center">
                  <FaShieldAlt className="mr-3 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">KYC Status: Verified</p>
                    <p className="text-xs text-blue-700">Your documents are securely stored</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="overflow-hidden mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          {payments.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400">
                <FaCreditCard className="mx-auto mb-3 text-3xl" />
                <p>No transactions found</p>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 sm:hidden">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment._id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Loan Payment</p>
                        <p className="text-xs text-gray-500">
                          {payment.loanId ? `Loan ${String(payment.loanId).slice(-6)}` : 'Loan'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-sm text-gray-600">
                        {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-semibold text-gray-900">${Number(payment.amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.slice(0, 5).map((payment) => (
                      <tr key={payment._id} className="transition-colors duration-150 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Loan Payment {payment.loanId ? `- ${String(payment.loanId).slice(-6)}` : ''}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ${Number(payment.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Financial Tips */}
        <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-3">
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
            <div className="flex items-center mb-3">
              <div className="flex justify-center items-center mr-3 w-8 h-8 bg-blue-100 rounded-lg">
                <span className="font-semibold text-blue-600">💡</span>
              </div>
              <h3 className="font-semibold text-blue-900">Smart Banking</h3>
            </div>
            <p className="text-sm text-blue-800">
              Set up automatic payments to avoid late fees and improve your credit score.
            </p>
          </div>
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200">
            <div className="flex items-center mb-3">
              <div className="flex justify-center items-center mr-3 w-8 h-8 bg-green-100 rounded-lg">
                <span className="font-semibold text-green-600">📈</span>
              </div>
              <h3 className="font-semibold text-green-900">Growth Tip</h3>
            </div>
            <p className="text-sm text-green-800">
              Consider shorter loan terms to save up to 20% on total interest payments.
            </p>
          </div>
          <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
            <div className="flex items-center mb-3">
              <div className="flex justify-center items-center mr-3 w-8 h-8 bg-purple-100 rounded-lg">
                <span className="font-semibold text-purple-600">🛡️</span>
              </div>
              <h3 className="font-semibold text-purple-900">Security</h3>
            </div>
            <p className="text-sm text-purple-800">
              Your financial data is protected with bank-level encryption and security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
