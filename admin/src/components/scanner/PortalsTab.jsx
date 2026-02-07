import React from 'react';
import {
  GlobeIcon,
  ExternalLinkIcon,
  BellIcon,
  ZapIcon,
  LoaderIcon,
  ShieldIcon,
  BriefcaseIcon,
  DatabaseIcon,
  FilterIcon
} from 'lucide-react';

// Portal type section config
const PORTAL_SECTIONS = [
  { type: 'government', title: 'Government Portals', icon: ShieldIcon, description: 'Singapore public sector procurement portals' },
  { type: 'aggregator', title: 'Tender Aggregators', icon: DatabaseIcon, description: 'Multi-source tender search engines and aggregation platforms' },
  { type: 'hospitality', title: 'Hospitality & Private Sector', icon: BriefcaseIcon, description: 'Hospital, hotel, and private sector vendor registration portals' }
];

/**
 * PortalsTab
 * Category settings + dynamic portal cards grouped by type + integration tools.
 */
export default function PortalsTab({
  portals,
  portalsLoading,
  onTogglePortal,
  categories,
  enabledCategories,
  onToggleCategory
}) {
  return (
    <div className="space-y-6">
      {/* Feed Categories Section */}
      <CategorySettings
        categories={categories}
        enabledCategories={enabledCategories}
        onToggle={onToggleCategory}
      />

      {/* Portal Sections */}
      {portalsLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderIcon className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-slate-500 dark:text-slate-400">Loading portals...</span>
        </div>
      ) : (
        <>
          {PORTAL_SECTIONS.map((section) => {
            const typePortals = portals.filter(p => p.type === section.type);
            if (typePortals.length === 0) return null;
            return (
              <PortalSection
                key={section.type}
                section={section}
                portals={typePortals}
                onToggle={onTogglePortal}
              />
            );
          })}
        </>
      )}

      {/* Integration Tools */}
      <IntegrationTools />
    </div>
  );
}

/**
 * CategorySettings
 * Grid of toggleable category cards that control which tenders appear in the feed.
 */
function CategorySettings({ categories, enabledCategories, onToggle }) {
  if (!categories || categories.length === 0) return null;

  const enabledCount = enabledCategories.length;
  const totalCount = categories.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FilterIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Feed Categories</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select which tender categories appear in your Live Feed
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {enabledCount} of {totalCount} active
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {categories.map((cat) => {
          const isEnabled = enabledCategories.includes(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => onToggle(cat.key)}
              className={`text-left p-3 rounded-lg border transition-all ${
                isEnabled
                  ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${
                  isEnabled
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {cat.label}
                </span>
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  isEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                }`} />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight line-clamp-2">
                {cat.keywords}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PortalSection({ section, portals, onToggle }) {
  const SectionIcon = section.icon;

  return (
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <SectionIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{section.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {portals.map((portal) => (
          <PortalCard key={portal.portal_key} portal={portal} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function PortalCard({ portal, onToggle }) {
  const isActive = portal.scraper_available && portal.enabled;
  const isComingSoon = !portal.scraper_available;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg border p-4 transition-colors ${
        isActive
          ? 'border-emerald-300 dark:border-emerald-700'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{portal.name}</h4>
            {isActive ? (
              <StatusBadge type="active" />
            ) : isComingSoon ? (
              <StatusBadge type="coming-soon" />
            ) : (
              <StatusBadge type="disabled" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{portal.description}</p>
        </div>
        {portal.scraper_available ? (
          <ToggleSwitch
            enabled={portal.enabled}
            onToggle={() => onToggle(portal.portal_key, portal.enabled)}
            label={portal.name}
          />
        ) : (
          <GlobeIcon className="h-5 w-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
        <a
          href={portal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          <span>Visit</span>
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
        {portal.last_scraped_at ? (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Last scraped: {new Date(portal.last_scraped_at).toLocaleString('en-SG')}
          </span>
        ) : portal.scraper_available ? (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Never scraped</span>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ type }) {
  const styles = {
    active: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    'coming-soon': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    disabled: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
  };
  const labels = { active: 'ACTIVE', 'coming-soon': 'COMING SOON', disabled: 'DISABLED' };

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function ToggleSwitch({ enabled, onToggle, label }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
        enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
      role="switch"
      aria-checked={enabled}
      aria-label={`Toggle ${label}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  );
}

function IntegrationTools() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Integration Tools</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IntegrationCard
          icon={BellIcon}
          iconColor="text-amber-500 dark:text-amber-400"
          title="Google Alerts"
          description="Set up Google Alerts for tender-related keywords to receive email notifications when new results appear."
          steps={[
            'Go to google.com/alerts',
            'Enter keywords like "singapore tender manpower services"',
            'Set frequency to "As-it-happens"',
            'Choose "Only best results" or "All results"'
          ]}
          linkUrl="https://www.google.com/alerts"
          linkLabel="Open Google Alerts"
        />
        <IntegrationCard
          icon={ZapIcon}
          iconColor="text-orange-500 dark:text-orange-400"
          title="Zapier Webhooks"
          description="Connect Zapier webhooks to automatically ingest tenders from external sources into the scanner feed."
          steps={[
            'Create a new Zap with "Webhooks by Zapier" trigger',
            'Set the webhook URL to your scanner ingest endpoint',
            'Map tender fields: title, agency, closing_date, url',
            'Test and enable the Zap'
          ]}
          linkUrl="https://zapier.com"
          linkLabel="Open Zapier"
        />
      </div>
    </div>
  );
}

function IntegrationCard({ icon: Icon, iconColor, title, description, steps, linkUrl, linkLabel }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center space-x-2 mb-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{description}</p>
      <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center space-x-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
      >
        <span>{linkLabel}</span>
        <ExternalLinkIcon className="h-3 w-3" />
      </a>
    </div>
  );
}
