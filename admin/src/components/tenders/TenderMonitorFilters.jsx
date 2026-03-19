import React from 'react';
import {
  RefreshCwIcon,
  PlusIcon,
  RssIcon,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { clsx } from 'clsx';

/**
 * TenderMonitorHeader - Page title and action buttons.
 */
function TenderMonitorHeader({ onRefresh, onCheckGeBIZ, onAddAlert }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tender Monitor</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Real-time GeBIZ keyword alerts and tender tracking
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" icon={RefreshCwIcon} onClick={onRefresh}>
          Refresh
        </Button>
        <Button variant="secondary" size="sm" icon={RssIcon} onClick={onCheckGeBIZ}>
          Check GeBIZ
        </Button>
        <Button size="sm" icon={PlusIcon} onClick={onAddAlert}>
          Add Alert
        </Button>
      </div>
    </div>
  );
}

/**
 * TenderMonitorTabs - Tab bar for dashboard / alerts / matches.
 */
function TenderMonitorTabs({ activeTab, onTabChange, unreadCount }) {
  return (
    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
      {['dashboard', 'alerts', 'matches'].map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={clsx(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
            activeTab === tab
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          )}
        >
          {tab}
          {tab === 'matches' && unreadCount > 0 && (
            <Badge variant="error" className="ml-2">{unreadCount}</Badge>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * AddAlertModal - Modal for adding a new keyword alert.
 */
function AddAlertModal({ isOpen, onClose, keyword, onKeywordChange, onSubmit }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Keyword Alert">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Keyword
          </label>
          <Input
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="e.g., Supply of Manpower Services"
          />
          <p className="text-xs text-slate-500 mt-1">
            Tenders containing this keyword will be matched
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!keyword.trim()}>Add Alert</Button>
        </div>
      </div>
    </Modal>
  );
}

export { TenderMonitorHeader, TenderMonitorTabs, AddAlertModal };
