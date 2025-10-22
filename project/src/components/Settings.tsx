import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Camera, Clock, Shield, Bell } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    recognitionThreshold: 75,
    autoMarkAttendance: true,
    locationTracking: true,
    lateThreshold: 15,
    notificationsEnabled: true,
    cameraQuality: 'high',
    dataRetention: 365,
    backupFrequency: 'daily',
  });

  const handleSettingChange = (key: string, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // In a real application, this would save to backend
    localStorage.setItem('neoattend_settings', JSON.stringify({ ...settings, [key]: value }));
  };

  const resetDatabase = () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      localStorage.removeItem('neoattend_students');
      localStorage.removeItem('neoattend_attendance');
      localStorage.removeItem('neoattend_settings');
      window.location.reload();
    }
  };

  const exportData = () => {
    const students = localStorage.getItem('neoattend_students');
    const attendance = localStorage.getItem('neoattend_attendance');
    
    const exportData = {
      students: students ? JSON.parse(students) : [],
      attendance: attendance ? JSON.parse(attendance) : [],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neoattend-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SettingCard = ({ icon: Icon, title, description, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-cyan-500/20 rounded-lg backdrop-blur-sm">
          <Icon className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-300">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-xl p-6 text-white shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 flex items-center">
          <SettingsIcon className="h-7 w-7 mr-3" />
          System Settings
        </h2>
        <p className="text-purple-100">Configure NEOATTEND system preferences and parameters</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Face Recognition Settings */}
        <SettingCard
          icon={Camera}
          title="Face Recognition"
          description="Configure facial recognition parameters"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recognition Threshold: {settings.recognitionThreshold}%
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={settings.recognitionThreshold}
                onChange={(e) => handleSettingChange('recognitionThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Less Strict (50%)</span>
                <span>More Strict (95%)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Camera Quality</label>
              <select
                value={settings.cameraQuality}
                onChange={(e) => handleSettingChange('cameraQuality', e.target.value)}
                className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/10 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="low" className="bg-gray-800 text-white">Low (480p)</option>
                <option value="medium" className="bg-gray-800 text-white">Medium (720p)</option>
                <option value="high" className="bg-gray-800 text-white">High (1080p)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Auto-mark attendance</span>
              <button
                onClick={() => handleSettingChange('autoMarkAttendance', !settings.autoMarkAttendance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoMarkAttendance ? 'bg-cyan-600' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoMarkAttendance ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </SettingCard>

        {/* Time & Location Settings */}
        <SettingCard
          icon={Clock}
          title="Time & Location"
          description="Configure time and location tracking"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Late Threshold: {settings.lateThreshold} minutes
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={settings.lateThreshold}
                onChange={(e) => handleSettingChange('lateThreshold', parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-1">
                Students arriving after this time will be marked as late
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-300">Location Tracking</span>
                <p className="text-xs text-gray-400">Track attendance location for verification</p>
              </div>
              <button
                onClick={() => handleSettingChange('locationTracking', !settings.locationTracking)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.locationTracking ? 'bg-cyan-600' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.locationTracking ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </SettingCard>

        {/* Notification Settings */}
        <SettingCard
          icon={Bell}
          title="Notifications"
          description="Configure system notifications and alerts"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-300">Enable Notifications</span>
                <p className="text-xs text-gray-400">Get alerts for attendance events</p>
              </div>
              <button
                onClick={() => handleSettingChange('notificationsEnabled', !settings.notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notificationsEnabled ? 'bg-cyan-600' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-3 bg-cyan-500/20 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
              <h4 className="text-sm font-medium text-cyan-100 mb-2">Notification Types</h4>
              <div className="space-y-2 text-xs text-cyan-200">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded bg-white/20 border-white/30" />
                  <span>Low attendance alerts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded bg-white/20 border-white/30" />
                  <span>System status updates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded bg-white/20 border-white/30" />
                  <span>Daily attendance summaries</span>
                </div>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* Database Settings */}
        <SettingCard
          icon={Database}
          title="Data Management"
          description="Manage system data and backups"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data Retention (days)</label>
              <select
                value={settings.dataRetention}
                onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/10 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={90} className="bg-gray-800 text-white">3 months</option>
                <option value={180} className="bg-gray-800 text-white">6 months</option>
                <option value={365} className="bg-gray-800 text-white">1 year</option>
                <option value={730} className="bg-gray-800 text-white">2 years</option>
                <option value={-1} className="bg-gray-800 text-white">Never delete</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Backup Frequency</label>
              <select
                value={settings.backupFrequency}
                onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                className="w-full px-3 py-2 border border-white/30 rounded-lg bg-white/10 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="hourly" className="bg-gray-800 text-white">Hourly</option>
                <option value="daily" className="bg-gray-800 text-white">Daily</option>
                <option value="weekly" className="bg-gray-800 text-white">Weekly</option>
                <option value="monthly" className="bg-gray-800 text-white">Monthly</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={exportData}
                className="flex-1 bg-gradient-to-r from-green-600 to-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-cyan-700 transform hover:scale-105 transition-all duration-200 text-sm"
              >
                Export Data
              </button>
              <button
                onClick={resetDatabase}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 text-sm"
              >
                Reset Database
              </button>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* System Information */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-green-400" />
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-cyan-500/20 rounded-lg backdrop-blur-sm border border-cyan-500/30">
            <p className="text-2xl font-bold text-cyan-400">v2.1.0</p>
            <p className="text-sm text-cyan-200">System Version</p>
          </div>
          <div className="text-center p-4 bg-green-500/20 rounded-lg backdrop-blur-sm border border-green-500/30">
            <p className="text-2xl font-bold text-green-400">99.9%</p>
            <p className="text-sm text-green-200">Uptime</p>
          </div>
          <div className="text-center p-4 bg-purple-500/20 rounded-lg backdrop-blur-sm border border-purple-500/30">
            <p className="text-2xl font-bold text-purple-400">2.1ms</p>
            <p className="text-sm text-purple-200">Avg Response</p>
          </div>
          <div className="text-center p-4 bg-pink-500/20 rounded-lg backdrop-blur-sm border border-pink-500/30">
            <p className="text-2xl font-bold text-pink-400">SSL</p>
            <p className="text-sm text-pink-200">Security</p>
          </div>
        </div>
      </div>
    </div>
  );
}