import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useChat } from '../contexts/ChatContext.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
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
  RadialLinearScale,
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
  ArcElement,
  RadialLinearScale
);

interface AnalyticsData {
  overview: {
    totalQueries: number;
    totalSessions: number;
    averageSessionLength: number;
    averageResponseTime: number;
    satisfactionScore: number;
    trendsComparison: {
      queries: number;
      sessions: number;
      satisfaction: number;
    };
  };
  timeSeriesData: {
    daily: Array<{ date: string; queries: number; sessions: number }>;
    weekly: Array<{ week: string; queries: number; sessions: number }>;
    monthly: Array<{ month: string; queries: number; sessions: number }>;
  };
  categoryAnalysis: Array<{
    category: string;
    queries: number;
    averageRating: number;
    responseTime: number;
  }>;
  performanceMetrics: {
    responseTimeDistribution: Array<{ range: string; count: number }>;
    satisfactionDistribution: Array<{ rating: number; count: number }>;
    peakUsageHours: Array<{ hour: number; queries: number }>;
  };
  topQuestions: Array<{
    question: string;
    category: string;
    frequency: number;
    averageRating: number;
  }>;
}

const Analytics: React.FC = () => {
  const { sessions } = useChat();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // For now, we'll generate mock data based on sessions
      
      const activeSessions = sessions.filter(s => s && s.status === 'active');
      const totalQueries = activeSessions.reduce((sum, session) => sum + session.analytics.totalMessages, 0);
      const totalSessions = activeSessions.length;
      const avgSessionLength = totalSessions > 0 ? totalQueries / totalSessions : 0;

      // Generate time series data
      const timeSeriesData = [];
      const categoryData = [];
      const overviewData = [];

      // Mock data generation based on time range
      if (timeRange === '7d') {
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          timeSeriesData.push({
            date: date.toISOString().split('T')[0],
            queries: Math.floor(Math.random() * 100) + 20,
            sessions: Math.floor(Math.random() * 30) + 5
          });
        }
      } else if (timeRange === '30d') {
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          timeSeriesData.push({
            date: date.toISOString().split('T')[0],
            queries: Math.floor(Math.random() * 150) + 30,
            sessions: Math.floor(Math.random() * 40) + 8
          });
        }
      } else if (timeRange === '90d') {
        for (let i = 12; i >= 0; i--) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - (i * 7));
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          timeSeriesData.push({
            week: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
            queries: Math.floor(Math.random() * 500) + 100,
            sessions: Math.floor(Math.random() * 150) + 30
          });
        }
      }

      // Generate hourly data for today
      for (let hour = 0; hour < 24; hour++) {
        categoryData.push({
          hour,
          queries: Math.floor(Math.random() * 20) + 1
        });
      }

      // Generate overview data
      overviewData.push(
        { name: 'Total Queries', value: totalQueries, change: '+12%', trend: 'up' },
        { name: 'Active Sessions', value: totalSessions, change: '+8%', trend: 'up' },
        { name: 'Avg Session Length', value: Math.round(avgSessionLength), change: '-3%', trend: 'down' },
        { name: 'Response Time', value: '1.2s', change: '+5%', trend: 'down' }
      );

      setAnalyticsData({
        overview: overviewData,
        timeSeries: timeSeriesData,
        categories: categoryData
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [sessions, timeRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, fetchAnalyticsData]);

  const generateDailyData = () => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        queries: Math.floor(Math.random() * 20) + 5,
        sessions: Math.floor(Math.random() * 8) + 2,
      });
    }
    return data;
  };

  const generateWeeklyData = () => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      data.push({
        week: `Week of ${weekStart.toLocaleDateString()}`,
        queries: Math.floor(Math.random() * 100) + 50,
        sessions: Math.floor(Math.random() * 30) + 15,
      });
    }
    return data;
  };

  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      queries: Math.floor(Math.random() * 200) + 100,
      sessions: Math.floor(Math.random() * 60) + 30,
    }));
  };

  const generateHourlyData = () => {
    const data = [];
    for (let hour = 0; hour < 24; hour++) {
      data.push({
        hour,
        queries: Math.floor(Math.random() * 15) + (hour >= 9 && hour <= 17 ? 10 : 2),
      });
    }
    return data;
  };

  const getTimeSeriesData = () => {
    if (!analyticsData) return { labels: [], datasets: [] };
    
    const data = timeRange === '7d' ? analyticsData.timeSeriesData.daily.slice(-7) :
                 timeRange === '30d' ? analyticsData.timeSeriesData.daily :
                 timeRange === '90d' ? analyticsData.timeSeriesData.weekly :
                 analyticsData.timeSeriesData.monthly;
    
    const labels = data.map(item => 
      timeRange === '7d' || timeRange === '30d' ? 
        new Date(item.date || '').toLocaleDateString() :
      timeRange === '90d' ? 
        (item as any).week :
        (item as any).month
    );
    
    return {
      labels,
      datasets: [
        {
          label: 'Queries',
          data: data.map(item => item.queries),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Sessions',
          data: data.map(item => item.sessions),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
      ],
    };
  };

  const getCategoryData = () => {
    if (!analyticsData) return { labels: [], datasets: [] };
    
    return {
      labels: analyticsData.categoryAnalysis.map(item => item.category),
      datasets: [
        {
          label: 'Queries',
          data: analyticsData.categoryAnalysis.map(item => item.queries),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
      ],
    };
  };

  const getSatisfactionData = () => {
    if (!analyticsData) return { labels: [], datasets: [] };
    
    return {
      labels: analyticsData.performanceMetrics.satisfactionDistribution.map(item => `${item.rating} Stars`),
      datasets: [
        {
          data: analyticsData.performanceMetrics.satisfactionDistribution.map(item => item.count),
          backgroundColor: [
            '#EF4444',
            '#F59E0B',
            '#10B981',
            '#3B82F6',
            '#8B5CF6',
          ],
        },
      ],
    };
  };

  const getPerformanceRadarData = () => {
    if (!analyticsData) return { labels: [], datasets: [] };
    
    const categories = analyticsData.categoryAnalysis.slice(0, 6);
    
    return {
      labels: categories.map(item => item.category),
      datasets: [
        {
          label: 'Average Rating',
          data: categories.map(item => item.averageRating),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
        },
        {
          label: 'Response Time (inverted)',
          data: categories.map(item => 5 - item.responseTime), // Invert for better visualization
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Insights into your legal consultation usage</p>
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalQueries}</p>
              <div className="flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{analyticsData.overview.trendsComparison.queries}%</span>
              </div>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalSessions}</p>
              <div className="flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{analyticsData.overview.trendsComparison.sessions}%</span>
              </div>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Session Length</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.averageSessionLength}</p>
              <p className="text-sm text-gray-500 mt-1">messages</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.averageResponseTime}s</p>
              <p className="text-sm text-gray-500 mt-1">per query</p>
            </div>
            <ArrowTrendingUpIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Satisfaction Score</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.satisfactionScore}/5</p>
              <div className="flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{analyticsData.overview.trendsComparison.satisfaction}</span>
              </div>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h3>
          <div className="h-80">
            <Line data={getTimeSeriesData()} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Queries by Category</h3>
          <div className="h-80">
            <Bar data={getCategoryData()} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Satisfaction Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={getSatisfactionData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }} 
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Category</h3>
          <div className="h-64">
            <Radar 
              data={getPerformanceRadarData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 5,
                  },
                },
              }} 
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Questions</h3>
          <div className="space-y-3">
            {analyticsData.topQuestions.slice(0, 5).map((question, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {question.question.length > 50 
                    ? `${question.question.substring(0, 50)}...` 
                    : question.question
                  }
                </p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{question.category}</span>
                  <div className="flex items-center space-x-2">
                    <span>{question.frequency}x</span>
                    <div className="flex items-center">
                      <StarIcon className="h-3 w-3 text-yellow-400 mr-1" />
                      <span>{question.averageRating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.categoryAnalysis.map((category, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.queries}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                        {category.averageRating}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.responseTime}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Distribution</h3>
          <div className="space-y-3">
            {analyticsData.performanceMetrics.responseTimeDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.range}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${(item.count / Math.max(...analyticsData.performanceMetrics.responseTimeDistribution.map(d => d.count))) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;