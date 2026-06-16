'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Settings {
  defaultView: 'inbox' | 'today' | 'next7days' | 'upcoming' | 'calendar' | 'kanban' | 'dashboard';
  showCompleted: boolean;
  reminderEnabled: boolean;
  reminderMinutes: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    defaultView: 'inbox',
    showCompleted: false,
    reminderEnabled: true,
    reminderMinutes: 15,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/preferences');
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data.data }));
        }
      } catch {
        // Fallback to localStorage
        const saved = localStorage.getItem('taskSettings');
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      }
    };
    loadSettings();
  }, []);

  const saveSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('taskSettings', JSON.stringify(updated));

    // Also save to server
    fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const resetAllData = () => {
    if (!confirm('Are you sure you want to reset all data? This cannot be undone.')) return;

    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Customize your task management experience.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Theme</Label>
              <p className="text-sm text-gray-400">Switch between light and dark mode.</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Preferences</CardTitle>
          <CardDescription>Configure default task behaviors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base">Default View</Label>
            <p className="text-sm text-gray-400 mb-2">Choose which page to see when you open the app.</p>
            <select
              value={settings.defaultView}
              onChange={(e) => saveSettings({ defaultView: e.target.value as Settings['defaultView'] })}
              className="w-full p-2 rounded-md border bg-background"
            >
              <option value="inbox">Inbox</option>
              <option value="today">Today</option>
              <option value="next7days">Next 7 Days</option>
              <option value="upcoming">Upcoming</option>
              <option value="calendar">Calendar</option>
              <option value="kanban">Kanban</option>
              <option value="dashboard">Dashboard</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Show completed tasks</Label>
              <p className="text-sm text-gray-400">Display completed tasks by default.</p>
            </div>
            <button
              type="button"
              onClick={() => saveSettings({ showCompleted: !settings.showCompleted })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.showCompleted ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition ${
                  settings.showCompleted ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure reminder notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable reminders</Label>
              <p className="text-sm text-gray-400">Get notified about upcoming tasks.</p>
            </div>
            <button
              type="button"
              onClick={() => saveSettings({ reminderEnabled: !settings.reminderEnabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.reminderEnabled ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition ${
                  settings.reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <Label className="text-base">Default reminder time (minutes)</Label>
            <p className="text-sm text-gray-400 mb-2">How many minutes before a task to show reminder.</p>
            <Input
              type="number"
              min="1"
              max="1440"
              value={settings.reminderMinutes}
              onChange={(e) => saveSettings({ reminderMinutes: parseInt(e.target.value) || 15 })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Import, export, and reset your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={() => window.location.href = '/api/export?format=json'}>
            Export All Data
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('import-input')?.click()}>
            Import Data
          </Button>
          <input
            id="import-input"
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const text = await file.text();
                const res = await fetch('/api/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: text,
                });
                if (res.ok) {
                  alert('Data imported successfully! Page will reload.');
                  window.location.href = '/';
                } else {
                  const error = await res.json();
                  alert('Import failed: ' + error.error);
                }
                e.target.value = '';
              }
            }}
          />
          <Button variant="destructive" onClick={resetAllData}>
            Reset All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}