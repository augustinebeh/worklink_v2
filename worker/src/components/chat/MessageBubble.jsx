import { CheckIcon, CheckCheckIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { DEFAULT_LOCALE, TIMEZONE } from '../../utils/constants';
import { parseUTCTimestamp } from './utils';
import MessageAttachment from './MessageAttachment';

export default function MessageBubble({ message, isOwn }) {
  const time = parseUTCTimestamp(message.created_at).toLocaleTimeString(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: TIMEZONE
  });

  const attachments = message.attachments
    ? (typeof message.attachments === 'string' ? JSON.parse(message.attachments) : message.attachments)
    : [];

  const hasInlineAttachment = message.attachment_url && message.attachment_type;

  const readAt = message.read_at
    ? parseUTCTimestamp(message.read_at).toLocaleTimeString(DEFAULT_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: TIMEZONE
      })
    : null;

  return (
    <div className={clsx('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={clsx(
        'max-w-[80%] px-4 py-2.5 rounded-2xl relative',
        isOwn
          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-br-md'
          : 'bg-[#0a1628] text-white rounded-bl-md border border-white/[0.05]'
      )}>
        {hasInlineAttachment && (
          <MessageAttachment
            attachment={{ url: message.attachment_url, type: message.attachment_type, name: message.attachment_name }}
            isOwn={isOwn}
          />
        )}

        {attachments.map((att, idx) => (
          <MessageAttachment key={idx} attachment={att} isOwn={isOwn} />
        ))}

        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

        <div className={clsx('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
          <span className={clsx('text-xs', isOwn ? 'text-white/60' : 'text-white/40')}>{time}</span>
          {isOwn && (
            message.read ? (
              <div className="flex items-center gap-0.5">
                <CheckCheckIcon className="h-3 w-3 text-cyan-300" />
                {readAt && <span className="text-[10px] text-white/50">Seen {readAt}</span>}
              </div>
            ) : (
              <CheckIcon className="h-3 w-3 text-white/60" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
