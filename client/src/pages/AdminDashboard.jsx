import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoanCard from '../components/LoanCard';
import LoadingSpinner from '../components/LoadingSpinner';
import KycVerification from '../components/KycVerification';
import { createSocket } from '../utils/socket';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const AnalyticsChart = ({ title, data, type = 'line', dataKey, xAxis = 'name' }) => {
  const ChartComponent = type === 'line' ? LineChart : AreaChart;
  const DataComponent = type === 'line' ? Line : Area;

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <select className="px-3 py-1 text-sm bg-gray-50 rounded-lg border border-gray-300">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxis} />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(dataKey) ? (
              dataKey.map((key, index) => (
                <DataComponent
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={
                    index === 0 ? '#2563eb' :
                    index === 1 ? '#16a34a' :
                    '#7c3aed'
                  }
                  fill={
                    index === 0 ? '#3b82f610' :
                    index === 1 ? '#22c55e10' :
                    '#8b5cf610'
                  }
                  strokeWidth={2}
                />
              ))
            ) : (
              <DataComponent
                type="monotone"
                dataKey={dataKey}
                stroke="#2563eb"
                fill="#3b82f610"
                strokeWidth={2}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, trend, color = 'blue', icon }) => {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    purple: 'bg-purple-600',
    red: 'bg-red-600'
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className={`flex justify-center items-center w-12 h-12 rounded-xl ${colors[color]}`}>
          {icon}
        </div>
        <div className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'} flex items-center`}>
          {trend > 0 ? (
            <svg className="mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : trend < 0 ? (
            <svg className="mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : null}
          {Math.abs(trend)}%
        </div>
      </div>
      <h3 className="mb-1 text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-xs text-gray-400">{subtitle}</p>
    </div>
  );
};

const QuickAction = ({ icon, title, description, onClick, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 text-left rounded-xl border-2 transition-all duration-200 ${colorClasses[color]} group hover:shadow-md`}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-white rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-110">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({ trends: [], approvalRates: [], monthlyStats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [wsTick, setWsTick] = useState(0);
  const [interestRates, setInterestRates] = useState([]);
  const [interestRatesLoading, setInterestRatesLoading] = useState(false);
  const [interestRatesError, setInterestRatesError] = useState('');
  const [newRateCategory, setNewRateCategory] = useState('');
  const [newAnnualRatePercent, setNewAnnualRatePercent] = useState('');
  const [draftRateByCategory, setDraftRateByCategory] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [loansRes, statsRes, analyticsRes, usersRes] = await Promise.all([
          axios.get(`/admin/loans${filter ? `?status=${filter}` : ''}${search ? `&search=${search}` : ''}`),
          axios.get('/admin/stats'),
          axios.get('/admin/analytics'),
          axios.get('/admin/users')
        ]);
        
        setLoans(loansRes.data);
        setStats(statsRes.data);
        setAnalytics({
          trends: analyticsRes.data.dailyTrends || [],
          approvalRates: analyticsRes.data.dailyTrends?.map(day => ({
            name: day.date,
            rate: day.approvalRate
          })) || [],
          monthlyStats: analyticsRes.data.monthlyAmounts || {}
        });
        setUsers(usersRes.data);
        setActiveUsers(usersRes.data.filter(u => u.activeLoans > 0));
        setError('');
      } catch (err) {
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter, search, activeTab, wsTick]);

  useEffect(() => {
    const load = async () => {
      if (activeTab !== 'interestRates') return;
      try {
        setInterestRatesLoading(true);
        setInterestRatesError('');
        const res = await axios.get('/admin/interest-rates');
        const rates = Array.isArray(res.data) ? res.data : [];
        setInterestRates(rates);
        setDraftRateByCategory(
          rates.reduce((acc, r) => {
            if (r?.category) acc[r.category] = String(r.annualRatePercent ?? '');
            return acc;
          }, {})
        );
      } catch (err) {
        setInterestRatesError('Failed to fetch interest rates');
      } finally {
        setInterestRatesLoading(false);
      }
    };

    load();
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = user?._id || user?.id;
    if (!token || !userId) return;

    const socket = createSocket();

    const onLoanStatusChanged = () => {
      setWsTick((t) => t + 1);
    };

    socket.on('loan:statusChanged', onLoanStatusChanged);

    return () => {
      socket.off('loan:statusChanged', onLoanStatusChanged);
      socket.disconnect();
    };
  }, [user]);

  const upsertInterestRate = async ({ category, annualRatePercent }) => {
    const normalizedCategory = String(category || '').trim().toLowerCase();
    const rateValue = Number(annualRatePercent);

    if (!normalizedCategory) {
      setInterestRatesError('Category is required');
      return;
    }
    if (!Number.isFinite(rateValue)) {
      setInterestRatesError('Annual rate must be a number');
      return;
    }

    try {
      setInterestRatesLoading(true);
      setInterestRatesError('');
      await axios.put(`/admin/interest-rates/${encodeURIComponent(normalizedCategory)}`, {
        annualRatePercent: rateValue,
      });
      const res = await axios.get('/admin/interest-rates');
      const rates = Array.isArray(res.data) ? res.data : [];
      setInterestRates(rates);
      setDraftRateByCategory(
        rates.reduce((acc, r) => {
          if (r?.category) acc[r.category] = String(r.annualRatePercent ?? '');
          return acc;
        }, {})
      );
      setNewRateCategory('');
      setNewAnnualRatePercent('');
    } catch (err) {
      setInterestRatesError('Failed to save interest rate');
    } finally {
      setInterestRatesLoading(false);
    }
  };

  const deleteInterestRate = async (category) => {
    const normalizedCategory = String(category || '').trim().toLowerCase();
    if (!normalizedCategory) return;

    try {
      setInterestRatesLoading(true);
      setInterestRatesError('');
      await axios.delete(`/admin/interest-rates/${encodeURIComponent(normalizedCategory)}`);
      const res = await axios.get('/admin/interest-rates');
      const rates = Array.isArray(res.data) ? res.data : [];
      setInterestRates(rates);
      setDraftRateByCategory(
        rates.reduce((acc, r) => {
          if (r?.category) acc[r.category] = String(r.annualRatePercent ?? '');
          return acc;
        }, {})
      );
    } catch (err) {
      setInterestRatesError('Failed to delete interest rate');
    } finally {
      setInterestRatesLoading(false);
    }
  };

  const handleStatusUpdate = async (loanId, status) => {
    try {
      await axios.put(`/admin/loans/${loanId}/status`, { status });
      
      // Refresh data after update
      const [loansRes, statsRes, analyticsRes, usersRes] = await Promise.all([
        axios.get(`/admin/loans${filter ? `?status=${filter}` : ''}${search ? `&search=${search}` : ''}`),
        axios.get('/admin/stats'),
        axios.get('/admin/analytics'),
        axios.get('/admin/users')
      ]);
      
      setLoans(loansRes.data);
      setStats(statsRes.data);
      setAnalytics({
        trends: analyticsRes.data.dailyTrends || [],
        approvalRates: analyticsRes.data.dailyTrends?.map(day => ({
          name: day.date,
          rate: day.approvalRate
        })) || [],
        monthlyStats: analyticsRes.data.monthlyAmounts || {}
      });
      setUsers(usersRes.data);
      setActiveUsers(usersRes.data.filter(u => u.activeLoans > 0));
      
      // Show success notification
      alert(`Loan status updated to ${status}`);
    } catch (error) {
      console.error('Error updating loan status:', error);
      setError(`Failed to update loan status: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // The search is handled in the useEffect when search state changes
  };

  const handleBulkAction = async (action) => {
    if (!loans.length) return;
    
    try {
      if (action === 'report') {
        alert('Generating report... This feature will be available soon.');
        return;
      } else if (action === 'bulk') {
        alert('Bulk processing... This feature will be available soon.');
        return;
      } else if (action === 'users') {
        setActiveTab('users');
        return;
      }
      
      alert(`${action} action initiated`);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      setError(`Failed to perform bulk action: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <nav className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-8 h-8 bg-blue-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">LoanFlow Admin</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Loading Dashboard</h1>
            <p className="text-gray-600">Fetching latest data...</p>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm animate-pulse">
                <div className="mb-4 w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="mb-2 w-1/2 h-6 bg-gray-200 rounded"></div>
                <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={`chart-${i}`} className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm animate-pulse">
                <div className="mb-6 w-1/3 h-6 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex justify-center items-center w-8 h-8 bg-blue-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">LoanFlow Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="flex justify-center items-center w-8 h-8 text-sm font-semibold text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="text-gray-500 transition-colors duration-200 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage loan applications and monitor system performance</p>
        </div>

        {error && (
          <div className="flex items-start p-4 mb-6 space-x-3 bg-red-50 rounded-xl border border-red-200">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="p-2 mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex space-x-1">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'loans', label: 'Loans' },
              { key: 'users', label: 'Users' },
              { key: 'kyc', label: 'KYC' },
              { key: 'interestRates', label: 'Interest Rates' },
              { key: 'reports', label: 'Reports' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Loans"
            value={stats?.totalLoans?.toLocaleString() || '0'}
            subtitle="All time applications"
            trend={0}
            color="blue"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="Pending Review"
            value={stats?.pendingLoans?.toLocaleString() || '0'}
            subtitle={`${stats?.totalLoans ? ((stats?.pendingLoans / stats?.totalLoans) * 100).toFixed(1) : 0}% of total`}
            trend={0}
            color="orange"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Approved Loans"
            value={stats?.approvedLoans?.toLocaleString() || '0'}
            subtitle={`$${(stats?.totalAmount || 0).toLocaleString()} disbursed`}
            trend={0}
            color="green"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Active Users"
            value={stats?.totalUsers?.toLocaleString() || '0'}
            subtitle={`${activeUsers?.length || 0} with active loans`}
            trend={0}
            color="purple"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            }
          />
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Analytics Charts */}
            <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
              <AnalyticsChart
                title="Loan Applications Trend"
                data={analytics?.trends || []}
                type="line"
                dataKey={['applications', 'approved', 'rejected']}
              />
              <AnalyticsChart
                title="Approval Rate Analytics"
                data={analytics?.approvalRates || []}
                type="area"
                dataKey="rate"
              />
            </div>
          </>
        ) : activeTab === 'loans' ? (
          <>
            {/* Loans Filter */}
            <div className="p-6 mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilter('')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilter('rejected')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Rejected
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search loans..."
                    className="py-2 pr-4 pl-10 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={handleSearch}
                  />
                  <svg
                    className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Loans List */}
            <div className="space-y-6">
              {loans.length > 0 ? (
                loans.map((loan) => (
                  <LoanCard
                    key={loan._id}
                    loan={loan}
                    isAdmin={true}
                    onStatusUpdate={(status) => handleStatusUpdate(loan._id, status)}
                  />
                ))
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <svg
                    className="mx-auto mb-4 w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mb-1 text-lg font-medium text-gray-900">No loans found</h3>
                  <p className="text-gray-500">
                    {filter ? `No ${filter} loans found.` : 'There are no loans in the system yet.'}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'users' ? (
          <>
            {/* Users List */}
            <div className="overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        User
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        KYC Status
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Active Loans
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex flex-shrink-0 justify-center items-center w-10 h-10 font-semibold text-white bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${user.status === 'active' ? 'bg-green-100 text-green-800' : 
                              user.status === 'suspended' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${user.kycStatus === 'verified' ? 'bg-green-100 text-green-800' : 
                              user.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {user.kycStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {user.activeLoans || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          ${(user.totalLoanAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="mr-4 text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : activeTab === 'kyc' ? (
          <>
            {selectedUser ? (
              <KycVerification user={selectedUser} />
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <svg
                  className="mx-auto mb-4 w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <h3 className="mb-1 text-lg font-medium text-gray-900">No user selected</h3>
                <p className="text-gray-500">
                  Please select a user from the Users tab to verify their KYC documents.
                </p>
              </div>
            )}
          </>
        ) : activeTab === 'interestRates' ? (
          <>
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex flex-col gap-4 justify-between mb-6 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Interest Rates</h3>
                  <p className="text-sm text-gray-500">Set annual interest rates by loan category</p>
                </div>
                <button
                  type="button"
                  onClick={() => upsertInterestRate({ category: newRateCategory, annualRatePercent: newAnnualRatePercent })}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={interestRatesLoading}
                >
                  Save Category
                </button>
              </div>

              {interestRatesError ? (
                <div className="p-4 mb-6 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm text-red-700">{interestRatesError}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Category</label>
                  <input
                    value={newRateCategory}
                    onChange={(e) => setNewRateCategory(e.target.value)}
                    placeholder="e.g. personal"
                    className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={interestRatesLoading}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Annual Rate (%)</label>
                  <input
                    value={newAnnualRatePercent}
                    onChange={(e) => setNewAnnualRatePercent(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={interestRatesLoading}
                    inputMode="decimal"
                  />
                </div>
                <div className="flex items-end">
                  {interestRatesLoading ? (
                    <div className="flex justify-center items-center w-full">
                      <LoadingSpinner />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Annual Rate (%)</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {interestRates.length ? (
                        interestRates.map((r) => (
                          <tr key={r._id || r.category}>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                              {r.category}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              <input
                                value={draftRateByCategory[r.category] ?? String(r.annualRatePercent ?? '')}
                                onChange={(e) =>
                                  setDraftRateByCategory((prev) => ({
                                    ...prev,
                                    [r.category]: e.target.value,
                                  }))
                                }
                                className="px-3 py-2 w-40 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={interestRatesLoading}
                                inputMode="decimal"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  upsertInterestRate({
                                    category: r.category,
                                    annualRatePercent: draftRateByCategory[r.category] ?? r.annualRatePercent,
                                  })
                                }
                                className="mr-4 text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={interestRatesLoading}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteInterestRate(r.category)}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={interestRatesLoading}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-6 py-6 text-sm text-gray-500" colSpan={3}>
                            No interest rate categories yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Reports Tab
          <>
            {/* Monthly Report Summary */}
            <div className="p-6 mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Monthly Report Summary</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="mb-1 text-sm text-blue-600">Total Approved This Month</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${(analytics?.monthlyStats?.approvedAmount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="mb-1 text-sm text-green-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-700">
                    {activeUsers?.length || 0}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="mb-1 text-sm text-purple-600">Average Loan Size</p>
                  <p className="text-2xl font-bold text-purple-700">
                    ${activeUsers?.length ? ((analytics?.monthlyStats?.approvedAmount || 0) / activeUsers.length).toLocaleString() : '0'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
          <QuickAction
            icon="📊"
            title="Generate Report"
            description="Export loan data and analytics"
            onClick={() => handleBulkAction('report')}
            color="blue"
          />
          <QuickAction
            icon="⚡"
            title="Bulk Actions"
            description="Process multiple applications"
            onClick={() => handleBulkAction('bulk')}
            color="green"
          />
          <QuickAction
            icon="👥"
            title="User Management"
            description="Manage user accounts and permissions"
            onClick={() => handleBulkAction('users')}
            color="purple"
          />
        </div>

        {/* Filters and Search */}
        <div className="p-6 mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-3 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              
              <select className="px-4 py-3 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Loan Types</option>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
                <option value="mortgage">Mortgage</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <form onSubmit={handleSearch} className="flex flex-1 gap-2 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search applications..."
                  className="py-3 pr-4 pl-10 w-full rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="submit"
                className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-xl transition-colors duration-200 hover:bg-blue-700"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Loans List */}
        <div className="overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Loan Applications</h2>
              <span className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-full">
                {loans.length} applications
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {loans.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="mx-auto mb-4 w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mb-2 text-lg font-medium text-gray-900">No applications found</h3>
                <p className="text-gray-500">No loan applications match your current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <LoanCard
                    key={loan._id}
                    loan={loan}
                    isAdmin={true}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-white rounded-xl border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="font-semibold text-green-700">All Systems Operational</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="font-semibold text-blue-700">124ms</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className="font-semibold text-purple-700">99.98%</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="font-semibold text-orange-700">247</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
