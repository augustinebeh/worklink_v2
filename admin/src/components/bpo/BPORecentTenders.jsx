import {
  ExternalLinkIcon,
  LightbulbIcon,
  GlobeIcon,
  ChevronRightIcon,
  BuildingIcon,
  BriefcaseIcon,
  RssIcon,
  BotIcon,
  TagIcon,
  AlertCircleIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { clsx } from 'clsx';

function PortalCard({ portal }) {
  const priorityColors = {
    essential: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <Card hover className="h-full">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-slate-900 dark:text-white">{portal.name}</h4>
            {portal.priority && (
              <span className={clsx('text-2xs px-2 py-0.5 rounded-full font-medium uppercase', priorityColors[portal.priority])}>
                {portal.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{portal.description}</p>
          {portal.categories && (
            <div className="flex flex-wrap gap-1 mt-3">
              {portal.categories.slice(0, 3).map((cat, idx) => (
                <Badge key={idx} variant="neutral" className="text-2xs">{cat}</Badge>
              ))}
              {portal.categories.length > 3 && (
                <Badge variant="neutral" className="text-2xs">+{portal.categories.length - 3}</Badge>
              )}
            </div>
          )}
          {portal.tip && (
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-3">💡 {portal.tip}</p>
          )}
          {portal.features && (
            <div className="flex flex-wrap gap-1 mt-3">
              {portal.features.map((feat, idx) => (
                <span key={idx} className="text-2xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                  {feat}
                </span>
              ))}
            </div>
          )}
          {portal.cost && (
            <p className="text-xs text-slate-500 mt-2">💰 {portal.cost}</p>
          )}
        </div>
        <a
          href={portal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ExternalLinkIcon className="h-5 w-5 text-slate-400" />
        </a>
      </div>
    </Card>
  );
}

function RecommendationsTab({ recommendations }) {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-slate-900 border-primary-200 dark:border-primary-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/50">
            <LightbulbIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">2026 Acquisition Intelligence</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Strategic recommendations based on Singapore tender market analysis and competitive intelligence.
            </p>
          </div>
        </div>
      </Card>

      {recommendations.recommendations?.map((category, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle>{category.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {category.items?.map((item, itemIdx) => (
                <div key={itemIdx} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <h4 className="font-medium text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.insight}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                    <ChevronRightIcon className="h-4 w-4" />
                    <span>{item.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PortalsTab({ governmentPortals, privatePortals, portalTab, setPortalTab }) {
  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
            <GlobeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Singapore Tender Portals</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Government and private sector portals for ad-hoc manpower tenders. Register on these to expand your opportunities.
            </p>
          </div>
        </div>
      </Card>

      {/* Portal Sub-tabs */}
      <div className="flex gap-2">
        {[
          { id: 'government', label: 'Government & GLCs', icon: BuildingIcon },
          { id: 'private', label: 'Private Sector', icon: BriefcaseIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPortalTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              portalTab === tab.id
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portalTab === 'government' && governmentPortals.map((portal, idx) => (
          <PortalCard key={idx} portal={portal} />
        ))}
        {portalTab === 'private' && privatePortals.map((portal, idx) => (
          <PortalCard key={idx} portal={portal} />
        ))}
      </div>
    </div>
  );
}

function ToolsTab({ aggregatorTools, automationTools }) {
  return (
    <div className="space-y-6">
      <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
            <BotIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Automatic Tender Monitoring</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Don't scrape GeBIZ directly (strong anti-bot protection). Use these aggregators and automation tools instead.
            </p>
          </div>
        </div>
      </Card>

      {/* Aggregators Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <RssIcon className="h-5 w-5 text-amber-500" />
          Done-for-You Aggregators (Recommended)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aggregatorTools.map((tool, idx) => (
            <PortalCard key={idx} portal={tool} />
          ))}
        </div>
      </div>

      {/* DIY Tools Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <BotIcon className="h-5 w-5 text-primary-500" />
          Build Your Own (For Power Users)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automationTools.map((tool, idx) => (
            <Card key={idx} hover>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 dark:text-white">{tool.name}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tool.description}</p>
                  {tool.features && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {tool.features.map((feat, fidx) => (
                        <span key={fidx} className="text-2xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}
                  {tool.setup && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-slate-500 whitespace-pre-line">{tool.setup}</p>
                    </div>
                  )}
                  {tool.cost && (
                    <p className="text-xs text-emerald-600 mt-2">💰 {tool.cost}</p>
                  )}
                </div>
                <a href={tool.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <ExternalLinkIcon className="h-5 w-5 text-slate-400" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function KeywordsTab({ searchKeywords }) {
  return (
    <div className="space-y-6">
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/50">
            <TagIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Search Keywords for Scraping</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Use these exact strings in your alerts to catch ad-hoc manpower tenders. Copy and paste into GeBIZ alerts or aggregator filters.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircleIcon className="h-5 w-5 text-red-500" />
            Essential Keywords (Must Use)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchKeywords.filter(k => typeof k === 'string' || k.priority === 'essential').slice(0, 5).map((keyword, idx) => {
              const text = typeof keyword === 'string' ? keyword : keyword.keyword;
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <code className="text-sm font-mono text-slate-700 dark:text-slate-300">"{text}"</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Copy
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(Array.isArray(searchKeywords) ? searchKeywords : []).map((keyword, idx) => {
              const text = typeof keyword === 'string' ? keyword : keyword.keyword;
              const notes = typeof keyword === 'object' ? keyword.notes : null;
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <code className="text-sm font-mono text-slate-700 dark:text-slate-300">"{text}"</code>
                    {notes && <p className="text-xs text-slate-500 mt-1">{notes}</p>}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(text)}
                    className="text-xs text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50"
                  >
                    Copy
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Copy All */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">Copy All Keywords</h4>
            <p className="text-sm text-slate-500 mt-1">Copy all keywords at once for bulk setup</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const allKeywords = searchKeywords.map(k => typeof k === 'string' ? k : k.keyword).join('\n');
              navigator.clipboard.writeText(allKeywords);
            }}
          >
            Copy All
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function BPORecentTenders({
  activeTab,
  recommendations,
  portalTab,
  setPortalTab,
}) {
  const governmentPortals = recommendations?.governmentPortals || [];
  const privatePortals = recommendations?.privatePortals || [];
  const aggregatorTools = recommendations?.aggregatorTools || [];
  const automationTools = recommendations?.automationTools || [];
  const searchKeywords = recommendations?.searchKeywords || [];

  return (
    <>
      {activeTab === 'recommendations' && recommendations && (
        <RecommendationsTab recommendations={recommendations} />
      )}

      {activeTab === 'portals' && (
        <PortalsTab
          governmentPortals={governmentPortals}
          privatePortals={privatePortals}
          portalTab={portalTab}
          setPortalTab={setPortalTab}
        />
      )}

      {activeTab === 'tools' && (
        <ToolsTab
          aggregatorTools={aggregatorTools}
          automationTools={automationTools}
        />
      )}

      {activeTab === 'keywords' && (
        <KeywordsTab searchKeywords={searchKeywords} />
      )}
    </>
  );
}
