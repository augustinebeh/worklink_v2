import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  MessageSquare,
  X,
  Clock,
  Bot,
  Volume2,
  VolumeX,
  Timer,
  TimerOff,
  AlignLeft,
  AlignJustify,
  User,
  Mail,
  MoreVertical,
  CheckCircle2,
  Languages,
  Briefcase,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { useAdminWebSocket } from '../contexts/WebSocketContext';
import {
  InterviewStatusHeader,
  InterviewDetailsPanel,
  SchedulingQuickActions,
  SLMActivityIndicator,
  useAdminInterviewScheduling
} from '../components/chat/InterviewSchedulingComponents';

// Sub-components
import ChatMessageList from '../components/chat/ChatMessageList';
import ChatInputBar from '../components/chat/ChatInputBar';
import ChatSidebar, { EscalationBadge } from '../components/chat/ChatSidebar';
import { AISuggestionBubble, SLMSuggestionBubble, AIModeSelector, SLMModeSelector } from '../components/chat/AISuggestionPanel';
import { StatusPriorityDropdown } from '../components/chat/EscalationBanner';

// Custom hooks
import { useMessageProcessor, playNotificationSound } from '../hooks/useMessageProcessor';

export default function AdminChat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchUnreadTotal, subscribe, send, isConnected, markMessagesRead } = useAdminWebSocket();
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('chat_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // AI Chat state
  const [typingDelayEnabled, setTypingDelayEnabled] = useState(true);
  const [responseStyle, setResponseStyle] = useState('concise');
  const [languageStyle, setLanguageStyle] = useState('singlish');

  // Feature states
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Interview scheduling state
  const [showInterviewDetails, setShowInterviewDetails] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [slmLoading, setSlmLoading] = useState(false);

  const {
    status: interviewStatus,
    loading: interviewLoading,
    error: interviewError,
    fetchCandidateStatus,
    scheduleInterview,
    updateInterviewStatus,
    rescheduleInterview,
    fetchAnalytics
  } = useAdminInterviewScheduling();

  // Refs
  const inputRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => { selectedConversationRef.current = selectedConversation; }, [selectedConversation]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // API call helpers (defined before hook usage)
  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.chat.getConversations();
      if (data.success) setConversations(data.data);
    } catch (error) { /* Failed */ }
    finally { setLoading(false); }
  }, []);

  const fetchMessagesApi = useCallback(async (candidateId) => {
    try {
      const data = await api.chat.getMessages(candidateId);
      if (data.success) {
        messageProcessor.setMessages(data.data.messages || []);
        api.chat.markAsRead(candidateId);
      }
    } catch (error) { /* Failed */ }
  }, []);

  // Message processor hook
  const messageProcessor = useMessageProcessor({
    subscribe,
    selectedConversationRef,
    soundEnabledRef,
    fetchConversations,
    fetchMessages: fetchMessagesApi,
    toast
  });

  const {
    messages, setMessages, aiSuggestion, setAiSuggestion,
    slmSuggestion, setSlmSuggestion, aiMode, setAiMode,
    slmMode, setSlmMode, messagesEndRef,
    addOptimisticMessage, getFilteredMessages
  } = messageProcessor;

  // WebSocket status change subscription
  useEffect(() => {
    if (!subscribe) return;

    const unsubStatusChange = subscribe('status_change', (data) => {
      setConversations(prev => prev.map(c =>
        c.candidate_id === data.candidateId
          ? { ...c, online_status: data.status, last_seen: data.last_seen || c.last_seen }
          : c
      ));
    });

    return () => { unsubStatusChange(); };
  }, [subscribe]);

  // ─── Settings toggles ───────────────────────────────────────

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('chat_sound_enabled', JSON.stringify(newValue));
      if (newValue) playNotificationSound();
      return newValue;
    });
  }, []);

  const fetchAISettings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/ai-chat/settings');
      const data = await res.json();
      if (data.success) {
        setTypingDelayEnabled(data.data.typing_delay_enabled !== false);
        setResponseStyle(data.data.response_style || 'concise');
        setLanguageStyle(data.data.language_style || 'singlish');
      }
    } catch (error) { /* Failed to fetch AI settings */ }
  }, []);

  const toggleTypingDelay = useCallback(async () => {
    const newValue = !typingDelayEnabled;
    setTypingDelayEnabled(newValue);
    try {
      await fetch('/api/v1/ai-chat/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'typing_delay_enabled', value: newValue }),
      });
    } catch (error) { setTypingDelayEnabled(!newValue); }
  }, [typingDelayEnabled]);

  const toggleResponseStyle = useCallback(async () => {
    const newValue = responseStyle === 'concise' ? 'normal' : 'concise';
    setResponseStyle(newValue);
    try {
      await fetch('/api/v1/ai-chat/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'response_style', value: newValue }),
      });
    } catch (error) { setResponseStyle(responseStyle); }
  }, [responseStyle]);

  const toggleLanguageStyle = useCallback(async () => {
    const newValue = languageStyle === 'singlish' ? 'professional' : 'singlish';
    setLanguageStyle(newValue);
    try {
      await fetch('/api/v1/ai-chat/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'language_style', value: newValue }),
      });
    } catch (error) { setLanguageStyle(languageStyle); }
  }, [languageStyle]);

  // ─── Data fetching ──────────────────────────────────────────

  const fetchCandidates = async () => {
    try {
      const data = await api.chat.getCandidates();
      if (data.success) setCandidates(data.data);
    } catch (error) { /* Failed */ }
  };

  const fetchTemplates = async () => {
    try {
      const data = await api.chat.getTemplates();
      if (data.success) setTemplates(data.data);
    } catch (error) { /* Failed */ }
  };

  useEffect(() => {
    fetchConversations();
    fetchCandidates();
    fetchTemplates();
    fetchAISettings();
  }, []);

  useEffect(() => {
    const candidateId = searchParams.get('candidate');
    if (candidateId && !loading && (conversations.length > 0 || candidates.length > 0)) {
      const existingConv = conversations.find(c => c.candidate_id === candidateId);
      if (existingConv) {
        setSelectedConversation(existingConv);
      } else {
        const candidate = candidates.find(c => c.id === candidateId);
        if (candidate) {
          setSelectedConversation({
            candidate_id: candidate.id, name: candidate.name, email: candidate.email,
            profile_photo: candidate.profile_photo, online_status: candidate.online_status,
            last_seen: candidate.last_seen, telegram_chat_id: candidate.telegram_chat_id,
            channels: candidate.channels, status: candidate.status, level: candidate.level,
          });
        }
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, conversations, candidates, loading, setSearchParams]);

  const fetchAIMode = async (candidateId) => {
    try {
      const res = await fetch(`/api/v1/ai-chat/conversations/${candidateId}/mode`);
      const data = await res.json();
      if (data.success) setAiMode(data.data.mode);
    } catch (error) { setAiMode('off'); }
  };

  const fetchSLMMode = async (candidateId) => {
    try {
      const res = await fetch(`/api/v1/slm-chat/conversations/${candidateId}/mode`);
      const data = await res.json();
      if (data.success) setSlmMode(data.data.mode);
    } catch (error) { setSlmMode('inherit'); }
  };

  useEffect(() => {
    if (selectedConversation) {
      fetchMessagesApi(selectedConversation.candidate_id);
      fetchAIMode(selectedConversation.candidate_id);
      fetchSLMMode(selectedConversation.candidate_id);
      setAiSuggestion(null);
      setSlmSuggestion(null);
      setMessageSearchQuery('');
      setShowMessageSearch(false);
      setShowInterviewDetails(false);

      if (selectedConversation.candidate_id) {
        fetchCandidateStatus(selectedConversation.candidate_id);
      }

      if (isConnected && selectedConversation.unread_count > 0) {
        send({ type: 'read', candidateId: selectedConversation.candidate_id });
        fetchUnreadTotal();
      }
      setConversations(prev => prev.map(c =>
        c.candidate_id === selectedConversation.candidate_id ? { ...c, unread_count: 0 } : c
      ));
    }
  }, [selectedConversation, fetchUnreadTotal, isConnected, send]);

  // ─── AI / SLM handlers ─────────────────────────────────────

  const handleAIModeChange = async (newMode) => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/v1/ai-chat/conversations/${selectedConversation.candidate_id}/mode`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (data.success) { setAiMode(newMode); if (newMode === 'off') setAiSuggestion(null); }
    } catch (error) { /* Failed */ }
  };

  const handleSLMModeChange = async (newMode) => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/v1/slm-chat/conversations/${selectedConversation.candidate_id}/mode`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      if (data.success) { setSlmMode(newMode); if (newMode === 'off') setSlmSuggestion(null); }
    } catch (error) { /* Failed */ }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    if (!selectedConversation || !suggestion) return;
    try {
      const res = await fetch(`/api/v1/ai-chat/suggestions/${suggestion.id}/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: selectedConversation.candidate_id }),
      });
      const data = await res.json();
      if (data.success) { setAiSuggestion(null); fetchMessagesApi(selectedConversation.candidate_id); }
    } catch (error) { /* Failed */ }
  };

  const handleEditSuggestion = async (editedContent) => {
    if (!selectedConversation || !aiSuggestion) return;
    try {
      const res = await fetch(`/api/v1/ai-chat/suggestions/${aiSuggestion.id}/edit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: selectedConversation.candidate_id, content: editedContent }),
      });
      const data = await res.json();
      if (data.success) { setAiSuggestion(null); fetchMessagesApi(selectedConversation.candidate_id); }
    } catch (error) { /* Failed */ }
  };

  const handleDismissSuggestion = async (suggestion) => {
    if (!suggestion) return;
    try {
      await fetch(`/api/v1/ai-chat/suggestions/${suggestion.id}/dismiss`, { method: 'POST' });
      setAiSuggestion(null);
    } catch (error) { /* Failed */ }
  };

  const handleAcceptSLMSuggestion = async (suggestion) => {
    if (!selectedConversation || !suggestion) return;
    try {
      setSlmSuggestion(null);
      if (isConnected) {
        send({ type: 'message', candidateId: selectedConversation.candidate_id, content: suggestion.content, source: 'slm_suggestion' });
      }
      fetchMessagesApi(selectedConversation.candidate_id);
    } catch (error) { /* Failed */ }
  };

  const handleEditSLMSuggestion = async (editedContent) => {
    if (!selectedConversation || !slmSuggestion) return;
    try {
      setSlmSuggestion(null);
      if (isConnected) {
        send({ type: 'message', candidateId: selectedConversation.candidate_id, content: editedContent, source: 'slm_suggestion_edited' });
      }
      fetchMessagesApi(selectedConversation.candidate_id);
    } catch (error) { /* Failed */ }
  };

  const handleDismissSLMSuggestion = async (suggestion) => {
    if (!suggestion) return;
    setSlmSuggestion(null);
  };

  // ─── Interview handlers ─────────────────────────────────────

  const handleScheduleInterview = async () => {
    if (!selectedConversation) return;
    setShowSchedulingModal(true);
  };

  const handleInterviewScheduled = async (date, time, notes = '') => {
    if (!selectedConversation) return;
    try {
      await scheduleInterview(selectedConversation.candidate_id, date, time, notes);
      setShowSchedulingModal(false);
      toast.success('Interview scheduled successfully');
      await fetchCandidateStatus(selectedConversation.candidate_id);
    } catch (error) { toast.error('Failed to schedule interview', error.message); }
  };

  const handleInterviewStatusUpdate = async (interviewId, status, notes = '') => {
    try {
      await updateInterviewStatus(interviewId, status, notes);
      toast.success(`Interview status updated to ${status}`);
      if (selectedConversation?.candidate_id) await fetchCandidateStatus(selectedConversation.candidate_id);
    } catch (error) { toast.error('Failed to update interview status', error.message); }
  };

  const handleInterviewCancel = async (interviewId) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return;
    try {
      await updateInterviewStatus(interviewId, 'cancelled', 'Cancelled by admin');
      toast.success('Interview cancelled');
      if (selectedConversation?.candidate_id) await fetchCandidateStatus(selectedConversation.candidate_id);
    } catch (error) { toast.error('Failed to cancel interview', error.message); }
  };

  // ─── Conversation actions ───────────────────────────────────

  const handleStatusChange = async (newStatus) => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/v1/conversations/${selectedConversation.candidate_id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedConversation(prev => ({ ...prev, status: newStatus }));
        setConversations(prev => prev.map(c =>
          c.candidate_id === selectedConversation.candidate_id ? { ...c, status: newStatus } : c
        ));
      }
    } catch (error) { /* Failed */ }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/v1/conversations/${selectedConversation.candidate_id}/priority`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedConversation(prev => ({ ...prev, priority: newPriority }));
        setConversations(prev => prev.map(c =>
          c.candidate_id === selectedConversation.candidate_id ? { ...c, priority: newPriority } : c
        ));
      }
    } catch (error) { /* Failed */ }
  };

  const handleResolve = async () => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/v1/conversations/${selectedConversation.candidate_id}/resolve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSelectedConversation(prev => ({ ...prev, status: 'resolved' }));
        setConversations(prev => prev.map(c =>
          c.candidate_id === selectedConversation.candidate_id ? { ...c, status: 'resolved' } : c
        ));
      }
    } catch (error) { /* Failed */ }
  };

  // ─── Message sending & file upload ──────────────────────────

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidateId', selectedConversation.candidate_id);
      const res = await fetch('/api/v1/chat/attachments', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) fetchMessagesApi(selectedConversation.candidate_id);
    } catch (error) { /* Failed */ }
    finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const content = newMessage.trim();
    setNewMessage('');
    setShowEmoji(false);
    addOptimisticMessage(selectedConversation.candidate_id, content);

    try {
      if (isConnected) {
        send({ type: 'message', candidateId: selectedConversation.candidate_id, content });
      } else {
        await fetch(`/api/v1/chat/admin/${selectedConversation.candidate_id}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      }
    } catch (error) { /* Error sending message */ }
    inputRef.current?.focus();
  };

  const handleQuickReply = (template) => {
    let content = template.content;
    if (selectedConversation) {
      content = content.replace('{name}', selectedConversation.name.split(' ')[0]);
    }
    setNewMessage(content);
    inputRef.current?.focus();
  };

  const startNewConversation = (candidate) => {
    const existingConv = conversations.find(c => c.candidate_id === candidate.id);
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      setSelectedConversation({
        candidate_id: candidate.id, name: candidate.name, email: candidate.email,
        profile_photo: candidate.profile_photo, online_status: candidate.online_status,
        last_seen: candidate.last_seen, unread_count: 0,
      });
    }
    setShowNewChat(false);
  };

  const filteredCandidates = candidates.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMessages = getFilteredMessages(messageSearchQuery);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-7rem)]">
      <Card padding="none" className="h-full flex overflow-hidden">
        <ChatSidebar
          conversations={conversations} selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation} sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed} loading={loading} isConnected={isConnected}
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
          onShowNewChat={() => setShowNewChat(true)}
        />

        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
          {selectedConversation ? (
            <>
              <ChatHeader
                selectedConversation={selectedConversation}
                showMessageSearch={showMessageSearch} setShowMessageSearch={setShowMessageSearch}
                messageSearchQuery={messageSearchQuery} setMessageSearchQuery={setMessageSearchQuery}
                filteredMessages={filteredMessages}
                handleStatusChange={handleStatusChange} handlePriorityChange={handlePriorityChange}
                handleResolve={handleResolve}
                aiMode={aiMode} handleAIModeChange={handleAIModeChange}
                slmMode={slmMode} handleSLMModeChange={handleSLMModeChange}
                typingDelayEnabled={typingDelayEnabled} toggleTypingDelay={toggleTypingDelay}
                responseStyle={responseStyle} toggleResponseStyle={toggleResponseStyle}
                languageStyle={languageStyle} toggleLanguageStyle={toggleLanguageStyle}
                soundEnabled={soundEnabled} toggleSound={toggleSound}
              />

              {interviewStatus?.isInSchedulingFlow && (
                <div className="flex-shrink-0 px-6">
                  <InterviewStatusHeader
                    candidateId={selectedConversation.candidate_id}
                    interviewData={interviewStatus} onSchedule={handleScheduleInterview}
                    onReschedule={() => { if (interviewStatus.interview?.id) { /* reschedule modal */ } }}
                    onCancel={() => { if (interviewStatus.interview?.id) handleInterviewCancel(interviewStatus.interview.id); }}
                    onViewDetails={() => setShowInterviewDetails(true)}
                  />
                </div>
              )}

              {selectedConversation?.candidate_id && (
                <div className="flex-shrink-0 px-6">
                  <SLMActivityIndicator isActive={slmLoading} activityType="scheduling_conversation" lastActivity={new Date()} />
                </div>
              )}

              <ChatMessageList messages={messages} messageSearchQuery={messageSearchQuery} messagesEndRef={messagesEndRef} />

              {aiSuggestion && aiMode === 'suggest' && (
                <AISuggestionBubble suggestion={aiSuggestion} onAccept={handleAcceptSuggestion} onEdit={handleEditSuggestion} onDismiss={handleDismissSuggestion} />
              )}

              {slmSuggestion && (
                <SLMSuggestionBubble suggestion={slmSuggestion} onAccept={handleAcceptSLMSuggestion} onEdit={handleEditSLMSuggestion} onDismiss={handleDismissSLMSuggestion} />
              )}

              <ChatInputBar
                newMessage={newMessage} setNewMessage={setNewMessage}
                showEmoji={showEmoji} setShowEmoji={setShowEmoji}
                onSendMessage={sendMessage} onFileUpload={handleFileUpload}
                onQuickReply={handleQuickReply} uploadingFile={uploadingFile}
                templates={templates} inputRef={inputRef} fileInputRef={fileInputRef}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 opacity-50" />
              </div>
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Select a conversation</p>
              <p className="text-sm mt-1">or start a new one</p>
              <button onClick={() => setShowNewChat(true)} className="mt-4 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors text-sm font-medium">
                Start New Chat
              </button>
            </div>
          )}
        </div>

        {showInterviewDetails && interviewStatus?.interview && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <InterviewDetailsPanel
                interview={interviewStatus.interview} candidate={selectedConversation}
                onClose={() => setShowInterviewDetails(false)}
                onUpdateStatus={handleInterviewStatusUpdate}
                onReschedule={() => { setShowInterviewDetails(false); }}
                onCancel={(id) => { handleInterviewCancel(id); setShowInterviewDetails(false); }}
              />
            </div>
          </div>
        )}

        {selectedConversation && (
          <div className="fixed bottom-6 right-6 z-40">
            <SchedulingQuickActions
              candidateId={selectedConversation.candidate_id}
              onScheduleInterview={handleScheduleInterview}
              onViewQueue={() => {}} onViewAnalytics={() => {}}
            />
          </div>
        )}

        {showNewChat && (
          <NewChatModal
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            filteredCandidates={filteredCandidates}
            onClose={() => setShowNewChat(false)}
            onStartConversation={startNewConversation}
          />
        )}
      </Card>
    </div>
  );
}

