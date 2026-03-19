import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { clsx } from 'clsx';

export default function EscalationFilters({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  filters,
  onFilterChange,
  selectedCount,
  onBulkAssign,
  onClearSelection
}) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search escalations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={onToggleFilters}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </div>

        {/* Bulk actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {selectedCount} selected
            </span>
            <Button
              onClick={onBulkAssign}
              variant="outline"
              size="sm"
            >
              Bulk Assign
            </Button>
            <Button
              onClick={onClearSelection}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select
              value={filters.status}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>

            <input
              type="text"
              placeholder="Assigned to..."
              value={filters.assignedAdmin}
              onChange={(e) => onFilterChange({ ...filters, assignedAdmin: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />

            <label className="flex items-center gap-2 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={filters.unassignedOnly}
                onChange={(e) => onFilterChange({ ...filters, unassignedOnly: e.target.checked })}
                className="rounded"
              />
              Unassigned only
            </label>

            <label className="flex items-center gap-2 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={filters.slaBreachedOnly}
                onChange={(e) => onFilterChange({ ...filters, slaBreachedOnly: e.target.checked })}
                className="rounded"
              />
              SLA breached
            </label>
          </div>
        </div>
      )}
    </Card>
  );
}
