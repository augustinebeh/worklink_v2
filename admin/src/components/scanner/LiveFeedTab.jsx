import React from 'react';
import {
  SearchIcon,
  RadioIcon,
  PlusIcon,
  EyeOffIcon,
  ClockIcon,
  InboxIcon,
  LoaderIcon,
  FilterIcon
} from 'lucide-react';

// Source color mapping for badges
const SOURCE_COLORS = {
  gebiz: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  alps: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  mohh_ariba: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  tenderboard: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  mbs_supplier: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
};

const getSourceColor = (source) =>
  SOURCE_COLORS[source] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';

// Category display labels (short form for pills)
const CATEGORY_SHORT_LABELS = {
  healthcare_staffing: 'Healthcare',
  hospitality_services: 'Hospitality',
  manpower_services: 'Manpower',
  cleaning_services: 'Cleaning',
  security_services: 'Security',
  catering_services: 'Catering',
  event_management: 'Events',
  facility_management: 'Facilities',
  transport_services: 'Transport',
  general_services: 'General',
};

/**
 * LiveFeedTab
 * Shows search/filter bar, category pills, active source indicator, and tender cards list.
 */
export default function LiveFeedTab({
  feedTenders,
  feedSearch,
  setFeedSearch,
  feedFilter,
  setFeedFilter,
  activePortals,
  loading,
  onAddToPipeline,
  onDismiss,
  categories,
  enabledCategories,
  onToggleCategory
}) {
  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={feedSearch}
            onChange={(e) => setFeedSearch(e.target.value)}
            placeholder="Search tenders..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
          />
        </div>
        <select
          value={feedFilter}
          onChange={(e) => setFeedFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
        >
          <option value="all">All Tenders</option>
          <option value="open">Open (Not Dismissed)</option>
          <option value="dismissed">Dismissed</option>
          <option value="in_pipeline">Added to Pipeline</option>
        </select>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <CategoryFilterBar
          categories={categories}
          enabledCategories={enabledCategories}
          onToggle={onToggleCategory}
        />
      )}

      {/* Active Sources Indicator */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <RadioIcon className="h-3.5 w-3.5 text-green-500 animate-pulse" />
        <span>Scraping from:</span>
        {activePortals.length > 0 ? (
          activePortals.map(p => (
            <span
              key={p.portal_key}
              className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium"
            >
              {p.name}
            </span>
          ))
        ) : (
          <span className="text-slate-400 dark:text-slate-500">None active</span>
        )}
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderIcon className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-slate-500 dark:text-slate-400">Loading feed...</span>
        </div>
      ) : feedTenders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <InboxIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No tenders found</h3>
          <p className="text-slate-500 dark:text-slate-400">
            {feedSearch
              ? 'Try a different search term or filter.'
              : enabledCategories.length === 0
              ? 'No categories selected. Enable categories in Portals & Sources tab.'
              : 'The scanner has not discovered any matching tenders yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedTenders.map((tender) => (
            <TenderFeedCard
              key={tender.id}
              tender={tender}
              onAdd={onAddToPipeline}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CategoryFilterBar
 * Row of pill buttons showing which categories are active in the feed.
 */
function CategoryFilterBar({ categories, enabledCategories, onToggle }) {
  const allEnabled = enabledCategories.length === categories.length;
  const noneEnabled = enabledCategories.length === 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FilterIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
      <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">Categories:</span>
      {categories.map((cat) => {
        const isEnabled = enabledCategories.includes(cat.key);
        return (
          <button
            key={cat.key}
            onClick={() => onToggle(cat.key)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
              isEnabled
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-400'
            }`}
            title={cat.keywords}
          >
            {CATEGORY_SHORT_LABELS[cat.key] || cat.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * TenderFeedCard
 * Individual tender card in the live feed list.
 */
function TenderFeedCard({ tender, onAdd, onDismiss }) {
  const sourceColor = getSourceColor(tender.source || 'gebiz');
  const categoryLabel = CATEGORY_SHORT_LABELS[tender.category] || tender.category;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {tender.title}
            </h4>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase flex-shrink-0 ${sourceColor}`}>
              {(tender.source || 'gebiz').toUpperCase()}
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tender.agency}</p>
            {categoryLabel && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                {categoryLabel}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1">
              <ClockIcon className="h-3.5 w-3.5" />
              <span>Closes: {tender.closing_date || 'N/A'}</span>
            </span>
            {tender.estimated_value && (
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Est: ${Number(tender.estimated_value).toLocaleString()}
              </span>
            )}
          </div>
          {tender.matched_keywords && tender.matched_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tender.matched_keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => onAdd(tender)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 dark:bg-emerald-500 rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center space-x-1"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>Add to Pipeline</span>
          </button>
          <button
            onClick={() => onDismiss(tender.id)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center space-x-1"
          >
            <EyeOffIcon className="h-3.5 w-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
}