// ─── Extracted Sub-Components ─────────────────────────────────

function ChatHeader({
  selectedConversation, showMessageSearch, setShowMessageSearch,
  messageSearchQuery, setMessageSearchQuery, filteredMessages,
  handleStatusChange, handlePriorityChange, handleResolve,
  aiMode, handleAIModeChange, slmMode, handleSLMModeChange,
  typingDelayEnabled, toggleTypingDelay,
  responseStyle, toggleResponseStyle,
  languageStyle, toggleLanguageStyle,
  soundEnabled, toggleSound
}) {
  return (
    <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            {selectedConversation.profile_photo ? (
              <img src={selectedConversation.profile_photo} alt={selectedConversation.name} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="font-semibold text-primary-600 dark:text-primary-400">{selectedConversation.name?.charAt(0)}</span>
              </div>
            )}
            <span className={clsx('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900', selectedConversation.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-300')} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">{selectedConversation.name}</h3>
              {selectedConversation.escalated && <EscalationBadge escalated={true} reason={selectedConversation.escalation_reason} />}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {selectedConversation.online_status === 'online' ? (
                <Badge variant="success" size="xs">Online</Badge>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  {selectedConversation.last_seen
                    ? `Last seen ${new Date(selectedConversation.last_seen).toLocaleString('en-SG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' })}`
                    : 'Offline'}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMessageSearch(!showMessageSearch)} className={clsx('p-2 rounded-lg transition-colors', showMessageSearch ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800')} title="Search messages">
            <Search className="h-5 w-5" />
          </button>
          <StatusPriorityDropdown type="status" value={selectedConversation.status || 'open'} onChange={handleStatusChange} />
          <StatusPriorityDropdown type="priority" value={selectedConversation.priority || 'normal'} onChange={handlePriorityChange} />
          {selectedConversation.status !== 'resolved' && (
            <button onClick={handleResolve} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
              <CheckCircle2 className="h-4 w-4" /> Resolve
            </button>
          )}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI</span>
              </div>
              <AIModeSelector mode={aiMode} onChange={handleAIModeChange} candidateId={selectedConversation.candidate_id} />
            </div>
            <SLMModeSelector mode={slmMode} onChange={handleSLMModeChange} candidateId={selectedConversation.candidate_id} />
          </div>
          <button onClick={toggleTypingDelay} className={clsx('p-2 rounded-lg transition-colors', typingDelayEnabled ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800')} title={typingDelayEnabled ? 'Typing delay ON' : 'Typing delay OFF'}>
            {typingDelayEnabled ? <Timer className="h-5 w-5" /> : <TimerOff className="h-5 w-5" />}
          </button>
          <button onClick={toggleResponseStyle} className={clsx('p-2 rounded-lg transition-colors', responseStyle === 'normal' ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800')} title={responseStyle === 'normal' ? 'Normal replies' : 'Concise replies'}>
            {responseStyle === 'normal' ? <AlignJustify className="h-5 w-5" /> : <AlignLeft className="h-5 w-5" />}
          </button>
          <button onClick={toggleLanguageStyle} className={clsx('p-2 rounded-lg transition-colors', languageStyle === 'singlish' ? 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800')} title={languageStyle === 'singlish' ? 'Singlish mode' : 'Professional mode'}>
            {languageStyle === 'singlish' ? <Languages className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
          </button>
          <button onClick={toggleSound} className={clsx('p-2 rounded-lg transition-colors', soundEnabled ? 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800')} title={soundEnabled ? 'Sound on' : 'Sound off'}>
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          {selectedConversation.email && (
            <a href={`mailto:${selectedConversation.email}`} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Send email">
              <Mail className="h-5 w-5" />
            </a>
          )}
          <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showMessageSearch && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search in this conversation..." value={messageSearchQuery}
              onChange={(e) => setMessageSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
            {messageSearchQuery && (
              <button onClick={() => setMessageSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {messageSearchQuery && <span className="text-sm text-slate-500">{filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}</span>}
        </div>
      )}
    </div>
  );
}

function NewChatModal({ searchTerm, setSearchTerm, filteredCandidates, onClose, onStartConversation }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">New Conversation</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search candidates..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No candidates found</p>
            </div>
          ) : (
            filteredCandidates.map(candidate => (
              <button key={candidate.id} onClick={() => onStartConversation(candidate)}
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                {candidate.profile_photo ? (
                  <img src={candidate.profile_photo} alt={candidate.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                    <span className="font-semibold text-primary-600 dark:text-primary-400">{candidate.name?.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium text-slate-900 dark:text-white">{candidate.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{candidate.email}</p>
                </div>
                <span className={clsx('w-2.5 h-2.5 rounded-full', candidate.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-300')} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
