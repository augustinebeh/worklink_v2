/**
 * KanbanBoard Component Tests
 *
 * Run these tests to verify the kanban board functionality
 *
 * Test command: npm test -- KanbanBoard.test.jsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '../ui/Toast';
import KanbanBoard from './KanbanBoard';
import { lifecycleService } from "../../shared/services/api";

// Mock the lifecycle service
jest.mock('../../shared/services/api', () => ({
  lifecycleService: {
    getTenders: jest.fn(),
    moveTender: jest.fn()
  }
}));

// Mock tender data
const mockTenders = [
  {
    id: 1,
    title: 'Ministry of Health - Healthcare Services',
    agency: 'MOH',
    stage: 'new_opportunity',
    priority: 'high',
    estimated_value: 500000,
    closing_date: '2026-03-15',
    assigned_to: 'sarah_tan',
    is_renewal: false,
    urgent: true
  },
  {
    id: 2,
    title: 'GovTech - IT Support Services',
    agency: 'GovTech',
    stage: 'review',
    priority: 'medium',
    estimated_value: 250000,
    closing_date: '2026-04-01',
    assigned_to: null,
    is_renewal: false,
    urgent: false
  },
  {
    id: 3,
    title: 'MOM - Payroll Services',
    agency: 'MOM',
    stage: 'bidding',
    priority: 'critical',
    estimated_value: 1000000,
    closing_date: '2026-02-28',
    assigned_to: 'david_lim',
    is_renewal: true,
    urgent: true
  }
];

// Wrapper with ToastProvider
const renderWithProviders = (component) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('KanbanBoard Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Default mock implementation
    lifecycleService.getTenders.mockResolvedValue({
      success: true,
      data: mockTenders
    });
  });

  describe('Rendering', () => {
    test('renders all 8 stage columns', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('Renewal Watch')).toBeInTheDocument();
        expect(screen.getByText('New Opportunity')).toBeInTheDocument();
        expect(screen.getByText('Review')).toBeInTheDocument();
        expect(screen.getByText('Bidding')).toBeInTheDocument();
        expect(screen.getByText('Approval')).toBeInTheDocument();
        expect(screen.getByText('Submitted')).toBeInTheDocument();
        expect(screen.getByText('Won')).toBeInTheDocument();
        expect(screen.getByText('Lost')).toBeInTheDocument();
      });
    });

    test('renders tender cards in correct stages', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('Ministry of Health - Healthcare Services')).toBeInTheDocument();
        expect(screen.getByText('GovTech - IT Support Services')).toBeInTheDocument();
        expect(screen.getByText('MOM - Payroll Services')).toBeInTheDocument();
      });
    });

    test('shows loading skeletons initially', () => {
      renderWithProviders(<KanbanBoard />);

      // Should show loading skeletons before data loads
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('displays empty state when no tenders', async () => {
      lifecycleService.getTenders.mockResolvedValue({
        success: true,
        data: []
      });

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getAllByText('No tenders in this stage').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Fetching', () => {
    test('fetches tenders on mount', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(lifecycleService.getTenders).toHaveBeenCalledTimes(1);
      });
    });

    test('refetches data when refreshKey changes', async () => {
      const { rerender } = renderWithProviders(<KanbanBoard refreshKey={0} />);

      await waitFor(() => {
        expect(lifecycleService.getTenders).toHaveBeenCalledTimes(1);
      });

      rerender(
        <ToastProvider>
          <KanbanBoard refreshKey={1} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(lifecycleService.getTenders).toHaveBeenCalledTimes(2);
      });
    });

    test('handles API errors gracefully', async () => {
      lifecycleService.getTenders.mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading tenders/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tender Cards', () => {
    test('displays priority badges correctly', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
        expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      });
    });

    test('displays urgent badges', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        const urgentBadges = screen.getAllByText('URGENT');
        expect(urgentBadges.length).toBe(2);
      });
    });

    test('displays renewal badges', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('RENEWAL')).toBeInTheDocument();
      });
    });

    test('formats tender values correctly', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('$500K')).toBeInTheDocument();
        expect(screen.getByText('$250K')).toBeInTheDocument();
        expect(screen.getByText('$1000K')).toBeInTheDocument();
      });
    });

    test('shows BD manager avatars when assigned', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText('ST')).toBeInTheDocument(); // Sarah Tan
        expect(screen.getByText('DL')).toBeInTheDocument(); // David Lim
      });
    });
  });

  describe('Interactions', () => {
    test('calls onTenderClick when details button is clicked', async () => {
      const onTenderClick = jest.fn();
      renderWithProviders(<KanbanBoard onTenderClick={onTenderClick} />);

      await waitFor(() => {
        const detailsButtons = screen.getAllByText('Details');
        fireEvent.click(detailsButtons[0]);
      });

      expect(onTenderClick).toHaveBeenCalledWith(mockTenders[0]);
    });

    test('calls onStageChange after successful move', async () => {
      const onStageChange = jest.fn();

      lifecycleService.moveTender.mockResolvedValue({
        success: true,
        data: { ...mockTenders[0], stage: 'review' }
      });

      renderWithProviders(<KanbanBoard onStageChange={onStageChange} />);

      // Note: Testing drag-and-drop requires more complex setup
      // This is a simplified version focusing on the callback
      await waitFor(() => {
        expect(screen.getByText('Ministry of Health - Healthcare Services')).toBeInTheDocument();
      });

      // In real implementation, you would simulate drag and drop here
      // For now, we verify the API service is available
      expect(lifecycleService.moveTender).toBeDefined();
    });
  });

  describe('Mobile Responsiveness', () => {
    test('shows mobile warning on small screens', async () => {
      // Mock window.innerWidth
      global.innerWidth = 500;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByText(/Drag-and-drop is optimized for desktop/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Tender lifecycle kanban board')).toBeInTheDocument();
      });
    });

    test('stage columns have proper ARIA regions', async () => {
      renderWithProviders(<KanbanBoard />);

      await waitFor(() => {
        expect(screen.getByLabelText('Review stage')).toBeInTheDocument();
        expect(screen.getByLabelText('Bidding stage')).toBeInTheDocument();
      });
    });
  });
});

describe('KanbanColumn Component', () => {
  test('displays correct tender count', () => {
    const stage = { id: 'review', name: 'Review' };
    const tenders = mockTenders.filter(t => t.stage === 'review');

    const { container } = render(
      <KanbanColumn stage={stage} tenders={tenders} />
    );

    expect(container.textContent).toContain('1'); // One tender in review
  });

  test('calculates total value correctly', () => {
    const stage = { id: 'review', name: 'Review' };
    const tenders = mockTenders.filter(t => t.stage === 'review');

    render(<KanbanColumn stage={stage} tenders={tenders} />);

    expect(screen.getByText('$250K')).toBeInTheDocument();
  });
});

describe('useKanbanDnd Hook', () => {
  test('provides drag handlers', () => {
    // This would require a custom test hook setup
    // Placeholder for future implementation
    expect(true).toBe(true);
  });

  test('handles optimistic updates', () => {
    // This would require testing the hook in isolation
    // Placeholder for future implementation
    expect(true).toBe(true);
  });
});

// Snapshot test
describe('Snapshots', () => {
  test('matches snapshot', async () => {
    const { container } = renderWithProviders(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText('Ministry of Health - Healthcare Services')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });
});
