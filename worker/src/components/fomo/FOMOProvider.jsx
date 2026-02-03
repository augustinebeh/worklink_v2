/**
 * FOMO Provider Component
 *
 * Provides FOMO context and manages real-time FOMO events,
 * WebSocket connections, and FOMO state throughout the application.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';

const FOMOContext = createContext();

// FOMO actions
const FOMO_ACTIONS = {
  SET_TRIGGERS: 'SET_TRIGGERS',
  ADD_TRIGGER: 'ADD_TRIGGER',
  REMOVE_TRIGGER: 'REMOVE_TRIGGER',
  UPDATE_TRIGGER: 'UPDATE_TRIGGER',
  SET_SOCIAL_PROOF: 'SET_SOCIAL_PROOF',
  SET_URGENCY_ALERT: 'SET_URGENCY_ALERT',
  SET_STREAK_RISK: 'SET_STREAK_RISK',
  DISMISS_EVENT: 'DISMISS_EVENT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Initial FOMO state
const initialState = {
  triggers: [],
  socialProof: {},
  urgencyAlerts: [],
  streakRisk: null,
  isLoading: false,
  error: null,
  settings: {
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    maxTriggers: 5,
    enableSounds: true,
    enableVibration: true
  }
};

// FOMO reducer
function fomoReducer(state, action) {
  switch (action.type) {
    case FOMO_ACTIONS.SET_TRIGGERS:
      return {
        ...state,
        triggers: action.payload,
        isLoading: false,
        error: null
      };

    case FOMO_ACTIONS.ADD_TRIGGER:
      return {
        ...state,
        triggers: [...state.triggers, action.payload].slice(-state.settings.maxTriggers)
      };

    case FOMO_ACTIONS.REMOVE_TRIGGER:
      return {
        ...state,
        triggers: state.triggers.filter(trigger => trigger.id !== action.payload)
      };

    case FOMO_ACTIONS.UPDATE_TRIGGER:
      return {
        ...state,
        triggers: state.triggers.map(trigger =>
          trigger.id === action.payload.id ? { ...trigger, ...action.payload.updates } : trigger
        )
      };

    case FOMO_ACTIONS.SET_SOCIAL_PROOF:
      return {
        ...state,
        socialProof: {
          ...state.socialProof,
          [action.payload.key]: action.payload.data
        }
      };

    case FOMO_ACTIONS.SET_URGENCY_ALERT:
      return {
        ...state,
        urgencyAlerts: [action.payload, ...state.urgencyAlerts.slice(0, 2)]
      };

    case FOMO_ACTIONS.SET_STREAK_RISK:
      return {
        ...state,
        streakRisk: action.payload
      };

    case FOMO_ACTIONS.DISMISS_EVENT:
      return {
        ...state,
        triggers: state.triggers.filter(trigger => trigger.id !== action.payload),
        urgencyAlerts: state.urgencyAlerts.filter(alert => alert.id !== action.payload)
      };

    case FOMO_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case FOMO_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    default:
      return state;
  }
}

export const FOMOProvider = ({ children }) => {
  const [state, dispatch] = useReducer(fomoReducer, initialState);
  const { ws, isConnected, sendMessage } = useWebSocket();
  const { user } = useAuth();

  // Handle WebSocket FOMO events
  useEffect(() => {
    if (!ws || !isConnected) return;

    const handleFOMOEvent = (event) => {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

      switch (data.type) {
        case 'fomo_trigger':
          dispatch({ type: FOMO_ACTIONS.ADD_TRIGGER, payload: data.event });
          triggerNotificationEffects(data.event);
          break;

        case 'fomo_triggers':
          dispatch({ type: FOMO_ACTIONS.SET_TRIGGERS, payload: data.triggers || [] });
          break;

        case 'fomo_social_proof':
          dispatch({
            type: FOMO_ACTIONS.SET_SOCIAL_PROOF,
            payload: { key: data.jobId || 'general', data: data.alert }
          });
          break;

        case 'fomo_urgency':
          dispatch({ type: FOMO_ACTIONS.SET_URGENCY_ALERT, payload: data.alert });
          triggerNotificationEffects(data.alert);
          break;

        case 'fomo_scarcity':
          dispatch({ type: FOMO_ACTIONS.ADD_TRIGGER, payload: {
            id: `scarcity_${Date.now()}`,
            type: 'scarcity',
            ...data.alert
          }});
          break;

        case 'fomo_streak_risk':
          dispatch({ type: FOMO_ACTIONS.SET_STREAK_RISK, payload: data.risk });
          triggerNotificationEffects(data.risk);
          break;

        case 'fomo_peer_activity':
          dispatch({
            type: FOMO_ACTIONS.ADD_TRIGGER,
            payload: {
              id: `peer_${Date.now()}`,
              type: 'peer_activity',
              message: data.message,
              urgency: data.urgency || 'medium',
              activityType: data.activityType
            }
          });
          break;

        case 'fomo_competitive_pressure':
          dispatch({
            type: FOMO_ACTIONS.ADD_TRIGGER,
            payload: {
              id: `competitive_${Date.now()}`,
              type: 'competitive_pressure',
              ...data.competition
            }
          });
          break;

        default:
          break;
      }
    };

    ws.addEventListener('message', handleFOMOEvent);
    return () => ws.removeEventListener('message', handleFOMOEvent);
  }, [ws, isConnected]);

  // Request FOMO triggers on connection
  useEffect(() => {
    if (isConnected && user?.id) {
      requestFOMOTriggers();
    }
  }, [isConnected, user?.id]);

  // Auto-refresh FOMO triggers
  useEffect(() => {
    if (!state.settings.autoRefresh || !isConnected) return;

    const interval = setInterval(() => {
      requestFOMOTriggers();
    }, state.settings.refreshInterval);

    return () => clearInterval(interval);
  }, [isConnected, state.settings.autoRefresh, state.settings.refreshInterval]);

  // Trigger notification effects (sound, vibration)
  const triggerNotificationEffects = useCallback((event) => {
    if (!event) return;

    // Sound notification
    if (state.settings.enableSounds && event.urgency !== 'low') {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = event.urgency === 'critical' ? 0.8 : 0.5;
        audio.play().catch(() => {}); // Ignore if audio fails
      } catch (error) {
        console.log('Audio notification failed:', error);
      }
    }

    // Vibration
    if (state.settings.enableVibration && 'vibrate' in navigator && event.urgency !== 'low') {
      const pattern = event.urgency === 'critical' ? [200, 100, 200] : [100];
      navigator.vibrate(pattern);
    }
  }, [state.settings]);

  // Request FOMO triggers from server
  const requestFOMOTriggers = useCallback(() => {
    if (!isConnected) return;

    dispatch({ type: FOMO_ACTIONS.SET_LOADING, payload: true });
    sendMessage({
      type: 'get_fomo_triggers',
      limit: state.settings.maxTriggers
    });
  }, [isConnected, sendMessage, state.settings.maxTriggers]);

  // Track activity for FOMO processing
  const trackActivity = useCallback((activityType, metadata = {}) => {
    if (!isConnected) return;

    sendMessage({
      type: 'track_activity',
      activityType,
      metadata
    });
  }, [isConnected, sendMessage]);

  // Track job view for competitive pressure
  const trackJobView = useCallback((jobId) => {
    if (!isConnected) return;

    sendMessage({
      type: 'view_job',
      jobId
    });
  }, [isConnected, sendMessage]);

  // Dismiss FOMO event
  const dismissFOMOEvent = useCallback((eventId) => {
    dispatch({ type: FOMO_ACTIONS.DISMISS_EVENT, payload: eventId });

    if (isConnected) {
      sendMessage({
        type: 'dismiss_fomo',
        fomoId: eventId
      });
    }
  }, [isConnected, sendMessage]);

  // Accept streak protection
  const acceptStreakProtection = useCallback((protectionId) => {
    if (!isConnected) return;

    sendMessage({
      type: 'accept_streak_protection',
      protectionId
    });
  }, [isConnected, sendMessage]);

  // Handle FOMO action (navigate, apply, etc.)
  const handleFOMOAction = useCallback((action, trigger) => {
    if (!action || !trigger) return;

    // Track the action
    trackActivity('fomo_action_taken', {
      actionType: action.type,
      triggerType: trigger.type,
      triggerId: trigger.id
    });

    // Handle different action types
    switch (action.type) {
      case 'view_job':
        if (action.jobId) {
          // Navigate to job details
          window.location.href = `/jobs/${action.jobId}`;
        }
        break;

      case 'browse_jobs':
        window.location.href = '/jobs';
        break;

      case 'quick_checkin':
        // Trigger check-in process
        trackActivity('quick_checkin', { source: 'fomo' });
        break;

      default:
        console.log('Unknown FOMO action:', action.type);
        break;
    }

    // Auto-dismiss trigger after action
    dismissFOMOEvent(trigger.id);
  }, [trackActivity, dismissFOMOEvent]);

  // Update FOMO settings
  const updateSettings = useCallback((newSettings) => {
    dispatch({
      type: FOMO_ACTIONS.SET_TRIGGERS,
      payload: { ...state.settings, ...newSettings }
    });
  }, [state.settings]);

  // Get active triggers by type
  const getTriggersByType = useCallback((type) => {
    return state.triggers.filter(trigger => trigger.type === type);
  }, [state.triggers]);

  // Get highest urgency trigger
  const getHighestUrgencyTrigger = useCallback(() => {
    return state.triggers.reduce((highest, current) => {
      const currentUrgency = current.urgency || 0;
      const highestUrgency = highest?.urgency || 0;
      return currentUrgency > highestUrgency ? current : highest;
    }, null);
  }, [state.triggers]);

  // Check if there are critical alerts
  const hasCriticalAlerts = useCallback(() => {
    return state.triggers.some(trigger =>
      trigger.urgency >= 0.8 || trigger.type === 'streak_protection'
    ) || state.streakRisk?.riskLevel === 'critical';
  }, [state.triggers, state.streakRisk]);

  const contextValue = {
    // State
    ...state,

    // Actions
    requestFOMOTriggers,
    trackActivity,
    trackJobView,
    dismissFOMOEvent,
    acceptStreakProtection,
    handleFOMOAction,
    updateSettings,

    // Helpers
    getTriggersByType,
    getHighestUrgencyTrigger,
    hasCriticalAlerts,

    // Status
    isConnected
  };

  return (
    <FOMOContext.Provider value={contextValue}>
      {children}
    </FOMOContext.Provider>
  );
};

// Custom hook to use FOMO context
export const useFOMO = () => {
  const context = useContext(FOMOContext);
  if (!context) {
    throw new Error('useFOMO must be used within a FOMOProvider');
  }
  return context;
};

// Hook for tracking FOMO activities
export const useFOMOTracking = () => {
  const { trackActivity, trackJobView } = useFOMO();

  const trackJobApplication = useCallback((jobId, metadata = {}) => {
    trackActivity('job_application', { jobId, ...metadata });
  }, [trackActivity]);

  const trackLevelUp = useCallback((newLevel, metadata = {}) => {
    trackActivity('level_up', { newLevel, ...metadata });
  }, [trackActivity]);

  const trackAchievementUnlock = useCallback((achievementId, metadata = {}) => {
    trackActivity('achievement_unlocked', { achievementId, ...metadata });
  }, [trackActivity]);

  const trackStreakMilestone = useCallback((streakDays, metadata = {}) => {
    trackActivity('streak_milestone', { streakDays, ...metadata });
  }, [trackActivity]);

  return {
    trackJobApplication,
    trackLevelUp,
    trackAchievementUnlock,
    trackStreakMilestone,
    trackJobView,
    trackActivity
  };
};

export default FOMOProvider;