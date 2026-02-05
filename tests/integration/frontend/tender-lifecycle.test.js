/**
 * 🧪 FRONTEND INTEGRATION TEST: Tender Lifecycle Components
 * Tests tender management interface components with API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API services
const mockLifecycleService = {
  getTenderList: jest.fn(),
  getTenderById: jest.fn(),
  createTender: jest.fn(),
  updateTender: jest.fn(),
  moveTenderStage: jest.fn(),
  recordDecision: jest.fn(),
  getStats: jest.fn(),
  getDeadlines: jest.fn()
};

jest.mock('../../../admin/src/shared/services/api/lifecycle.service.js', () => ({
  lifecycleService: mockLifecycleService
}));

// Mock components (these would be imported from actual component files)
const TenderList = ({ onTenderSelect, selectedStage, onStageFilter }) => {
  const [tenders, setTenders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTenders = async () => {
      try {
        const response = await mockLifecycleService.getTenderList({
          stage: selectedStage
        });
        if (response.success) {
          setTenders(response.data);
        }
      } catch (error) {
        console.error('Error fetching tenders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, [selectedStage]);

  if (loading) return <div>Loading tenders...</div>;

  return (
    <div>
      <div className="filters">
        <select
          data-testid="stage-filter"
          value={selectedStage || ''}
          onChange={(e) => onStageFilter(e.target.value)}
        >
          <option value="">All Stages</option>
          <option value="new_opportunity">New Opportunity</option>
          <option value="review">Review</option>
          <option value="bidding">Bidding</option>
          <option value="submitted">Submitted</option>
        </select>
      </div>

      <div className="tender-grid">
        {tenders.length === 0 ? (
          <div>No tenders found</div>
        ) : (
          tenders.map(tender => (
            <div
              key={tender.id}
              className="tender-card"
              onClick={() => onTenderSelect(tender)}
              data-testid={`tender-${tender.id}`}
            >
              <h3>{tender.title}</h3>
              <p>Agency: {tender.agency}</p>
              <p>Stage: {tender.stage}</p>
              <p>Priority: {tender.priority}</p>
              {tender.estimated_value && (
                <p>Value: ${tender.estimated_value.toLocaleString()}</p>
              )}
              {tender.closing_date && (
                <p>Closes: {tender.closing_date}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const TenderDetail = ({ tender, onUpdate }) => {
  const [editing, setEditing] = React.useState(false);
  const [formData, setFormData] = React.useState(tender || {});

  const handleSave = async () => {
    try {
      const response = await mockLifecycleService.updateTender(tender.id, formData);
      if (response.success) {
        onUpdate(response.data);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating tender:', error);
    }
  };

  const handleStageMove = async (newStage) => {
    try {
      const response = await mockLifecycleService.moveTenderStage(tender.id, {
        new_stage: newStage,
        user_id: 'test-user'
      });
      if (response.success) {
        onUpdate(response.data);
      }
    } catch (error) {
      console.error('Error moving stage:', error);
    }
  };

  const handleDecision = async (decision) => {
    try {
      const response = await mockLifecycleService.recordDecision(tender.id, {
        decision: decision,
        decision_reasoning: `${decision} decision made via UI`,
        user_id: 'test-user'
      });
      if (response.success) {
        onUpdate(response.data);
      }
    } catch (error) {
      console.error('Error recording decision:', error);
    }
  };

  if (!tender) return <div>Select a tender to view details</div>;

  return (
    <div className="tender-detail">
      <div className="tender-header">
        <h2>{tender.title}</h2>
        <div className="tender-actions">
          <button
            onClick={() => setEditing(!editing)}
            data-testid="edit-button"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="form-group">
            <label>Title:</label>
            <input
              data-testid="title-input"
              value={formData.title || ''}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              data-testid="description-input"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Estimated Value:</label>
            <input
              type="number"
              data-testid="value-input"
              value={formData.estimated_value || ''}
              onChange={(e) => setFormData({...formData, estimated_value: parseInt(e.target.value)})}
            />
          </div>
          <button type="submit" data-testid="save-button">Save</button>
        </form>
      ) : (
        <div className="tender-info">
          <p><strong>Agency:</strong> {tender.agency}</p>
          <p><strong>Stage:</strong> {tender.stage}</p>
          <p><strong>Priority:</strong> {tender.priority}</p>
          {tender.description && <p><strong>Description:</strong> {tender.description}</p>}
          {tender.estimated_value && (
            <p><strong>Estimated Value:</strong> ${tender.estimated_value.toLocaleString()}</p>
          )}
          {tender.closing_date && <p><strong>Closing Date:</strong> {tender.closing_date}</p>}

          {/* Stage Controls */}
          <div className="stage-controls">
            <h3>Stage Actions</h3>
            {tender.stage === 'new_opportunity' && (
              <button
                onClick={() => handleStageMove('review')}
                data-testid="move-to-review"
              >
                Move to Review
              </button>
            )}
            {tender.stage === 'review' && (
              <div>
                <button
                  onClick={() => handleDecision('go')}
                  data-testid="go-decision"
                >
                  Go Decision
                </button>
                <button
                  onClick={() => handleDecision('no-go')}
                  data-testid="no-go-decision"
                >
                  No-Go Decision
                </button>
              </div>
            )}
            {tender.stage === 'review' && tender.decision === 'go' && (
              <button
                onClick={() => handleStageMove('bidding')}
                data-testid="move-to-bidding"
              >
                Move to Bidding
              </button>
            )}
          </div>

          {/* Decision Display */}
          {tender.decision && (
            <div className="decision-info">
              <h3>Decision</h3>
              <p><strong>Decision:</strong> {tender.decision}</p>
              <p><strong>Reasoning:</strong> {tender.decision_reasoning}</p>
              <p><strong>Made By:</strong> {tender.decision_made_by}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = React.useState(null);
  const [deadlines, setDeadlines] = React.useState([]);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, deadlinesResponse] = await Promise.all([
          mockLifecycleService.getStats(),
          mockLifecycleService.getDeadlines()
        ]);

        if (statsResponse.success) {
          setStats(statsResponse.data);
        }

        if (deadlinesResponse.success) {
          setDeadlines(deadlinesResponse.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard">
      <h2>BPO Tender Pipeline Dashboard</h2>

      {stats && (
        <div className="stats-grid" data-testid="stats-section">
          <div className="stat-card">
            <h3>Total Tenders</h3>
            <p>{stats.total_tenders}</p>
          </div>
          <div className="stat-card">
            <h3>Active Pipeline</h3>
            <p>{stats.new_opportunity + stats.review + stats.bidding}</p>
          </div>
          <div className="stat-card">
            <h3>Win Rate</h3>
            <p>{stats.win_rate}%</p>
          </div>
          <div className="stat-card">
            <h3>Pipeline Value</h3>
            <p>${stats.total_pipeline_value?.toLocaleString() || '0'}</p>
          </div>
        </div>
      )}

      <div className="deadlines-section" data-testid="deadlines-section">
        <h3>Closing Soon</h3>
        {deadlines.length === 0 ? (
          <p>No urgent deadlines</p>
        ) : (
          <ul>
            {deadlines.map(tender => (
              <li key={tender.id} data-testid={`deadline-${tender.id}`}>
                <strong>{tender.title}</strong> - {tender.agency}
                <br />
                <span>Closes in {tender.days_until_close} days</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

describe('Frontend Integration: Tender Lifecycle Components', () => {
  let queryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    jest.clearAllMocks();
  });

  const renderWithQueryClient = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('TenderList Component', () => {
    test('Displays list of tenders correctly', async () => {
      const mockTenders = [
        {
          id: 'tender-1',
          title: 'Security Services Contract',
          agency: 'Ministry of Defence',
          stage: 'new_opportunity',
          priority: 'high',
          estimated_value: 2500000,
          closing_date: '2024-02-15'
        },
        {
          id: 'tender-2',
          title: 'IT Support Services',
          agency: 'Infocomm Media Development Authority',
          stage: 'review',
          priority: 'medium',
          estimated_value: 1200000,
          closing_date: '2024-02-20'
        }
      ];

      mockLifecycleService.getTenderList.mockResolvedValue({
        success: true,
        data: mockTenders
      });

      const mockOnSelect = jest.fn();
      const mockOnFilter = jest.fn();

      renderWithQueryClient(
        <TenderList
          onTenderSelect={mockOnSelect}
          onStageFilter={mockOnFilter}
        />
      );

      // Should show loading initially
      expect(screen.getByText('Loading tenders...')).toBeInTheDocument();

      // Wait for tenders to load
      await waitFor(() => {
        expect(screen.getByText('Security Services Contract')).toBeInTheDocument();
        expect(screen.getByText('IT Support Services')).toBeInTheDocument();
      });

      // Check tender details are displayed
      expect(screen.getByText('Agency: Ministry of Defence')).toBeInTheDocument();
      expect(screen.getByText('Stage: new_opportunity')).toBeInTheDocument();
      expect(screen.getByText('Value: $2,500,000')).toBeInTheDocument();

      // Test tender selection
      const tenderCard = screen.getByTestId('tender-tender-1');
      await user.click(tenderCard);

      expect(mockOnSelect).toHaveBeenCalledWith(mockTenders[0]);
    });

    test('Filters tenders by stage', async () => {
      const mockTenders = [
        {
          id: 'tender-1',
          title: 'Review Stage Tender',
          agency: 'Test Agency',
          stage: 'review',
          priority: 'medium'
        }
      ];

      mockLifecycleService.getTenderList.mockResolvedValue({
        success: true,
        data: mockTenders
      });

      const mockOnFilter = jest.fn();

      renderWithQueryClient(
        <TenderList onTenderSelect={jest.fn()} onStageFilter={mockOnFilter} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('stage-filter')).toBeInTheDocument();
      });

      // Change filter to review stage
      const stageFilter = screen.getByTestId('stage-filter');
      await user.selectOptions(stageFilter, 'review');

      expect(mockOnFilter).toHaveBeenCalledWith('review');
      expect(mockLifecycleService.getTenderList).toHaveBeenCalledWith({
        stage: 'review'
      });
    });

    test('Shows empty state when no tenders', async () => {
      mockLifecycleService.getTenderList.mockResolvedValue({
        success: true,
        data: []
      });

      renderWithQueryClient(
        <TenderList onTenderSelect={jest.fn()} onStageFilter={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('No tenders found')).toBeInTheDocument();
      });
    });
  });

  describe('TenderDetail Component', () => {
    const mockTender = {
      id: 'tender-1',
      title: 'Test Tender',
      agency: 'Test Agency',
      stage: 'review',
      priority: 'high',
      description: 'Test description',
      estimated_value: 1500000,
      closing_date: '2024-02-15'
    };

    test('Displays tender details correctly', () => {
      renderWithQueryClient(
        <TenderDetail tender={mockTender} onUpdate={jest.fn()} />
      );

      expect(screen.getByText('Test Tender')).toBeInTheDocument();
      expect(screen.getByText('Agency: Test Agency')).toBeInTheDocument();
      expect(screen.getByText('Stage: review')).toBeInTheDocument();
      expect(screen.getByText('Value: $1,500,000')).toBeInTheDocument();
    });

    test('Enables editing mode when edit button clicked', async () => {
      renderWithQueryClient(
        <TenderDetail tender={mockTender} onUpdate={jest.fn()} />
      );

      // Click edit button
      const editButton = screen.getByTestId('edit-button');
      await user.click(editButton);

      // Should show form inputs
      expect(screen.getByTestId('title-input')).toBeInTheDocument();
      expect(screen.getByTestId('description-input')).toBeInTheDocument();
      expect(screen.getByTestId('value-input')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();

      // Edit button should show "Cancel"
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('Updates tender when form is saved', async () => {
      const mockOnUpdate = jest.fn();
      const updatedTender = { ...mockTender, title: 'Updated Tender' };

      mockLifecycleService.updateTender.mockResolvedValue({
        success: true,
        data: updatedTender
      });

      renderWithQueryClient(
        <TenderDetail tender={mockTender} onUpdate={mockOnUpdate} />
      );

      // Enter edit mode
      await user.click(screen.getByTestId('edit-button'));

      // Update title
      const titleInput = screen.getByTestId('title-input');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Tender');

      // Save changes
      await user.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockLifecycleService.updateTender).toHaveBeenCalledWith(
          'tender-1',
          expect.objectContaining({
            title: 'Updated Tender'
          })
        );
        expect(mockOnUpdate).toHaveBeenCalledWith(updatedTender);
      });
    });

    test('Moves tender to review stage', async () => {
      const newOpportunityTender = { ...mockTender, stage: 'new_opportunity' };
      const mockOnUpdate = jest.fn();

      mockLifecycleService.moveTenderStage.mockResolvedValue({
        success: true,
        data: { ...newOpportunityTender, stage: 'review' }
      });

      renderWithQueryClient(
        <TenderDetail tender={newOpportunityTender} onUpdate={mockOnUpdate} />
      );

      // Click move to review
      const moveButton = screen.getByTestId('move-to-review');
      await user.click(moveButton);

      await waitFor(() => {
        expect(mockLifecycleService.moveTenderStage).toHaveBeenCalledWith(
          'tender-1',
          {
            new_stage: 'review',
            user_id: 'test-user'
          }
        );
      });
    });

    test('Records go/no-go decisions', async () => {
      const reviewTender = { ...mockTender, stage: 'review' };
      const mockOnUpdate = jest.fn();

      mockLifecycleService.recordDecision.mockResolvedValue({
        success: true,
        data: {
          ...reviewTender,
          decision: 'go',
          decision_reasoning: 'go decision made via UI',
          decision_made_by: 'test-user'
        }
      });

      renderWithQueryClient(
        <TenderDetail tender={reviewTender} onUpdate={mockOnUpdate} />
      );

      // Click go decision
      const goButton = screen.getByTestId('go-decision');
      await user.click(goButton);

      await waitFor(() => {
        expect(mockLifecycleService.recordDecision).toHaveBeenCalledWith(
          'tender-1',
          {
            decision: 'go',
            decision_reasoning: 'go decision made via UI',
            user_id: 'test-user'
          }
        );
      });
    });

    test('Shows decision information when present', () => {
      const decidedTender = {
        ...mockTender,
        decision: 'go',
        decision_reasoning: 'Strong market position',
        decision_made_by: 'bid.manager@worklink.sg'
      };

      renderWithQueryClient(
        <TenderDetail tender={decidedTender} onUpdate={jest.fn()} />
      );

      expect(screen.getByText('Decision: go')).toBeInTheDocument();
      expect(screen.getByText('Reasoning: Strong market position')).toBeInTheDocument();
      expect(screen.getByText('Made By: bid.manager@worklink.sg')).toBeInTheDocument();
    });

    test('Shows empty state when no tender selected', () => {
      renderWithQueryClient(
        <TenderDetail tender={null} onUpdate={jest.fn()} />
      );

      expect(screen.getByText('Select a tender to view details')).toBeInTheDocument();
    });
  });

  describe('Dashboard Component', () => {
    test('Displays pipeline statistics', async () => {
      const mockStats = {
        total_tenders: 25,
        new_opportunity: 8,
        review: 5,
        bidding: 3,
        submitted: 2,
        won: 4,
        lost: 3,
        win_rate: 57,
        total_pipeline_value: 15500000
      };

      const mockDeadlines = [
        {
          id: 'deadline-1',
          title: 'Urgent Security Contract',
          agency: 'Ministry of Defence',
          days_until_close: 1
        },
        {
          id: 'deadline-2',
          title: 'IT Maintenance Services',
          agency: 'GovTech',
          days_until_close: 3
        }
      ];

      mockLifecycleService.getStats.mockResolvedValue({
        success: true,
        data: mockStats
      });

      mockLifecycleService.getDeadlines.mockResolvedValue({
        success: true,
        data: mockDeadlines
      });

      renderWithQueryClient(<Dashboard />);

      await waitFor(() => {
        // Check stats display
        expect(screen.getByText('25')).toBeInTheDocument(); // total tenders
        expect(screen.getByText('16')).toBeInTheDocument(); // active pipeline (8+5+3)
        expect(screen.getByText('57%')).toBeInTheDocument(); // win rate
        expect(screen.getByText('$15,500,000')).toBeInTheDocument(); // pipeline value
      });

      // Check deadlines display
      expect(screen.getByText('Urgent Security Contract')).toBeInTheDocument();
      expect(screen.getByText('Closes in 1 days')).toBeInTheDocument();
      expect(screen.getByText('IT Maintenance Services')).toBeInTheDocument();
      expect(screen.getByText('Closes in 3 days')).toBeInTheDocument();
    });

    test('Shows empty state for deadlines when none exist', async () => {
      mockLifecycleService.getStats.mockResolvedValue({
        success: true,
        data: {
          total_tenders: 10,
          win_rate: 50,
          total_pipeline_value: 5000000
        }
      });

      mockLifecycleService.getDeadlines.mockResolvedValue({
        success: true,
        data: []
      });

      renderWithQueryClient(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('No urgent deadlines')).toBeInTheDocument();
      });
    });

    test('Handles API errors gracefully', async () => {
      mockLifecycleService.getStats.mockRejectedValue(
        new Error('API Error')
      );

      mockLifecycleService.getDeadlines.mockRejectedValue(
        new Error('API Error')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderWithQueryClient(<Dashboard />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching dashboard data:',
          expect.any(Error)
        );
      });

      // Component should still render title even with errors
      expect(screen.getByText('BPO Tender Pipeline Dashboard')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Component Integration', () => {
    test('TenderList and TenderDetail work together', async () => {
      const mockTenders = [
        {
          id: 'tender-1',
          title: 'Integration Test Tender',
          agency: 'Test Agency',
          stage: 'new_opportunity',
          priority: 'high'
        }
      ];

      mockLifecycleService.getTenderList.mockResolvedValue({
        success: true,
        data: mockTenders
      });

      const TestApp = () => {
        const [selectedTender, setSelectedTender] = React.useState(null);
        const [tenders, setTenders] = React.useState(mockTenders);

        const handleUpdate = (updatedTender) => {
          setTenders(prev =>
            prev.map(t => t.id === updatedTender.id ? updatedTender : t)
          );
          setSelectedTender(updatedTender);
        };

        return (
          <div style={{ display: 'flex' }}>
            <div style={{ width: '50%' }}>
              <TenderList
                onTenderSelect={setSelectedTender}
                onStageFilter={() => {}}
              />
            </div>
            <div style={{ width: '50%' }}>
              <TenderDetail
                tender={selectedTender}
                onUpdate={handleUpdate}
              />
            </div>
          </div>
        );
      };

      renderWithQueryClient(<TestApp />);

      // Wait for tender to load
      await waitFor(() => {
        expect(screen.getByText('Integration Test Tender')).toBeInTheDocument();
      });

      // Click on tender to select it
      const tenderCard = screen.getByTestId('tender-tender-1');
      await user.click(tenderCard);

      // Should show tender details
      await waitFor(() => {
        expect(screen.getByText('Agency: Test Agency')).toBeInTheDocument();
        expect(screen.getByText('Stage: new_opportunity')).toBeInTheDocument();
      });
    });
  });
});