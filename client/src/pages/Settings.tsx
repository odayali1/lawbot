import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import {
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  KeyIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
  sessionReminders: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'lawyers-only';
  shareAnalytics: boolean;
  allowDataExport: boolean;
  sessionHistory: 'keep-all' | 'keep-6months' | 'keep-1year';
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
}

const Settings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: false,
    securityAlerts: true,
    marketingEmails: false,
    sessionReminders: true,
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'lawyers-only',
    shareAnalytics: false,
    allowDataExport: true,
    sessionHistory: 'keep-1year',
  });

  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'system',
    language: 'en',
    fontSize: 'medium',
    compactMode: false,
  });

  const [apiSettings, setApiSettings] = useState({
    apiKey: '',
    webhookUrl: '',
    rateLimitEnabled: true,
    maxRequestsPerHour: 100,
  });

  useEffect(() => {
    // Load settings from localStorage or API
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      const savedPrivacy = localStorage.getItem('privacy');
      const savedAppearance = localStorage.getItem('appearance');
      const savedApiSettings = localStorage.getItem('apiSettings');

      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
      if (savedPrivacy) {
        setPrivacy(JSON.parse(savedPrivacy));
      }
      if (savedAppearance) {
        setAppearance(JSON.parse(savedAppearance));
      }
      if (savedApiSettings) {
        setApiSettings(JSON.parse(savedApiSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (settingsType: string, settings: any) => {
    try {
      setLoading(true);
      
      // Save to localStorage (in a real app, this would be an API call)
      localStorage.setItem(settingsType, JSON.stringify(settings));
      
      // Apply theme changes immediately
      if (settingsType === 'appearance') {
        applyTheme(settings.theme);
      }
      
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to save settings. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const generateApiKey = () => {
    const newApiKey = 'jlb_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiSettings(prev => ({ ...prev, apiKey: newApiKey }));
  };

  const exportData = async () => {
    try {
      setLoading(true);
      // In a real app, this would trigger a data export
      const exportData = {
        user: user,
        settings: { notifications, privacy, appearance },
        exportDate: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jordan-lawbot-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('Data exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to export data. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call to delete the account
      console.log('Account deletion requested');
      setSuccessMessage('Account deletion request submitted. You will receive a confirmation email.');
      setShowDeleteConfirm(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      setErrorMessage('Failed to process account deletion. Please contact support.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'privacy', name: 'Privacy & Security', icon: ShieldCheckIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
    { id: 'api', name: 'API & Integrations', icon: KeyIcon },
    { id: 'data', name: 'Data Management', icon: GlobeAltIcon },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences and privacy settings</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.emailNotifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                    <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.pushNotifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Weekly Reports</h4>
                    <p className="text-sm text-gray-500">Receive weekly usage and analytics reports</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.weeklyReports}
                      onChange={(e) => setNotifications(prev => ({ ...prev, weeklyReports: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Security Alerts</h4>
                    <p className="text-sm text-gray-500">Important security and account notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.securityAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, securityAlerts: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Marketing Emails</h4>
                    <p className="text-sm text-gray-500">Product updates and promotional content</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.marketingEmails}
                      onChange={(e) => setNotifications(prev => ({ ...prev, marketingEmails: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Session Reminders</h4>
                    <p className="text-sm text-gray-500">Reminders for incomplete sessions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.sessionReminders}
                      onChange={(e) => setNotifications(prev => ({ ...prev, sessionReminders: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => saveSettings('notifications', notifications)}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Save Notification Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Privacy & Security</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={privacy.profileVisibility}
                    onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value as any }))}
                    className="input"
                  >
                    <option value="public">Public - Visible to everyone</option>
                    <option value="lawyers-only">Lawyers Only - Visible to verified lawyers</option>
                    <option value="private">Private - Not visible to others</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Share Analytics</h4>
                    <p className="text-sm text-gray-500">Help improve the platform by sharing anonymous usage data</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacy.shareAnalytics}
                      onChange={(e) => setPrivacy(prev => ({ ...prev, shareAnalytics: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Allow Data Export</h4>
                    <p className="text-sm text-gray-500">Enable data export functionality for your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacy.allowDataExport}
                      onChange={(e) => setPrivacy(prev => ({ ...prev, allowDataExport: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session History Retention
                  </label>
                  <select
                    value={privacy.sessionHistory}
                    onChange={(e) => setPrivacy(prev => ({ ...prev, sessionHistory: e.target.value as any }))}
                    className="input"
                  >
                    <option value="keep-all">Keep All Sessions</option>
                    <option value="keep-1year">Keep for 1 Year</option>
                    <option value="keep-6months">Keep for 6 Months</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => saveSettings('privacy', privacy)}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Save Privacy Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Appearance & Language</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={appearance.theme}
                    onChange={(e) => setAppearance(prev => ({ ...prev, theme: e.target.value as any }))}
                    className="input"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={appearance.language}
                    onChange={(e) => setAppearance(prev => ({ ...prev, language: e.target.value as any }))}
                    className="input"
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size
                  </label>
                  <select
                    value={appearance.fontSize}
                    onChange={(e) => setAppearance(prev => ({ ...prev, fontSize: e.target.value as any }))}
                    className="input"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Compact Mode</h4>
                    <p className="text-sm text-gray-500">Use a more compact interface layout</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.compactMode}
                      onChange={(e) => setAppearance(prev => ({ ...prev, compactMode: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => saveSettings('appearance', appearance)}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Save Appearance Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">API & Integrations</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      value={apiSettings.apiKey}
                      readOnly
                      placeholder="No API key generated"
                      className="input flex-1"
                    />
                    <button
                      onClick={generateApiKey}
                      className="btn-secondary"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Use this API key to integrate Jordan LawBot with your applications
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={apiSettings.webhookUrl}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    placeholder="https://your-app.com/webhook"
                    className="input"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Receive notifications about important events
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Rate Limiting</h4>
                    <p className="text-sm text-gray-500">Enable rate limiting for API requests</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={apiSettings.rateLimitEnabled}
                      onChange={(e) => setApiSettings(prev => ({ ...prev, rateLimitEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {apiSettings.rateLimitEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Requests per Hour
                    </label>
                    <input
                      type="number"
                      value={apiSettings.maxRequestsPerHour}
                      onChange={(e) => setApiSettings(prev => ({ ...prev, maxRequestsPerHour: parseInt(e.target.value) }))}
                      min="1"
                      max="1000"
                      className="input"
                    />
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={() => saveSettings('apiSettings', apiSettings)}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Save API Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Export</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Export all your data including chat sessions, settings, and analytics.
                  </p>
                  <button
                    onClick={exportData}
                    disabled={loading || !privacy.allowDataExport}
                    className="btn-secondary"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Export My Data'}
                  </button>
                  {!privacy.allowDataExport && (
                    <p className="text-sm text-yellow-600">
                      Data export is disabled in your privacy settings.
                    </p>
                  )}
                </div>
              </div>

              <div className="card border-red-200">
                <h3 className="text-lg font-semibold text-red-900 mb-6">Danger Zone</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900">Delete Account</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-danger"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Account Deletion</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete your account? This will permanently remove all your data, 
              including chat sessions, settings, and analytics. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={loading}
                className="btn-danger flex-1"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;