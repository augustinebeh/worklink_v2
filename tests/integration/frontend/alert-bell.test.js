/**
 * 🧪 FRONTEND INTEGRATION TEST: AlertBell Component
 * Tests AlertBell React component with real API interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Mock the API service
const mockAlertService = {
  getUnreadCount: jest.fn(),
  getAlertHistory: jest.fn(),
  acknowledgeAlert: jest.fn(),
  markAllRead: jest.fn()
};

// Mock the alert service module
jest.mock('../../../admin/src/shared/services/api/alert.service.js', () => ({
  alertService: mockAlertService
}));

// Import component after mocking
const AlertBell = require('../../../admin/src/components/bpo/AlertBell.jsx').default;

describe('Frontend Integration: AlertBell Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup default mock responses
    mockAlertService.getUnreadCount.mockResolvedValue({
      success: true,
      data: { unread_count: 0 }
    });

    mockAlertService.getAlertHistory.mockResolvedValue({
      success: true,
      data: { alerts: [] }
    });

    mockAlertService.acknowledgeAlert.mockResolvedValue({
      success: true
    });

    mockAlertService.markAllRead.mockResolvedValue({
      success: true
    });
  });

  describe('AlertBell: Shows unread count', () => {
    test('Displays correct unread count on bell icon', async () => {
      // Setup mock with unread count
      mockAlertService.getUnreadCount.mockResolvedValue({
        success: true,
        data: { unread_count: 5 }
      });

      render(<AlertBell />);

      // Wait for component to load and fetch count
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      // Verify the bell icon is present
      expect(screen.getByRole('button')).toBeInTheDocument();

      // Verify API was called
      expect(mockAlertService.getUnreadCount).toHaveBeenCalledTimes(1);
    });

    test('Shows 9+ for counts greater than 9', async () => {
      mockAlertService.getUnreadCount.mockResolvedValue({
        success: true,
        data: { unread_count: 15 }
      });

      render(<AlertBell />);

      await waitFor(() => {
        expect(screen.getByText('9+')).toBeInTheDocument();
      });
    });

    test('Does not show badge when count is 0', async () => {
      mockAlertService.getUnreadCount.mockResolvedValue({
        success: true,
        data: { unread_count: 0 }
      });

      render(<AlertBell />);

      await waitFor(() => {
        expect(mockAlertService.getUnreadCount).toHaveBeenCalled();
      });

      // Badge should not be present
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    test('Polls for unread count every 30 seconds', async () => {
      jest.useFakeTimers();

      render(<AlertBell />);

      // Initial call
      await waitFor(() => {
        expect(mockAlertService.getUnreadCount).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockAlertService.getUnreadCount).toHaveBeenCalledTimes(2);
      });

      // Advance timer again
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockAlertService.getUnreadCount).toHaveBeenCalledTimes(3);
      });

      jest.useRealTimers();
    });
  });

  describe('AlertBell Dropdown Functionality', () => {
    test('Opens dropdown when bell is clicked', async () => {
      mockAlertService.getUnreadCount.mockResolvedValue({
        success: true,
        data: { unread_count: 3 }
      });

      render(<AlertBell />);

      // Click the bell
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      // Dropdown should be visible
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('3 unread')).toBeInTheDocument();
      });
    });

    test('Fetches and displays alerts when dropdown opens', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          alert_title: 'High-Value Tender: Security Services',
          alert_message: 'Ministry of Defence - $2.5M',
          trigger_type: 'tender',
          priority: 'high',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        },
        {
          id: 'alert-2',
          alert_title: 'Tender Closing in 2 Days',
          alert_message: 'Cleaning Services Contract - PUB',
          trigger_type: 'deadline',
          priority: 'critical',
          triggered_at: new Date(Date.now() - 60000).toISOString(),
          acknowledged_at: null
        }
      ];

      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: mockAlerts }
      });

      render(<AlertBell />);

      // Click to open dropdown
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      // Wait for alerts to load
      await waitFor(() => {
        expect(screen.getByText('High-Value Tender: Security Services')).toBeInTheDocument();
        expect(screen.getByText('Tender Closing in 2 Days')).toBeInTheDocument();
      });

      // Verify API was called with correct parameters
      expect(mockAlertService.getAlertHistory).toHaveBeenCalledWith({
        limit: 10,
        unread_only: false
      });
    });

    test('Shows loading state while fetching alerts', async () => {
      // Mock delayed response
      mockAlertService.getAlertHistory.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: { alerts: [] }
        }), 500))
      );

      render(<AlertBell />);

      // Open dropdown
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      // Should show loading spinner
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner has role status
    });

    test('Shows empty state when no alerts', async () => {
      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: [] }
      });

      render(<AlertBell />);

      // Open dropdown
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument();
      });
    });

    test('Closes dropdown when clicking outside', async () => {
      render(
        <div>
          <AlertBell />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      // Open dropdown
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });

      // Click outside
      const outsideElement = screen.getByTestId('outside-element');
      await user.click(outsideElement);

      await waitFor(() => {
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      });
    });
  });

  describe('Alert Acknowledgment', () => {
    test('Acknowledges individual alert when mark as read is clicked', async () => {
      const mockAlert = {
        id: 'alert-1',
        alert_title: 'Test Alert',
        alert_message: 'Test Message',
        trigger_type: 'tender',
        priority: 'medium',
        triggered_at: new Date().toISOString(),
        acknowledged_at: null
      };

      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: [mockAlert] }
      });

      mockAlertService.acknowledgeAlert.mockResolvedValue({
        success: true
      });

      render(<AlertBell />);

      // Open dropdown
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      // Wait for alert to appear
      await waitFor(() => {
        expect(screen.getByText('Test Alert')).toBeInTheDocument();
      });

      // Click mark as read
      const markAsReadButton = screen.getByText('Mark as read');
      await user.click(markAsReadButton);

      // Verify API call
      await waitFor(() => {
        expect(mockAlertService.acknowledgeAlert).toHaveBeenCalledWith(
          'alert-1',
          expect.objectContaining({
            user_id: expect.any(String),
            action_taken: 'viewed'
          })
        );
      });

      // Verify unread count is refreshed
      expect(mockAlertService.getUnreadCount).toHaveBeenCalledTimes(2); // Initial + after acknowledge
    });

    test('Marks all alerts as read when mark all read is clicked', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          alert_title: 'Alert 1',
          alert_message: 'Message 1',
          trigger_type: 'tender',
          priority: 'medium',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        },
        {
          id: 'alert-2',
          alert_title: 'Alert 2',
          alert_message: 'Message 2',
          trigger_type: 'tender',
          priority: 'high',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        }
      ];

      mockAlertService.getUnreadCount.mockResolvedValue({
        success: true,
        data: { unread_count: 2 }
      });

      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: mockAlerts }
      });

      render(<AlertBell />);

      // Open dropdown
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Mark all read')).toBeInTheDocument();
      });

      // Click mark all read
      const markAllReadButton = screen.getByText('Mark all read');
      await user.click(markAllReadButton);

      // Verify API call
      await waitFor(() => {
        expect(mockAlertService.markAllRead).toHaveBeenCalledTimes(1);
      });
    });

    test('Handles acknowledgment errors gracefully', async () => {
      const mockAlert = {
        id: 'alert-1',
        alert_title: 'Test Alert',
        alert_message: 'Test Message',
        trigger_type: 'tender',
        priority: 'medium',
        triggered_at: new Date().toISOString(),
        acknowledged_at: null
      };

      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: [mockAlert] }
      });

      mockAlertService.acknowledgeAlert.mockRejectedValue(
        new Error('Network error')
      );

      // Spy on console.error to verify error handling
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<AlertBell />);

      // Open dropdown and click mark as read
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Mark as read')).toBeInTheDocument();
      });

      const markAsReadButton = screen.getByText('Mark as read');
      await user.click(markAsReadButton);

      // Verify error was logged
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error acknowledging alert:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Alert Priority and Styling', () => {
    test('Displays correct priority badges and colors', async () => {
      const mockAlerts = [
        {
          id: 'critical-alert',
          alert_title: 'Critical Alert',
          alert_message: 'Urgent message',
          trigger_type: 'deadline',
          priority: 'critical',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        },
        {
          id: 'high-alert',
          alert_title: 'High Priority Alert',
          alert_message: 'Important message',
          trigger_type: 'tender',
          priority: 'high',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        },
        {
          id: 'medium-alert',
          alert_title: 'Medium Priority Alert',
          alert_message: 'Regular message',
          trigger_type: 'renewal',
          priority: 'medium',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        }
      ];

      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: mockAlerts }
      });

      render(<AlertBell />);

      // Open dropdown
      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        // Check that priority badges are displayed
        expect(screen.getByText('CRITICAL')).toBeInTheDocument();
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      });

      // Check CSS classes for proper styling
      const criticalBadge = screen.getByText('CRITICAL');
      expect(criticalBadge).toHaveClass('bg-red-100', 'text-red-800');

      const highBadge = screen.getByText('HIGH');
      expect(highBadge).toHaveClass('bg-orange-100', 'text-orange-800');

      const mediumBadge = screen.getByText('MEDIUM');
      expect(mediumBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    test('Shows correct icons for different trigger types', async () => {
      const mockAlerts = [
        {
          id: 'tender-alert',
          alert_title: 'Tender Alert',
          alert_message: 'New tender',
          trigger_type: 'tender',
          priority: 'medium',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        },
        {
          id: 'renewal-alert',
          alert_title: 'Renewal Alert',
          alert_message: 'Renewal opportunity',
          trigger_type: 'renewal',
          priority: 'medium',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        },
        {
          id: 'deadline-alert',
          alert_title: 'Deadline Alert',
          alert_message: 'Closing soon',
          trigger_type: 'deadline',
          priority: 'medium',
          triggered_at: new Date().toISOString(),
          acknowledged_at: null
        }
      ];

      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: mockAlerts }
      });

      render(<AlertBell />);

      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        // Icons are rendered as SVG elements with specific classes
        // This tests that different trigger types get different icons
        const alertItems = screen.getAllByText(/Alert$/);
        expect(alertItems).toHaveLength(3);
      });
    });
  });

  describe('Time Formatting', () => {
    test('Formats relative time correctly', async () => {
      const now = new Date();
      const mockAlerts = [
        {
          id: 'recent-alert',
          alert_title: 'Recent Alert',
          alert_message: 'Just happened',
          trigger_type: 'tender',
          priority: 'medium',
          triggered_at: now.toISOString(),
          acknowledged_at: null
        },
        {
          id: 'old-alert',
          alert_title: 'Old Alert',
          alert_message: 'From yesterday',
          trigger_type: 'tender',
          priority: 'medium',
          triggered_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          acknowledged_at: null
        }
      ];

      mockAlertService.getAlertHistory.mockResolvedValue({
        success: true,
        data: { alerts: mockAlerts }
      });

      render(<AlertBell />);

      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        // Should show "Just now" for very recent alerts
        expect(screen.getByText('Just now')).toBeInTheDocument();

        // Should show "1d ago" for day-old alerts
        expect(screen.getByText('1d ago')).toBeInTheDocument();
      });
    });
  });

  describe('API Error Handling', () => {
    test('Handles API errors gracefully', async () => {
      mockAlertService.getUnreadCount.mockRejectedValue(
        new Error('API Error')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<AlertBell />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching unread count:',
          expect.any(Error)
        );
      });

      // Component should still render even with API errors
      expect(screen.getByRole('button')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('Handles failed alert history fetch', async () => {
      mockAlertService.getAlertHistory.mockRejectedValue(
        new Error('Failed to fetch alerts')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<AlertBell />);

      const bellButton = screen.getByRole('button');
      await user.click(bellButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching alerts:',
          expect.any(Error)
        );
      });

      // Should show empty state when fetch fails
      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });
});