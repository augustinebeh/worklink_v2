import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BriefcaseIcon,
  CalendarIcon,
  UsersIcon,
  CheckCircleIcon,
  DollarSignIcon,
  XIcon,
  RocketIcon,
  PlayCircleIcon,
  LightbulbIcon,
  StarIcon,
  TrophyIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { clsx } from 'clsx';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(value || 0);
};

// Onboarding steps for new recruiters
const onboardingSteps = [
  { id: 'welcome', title: 'Welcome!', description: 'Start your journey as a recruitment coordinator', icon: RocketIcon, completed: true },
  { id: 'add_client', title: 'Add Your First Client', description: 'Register a company that needs manpower', icon: BriefcaseIcon, href: '/clients', tip: 'Start with an existing client relationship - it\'s easier to grow from there!' },
  { id: 'create_job', title: 'Create a Job Posting', description: 'Set up your first job with rates and slots', icon: CalendarIcon, href: '/jobs', tip: 'Aim for 25-30% gross margin. Charge $20/hr, pay $13-15/hr is a good starting point.' },
  { id: 'recruit_candidate', title: 'Recruit Candidates', description: 'Add workers to your talent pool', icon: UsersIcon, href: '/candidates', tip: 'Quality over quantity! 10 reliable workers beat 50 flaky ones.' },
  { id: 'first_deployment', title: 'Complete First Deployment', description: 'Successfully match and deploy a worker', icon: CheckCircleIcon, href: '/deployments', tip: 'Follow up after every job. Happy workers = repeat business!' },
  { id: 'track_financials', title: 'Track Your Profits', description: 'Understand your margins and growth', icon: DollarSignIcon, href: '/financials', tip: 'Review financials weekly. Catch margin leaks early!' },
];

// Quick tips carousel
const quickTips = [
  { title: 'Margin Math', content: 'Your gross profit = (Charge Rate - Pay Rate) x Hours. Aim for 25-30% margin minimum.', category: 'Finance' },
  { title: 'Finding Clients', content: 'Check GeBIZ daily for government tenders. Set up keyword alerts for "manpower" and "event support".', category: 'Sales' },
  { title: 'Keeping Workers Happy', content: 'Fast payments and consistent work = loyal workers. Pay within 7 days of job completion.', category: 'Operations' },
  { title: 'Scaling Up', content: 'Once you have 20 reliable workers, you can take bigger contracts (10-50 pax events).', category: 'Growth' },
  { title: 'Peak Seasons', content: 'Dec-Feb and Jun-Aug are peak. Book workers early for CNY, Christmas, and school holidays.', category: 'Planning' },
];

function OnboardingCard({ step, index }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className={clsx(
      'relative p-4 rounded-xl border-2 transition-all',
      step.completed
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-primary-300'
    )}>
      <div className="flex items-start gap-3">
        <div className={clsx(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          step.completed
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        )}>
          {step.completed ? <CheckCircleIcon className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Step {index + 1}</span>
            {step.completed && <Badge variant="success" size="xs">Done</Badge>}
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white">{step.title}</h4>
          <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>

          {step.tip && (
            <button
              onClick={() => setShowTip(!showTip)}
              className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
            >
              <LightbulbIcon className="h-3 w-3" />
              {showTip ? 'Hide tip' : 'Show tip'}
            </button>
          )}

          {showTip && step.tip && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">{step.tip}</p>
            </div>
          )}
        </div>

        {!step.completed && step.href && (
          <Link
            to={step.href}
            className="flex-shrink-0 p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
          >
            <PlayCircleIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function TipCarousel() {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % quickTips.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const tip = quickTips[currentTip];

  return (
    <Card className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-100 dark:border-primary-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Badge variant="info" size="xs">{tip.category}</Badge>
          <h4 className="font-semibold text-slate-900 dark:text-white mt-2">{tip.title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tip.content}</p>
        </div>
        <div className="flex gap-1 ml-4">
          {quickTips.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentTip(i)}
              className={clsx(
                'w-2 h-2 rounded-full transition-colors',
                i === currentTip ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'
              )}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function OnboardingProgress({ completedSteps, showOnboarding, setShowOnboarding }) {
  const stepsWithStatus = onboardingSteps.map(step => ({
    ...step,
    completed: completedSteps.includes(step.id)
  }));

  const completionPercent = Math.round((completedSteps.length / onboardingSteps.length) * 100);
  const allComplete = completedSteps.length === onboardingSteps.length;

  if (!showOnboarding || allComplete) return null;

  return (
    <Card className="border-2 border-primary-200 dark:border-primary-800 bg-gradient-to-r from-primary-50/50 to-white dark:from-primary-900/10 dark:to-slate-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/50">
            <RocketIcon className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Getting Started Guide</h3>
            <p className="text-sm text-slate-500">{completionPercent}% complete - {onboardingSteps.length - completedSteps.length} steps remaining</p>
          </div>
        </div>
        <button onClick={() => setShowOnboarding(false)} className="p-1 text-slate-400 hover:text-slate-600">
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {stepsWithStatus.map((step, i) => (
          <OnboardingCard key={step.id} step={step} index={i} />
        ))}
      </div>
    </Card>
  );
}

export function TopPerformers({ financialData }) {
  if (!financialData?.topPerformers?.length) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            <CardTitle>Your Star Workers</CardTitle>
          </div>
          <p className="text-xs text-slate-500">These workers generate the most profit for you</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {financialData.topPerformers.slice(0, 5).map((candidate, idx) => (
            <Link key={candidate.id} to={`/candidates/${candidate.id}`}>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <img
                    src={candidate.profile_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name}`}
                    alt={candidate.name}
                    className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-700"
                  />
                  <div className={clsx(
                    'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                  )}>
                    {idx + 1}
                  </div>
                </div>
                <p className="font-medium text-slate-900 dark:text-white truncate">{candidate.name}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <StarIcon className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs text-slate-500">Lv.{candidate.level}</span>
                </div>
                <p className="text-lg font-bold text-emerald-600 mt-2">{formatCurrency(candidate.profit_generated)}</p>
                <p className="text-xs text-slate-400">{candidate.deployments} jobs</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Default export bundles all sections together for convenience
export default function RecentActivity({ completedSteps, showOnboarding, setShowOnboarding, financialData }) {
  return (
    <>
      <OnboardingProgress
        completedSteps={completedSteps}
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
      />
      <TipCarousel />
      <TopPerformers financialData={financialData} />
    </>
  );
}
