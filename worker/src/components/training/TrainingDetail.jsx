import { useState, useEffect } from 'react';
import {
  BookOpenIcon,
  XIcon,
  AwardIcon,
} from 'lucide-react';

export default function TrainingDetail({ module, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Mock training content - in production this would come from the API
  const steps = module.content ? JSON.parse(module.content) : [
    { title: 'Introduction', content: module.description || 'Welcome to this training module.' },
    { title: 'Key Concepts', content: 'Learn the key concepts and best practices for this topic.' },
    { title: 'Practical Tips', content: 'Apply what you\'ve learned with these practical tips.' },
    { title: 'Summary', content: 'Great job! You\'ve completed this training module.' },
  ];

  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(module);
    setCompleting(false);
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 z-[100] flex items-center justify-center"
      style={{ position: 'fixed', height: '100dvh', width: '100vw' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg bg-[#0a1628] rounded-3xl border border-white/[0.08] max-h-[85vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a1628] px-4 py-4 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <BookOpenIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{module.title}</h2>
                <p className="text-xs text-white/40">{module.category || 'Training'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[200px]">
          <h3 className="text-xl font-semibold text-white mb-4">{steps[currentStep].title}</h3>
          <p className="text-white/60 leading-relaxed">{steps[currentStep].content}</p>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a1628] px-4 py-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={completing}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {completing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  Completing...
                </span>
              ) : isLastStep ? (
                <span className="flex items-center justify-center gap-2">
                  <AwardIcon className="h-5 w-5" />
                  Complete & Earn {module.xp_reward || 50} XP
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
