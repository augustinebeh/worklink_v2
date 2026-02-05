import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from 'lucide-react';
import { alertService } from '../../shared/services/api';
import AlertDropdown from '../alerts/AlertDropdown';

/**
 * Alert Bell Component
 * Displays notification bell with unread count, pulse animation, and dropdown
 * Features:
 * - Bell icon in top navigation
 * - Unread count badge (red circle)
 * - Pulse animation for new alerts
 * - Click toggles dropdown
 */
export default function AlertBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  const dropdownRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Poll every 30 seconds
    pollIntervalRef.current = setInterval(fetchUnreadCount, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const fetchUnreadCount = async () => {
    try {
      const response = await alertService.getUnreadCount();
      if (response.success) {
        const newCount = response.data.unread_count;
        const currentTime = Date.now();

        // Check if we have new alerts since last check
        if (newCount > unreadCount && currentTime - lastCheckTime > 5000) {
          setHasNewAlerts(true);
          // Reset pulse animation after 10 seconds
          setTimeout(() => setHasNewAlerts(false), 10000);
        }

        setUnreadCount(newCount);
        setLastCheckTime(currentTime);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      setHasNewAlerts(false); // Stop pulse when opening dropdown
    }
  };

  const handleUnreadCountChange = (newCount) => {
    setUnreadCount(newCount);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge and Pulse Animation */}
      <button
        onClick={handleToggleDropdown}
        className={`
          relative p-2 text-slate-600 dark:text-slate-400
          hover:text-slate-900 dark:hover:text-slate-200
          hover:bg-slate-100 dark:hover:bg-slate-800
          rounded-lg transition-all duration-200
          ${hasNewAlerts ? 'animate-pulse' : ''}
        `}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        {/* Bell Icon with Pulse Ring */}
        <div className="relative">
          <BellIcon className="h-5 w-5" />

          {/* Pulse Ring Animation for New Alerts */}
          {hasNewAlerts && (
            <div className="absolute inset-0 rounded-full animate-ping bg-primary-400 opacity-25"></div>
          )}
        </div>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className={`
            absolute -top-1 -right-1 h-5 w-5
            flex items-center justify-center
            bg-red-500 text-white text-xs font-bold rounded-full
            transform transition-transform duration-200
            ${hasNewAlerts ? 'scale-110' : 'scale-100'}
          `}>
            {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* New Alert Indicator Dot */}
        {hasNewAlerts && unreadCount === 0 && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Dropdown */}
      <AlertDropdown
        isOpen={showDropdown}
        onClose={() => setShowDropdown(false)}
        onUnreadCountChange={handleUnreadCountChange}
      />
    </div>
  );
}
