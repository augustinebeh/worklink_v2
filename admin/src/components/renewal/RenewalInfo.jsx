import { useState } from 'react';
import {
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
  Trophy
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate } from '../../shared/utils/formatters';
import { clsx } from 'clsx';

// Similar Tenders Carousel
function SimilarTendersCarousel({ similarTenders = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!similarTenders.length) return null;

  const nextTender = () => {
    setCurrentIndex((prev) => (prev + 1) % similarTenders.length);
  };

  const prevTender = () => {
    setCurrentIndex((prev) => (prev - 1 + similarTenders.length) % similarTenders.length);
  };

  const current = similarTenders[currentIndex];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 dark:text-white">Similar Past Tenders</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={prevTender}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={similarTenders.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-500">
            {currentIndex + 1} of {similarTenders.length}
          </span>
          <button
            onClick={nextTender}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={similarTenders.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h5 className="font-medium text-slate-900 dark:text-white">{current.title}</h5>
            <p className="text-sm text-slate-500 mt-1">{current.agency}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>{formatCurrency(current.value)}</span>
              <span>{formatDate(current.award_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {current.won ? (
              <Badge variant="success">Won</Badge>
            ) : (
              <Badge variant="neutral">Lost</Badge>
            )}
            <Trophy className={clsx(
              'h-4 w-4',
              current.won ? 'text-emerald-500' : 'text-slate-400'
            )} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RenewalInfo({ renewal }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Contract Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Original Contract</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Start Date:</span>
                <span>{formatDate(renewal.original_start_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span>{renewal.contract_duration || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contract Type:</span>
                <span>{renewal.contract_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Procurement Method:</span>
                <span>{renewal.procurement_method || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Incumbent Supplier</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Company:</span>
                <span>{renewal.incumbent_supplier || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Performance:</span>
                <span className="flex items-center gap-1">
                  {renewal.incumbent_performance || 'N/A'}
                  {renewal.incumbent_performance === 'Good' && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Issues:</span>
                <span>{renewal.known_issues || 'None known'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Probability Reasoning */}
        <div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-3">Renewal Probability Analysis</h4>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <ul className="space-y-2">
              {renewal.probability_factors?.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className={clsx(
                    'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                    factor.positive ? 'bg-emerald-500' : 'bg-red-500'
                  )} />
                  <span className={factor.positive ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                    {factor.description}
                  </span>
                </li>
              )) || (
                <li className="text-sm text-slate-500">No analysis factors available</li>
              )}
            </ul>
          </div>
        </div>

        {/* Historical Performance */}
        <div>
          <h4 className="font-medium text-slate-900 dark:text-white mb-3">Historical Performance</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-600">{renewal.agency_win_rate || 0}%</div>
              <div className="text-xs text-slate-500">Win Rate (This Agency)</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <div className="text-2xl font-bold text-emerald-600">{renewal.past_tenders || 0}</div>
              <div className="text-xs text-slate-500">Past Tenders</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <div className="text-2xl font-bold text-amber-600">{renewal.avg_win_margin || 0}%</div>
              <div className="text-xs text-slate-500">Avg Win Margin</div>
            </div>
          </div>
        </div>

        {/* Similar Tenders */}
        <SimilarTendersCarousel similarTenders={renewal.similar_tenders || []} />
      </CardContent>
    </Card>
  );
}
