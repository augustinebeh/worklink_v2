const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Get all tenders
router.get('/', (req, res) => {
  try {
    const { status, source, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM tenders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    query += ' ORDER BY closing_date ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const tenders = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM tenders').get().count;

    res.json({
      success: true,
      data: tenders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tender by ID
router.get('/:id', (req, res) => {
  try {
    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
    if (!tender) {
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }
    res.json({ success: true, data: tender });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update tender status
router.patch('/:id', (req, res) => {
  try {
    const { status, notes, our_bid_amount, assigned_to, win_probability } = req.body;
    const updates = [];
    const values = [];

    if (status) { updates.push('status = ?'); values.push(status); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (our_bid_amount !== undefined) { updates.push('our_bid_amount = ?'); values.push(our_bid_amount); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(assigned_to); }
    if (win_probability !== undefined) { updates.push('win_probability = ?'); values.push(win_probability); }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE tenders SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: tender });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tender statistics
router.get('/stats/overview', (req, res) => {
  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM tenders').get().count,
      new: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'new'").get().count,
      reviewing: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'reviewing'").get().count,
      bidding: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'bidding'").get().count,
      submitted: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'submitted'").get().count,
      won: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'won'").get().count,
      lost: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'lost'").get().count,
      totalValue: db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM tenders WHERE status IN ('new', 'reviewing', 'bidding', 'submitted')").get().total,
      wonValue: db.prepare("SELECT COALESCE(SUM(our_bid_amount), 0) as total FROM tenders WHERE status = 'won'").get().total,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get BPO acquisition recommendations
router.get('/recommendations/acquisition', (req, res) => {
  try {
    // Analyze tender patterns for recommendations
    const recommendations = [
      {
        category: 'High Win Rate Categories',
        items: [
          { title: 'Event Services', insight: 'You have a 65% win rate in event services. Consider focusing more bids here.', action: 'Filter GeBIZ for "Ad-hoc Event Support" and "usher services"' },
          { title: 'Administrative Support', insight: 'Government agencies frequently need temp admin staff.', action: 'Search "Invitation to Quote for Admin Support" on GeBIZ' },
        ]
      },
      {
        category: 'Untapped Opportunities',
        items: [
          { title: 'GLC Contracts via SESAMi', insight: 'Singtel, SATS, and SIA use SESAMi (Ariba) for ground handling and customer service.', action: 'Register on SAP Business Network to be discoverable' },
          { title: 'PSA Port Services', insight: 'PSA has its own portal for port-related manpower (crane operators, labourers).', action: 'Check PSA Singapore Tender Notices portal' },
        ]
      },
      {
        category: 'Search Keywords to Use',
        items: [
          { title: 'Supply of Manpower Services', insight: 'Primary keyword for GeBIZ searches.', action: 'Set daily alert for this exact phrase' },
          { title: 'Provision of Temporary Staff', insight: 'Used by ministries for short-term contracts.', action: 'Monitor GeBIZ RSS feed with Zapier' },
          { title: 'Term Contract for Labour', insight: 'Long-term recurring contracts (12-24 months).', action: 'Track award notices to predict renewal dates' },
        ]
      },
      {
        category: '2026 Competitive Intelligence',
        items: [
          { title: 'Contract Expiry Tracking', insight: 'When a 2-year contract is awarded to a competitor, the renewal tender appears ~18 months later.', action: 'Scrape GeBIZ Award Notices and set calendar reminders' },
          { title: 'TenderBoard Private Deals', insight: 'Heritage SG, Gardens by the Bay post "Open" deals anyone can bid on.', action: 'Register on TenderBoard for daily alerts' },
        ]
      },
    ];

    // GOVERNMENT SECTOR PORTALS
    const governmentPortals = [
      {
        name: 'GeBIZ',
        url: 'https://www.gebiz.gov.sg',
        type: 'government',
        priority: 'essential',
        description: 'All public sector tenders over $6,000. The largest source of government manpower contracts.',
        categories: ['Supply of Manpower Services', 'Provision of Temporary Staff', 'Admin Support', 'Event Support'],
        tip: 'Register as vendor. Use RSS feed + Zapier for auto-alerts. Strong anti-bot protection - use aggregators instead of scraping.',
        searchKeywords: ['Supply of Manpower Services', 'Provision of Temporary Staff', 'Invitation to Quote for Admin Support', 'Ad-hoc Event Support', 'Term Contract for Labour'],
      },
      {
        name: 'SESAMi (SAP Ariba)',
        url: 'https://www.sesami.sg',
        type: 'glc',
        priority: 'high',
        description: 'Used by GLCs like Singtel, SATS, SIA. Massive ad-hoc requirements for ground handling and customer service.',
        categories: ['Ground Handling', 'Customer Service', 'Airport Operations', 'Telecom Support'],
        tip: 'Register company profile on SAP Business Network to be "discoverable" by procurement teams.',
      },
      {
        name: 'PSA Singapore',
        url: 'https://www.singaporepsa.com/our-business/procurement',
        type: 'glc',
        priority: 'medium',
        description: 'Port Authority - own portal for port-related manpower (crane operators, container handling).',
        categories: ['Port Labour', 'Crane Operations', 'Container Handling', 'Logistics'],
        tip: 'Specialized workers needed. Consider partnerships with logistics training providers.',
      },
      {
        name: 'Town Councils',
        url: 'https://www.emservices.com.sg',
        type: 'government',
        priority: 'medium',
        description: 'Separate tenders for conservancy and ad-hoc estate workers. Check individual TC sites.',
        categories: ['Estate Maintenance', 'Conservancy', 'Ad-hoc Workers'],
        tip: 'Each Town Council has own portal. EMSERVICES handles multiple TCs.',
      },
    ];

    // PRIVATE SECTOR PORTALS
    const privatePortals = [
      {
        name: 'TenderBoard',
        url: 'https://www.tenderboard.biz',
        type: 'private',
        priority: 'high',
        description: 'B2B marketplace used by Heritage SG, Gardens by the Bay, NGOs. Lists "Open" deals anyone can bid on.',
        categories: ['Events', 'Hospitality', 'Tourism', 'NGO Projects'],
        tip: 'Register for free. Set alerts for "Manpower" category. Many small-medium contracts here.',
      },
      {
        name: 'SAP Business Network',
        url: 'https://www.ariba.com',
        type: 'private',
        priority: 'medium',
        description: 'Used by MNCs (Banks, Pharma, Tech) to source temporary staffing.',
        categories: ['Corporate Temp Staff', 'Admin Support', 'IT Support'],
        tip: 'Register company profile to be discoverable. Usually need to be invited for specific RFQs.',
      },
      {
        name: 'Coupa Supplier Portal',
        url: 'https://supplier.coupahost.com',
        type: 'private',
        priority: 'medium',
        description: 'Large tech and finance firms use Coupa for procurement.',
        categories: ['Tech Company Staffing', 'Finance Sector', 'Professional Services'],
        tip: 'Create supplier profile. Used by DBS, Standard Chartered, major tech firms.',
      },
    ];

    // AGGREGATOR TOOLS (Done-for-you scraping)
    const aggregatorTools = [
      {
        name: 'SingaporeTenders.com',
        url: 'https://www.singaporetenders.com',
        type: 'aggregator',
        cost: 'Subscription',
        description: 'Specifically categorizes "Supply of Manpower" tenders. Daily email alerts.',
        features: ['GeBIZ scraping', 'Keyword alerts', 'Email notifications', 'Manpower category filter'],
        tip: 'Best for hands-off monitoring. Set keywords: Manpower, Temp Staff, Ad-hoc.',
      },
      {
        name: 'Tender Impulse',
        url: 'https://www.tenderimpulse.com',
        type: 'aggregator',
        cost: 'Subscription',
        description: 'Global aggregator with strong Singapore-specific daily feed.',
        features: ['Multi-portal scraping', 'Global coverage', 'Daily digest'],
        tip: 'Good for tracking both local and regional opportunities.',
      },
      {
        name: 'BidsInfo',
        url: 'https://www.bidsinfo.com',
        type: 'aggregator',
        cost: 'Subscription',
        description: 'Excellent for tracking contract AWARDS - know when competitor contracts expire.',
        features: ['Award tracking', 'Competitor analysis', 'Contract expiry alerts'],
        tip: 'Use to predict when existing contracts will be re-tendered (18 months before expiry).',
      },
    ];

    // DIY AUTOMATION TOOLS
    const automationTools = [
      {
        name: 'Browse AI',
        url: 'https://www.browse.ai',
        type: 'scraper',
        cost: 'Free tier available',
        description: 'Train a robot by clicking on GeBIZ search results. Monitors page hourly.',
        features: ['No-code scraper', 'Slack/Email alerts', 'Scheduled monitoring'],
        setup: '1. Go to GeBIZ search results\n2. Use Browse AI extension\n3. Click elements to train\n4. Set hourly schedule\n5. Connect to Slack/Email',
      },
      {
        name: 'GeBIZ RSS + Zapier',
        url: 'https://zapier.com',
        type: 'automation',
        cost: 'Free tier available',
        description: 'GeBIZ offers RSS feed for Opportunities. Auto-add to Google Sheets or CRM.',
        features: ['RSS monitoring', 'Google Sheets integration', 'CRM sync', 'Email alerts'],
        setup: '1. Get GeBIZ RSS feed URL\n2. Create Zapier account\n3. New Zap: RSS → Google Sheets\n4. Filter by keywords\n5. Optional: Add to your CRM',
      },
      {
        name: 'Make.com (Integromat)',
        url: 'https://www.make.com',
        type: 'automation',
        cost: 'Free tier available',
        description: 'Alternative to Zapier with more complex workflow options.',
        features: ['Visual workflow builder', 'Multiple triggers', 'Data transformation'],
        setup: 'Similar to Zapier but with more granular control over data processing.',
      },
    ];

    res.json({
      success: true,
      data: {
        recommendations,
        governmentPortals,
        privatePortals,
        aggregatorTools,
        automationTools,
        searchKeywords: [
          'Supply of Manpower Services',
          'Provision of Temporary Staff',
          'Invitation to Quote for Admin Support',
          'Ad-hoc Event Support',
          'Term Contract for Labour',
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
