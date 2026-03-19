import { useRef } from 'react';
import {
  SendIcon,
  SmileIcon,
  PaperclipIcon,
  FileTextIcon,
  XIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import EmojiPicker from 'emoji-picker-react';
import { QuickReplyChip } from '../chat';

/**
 * WorkerChatInput - Input area for the worker chat page
 *
 * Renders:
 * - Quick reply chips
 * - File preview bar
 * - Emoji picker
 * - Hidden file input
 * - Message input with attachment, emoji, and send buttons
 */
const WorkerChatInput = ({
  newMessage,
  setNewMessage,
  sending,
  showEmoji,
  setShowEmoji,
  uploadingFile,
  selectedFile,
  filePreview,
  quickReplies,
  inputRef,
  onSend,
  onKeyPress,
  onTyping,
  onFileSelect,
  onClearFile,
  onQuickReply,
  onEmojiClick,
}) => {
  const fileInputRef = useRef(null);

  return (
    <>
      {/* Quick Replies */}
      {quickReplies.length > 0 && !newMessage && !selectedFile && !showEmoji && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-white/[0.05] bg-theme-primary">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {quickReplies.map((reply, idx) => (
              <QuickReplyChip key={idx} text={reply} onClick={onQuickReply} />
            ))}
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-white/[0.05] bg-[#0a1628]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/[0.08]">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 rounded object-cover" />
            ) : (
              <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center">
                <FileTextIcon className="h-6 w-6 text-white/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-white/40">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={onClearFile} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="flex-shrink-0 border-t border-white/[0.05]">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            width="100%"
            height={280}
            theme="dark"
            searchPlaceHolder="Search emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={onFileSelect}
        className="hidden"
      />

      {/* Input Area */}
      <div className="flex-shrink-0 bg-[#0a1628]/95 backdrop-blur-xl px-3 py-2 border-t border-white/[0.05]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <PaperclipIcon className="h-5 w-5" />
          </button>

          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={clsx(
              'p-2.5 rounded-xl transition-colors',
              showEmoji ? 'bg-emerald-500 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
            )}
          >
            <SmileIcon className="h-5 w-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); onTyping(); }}
            onKeyPress={onKeyPress}
            onFocus={() => setShowEmoji(false)}
            placeholder="Message"
            className="flex-1 h-10 px-4 rounded-xl bg-white/5 border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 text-sm transition-all"
          />

          <button
            onClick={onSend}
            disabled={(!newMessage.trim() && !selectedFile) || sending || uploadingFile}
            className={clsx(
              'p-2.5 rounded-xl transition-all',
              (newMessage.trim() || selectedFile)
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-white/30'
            )}
          >
            {uploadingFile ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default WorkerChatInput;
