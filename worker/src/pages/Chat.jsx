import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SendIcon,
  SmileIcon,
  CheckIcon,
  CheckCheckIcon,
  ChevronLeftIcon,
  PaperclipIcon,
  FileTextIcon,
  XIcon,
  DownloadIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { clsx } from 'clsx';
import EmojiPicker from 'emoji-picker-react';
import { LogoIcon } from '../components/ui/Logo';
import { DEFAULT_LOCALE, TIMEZONE, getSGDateString, MS_PER_DAY } from '../utils/constants';
import {
  InterviewOfferCard,
  AvailabilitySelector,
  InterviewConfirmation,
  SchedulingStatusIndicator,
  useInterviewScheduling
} from '../components/chat/InterviewSchedulingComponents';

// Parse DB timestamp (stored as UTC without timezone indicator)
function parseUTCTimestamp(timestamp) {
  if (!timestamp) return new Date();
  const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  return new Date(utcTimestamp);
}

// Attachment display component
function MessageAttachment({ attachment, isOwn }) {
  const isImage = attachment.type === 'image' || attachment.mime_type?.startsWith('image/');

  if (isImage) {
    return (
      <a href={attachment.url || attachment.file_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
        <img
          src={attachment.thumbnail_url || attachment.url || attachment.file_url}
          alt={attachment.name || attachment.original_name || 'Image'}
          className="max-w-full rounded-lg max-h-48 object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url || attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('flex items-center gap-2 p-2 rounded-lg mb-2', isOwn ? 'bg-white/10' : 'bg-white/5')}
    >
      <FileTextIcon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 truncate text-sm">{attachment.name || attachment.original_name || 'Document'}</span>
      <DownloadIcon className="h-4 w-4 flex-shrink-0" />
    </a>
  );
}

function MessageBubble({ message, isOwn }) {
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

function DateDivider({ date }) {
  const todaySG = getSGDateString();
  const yesterdaySG = getSGDateString(new Date(Date.now() - MS_PER_DAY));
  const msgDateSG = getSGDateString(parseUTCTimestamp(date));

  let label;
  if (msgDateSG === todaySG) label = 'Today';
  else if (msgDateSG === yesterdaySG) label = 'Yesterday';
  else label = parseUTCTimestamp(date).toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIMEZONE });

  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 rounded-full bg-white/[0.05] text-white/40 text-xs border border-white/[0.05]">
        {label}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#0a1628] px-4 py-3 rounded-2xl rounded-bl-md border border-white/[0.05]">
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function QuickReplyChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-4 py-2 rounded-xl bg-[#0a1628] border border-white/[0.08] text-sm text-white/70 hover:bg-white/5 hover:text-white transition-all whitespace-nowrap"
    >
      {text}
    </button>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const ws = useWebSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState(['Hi there!', 'I have a question', 'Help me with jobs']);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingSentRef = useRef(false);

  // Interview scheduling state
  const [showAvailabilitySelector, setShowAvailabilitySelector] = useState(false);
  const [pendingInterviewOffer, setPendingInterviewOffer] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Use interview scheduling hook
  const {
    status: interviewStatus,
    loading: interviewLoading,
    error: interviewError,
    refetch: refetchInterviewStatus,
    fetchAvailableSlots,
    scheduleInterview
  } = useInterviewScheduling(user?.id);

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  // Fetch AI-generated quick replies when messages change
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;
    
    const lastAdminMessage = [...messages].reverse().find(m => m.sender !== 'candidate');
    if (!lastAdminMessage) {
      setQuickReplies(['Hi there!', 'I have a question', 'Help me with jobs']);
      return;
    }

    // Fetch AI-generated quick replies
    const fetchQuickReplies = async () => {
      try {
        const res = await fetch(`/api/v1/chat/${user.id}/quick-replies`);
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          setQuickReplies(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch quick replies:', error);
      }
    };

    fetchQuickReplies();
  }, [messages, user?.id]);

  useEffect(() => {
    if (!ws) return;

    const unsubHistory = ws.subscribe('chat_history', (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });

    const unsubMessage = ws.subscribe('chat_message', (data) => {
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    const unsubTyping = ws.subscribe('typing', (data) => {
      setIsTyping(data.typing);
    });

    const unsubRead = ws.subscribe('messages_read', () => {
      setMessages(prev => prev.map(m => ({ ...m, read: 1 })));
    });

    return () => {
      unsubHistory?.();
      unsubMessage?.();
      unsubTyping?.();
      unsubRead?.();
    };
  }, [ws]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (ws && messages.length > 0) ws.markMessagesRead();
  }, [ws, messages.length]);

  const fetchMessages = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/v1/chat/${user.id}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);
        fetch(`/api/v1/chat/${user.id}/read`, { method: 'POST' });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Max 10MB.');
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async () => {
    if (!selectedFile || !user?.id) return null;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('candidateId', user.id);
      const res = await fetch('/api/v1/chat/attachments', { method: 'POST', body: formData });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleQuickReply = (text) => {
    setNewMessage(text);
    inputRef.current?.focus();
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleTyping = () => {
    if (ws) {
      if (!isTypingSentRef.current) {
        ws.sendTyping(true);
        isTypingSentRef.current = true;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        ws.sendTyping(false);
        isTypingSentRef.current = false;
      }, 2000);
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedFile) || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    setShowEmoji(false);

    if (ws) {
      ws.sendTyping(false);
      isTypingSentRef.current = false;
    }

    let attachment = null;
    if (selectedFile) {
      attachment = await uploadFile();
      clearFileSelection();
    }

    const tempMessage = {
      id: Date.now(),
      content,
      sender: 'candidate',
      created_at: new Date().toISOString(),
      read: 0,
      attachment_url: attachment?.file_url,
      attachment_type: attachment?.is_image ? 'image' : 'file',
      attachment_name: attachment?.original_name,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      if (ws?.isConnected) {
        ws.sendChatMessage(content);
      } else {
        await fetch(`/api/v1/chat/${user.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, attachmentId: attachment?.id }),
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  // Interview scheduling handlers
  const handleInterviewOfferAccept = async (offer) => {
    try {
      const slotToBook = selectedSlot || offer?.suggestedSlot;

      if (slotToBook) {
        // Book the selected/suggested slot directly
        await scheduleInterview(
          slotToBook.date,
          slotToBook.time,
          selectedSlot ? 'Selected from availability picker' : 'Accepted suggested slot from SLM'
        );
        setPendingInterviewOffer(null);
        setSelectedSlot(null); // Clear selected slot after booking
      } else {
        // Show availability selector
        setSlotsLoading(true);
        try {
          const slots = await fetchAvailableSlots(7);
          setAvailableSlots(slots);
          setShowAvailabilitySelector(true);
          setPendingInterviewOffer(null);
        } catch (error) {
          console.error('Failed to fetch available slots:', error);
          // Could show an error message here
        } finally {
          setSlotsLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to accept interview offer:', error);
      // Could show an error message here
    }
  };

  const handleInterviewOfferDecline = () => {
    setPendingInterviewOffer(null);
    // Could send a message back to chat indicating decline
  };

  const handleInterviewOfferViewAvailability = async () => {
    setSlotsLoading(true);
    try {
      const slots = await fetchAvailableSlots(7);
      setAvailableSlots(slots);
      setShowAvailabilitySelector(true);
      setPendingInterviewOffer(null);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      // Could show an error message here
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleAvailabilitySlotSelect = async (slot) => {
    try {
      // Set selected slot first to show the confirmation modal
      setSelectedSlot(slot);
      setShowAvailabilitySelector(false);

      // Show the interview offer card with selected slot for confirmation
      setPendingInterviewOffer({
        type: 'slot_confirmation',
        suggestedSlot: slot
      });
    } catch (error) {
      console.error('Failed to handle slot selection:', error);
      // Could show an error message here
    }
  };

  const handleAvailabilityCancel = () => {
    setShowAvailabilitySelector(false);
    setAvailableSlots([]);
  };

  const handleInterviewReschedule = async () => {
    setSlotsLoading(true);
    try {
      const slots = await fetchAvailableSlots(7);
      setAvailableSlots(slots);
      setShowAvailabilitySelector(true);
    } catch (error) {
      console.error('Failed to fetch available slots for reschedule:', error);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleAddToCalendar = (interview) => {
    // Create calendar event
    const startDate = new Date(`${interview.scheduled_date}T${interview.scheduled_time}:00`);
    const endDate = new Date(startDate.getTime() + (interview.duration_minutes || 30) * 60000);

    const eventDetails = {
      title: 'WorkLink Interview - Verification Call',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      details: `Interview with WorkLink consultant.\n\nMeeting Link: ${interview.meeting_link}\n\nNotes: ${interview.notes || 'Verification interview for account approval'}`
    };

    // Create calendar URLs
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(eventDetails.details)}`;

    // Open in new window
    window.open(googleCalUrl, '_blank');
  };

  // Parse interview offers from SLM messages
  useEffect(() => {
    if (!messages.length) return;

    const lastMessage = messages[messages.length - 1];

    // Check if the last message from admin contains interview offer
    if (lastMessage.sender === 'admin' && lastMessage.content) {
      const content = lastMessage.content.toLowerCase();

      // Look for interview scheduling keywords
      if (content.includes('schedule') && content.includes('interview') ||
          content.includes('verification call') ||
          content.includes('15-minute') ||
          content.includes('book now')) {

        // Extract suggested time if present (this would be enhanced with actual SLM integration)
        const timeMatch = content.match(/(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))/i);
        const dateMatch = content.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i);

        if (timeMatch || dateMatch) {
          setPendingInterviewOffer({
            messageId: lastMessage.id,
            content: lastMessage.content,
            suggestedSlot: null // Would be extracted from SLM response
          });
        }
      }
    }
  }, [messages]);

  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = parseUTCTimestamp(a.created_at).getTime();
    const timeB = parseUTCTimestamp(b.created_at).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.id || 0) - (b.id || 0);
  });

  const groupedMessages = sortedMessages.reduce((acc, msg) => {
    const date = getSGDateString(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="h-screen bg-theme-primary flex items-center justify-center">
        <p className="text-white/40">Please log in to chat</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-theme-primary flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-[#0a1628]/95 backdrop-blur-xl px-4 pt-4 pb-3 border-b border-white/[0.05] z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <LogoIcon size={36} />
          <div className="flex-1">
            <h1 className="font-semibold text-white">WorkLink Support</h1>
            <div className="flex items-center gap-1.5">
              <span className={clsx('w-2 h-2 rounded-full', ws?.isConnected ? 'bg-emerald-400' : 'bg-white/30')} />
              <span className="text-xs text-white/40">
                {ws?.isConnected ? (isTyping ? 'Typing...' : 'Online') : 'Connecting...'}
              </span>
              {interviewStatus?.isInSchedulingFlow && (
                <SchedulingStatusIndicator
                  stage={interviewStatus.schedulingStage}
                  interview={interviewStatus.interview}
                  size="sm"
                  className="ml-1"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <SendIcon className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-white font-medium">Start a conversation</p>
            <p className="text-white/40 text-sm mt-1">Send a message to WorkLink support</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <DateDivider date={date} />
                <div className="space-y-3">
                  {msgs.map(msg => (
                    <MessageBubble key={msg.id} message={msg} isOwn={msg.sender === 'candidate'} />
                  ))}
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}

            {/* Interview Scheduling Components */}
            {selectedSlot && pendingInterviewOffer && (
              <InterviewOfferCard
                offer={pendingInterviewOffer}
                selectedSlot={selectedSlot}
                onAccept={handleInterviewOfferAccept}
                onDecline={handleInterviewOfferDecline}
                onViewAvailability={handleInterviewOfferViewAvailability}
                showOnlyAfterSlotSelection={true}
              />
            )}

            {showAvailabilitySelector && (
              <AvailabilitySelector
                availableSlots={availableSlots}
                onSelectSlot={handleAvailabilitySlotSelect}
                onCancel={handleAvailabilityCancel}
                loading={slotsLoading}
              />
            )}

            {interviewStatus?.interview && interviewStatus.schedulingStage === 'interview_scheduled' && (
              <InterviewConfirmation
                interview={interviewStatus.interview}
                onReschedule={handleInterviewReschedule}
                onAddToCalendar={() => handleAddToCalendar(interviewStatus.interview)}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick Replies */}
      {quickReplies.length > 0 && !newMessage && !selectedFile && !showEmoji && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-white/[0.05] bg-theme-primary">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {quickReplies.map((reply, idx) => (
              <QuickReplyChip key={idx} text={reply} onClick={handleQuickReply} />
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
            <button onClick={clearFileSelection} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="flex-shrink-0 border-t border-white/[0.05]">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            width="100%"
            height={280}
            theme="dark"
            searchPlaceHolder="Search emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />

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
            onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowEmoji(false)}
            placeholder="Message"
            className="flex-1 h-10 px-4 rounded-xl bg-white/5 border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 text-sm transition-all"
          />

          <button
            onClick={handleSend}
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
    </div>
  );
}
