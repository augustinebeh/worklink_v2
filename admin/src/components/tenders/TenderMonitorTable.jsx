import React from 'react';
import {
  TrashIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  TrendingUpIcon,
  TagIcon,
  BellIcon,
  SearchIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Table from '../ui/Table';
import { clsx } from 'clsx';

/**
 * StatCard - Small stat display used in the dashboard tab.
 */
function StatCard({ title, value, icon: Icon, color = 'primary', subtitle }) {
  const colors = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

/**
 * DashboardTab - Stats, alert performance, and recommended keywords.
 */
function DashboardTab({ dashboard, onAddKeyword }) {
  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Alerts" value={dashboard.stats.activeAlerts} icon={BellIcon} color="primary" />
        <StatCard title="Total Matches" value={dashboard.stats.totalMatches} icon={SearchIcon} color="info" />
        <StatCard title="Unread Matches" value={dashboard.stats.unreadMatches} icon={AlertCircleIcon} color="warning" />
        <StatCard
          title="Last Checked"
          value={dashboard.stats.lastChecked ? new Date(dashboard.stats.lastChecked).toLocaleTimeString() : 'Never'}
          icon={RefreshCwIcon}
          color="success"
        />
      </div>

      {/* Alert Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-primary-500" />
            Alert Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboard.alertPerformance?.map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <code className="text-sm font-medium text-slate-700 dark:text-slate-300">"{alert.keyword}"</code>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.source}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-white">{alert.total_matches} matches</p>
                  <p className="text-xs text-slate-500">{alert.matches_this_week} this week</p>
                </div>
              </div>
            ))}
            {(!dashboard.alertPerformance || dashboard.alertPerformance.length === 0) && (
              <p className="text-center text-slate-500 py-4">No alerts configured yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Keywords */}
      {dashboard.recommendedKeywords?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-amber-500" />
              Recommended Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dashboard.recommendedKeywords.map((rec, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div>
                    <code className="text-sm font-medium text-amber-800 dark:text-amber-300">"{rec.keyword}"</code>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{rec.reason}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onAddKeyword(rec.keyword)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * AlertsTab - Table of keyword alerts with toggle and delete actions.
 */
function AlertsTab({ alerts, loading, onToggleAlert, onDeleteAlert }) {
  const alertColumns = [
    {
      header: 'Keyword',
      accessor: 'keyword',
      render: (value) => <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-sm">{value}</code>
    },
    { header: 'Source', accessor: 'source', render: (value) => <Badge variant="info">{value}</Badge> },
    { header: 'Matches', accessor: 'match_count', render: (value) => value || 0 },
    {
      header: 'Unread',
      accessor: 'unread_count',
      render: (value) => value > 0 ? <Badge variant="error">{value}</Badge> : <span className="text-slate-400">0</span>
    },
    {
      header: 'Status',
      accessor: 'active',
      render: (value, row) => (
        <button onClick={() => onToggleAlert(row.id, value)} className="flex items-center">
          {value ? (
            <ToggleRightIcon className="h-6 w-6 text-emerald-500" />
          ) : (
            <ToggleLeftIcon className="h-6 w-6 text-slate-400" />
          )}
        </button>
      ),
    },
    {
      header: '',
      accessor: 'id',
      render: (value) => (
        <button onClick={() => onDeleteAlert(value)} className="p-1 text-red-400 hover:text-red-500">
          <TrashIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <Card padding="none">
      <Table
        columns={alertColumns}
        data={alerts}
        loading={loading}
        emptyMessage="No keyword alerts configured. Add one to start monitoring!"
      />
    </Card>
  );
}

/**
 * MatchesTab - List of unread tender matches with mark-all-read action.
 */
function MatchesTab({ unreadMatches, onMarkAllRead }) {
  return (
    <div className="space-y-4">
      {unreadMatches.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" icon={CheckCircleIcon} onClick={onMarkAllRead}>
            Mark All as Read
          </Button>
        </div>
      )}

      {unreadMatches.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No unread matches</p>
            <p className="text-sm text-slate-500 mt-1">New tender matches will appear here</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {unreadMatches.map((match) => (
            <Card key={match.id} hover>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info">{match.keyword}</Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(match.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white">{match.title}</h4>
                  {match.agency && (
                    <p className="text-sm text-slate-500 mt-1">{match.agency}</p>
                  )}
                  {match.estimated_value && (
                    <p className="text-sm text-emerald-600 font-medium mt-1">
                      Est. Value: ${(match.estimated_value / 1000).toFixed(0)}K
                    </p>
                  )}
                </div>
                {match.external_url && (
                  <a
                    href={match.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ExternalLinkIcon className="h-5 w-5 text-slate-400" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export { StatCard, DashboardTab, AlertsTab, MatchesTab };
