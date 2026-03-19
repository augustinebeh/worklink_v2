import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for message processing, grouping, sorting, and search filtering.
 * Also handles WebSocket message subscriptions and optimistic updates.
 */

// Notification sound using Web Audio API
let audioContext = null;
export function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Notification sound failed silently
  }
}

export function useMessageProcessor({
  subscribe,
  selectedConversationRef,
  soundEnabledRef,
  fetchConversations,
  fetchMessages,
  toast
}) {
  const [messages, setMessages] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [slmSuggestion, setSlmSuggestion] = useState(null);
  const [aiMode, setAiMode] = useState('off');
  const [slmMode, setSlmMode] = useState('inherit');
  const messagesEndRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket subscriptions for messages
  useEffect(() => {
    if (!subscribe) return;

    const unsubNewMessage = subscribe('new_message', (data) => {
      if (soundEnabledRef.current) playNotificationSound();

      setMessages(prev => {
        const currentConv = selectedConversationRef.current;
        if (currentConv?.candidate_id === data.candidateId) {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        }
        return prev;
      });
      fetchConversations();
    });

    const unsubMessageSent = subscribe('message_sent', (data) => {
      setMessages(prev => {
        if (prev.some(m => m.id === data.message.id)) return prev;
        const optimisticIndex = prev.findIndex(m =>
          m.sender === 'admin' &&
          m.content === data.message.content &&
          typeof m.id === 'number' && m.id > Date.now() - 10000
        );
        if (optimisticIndex !== -1) {
          const updated = [...prev];
          updated[optimisticIndex] = data.message;
          return updated;
        }
        return [...prev, data.message];
      });
      fetchConversations();
    });

    const unsubAiSuggestion = subscribe('ai_suggestion', (data) => {
      if (selectedConversationRef.current?.candidate_id === data.candidateId) {
        setAiSuggestion(data.suggestion);
      }
    });

    const unsubAiUpdate = subscribe('ai_suggestion_update', () => { setAiSuggestion(null); });

    const unsubAiMessageSent = subscribe('ai_message_sent', (data) => {
      fetchMessages(data.candidateId);
    });

    const unsubAiModeUpdated = subscribe('ai_mode_updated', (data) => {
      if (selectedConversationRef.current?.candidate_id === data.candidateId) setAiMode(data.mode);
    });

    const unsubSlmSuggestion = subscribe('slm_suggestion', (data) => {
      if (selectedConversationRef.current?.candidate_id === data.candidateId) {
        setSlmSuggestion(data.suggestion);
      }
    });

    const unsubSlmUpdate = subscribe('slm_suggestion_update', () => { setSlmSuggestion(null); });

    const unsubSlmMessageSent = subscribe('slm_message_sent', (data) => {
      fetchMessages(data.candidateId);
    });

    const unsubSlmModeUpdated = subscribe('slm_mode_updated', (data) => {
      if (selectedConversationRef.current?.candidate_id === data.candidateId) setSlmMode(data.mode);
    });

    const unsubAiAction = subscribe('ai_action', (data) => {
      const name = data.candidateName || 'a worker';
      const actionMessages = {
        'conversation_status_updated': `Changed ${name}'s conversation status to "${data.newStatus}"`,
      };
      toast.info('AI Action', actionMessages[data.action] || `AI performed: ${data.action}`);
      if (data.action === 'conversation_status_updated') fetchConversations();
    });

    const unsubEscalation = subscribe('conversation_escalated', (data) => {
      const name = data.candidateName || 'Worker';
      toast.warning('Escalation', `${name}: ${data.reason}`);
      if (soundEnabledRef.current) playNotificationSound();
      fetchConversations();
    });

    return () => {
      unsubNewMessage(); unsubMessageSent();
      unsubAiSuggestion(); unsubAiUpdate(); unsubAiMessageSent(); unsubAiModeUpdated();
      unsubSlmSuggestion(); unsubSlmUpdate(); unsubSlmMessageSent(); unsubSlmModeUpdated();
      unsubAiAction(); unsubEscalation();
    };
  }, [subscribe, toast, fetchConversations, fetchMessages, selectedConversationRef, soundEnabledRef]);

  // Add optimistic message
  const addOptimisticMessage = useCallback((candidateId, content) => {
    const optimisticMessage = {
      id: Date.now(),
      candidate_id: candidateId,
      sender: 'admin',
      content,
      channel: 'app',
      read: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
  }, []);

  // Filter messages by search query
  const getFilteredMessages = useCallback((searchQuery) => {
    if (!searchQuery) return messages;
    return messages.filter(m =>
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages]);

  return {
    messages,
    setMessages,
    aiSuggestion,
    setAiSuggestion,
    slmSuggestion,
    setSlmSuggestion,
    aiMode,
    setAiMode,
    slmMode,
    setSlmMode,
    messagesEndRef,
    addOptimisticMessage,
    getFilteredMessages
  };
}
