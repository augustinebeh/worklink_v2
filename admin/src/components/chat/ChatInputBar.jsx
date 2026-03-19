import { useRef } from 'react';
import {
  Send,
  Smile,
  Zap,
  Paperclip,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { clsx } from 'clsx';

// Quick reply chip component
function QuickReplyChip({ template, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap border border-slate-200 dark:border-slate-700"
    >
      {template.name}
    </button>
  );
}

/**
 * ChatInputBar - Message input with emoji picker, file upload, and quick replies
 */
export default function ChatInputBar({
  newMessage,
  setNewMessage,
  showEmoji,
  setShowEmoji,
  onSendMessage,
  onFileUpload,
  onQuickReply,
  uploadingFile,
  templates,
  inputRef,
  fileInputRef,
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <>
      {/* Quick replies bar */}
      {templates.length > 0 && (
        <div className="flex-shrink-0 px-6 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs text-slate-400 flex-shrink-0">Quick replies:</span>
            {templates.slice(0, 6).map(template => (
              <QuickReplyChip
                key={template.id}
                template={template}
                onClick={() => onQuickReply(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        {showEmoji && (
          <div className="absolute bottom-20 left-4 z-10">
            <EmojiPicker
              onEmojiClick={(emoji) => {
                setNewMessage(prev => prev + emoji.emoji);
                inputRef.current?.focus();
              }}
              theme="auto"
              width={320}
              height={400}
            />
          </div>
        )}

        <div className="flex items-end gap-3">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={clsx(
              'p-2.5 rounded-lg transition-colors',
              showEmoji
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <Smile className="h-5 w-5" />
          </button>

          {/* File upload button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className={clsx(
              'p-2.5 rounded-lg transition-colors',
              uploadingFile
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
            title="Attach file"
          >
            {uploadingFile ? (
              <div className="h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none max-h-32"
            />
          </div>
          <button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            className={clsx(
              'p-2.5 rounded-lg transition-colors',
              newMessage.trim()
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
