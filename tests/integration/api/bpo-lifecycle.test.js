/**
 * 🧪 API INTEGRATION TEST: BPO Lifecycle API
 * Tests all BPO lifecycle endpoints and workflows
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Import routes
const bpoLifecycleRouter = require('../../../routes/api/v1/bpo/lifecycle');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/bpo/lifecycle', bpoLifecycleRouter);
  return app;
};

describe('API Integration: BPO Lifecycle Management', () => {
  let app;
  let testDB;

  beforeAll(() => {
    app = createTestApp();
    testDB = global.TestDB.createTestDB();
  });

  afterAll(() => {
    if (testDB) testDB.close();
  });

  beforeEach(() => {
    global.TestDB.cleanTestDB();
    global.TestDB.seedTestData();
  });

  describe('GET /api/v1/bpo/lifecycle', () => {
    test('Returns list of tenders with default pagination', async () => {
      const response = await request(app)
        .get('/api/v1/bpo/lifecycle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.limit).toBe(100);
      expect(response.body.meta.offset).toBe(0);
    });

    test('Supports filtering by stage', async () => {
      // Create tenders in different stages
      const stages = ['new_opportunity', 'review', 'bidding'];

      for (const stage of stages) {
        await request(app)
          .post('/api/v1/bpo/lifecycle')
          .send({
            title: `Test Tender - ${stage}`,
            agency: 'Test Agency',
            stage: stage
          });
      }

      // Filter by specific stage
      const response = await request(app)
        .get('/api/v1/bpo/lifecycle?stage=review')
        .expect(200);

      expect(response.body.data.every(t => t.stage === 'review')).toBe(true);
    });

    test('Supports filtering by priority', async () => {
      // Create tenders with different priorities
      const priorities = ['low', 'medium', 'high', 'critical'];

      for (const priority of priorities) {
        await request(app)
          .post('/api/v1/bpo/lifecycle')
          .send({
            title: `Test Tender - ${priority}`,
            agency: 'Test Agency',
            priority: priority
          });
      }

      const response = await request(app)
        .get('/api/v1/bpo/lifecycle?priority=high')
        .expect(200);

      expect(response.body.data.every(t => t.priority === 'high')).toBe(true);
    });

    test('Supports filtering by urgency', async () => {
      // Create urgent tender
      await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Urgent Security Services',
          agency: 'Ministry of Defence',
          is_urgent: true
        });

      const response = await request(app)
        .get('/api/v1/bpo/lifecycle?is_urgent=true')
        .expect(200);

      expect(response.body.data.every(t => t.is_urgent === 1)).toBe(true);
    });

    test('Supports pagination', async () => {
      // Create multiple tenders
      for (let i = 1; i <= 15; i++) {
        await request(app)
          .post('/api/v1/bpo/lifecycle')
          .send({
            title: `Pagination Test Tender ${i}`,
            agency: 'Test Agency'
          });
      }

      // Test pagination
      const page1 = await request(app)
        .get('/api/v1/bpo/lifecycle?limit=10&offset=0')
        .expect(200);

      const page2 = await request(app)
        .get('/api/v1/bpo/lifecycle?limit=10&offset=10')
        .expect(200);

      expect(page1.body.data.length).toBe(10);
      expect(page2.body.data.length).toBeGreaterThan(0);

      // Ensure no duplicates between pages
      const page1Ids = page1.body.data.map(t => t.id);
      const page2Ids = page2.body.data.map(t => t.id);
      const duplicates = page1Ids.filter(id => page2Ids.includes(id));
      expect(duplicates.length).toBe(0);
    });
  });

  describe('GET /api/v1/bpo/lifecycle/:id', () => {
    test('Returns single tender with full details', async () => {
      const createResponse = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Detailed Tender Test',
          agency: 'Ministry of Education',
          description: 'Complete tender for testing details',
          estimated_value: 1500000,
          is_renewal: true
        });

      const tenderId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/bpo/lifecycle/${tenderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(tenderId);
      expect(response.body.data.title).toBe('Detailed Tender Test');
      expect(response.body.data.estimated_value).toBe(1500000);
    });

    test('Returns 404 for non-existent tender', async () => {
      const response = await request(app)
        .get('/api/v1/bpo/lifecycle/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tender not found');
    });

    test('Includes renewal details for renewal tenders', async () => {
      // Create renewal record
      const renewalId = uuidv4();
      testDB.prepare(`
        INSERT INTO contract_renewals (
          id, agency, contract_reference, renewal_probability
        ) VALUES (?, ?, ?, ?)
      `).run(renewalId, 'Test Agency', 'TEST/2023/001', 80);

      // Create tender linked to renewal
      const createResponse = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Renewal Tender',
          agency: 'Test Agency',
          is_renewal: true,
          renewal_id: renewalId
        });

      const tenderId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/v1/bpo/lifecycle/${tenderId}`)
        .expect(200);

      expect(response.body.data.renewal_details).toBeTruthy();
      expect(response.body.data.renewal_details.id).toBe(renewalId);
    });
  });

  describe('POST /api/v1/bpo/lifecycle', () => {
    test('Creates new tender with minimal required fields', async () => {
      const tenderData = {
        title: 'Minimal Tender',
        agency: 'Public Utilities Board'
      };

      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send(tenderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(tenderData.title);
      expect(response.body.data.agency).toBe(tenderData.agency);
      expect(response.body.data.stage).toBe('new_opportunity'); // Default
      expect(response.body.data.priority).toBe('medium'); // Default
      expect(response.body.data.id).toBeTruthy();
    });

    test('Creates tender with all optional fields', async () => {
      const tenderData = {
        source_type: 'gebiz_rss',
        source_id: 'RSS-123',
        tender_no: 'PUB/2024/WATER/001',
        title: 'Water Treatment Plant Upgrade',
        agency: 'Public Utilities Board',
        description: 'Comprehensive upgrade of water treatment facilities',
        category: 'Infrastructure',
        published_date: '2024-01-15',
        closing_date: '2024-02-15',
        contract_start_date: '2024-03-01',
        contract_end_date: '2025-03-01',
        estimated_value: 5000000,
        stage: 'review',
        priority: 'high',
        is_urgent: true,
        is_renewal: false,
        external_url: 'https://gebiz.gov.sg/tender/123',
        assigned_to: 'bid.manager@worklink.sg'
      };

      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send(tenderData)
        .expect(201);

      expect(response.body.success).toBe(true);

      const created = response.body.data;
      expect(created.source_type).toBe(tenderData.source_type);
      expect(created.tender_no).toBe(tenderData.tender_no);
      expect(created.estimated_value).toBe(tenderData.estimated_value);
      expect(created.is_urgent).toBe(1);
      expect(created.assigned_to).toBe(tenderData.assigned_to);
    });

    test('Validates required fields', async () => {
      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: '', // Empty title
          agency: 'Test Agency'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    test('Handles missing agency field', async () => {
      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Valid Title'
          // Missing agency
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('agency');
    });
  });

  describe('PATCH /api/v1/bpo/lifecycle/:id', () => {
    let testTenderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Updatable Tender',
          agency: 'Test Agency',
          estimated_value: 1000000
        });
      testTenderId = response.body.data.id;
    });

    test('Updates basic tender fields', async () => {
      const updateData = {
        title: 'Updated Tender Title',
        description: 'Updated description',
        estimated_value: 1500000,
        priority: 'high'
      };

      const response = await request(app)
        .patch(`/api/v1/bpo/lifecycle/${testTenderId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.estimated_value).toBe(updateData.estimated_value);
      expect(response.body.data.priority).toBe(updateData.priority);
    });

    test('Updates qualification details', async () => {
      const qualificationData = {
        qualification_score: 88,
        qualification_details: {
          technical_capability: 85,
          financial_stability: 90,
          past_performance: 88,
          team_experience: 85,
          pricing_competitiveness: 90
        }
      };

      const response = await request(app)
        .patch(`/api/v1/bpo/lifecycle/${testTenderId}`)
        .send(qualificationData)
        .expect(200);

      expect(response.body.data.qualification_score).toBe(88);
      expect(response.body.data.qualification_details).toEqual(qualificationData.qualification_details);
    });

    test('Updates assigned team', async () => {
      const teamData = {
        assigned_to: 'senior.manager@worklink.sg',
        assigned_team: [
          'bid.manager@worklink.sg',
          'technical.lead@worklink.sg',
          'financial.analyst@worklink.sg'
        ]
      };

      const response = await request(app)
        .patch(`/api/v1/bpo/lifecycle/${testTenderId}`)
        .send(teamData)
        .expect(200);

      expect(response.body.data.assigned_to).toBe(teamData.assigned_to);
      expect(response.body.data.assigned_team).toEqual(teamData.assigned_team);
    });

    test('Ignores invalid fields', async () => {
      const response = await request(app)
        .patch(`/api/v1/bpo/lifecycle/${testTenderId}`)
        .send({
          title: 'Valid Update',
          invalid_field: 'Should be ignored',
          id: 'cannot-change-id'
        })
        .expect(200);

      expect(response.body.data.title).toBe('Valid Update');
      expect(response.body.data.invalid_field).toBeUndefined();
      expect(response.body.data.id).toBe(testTenderId); // ID unchanged
    });

    test('Returns 404 for non-existent tender', async () => {
      const response = await request(app)
        .patch('/api/v1/bpo/lifecycle/non-existent')
        .send({ title: 'Update' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/bpo/lifecycle/:id/move', () => {
    let testTenderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Movable Tender',
          agency: 'Test Agency',
          stage: 'new_opportunity'
        });
      testTenderId = response.body.data.id;
    });

    test('Moves tender through valid stages', async () => {
      const stages = ['review', 'bidding', 'internal_approval', 'submitted'];

      for (const stage of stages) {
        const response = await request(app)
          .post(`/api/v1/bpo/lifecycle/${testTenderId}/move`)
          .send({
            new_stage: stage,
            user_id: global.TEST_CONFIG.TEST_USER_ID
          })
          .expect(200);

        expect(response.body.data.stage).toBe(stage);
        expect(response.body.data.stage_updated_at).toBeTruthy();
      }
    });

    test('Validates stage names', async () => {
      const response = await request(app)
        .post(`/api/v1/bpo/lifecycle/${testTenderId}/move`)
        .send({
          new_stage: 'invalid_stage',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid stage');
    });

    test('Creates audit log entry', async () => {
      await request(app)
        .post(`/api/v1/bpo/lifecycle/${testTenderId}/move`)
        .send({
          new_stage: 'review',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        })
        .expect(200);

      // Check audit log
      const auditEntry = testDB.prepare(`
        SELECT * FROM audit_log
        WHERE event_type = 'stage_changed'
          AND resource_id = ?
      `).get(testTenderId);

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.user_id).toBe(global.TEST_CONFIG.TEST_USER_ID);
      expect(JSON.parse(auditEntry.new_value).new_stage).toBe('review');
    });

    test('Requires new_stage parameter', async () => {
      const response = await request(app)
        .post(`/api/v1/bpo/lifecycle/${testTenderId}/move`)
        .send({
          user_id: global.TEST_CONFIG.TEST_USER_ID
        })
        .expect(400);

      expect(response.body.error).toContain('new_stage required');
    });
  });

  describe('POST /api/v1/bpo/lifecycle/:id/decision', () => {
    let testTenderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Decision Tender',
          agency: 'Test Agency',
          stage: 'review'
        });
      testTenderId = response.body.data.id;
    });

    test('Records go decision', async () => {
      const decisionData = {
        decision: 'go',
        decision_reasoning: 'Strong market position and competitive advantage',
        qualification_score: 85,
        qualification_details: {
          technical: 90,
          financial: 80,
          experience: 85
        },
        user_id: global.TEST_CONFIG.TEST_USER_ID
      };

      const response = await request(app)
        .post(`/api/v1/bpo/lifecycle/${testTenderId}/decision`)
        .send(decisionData)
        .expect(200);

      expect(response.body.data.decision).toBe('go');
      expect(response.body.data.decision_reasoning).toBe(decisionData.decision_reasoning);
      expect(response.body.data.qualification_score).toBe(85);
      expect(response.body.data.decision_made_by).toBe(global.TEST_CONFIG.TEST_USER_ID);
      expect(response.body.data.decision_made_at).toBeTruthy();
    });

    test('Records no-go decision and moves to lost', async () => {
      const decisionData = {
        decision: 'no-go',
        decision_reasoning: 'Low margin opportunity, outside core competency',
        user_id: global.TEST_CONFIG.TEST_USER_ID
      };

      const response = await request(app)
        .post(`/api/v1/bpo/lifecycle/${testTenderId}/decision`)
        .send(decisionData)
        .expect(200);

      expect(response.body.data.decision).toBe('no-go');
      expect(response.body.data.stage).toBe('lost');
      expect(response.body.data.outcome).toBe('lost');
      expect(response.body.data.loss_reason).toBe(decisionData.decision_reasoning);
    });

    test('Records maybe decision', async () => {
      const decisionData = {
        decision: 'maybe',
        decision_reasoning: 'Need more information before final decision',
        user_id: global.TEST_CONFIG.TEST_USER_ID
      };

      const response = await request(app)
        .post(`/api/v1/bpo/lifecycle/${testTenderId}/decision`)
        .send(decisionData)
        .expect(200);

      expect(response.body.data.decision).toBe('maybe');
      expect(response.body.data.stage).toBe('review'); // Stage unchanged for maybe
    });

    test('Requires decision parameter', async () => {
      const response = await request(app)
        .post(`/api/v1/bpo/lifecycle/${testTenderId}/decision`)
        .send({
          decision_reasoning: 'Missing decision',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        })
        .expect(400);

      expect(response.body.error).toContain('decision required');
    });
  });

  describe('GET /api/v1/bpo/lifecycle/dashboard/stats', () => {
    beforeEach(async () => {
      // Create tenders in various stages for stats testing
      const testTenders = [
        { stage: 'new_opportunity', priority: 'high', estimated_value: 2000000 },
        { stage: 'review', priority: 'medium', estimated_value: 1000000 },
        { stage: 'bidding', priority: 'high', estimated_value: 3000000 },
        { stage: 'submitted', priority: 'critical', estimated_value: 5000000 },
        { stage: 'awarded', outcome: 'won', estimated_value: 2500000, actual_contract_value: 2400000 },
        { stage: 'lost', outcome: 'lost', estimated_value: 1500000 }
      ];

      for (const tender of testTenders) {
        await request(app)
          .post('/api/v1/bpo/lifecycle')
          .send({
            title: `Stats Test - ${tender.stage}`,
            agency: 'Test Agency',
            ...tender
          });
      }
    });

    test('Returns comprehensive pipeline statistics', async () => {
      const response = await request(app)
        .get('/api/v1/bpo/lifecycle/dashboard/stats')
        .expect(200);

      const stats = response.body.data;

      expect(stats.total_tenders).toBeGreaterThan(0);
      expect(stats.new_opportunity).toBeGreaterThan(0);
      expect(stats.review).toBeGreaterThan(0);
      expect(stats.bidding).toBeGreaterThan(0);
      expect(stats.submitted).toBeGreaterThan(0);
      expect(stats.won).toBe(1);
      expect(stats.lost).toBe(1);
      expect(stats.total_pipeline_value).toBeGreaterThan(0);
      expect(stats.total_won_value).toBe(2400000);
    });

    test('Calculates win rate correctly', async () => {
      const response = await request(app)
        .get('/api/v1/bpo/lifecycle/dashboard/stats')
        .expect(200);

      const stats = response.body.data;

      // With 1 won and 1 lost, win rate should be 50%
      expect(stats.win_rate).toBe(50);
    });
  });

  describe('GET /api/v1/bpo/lifecycle/dashboard/deadlines', () => {
    test('Returns tenders closing soon', async () => {
      // Create tender closing in 3 days
      await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Deadline Test Tender',
          agency: 'Test Agency',
          closing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          stage: 'bidding'
        });

      const response = await request(app)
        .get('/api/v1/bpo/lifecycle/dashboard/deadlines?days=7')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const deadlineTender = response.body.data.find(t => t.title === 'Deadline Test Tender');
      expect(deadlineTender).toBeTruthy();
      expect(deadlineTender.days_until_close).toBe(3);
    });

    test('Excludes completed tenders from deadlines', async () => {
      // Create completed tender
      await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Completed Tender',
          agency: 'Test Agency',
          closing_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          stage: 'submitted'
        });

      const response = await request(app)
        .get('/api/v1/bpo/lifecycle/dashboard/deadlines')
        .expect(200);

      const completedTender = response.body.data.find(t => t.title === 'Completed Tender');
      expect(completedTender).toBeFalsy();
    });
  });

  describe('DELETE /api/v1/bpo/lifecycle/:id', () => {
    let testTenderId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/bpo/lifecycle')
        .send({
          title: 'Deletable Tender',
          agency: 'Test Agency'
        });
      testTenderId = response.body.data.id;
    });

    test('Successfully deletes tender', async () => {
      const response = await request(app)
        .delete(`/api/v1/bpo/lifecycle/${testTenderId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify tender is deleted
      await request(app)
        .get(`/api/v1/bpo/lifecycle/${testTenderId}`)
        .expect(404);
    });

    test('Returns 404 for non-existent tender', async () => {
      const response = await request(app)
        .delete('/api/v1/bpo/lifecycle/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});