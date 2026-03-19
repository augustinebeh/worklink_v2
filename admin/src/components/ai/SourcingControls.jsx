import { useState } from 'react';
import {
  SparklesIcon,
  MessageSquareIcon,
  ClipboardCopyIcon,
  CheckIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-emerald-500" />
      ) : (
        <ClipboardCopyIcon className="h-4 w-4 text-slate-400" />
      )}
    </button>
  );
}

export { CopyButton };

export default function SourcingControls({
  postingForm,
  setPostingForm,
  generatedPostings,
  loading,
  onGenerate,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-emerald-500" />
            Generate Job Postings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Generate optimized job postings for multiple platforms with a single click.
          </p>

          <Input
            label="Job Title"
            value={postingForm.jobTitle}
            onChange={(e) => setPostingForm({...postingForm, jobTitle: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pay Rate ($/hr)"
              value={postingForm.payRate}
              onChange={(e) => setPostingForm({...postingForm, payRate: e.target.value})}
            />
            <Input
              label="Slots Needed"
              value={postingForm.slots}
              onChange={(e) => setPostingForm({...postingForm, slots: e.target.value})}
            />
          </div>
          <Input
            label="Location"
            value={postingForm.location}
            onChange={(e) => setPostingForm({...postingForm, location: e.target.value})}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Requirements
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm min-h-[100px]"
              value={postingForm.requirements}
              onChange={(e) => setPostingForm({...postingForm, requirements: e.target.value})}
            />
          </div>
          <Button onClick={onGenerate} loading={loading} icon={SparklesIcon} className="w-full">
            Generate All Platforms
          </Button>
        </CardContent>
      </Card>

      {generatedPostings ? (
        <div className="space-y-4">
          {Object.entries(generatedPostings).map(([platform, content]) => (
            <Card key={platform}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize flex items-center gap-2">
                    {platform === 'whatsapp' && '📱'}
                    {platform === 'facebook' && '📘'}
                    {platform === 'instagram' && '📷'}
                    {platform === 'telegram' && '✈️'}
                    {platform}
                  </CardTitle>
                  <CopyButton text={typeof content === 'string' ? content : content.caption || JSON.stringify(content)} />
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  {typeof content === 'string' ? content : content.caption || JSON.stringify(content, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <MessageSquareIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white mb-2">No Postings Generated Yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Fill in the job details and click "Generate All Platforms" to create optimized postings for WhatsApp, Facebook, Instagram, and Telegram.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
