import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useChat } from '../contexts/ChatContext.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentTextIcon,
  TrophyIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardStats {
  totalSessions: number;
  totalMessages: number;
  averageSessionLength: number;
  topCategories: Array<{ category: string; count: number }>;
  recentSessions: Array<{
    _id: string;
    title: string;
    category: string;
    lastActivity: string;
    analytics: {
      totalMessages: number;
      userSatisfaction?: { rating: number };
    };
  }>;
  monthlyUsage: Array<{ month: string; queries: number }>;
  categoryDistribution: Array<{ category: string; percentage: number }>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { sessions } = useChat();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // For now, we'll calculate stats from the sessions data
      const activeSessions = sessions.filter(s => s && s.status === 'active');
      
      const totalMessages = activeSessions.reduce((sum, session) => 
        sum + session.analytics.totalMessages, 0
      );
      
      const averageSessionLength = activeSessions.length > 0 
        ? totalMessages / activeSessions.length 
        : 0;
      
      const categoryCount: { [key: string]: number } = {};
      activeSessions.forEach(session => {
        categoryCount[session.category] = (categoryCount[session.category] || 0) + 1;
      });
      
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const recentSessions = activeSessions
        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        .slice(0, 5);
      
      // Mock monthly usage data
      const monthlyUsage = [
        { month: 'Jan', queries: 45 },
        { month: 'Feb', queries: 52 },
        { month: 'Mar', queries: 48 },
        { month: 'Apr', queries: 61 },
        { month: 'May', queries: 55 },
        { month: 'Jun', queries: user?.usage?.queriesThisMonth || user?.subscription?.monthlyUsage || 0 },
      ];
      
      const totalCategorySessions = Object.values(categoryCount).reduce((sum, count) => sum + count, 0);
      const categoryDistribution = Object.entries(categoryCount)
        .map(([category, count]) => ({
          category,
          percentage: totalCategorySessions > 0 ? (count / totalCategorySessions) * 100 : 0
        }));
      
      setStats({
        totalSessions: activeSessions.length,
        totalMessages,
        averageSessionLength,
        topCategories,
        recentSessions,
        monthlyUsage,
        categoryDistribution,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionLimitColor = () => {
    const usage = user?.usage?.queriesThisMonth || user?.subscription?.monthlyUsage || 0;
    const limit = user?.subscription?.plan === 'basic' ? 100 :
                  user?.subscription?.plan === 'pro' ? 500 : 1000;
    const percentage = (usage / limit) * 100;
    
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const usageChartData = {
    labels: stats?.monthlyUsage.map(item => item.month) || [],
    datasets: [
      {
        label: 'Queries',
        data: stats?.monthlyUsage.map(item => item.queries) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const categoryChartData = {
    labels: stats?.topCategories.map(item => item.category) || [],
    datasets: [
      {
        label: 'Sessions',
        data: stats?.topCategories.map(item => item.count) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
      },
    ],
  };

  const distributionChartData = {
    labels: stats?.categoryDistribution.map(item => item.category) || [],
    datasets: [
      {
        data: stats?.categoryDistribution.map(item => item.percentage) || [],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#06B6D4',
          '#84CC16',
        ],
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's your legal consultation overview
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalSessions || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <DocumentTextIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalMessages || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Session Length</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(stats?.averageSessionLength || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${getSubscriptionLimitColor()}`}>
              <TrophyIcon className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {user?.usage?.queriesThisMonth || user?.subscription?.monthlyUsage || 0}
                <span className="text-sm text-gray-500 ml-1">
                  / {user?.subscription?.plan === 'basic' ? 100 :
                      user?.subscription?.plan === 'pro' ? 500 : 1000}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Monthly Usage Trend
          </h3>
          <div className="h-64">
            <Line data={usageChartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Top Legal Categories
          </h3>
          <div className="h-64">
            <Bar data={categoryChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Activity and Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Recent Sessions
          </h3>
          <div className="space-y-3">
            {stats?.recentSessions.map((session) => (
              <div key={session._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{session.title}</h4>
                  <p className="text-sm text-gray-600">
                    {session.category} • {session.analytics.totalMessages} messages
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(session.lastActivity).toLocaleDateString()}
                  </p>
                </div>
                {session.analytics.userSatisfaction && (
                  <div className="flex items-center space-x-1">
                    <StarIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-600">
                      {session.analytics.userSatisfaction.rating}/5
                    </span>
                  </div>
                )}
              </div>
            ))}
            {(!stats?.recentSessions || stats.recentSessions.length === 0) && (
              <p className="text-gray-500 text-center py-8">
                No recent sessions found. Start a new chat to see your activity here.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Distribution
          </h3>
          <div className="h-64">
            {stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
              <Doughnut 
                data={distributionChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                          size: 11
                        }
                      }
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Subscription Status
            </h3>
            <p className="text-gray-600 mt-1">
              You're on the <span className="font-medium capitalize">{user?.subscription?.plan || 'basic'}</span> plan
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Expires on</p>
            <p className="font-medium text-gray-900">
              {user?.subscription.expiresAt 
                ? new Date(user.subscription.expiresAt).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Monthly Queries Used</span>
            <span>
              {user?.usage?.queriesThisMonth || user?.subscription?.monthlyUsage || 0} / {
                user?.subscription?.plan === 'basic' ? 100 :
                user?.subscription?.plan === 'pro' ? 500 : 1000
              }
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                ((user?.usage?.queriesThisMonth || user?.subscription?.monthlyUsage || 0) / (
                  user?.subscription?.plan === 'basic' ? 100 :
                  user?.subscription?.plan === 'pro' ? 500 : 1000
                )) >= 0.9 ? 'bg-red-500' :
                ((user?.usage?.queriesThisMonth || user?.subscription?.monthlyUsage || 0) / (
                  user?.subscription?.plan === 'basic' ? 100 :
                  user?.subscription?.plan === 'pro' ? 500 : 1000
                )) >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min(100, ((user?.usage?.queriesThisMonth || user?.subscription?.monthlyUsage || 0) / (
                  user?.subscription?.plan === 'basic' ? 100 :
                  user?.subscription?.plan === 'pro' ? 500 : 1000
                )) * 100)}%`
              }}
            ></div>
          </div>
        </div>
        
        {user?.subscription?.plan === 'basic' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Upgrade to get more queries and advanced features.
              <button className="ml-1 font-medium underline hover:no-underline">
                View Plans
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;