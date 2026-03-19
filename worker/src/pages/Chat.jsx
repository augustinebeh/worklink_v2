import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import logger from '../utils/logger';
import { clsx } from 'clsx';
import { LogoIcon } from '../components/ui/Logo';
import { getSGDateString } from '../utils/constants';
import {
  SchedulingStatusIndicator,
  useInterviewScheduling
} from '../components/chat/InterviewSchedulingComponents';
import { parseUTCTimestamp } from '../components/chat';
import WorkerMessageList from '../components/chat/WorkerMessageList';
import WorkerChatInput from '../components/chat/WorkerChatInput';

/**
 * Chat - Page orchestrator for the worker chat
 *
 * Visual sections split into:
 * - WorkerMessageList.jsx (message display, interview scheduling UI)
 * - WorkerChatInput.jsx (input area, emoji picker, file preview, quick replies)
 *
 * This parent manages:
 * - All state (messages, typing, files, interview scheduling)
 * - WebSocket subscriptions and message fetching
 * - Send/upload logic
 * - Interview scheduling handlers
 */

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
  const typingTimeoutRef = useRef(null);
  const isTypingSentRef = useRef(false);

  // Interview scheduling state
  const [showAvailabilitySelector, setShowAvailabilitySelector] = useState(false);
  const [pendingInterviewOffer, setPendingInterviewOffer] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const {
    status: interviewStatus,
    fetchAvailableSlots,
    scheduleInterview
  } = useInterviewScheduling(user?.id);

  // --- Data fetching ---

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  useEffect(() => {
    if (!user?.id || messages.length === 0) return;

    const lastAdminMessage = [...messages].reverse().find(m => m.sender !== 'candidate');
    if (!lastAdminMessage) {
      setQuickReplies(['Hi there!', 'I have a question', 'Help me with jobs']);
      return;
    }

    const fetchQuickReplies = async () => {
      try {
        const res = await fetch(`/api/v1/chat/${user.id}/quick-replies`);
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          setQuickReplies(data.data);
        }
      } catch (error) {
        logger.error('Failed to fetch quick replies:', error);
      }
    };

    fetchQuickReplies();
  }, [messages, user?.id]);

  // --- WebSocket subscriptions ---

  useEffect(() => {
    if (!ws) return;

    const unsubHistory = ws.subscribe('chat_history', (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });

    const unsubMessage = ws.subscribe('chat_message', (data) => {
      if (data.message) setMessages(prev => [...prev, data.message]);
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (ws && messages.length > 0) ws.markMessagesRead();
  }, [ws, messages.length]);

  // --- Parse interview offers from SLM messages ---

  useEffect(() => {
    if (!messages.length) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.sender === 'admin' && lastMessage.content) {
      const content = lastMessage.content.toLowerCase();

      if (content.includes('schedule') && content.includes('interview') ||
          content.includes('verification call') ||
          content.includes('15-minute') ||
          content.includes('book now')) {

        const timeMatch = content.match(/(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))/i);
        const dateMatch = content.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i);

        if (timeMatch || dateMatch) {
          setPendingInterviewOffer({
            messageId: lastMessage.id,
            content: lastMessage.content,
            suggestedSlot: null
          });
        }
      }
    }
  }, [messages]);

  // --- Core handlers ---

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
      logger.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { e.target.value = ''; return; }
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
      logger.error('Failed to upload file:', error);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleQuickReply = (text) => {
    setNewMessage(text);
    inputRef.current?.focus();
  };

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

    if (ws) { ws.sendTyping(false); isTypingSentRef.current = false; }

    let attachment = null;
    if (selectedFile) { attachment = await uploadFile(); clearFileSelection(); }

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
      logger.error('Failed to send message:', error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  // --- Interview scheduling handlers ---

  const handleInterviewOfferAccept = async (offer) => {
    try {
      const slotToBook = selectedSlot || offer?.suggestedSlot;
      if (slotToBook) {
        await scheduleInterview(
          slotToBook.date,
          slotToBook.time,
          selectedSlot ? 'Selected from availability picker' : 'Accepted suggested slot from SLM'
        );
        setPendingInterviewOffer(null);
        setSelectedSlot(null);
      } else {
        setSlotsLoading(true);
        try {
          const slots = await fetchAvailableSlots(7);
          setAvailableSlots(slots);
          setShowAvailabilitySelector(true);
          setPendingInterviewOffer(null);
        } catch (error) {
          logger.error('Failed to fetch available slots:', error);
        } finally {
          setSlotsLoading(false);
        }
      }
    } catch (error) {
      logger.error('Failed to accept interview offer:', error);
    }
  };

  const handleInterviewOfferDecline = () => { setPendingInterviewOffer(null); };

  const handleInterviewOfferViewAvailability = async () => {
    setSlotsLoading(true);
    try {
      const slots = await fetchAvailableSlots(7);
      setAvailableSlots(slots);
      setShowAvailabilitySelector(true);
      setPendingInterviewOffer(null);
    } catch (error) {
      logger.error('Failed to fetch available slots:', error);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleAvailabilitySlotSelect = async (slot) => {
    try {
      setSelectedSlot(slot);
      setShowAvailabilitySelector(false);
      setPendingInterviewOffer({ type: 'slot_confirmation', suggestedSlot: slot });
    } catch (error) {
      logger.error('Failed to handle slot selection:', error);
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
      logger.error('Failed to fetch available slots for reschedule:', error);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleAddToCalendar = (interview) => {
    const startDate = new Date(`${interview.scheduled_date}T${interview.scheduled_time}:00`);
    const endDate = new Date(startDate.getTime() + (interview.duration_minutes || 30) * 60000);
    const eventDetails = {
      title: 'WorkLink Interview - Verification Call',
      details: `Interview with WorkLink consultant.\n\nMeeting Link: ${interview.meeting_link}\n\nNotes: ${interview.notes || 'Verification interview for account approval'}`
    };
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(eventDetails.details)}`;
    window.open(googleCalUrl, '_blank');
  };

  // --- Derived data ---

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

  // --- Render ---

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
      <WorkerMessageList
        ref={messagesEndRef}
        loading={loading}
        messages={messages}
        groupedMessages={groupedMessages}
        isTyping={isTyping}
        selectedSlot={selectedSlot}
        pendingInterviewOffer={pendingInterviewOffer}
        showAvailabilitySelector={showAvailabilitySelector}
        availableSlots={availableSlots}
        slotsLoading={slotsLoading}
        interviewStatus={interviewStatus}
        onInterviewOfferAccept={handleInterviewOfferAccept}
        onInterviewOfferDecline={handleInterviewOfferDecline}
        onInterviewOfferViewAvailability={handleInterviewOfferViewAvailability}
        onAvailabilitySlotSelect={handleAvailabilitySlotSelect}
        onAvailabilityCancel={handleAvailabilityCancel}
        onInterviewReschedule={handleInterviewReschedule}
        onAddToCalendar={handleAddToCalendar}
      />

      {/* Input Area */}
      <WorkerChatInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sending={sending}
        showEmoji={showEmoji}
        setShowEmoji={setShowEmoji}
        uploadingFile={uploadingFile}
        selectedFile={selectedFile}
        filePreview={filePreview}
        quickReplies={quickReplies}
        inputRef={inputRef}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        onTyping={handleTyping}
        onFileSelect={handleFileSelect}
        onClearFile={clearFileSelection}
        onQuickReply={handleQuickReply}
        onEmojiClick={handleEmojiClick}
      />
    </div>
  );
}
