const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Comprehensive financial dashboard
router.get('/financial/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);

    // ===== CURRENT EARNINGS (Completed deployments) =====
    const currentEarnings = db.prepare(`
      SELECT 
        COALESCE(SUM(gross_revenue), 0) as total_revenue,
        COALESCE(SUM(candidate_pay), 0) as total_candidate_pay,
        COALESCE(SUM(gross_profit), 0) as total_gross_profit,
        COALESCE(SUM(incentive_amount), 0) as total_incentives,
        COUNT(*) as total_deployments,
        COALESCE(SUM(hours_worked), 0) as total_hours
      FROM deployments 
      WHERE status = 'completed'
    `).get();

    // Net profit after incentives
    currentEarnings.net_profit = currentEarnings.total_gross_profit - currentEarnings.total_incentives;
    currentEarnings.avg_margin_percent = currentEarnings.total_revenue > 0 
      ? ((currentEarnings.total_gross_profit / currentEarnings.total_revenue) * 100).toFixed(1)
      : 0;

    // ===== THIS MONTH vs LAST MONTH =====
    const thisMonthEarnings = db.prepare(`
      SELECT 
        COALESCE(SUM(d.gross_revenue), 0) as revenue,
        COALESCE(SUM(d.gross_profit), 0) as profit,
        COALESCE(SUM(d.incentive_amount), 0) as incentives,
        COUNT(*) as deployments
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.status = 'completed' AND j.job_date LIKE ?
    `).get(thisMonth + '%');

    const lastMonthEarnings = db.prepare(`
      SELECT 
        COALESCE(SUM(d.gross_revenue), 0) as revenue,
        COALESCE(SUM(d.gross_profit), 0) as profit,
        COALESCE(SUM(d.incentive_amount), 0) as incentives,
        COUNT(*) as deployments
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.status = 'completed' AND j.job_date LIKE ?
    `).get(lastMonth + '%');

    // ===== PROJECTED EARNINGS (Upcoming confirmed jobs) =====
    const projectedEarnings = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.job_date,
        j.start_time,
        j.end_time,
        j.break_minutes,
        j.charge_rate,
        j.pay_rate,
        j.total_slots,
        j.filled_slots,
        c.company_name as client_name
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE j.status IN ('open', 'filled') AND j.job_date >= ?
      ORDER BY j.job_date ASC
    `).all(today);

    // Calculate projected earnings
    let projectedRevenue = 0;
    let projectedCosts = 0;
    let projectedProfit = 0;

    const upcomingJobs = projectedEarnings.map(job => {
      // Calculate hours (end - start - break)
      const start = job.start_time.split(':').map(Number);
      let end = job.end_time.split(':').map(Number);
      
      // Handle overnight shifts
      if (end[0] < start[0]) {
        end[0] += 24;
      }
      
      const hours = ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1]) - (job.break_minutes || 0)) / 60;
      
      const expectedSlots = job.filled_slots || Math.ceil(job.total_slots * 0.7); // Assume 70% fill rate
      const revenue = hours * job.charge_rate * expectedSlots;
      const costs = hours * job.pay_rate * expectedSlots;
      const profit = revenue - costs;
      const marginPercent = ((profit / revenue) * 100).toFixed(1);

      projectedRevenue += revenue;
      projectedCosts += costs;
      projectedProfit += profit;

      return {
        ...job,
        hours,
        expected_slots: expectedSlots,
        projected_revenue: revenue,
        projected_costs: costs,
        projected_profit: profit,
        margin_percent: marginPercent,
      };
    });

    // ===== MONTHLY TREND (Last 6 months) =====
    const monthlyTrend = db.prepare(`
      SELECT 
        strftime('%Y-%m', j.job_date) as month,
        SUM(d.gross_revenue) as revenue,
        SUM(d.candidate_pay) as costs,
        SUM(d.gross_profit) as gross_profit,
        SUM(d.incentive_amount) as incentives,
        SUM(d.gross_profit) - SUM(d.incentive_amount) as net_profit,
        COUNT(*) as deployments,
        SUM(d.hours_worked) as hours
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.status = 'completed'
      GROUP BY strftime('%Y-%m', j.job_date)
      ORDER BY month DESC
      LIMIT 6
    `).all().reverse();

    // ===== MARGIN ANALYSIS =====
    const marginByClient = db.prepare(`
      SELECT 
        c.company_name,
        c.id as client_id,
        SUM(d.gross_revenue) as total_revenue,
        SUM(d.gross_profit) as total_profit,
        AVG((d.gross_profit / d.gross_revenue) * 100) as avg_margin,
        COUNT(DISTINCT j.id) as jobs,
        COUNT(*) as deployments
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      WHERE d.status = 'completed'
      GROUP BY c.id
      ORDER BY total_revenue DESC
    `).all();

    // ===== INCENTIVE ANALYSIS =====
    const incentiveAnalysis = db.prepare(`
      SELECT 
        SUM(incentive_amount) as total_incentives,
        SUM(gross_profit) as total_gross_profit,
        (SUM(incentive_amount) / SUM(gross_profit) * 100) as incentive_percent_of_profit,
        COUNT(CASE WHEN incentive_amount > 0 THEN 1 END) as deployments_with_incentive,
        COUNT(*) as total_deployments
      FROM deployments 
      WHERE status = 'completed'
    `).get();

    // ===== CHARGE RATE vs PAY RATE ANALYSIS =====
    const rateAnalysis = db.prepare(`
      SELECT 
        j.charge_rate,
        j.pay_rate,
        (j.charge_rate - j.pay_rate) as spread,
        ((j.charge_rate - j.pay_rate) / j.charge_rate * 100) as margin_percent,
        j.title,
        c.company_name,
        COUNT(d.id) as deployment_count
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      LEFT JOIN deployments d ON j.id = d.job_id
      WHERE j.status = 'completed'
      GROUP BY j.id
      ORDER BY margin_percent DESC
    `).all();

    // Average rates
    const avgRates = db.prepare(`
      SELECT 
        AVG(charge_rate) as avg_charge_rate,
        AVG(pay_rate) as avg_pay_rate,
        AVG(charge_rate - pay_rate) as avg_spread,
        AVG((charge_rate - pay_rate) / charge_rate * 100) as avg_margin_percent
      FROM jobs
      WHERE status = 'completed'
    `).get();

    // ===== TOP PERFORMERS (Candidates generating most profit) =====
    const topPerformers = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.level,
        c.total_jobs_completed,
        c.rating,
        c.total_incentives_earned,
        SUM(d.gross_profit) as profit_generated,
        SUM(d.hours_worked) as total_hours,
        COUNT(*) as deployments
      FROM deployments d
      JOIN candidates c ON d.candidate_id = c.id
      WHERE d.status = 'completed'
      GROUP BY c.id
      ORDER BY profit_generated DESC
      LIMIT 10
    `).all();

    // ===== PROJECTIONS FROM TABLE =====
    const financialProjections = db.prepare(`
      SELECT * FROM financial_projections
      ORDER BY month ASC
    `).all();

    // ===== TENDER PIPELINE VALUE =====
    const tenderPipeline = db.prepare(`
      SELECT 
        SUM(CASE WHEN status IN ('new', 'reviewing', 'bidding') THEN estimated_value ELSE 0 END) as pipeline_value,
        SUM(CASE WHEN status = 'submitted' THEN our_bid_amount ELSE 0 END) as pending_bids,
        SUM(CASE WHEN status = 'won' THEN our_bid_amount ELSE 0 END) as won_value,
        SUM(CASE WHEN status = 'won' THEN estimated_monthly_revenue ELSE 0 END) as monthly_recurring_potential
      FROM tenders
    `).get();

    res.json({
      success: true,
      data: {
        // Summary
        currentEarnings,
        thisMonth: thisMonthEarnings,
        lastMonth: lastMonthEarnings,
        
        // Projections
        projected: {
          revenue: projectedRevenue,
          costs: projectedCosts,
          profit: projectedProfit,
          upcomingJobs,
        },
        
        // Trends
        monthlyTrend,
        
        // Analysis
        marginByClient,
        incentiveAnalysis,
        rateAnalysis: {
          byJob: rateAnalysis,
          averages: avgRates,
        },
        
        // People
        topPerformers,
        
        // Future
        financialProjections,
        tenderPipeline,
      },
    });
  } catch (error) {
    console.error('Financial dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get incentive schemes
router.get('/incentives', (req, res) => {
  try {
    const schemes = db.prepare('SELECT * FROM incentive_schemes WHERE active = 1').all();
    
    // Get incentive totals
    const totals = db.prepare(`
      SELECT 
        SUM(incentive_amount) as total_paid,
        COUNT(CASE WHEN incentive_amount > 0 THEN 1 END) as times_paid
      FROM deployments 
      WHERE status = 'completed'
    `).get();

    res.json({ 
      success: true, 
      data: { 
        schemes, 
        totals,
        minGrossMarginPercent: 20, // Business rule
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate incentive for a deployment (with margin protection)
router.post('/incentives/calculate', (req, res) => {
  try {
    const { deployment_id, candidate_id, scheme_id } = req.body;

    const deployment = db.prepare('SELECT * FROM deployments WHERE id = ?').get(deployment_id);
    if (!deployment) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    const scheme = db.prepare('SELECT * FROM incentive_schemes WHERE id = ?').get(scheme_id);
    if (!scheme) {
      return res.status(404).json({ success: false, error: 'Incentive scheme not found' });
    }

    // Calculate gross margin percentage
    const marginPercent = (deployment.gross_profit / deployment.gross_revenue) * 100;
    
    // Check minimum margin constraint
    let incentiveAmount = 0;
    let canApply = true;
    let reason = '';

    if (marginPercent < scheme.min_gross_margin_percent) {
      canApply = false;
      reason = `Cannot apply incentive. Current margin (${marginPercent.toFixed(1)}%) is below minimum required (${scheme.min_gross_margin_percent}%)`;
    } else {
      // Calculate incentive
      if (scheme.reward_type === 'fixed') {
        incentiveAmount = Math.min(scheme.reward_value, scheme.max_reward);
      } else if (scheme.reward_type === 'percentage') {
        incentiveAmount = Math.min(deployment.gross_profit * (scheme.reward_value / 100), scheme.max_reward);
      }

      // Check if incentive would drop margin below minimum
      const newProfit = deployment.gross_profit - incentiveAmount;
      const newMargin = (newProfit / deployment.gross_revenue) * 100;
      
      if (newMargin < scheme.min_gross_margin_percent) {
        // Reduce incentive to maintain minimum margin
        const maxIncentive = deployment.gross_profit - (deployment.gross_revenue * scheme.min_gross_margin_percent / 100);
        incentiveAmount = Math.max(0, maxIncentive);
        reason = `Incentive reduced to $${incentiveAmount.toFixed(2)} to maintain minimum ${scheme.min_gross_margin_percent}% margin`;
      }
    }

    res.json({
      success: true,
      data: {
        canApply,
        reason,
        originalMargin: marginPercent,
        incentiveAmount,
        newMargin: canApply ? ((deployment.gross_profit - incentiveAmount) / deployment.gross_revenue) * 100 : marginPercent,
        deployment,
        scheme,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Referral tracking
router.get('/referrals', (req, res) => {
  try {
    const referrals = db.prepare(`
      SELECT 
        r.*,
        referrer.name as referrer_name,
        referrer.email as referrer_email,
        referred.name as referred_name,
        referred.email as referred_email,
        referred.total_jobs_completed as referred_jobs
      FROM referrals r
      JOIN candidates referrer ON r.referrer_id = referrer.id
      JOIN candidates referred ON r.referred_id = referred.id
      ORDER BY r.created_at DESC
    `).all();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN status = 'bonus_paid' THEN 1 END) as successful_referrals,
        SUM(CASE WHEN status = 'bonus_paid' THEN bonus_amount ELSE 0 END) as total_bonus_paid
      FROM referrals
    `).get();

    res.json({ success: true, data: { referrals, stats } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Job profitability calculator
router.post('/calculate-job-profit', (req, res) => {
  try {
    const { charge_rate, pay_rate, hours, headcount, estimated_incentives = 0 } = req.body;

    const grossRevenue = charge_rate * hours * headcount;
    const candidateCosts = pay_rate * hours * headcount;
    const grossProfit = grossRevenue - candidateCosts;
    const netProfit = grossProfit - estimated_incentives;
    const grossMarginPercent = (grossProfit / grossRevenue) * 100;
    const netMarginPercent = (netProfit / grossRevenue) * 100;

    // Check if meets minimum margin
    const minMarginPercent = 20;
    const meetsMinMargin = grossMarginPercent >= minMarginPercent;

    // Calculate max allowable incentive
    const maxIncentive = grossProfit - (grossRevenue * minMarginPercent / 100);

    // Suggest optimal rates
    const suggestedChargeRate = pay_rate / (1 - minMarginPercent / 100);

    res.json({
      success: true,
      data: {
        inputs: { charge_rate, pay_rate, hours, headcount, estimated_incentives },
        grossRevenue,
        candidateCosts,
        grossProfit,
        netProfit,
        grossMarginPercent: grossMarginPercent.toFixed(1),
        netMarginPercent: netMarginPercent.toFixed(1),
        meetsMinMargin,
        minMarginPercent,
        maxIncentive: Math.max(0, maxIncentive),
        suggestedChargeRate: suggestedChargeRate.toFixed(2),
        perPersonBreakdown: {
          revenue: charge_rate * hours,
          cost: pay_rate * hours,
          profit: (charge_rate - pay_rate) * hours,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get dashboard analytics (original endpoint updated)
router.get('/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const analytics = {
      candidates: {
        total: db.prepare('SELECT COUNT(*) as count FROM candidates').get().count,
        active: db.prepare("SELECT COUNT(*) as count FROM candidates WHERE status = 'active'").get().count,
        newThisMonth: db.prepare("SELECT COUNT(*) as count FROM candidates WHERE created_at >= date('now', 'start of month')").get().count,
        byStatus: db.prepare('SELECT status, COUNT(*) as count FROM candidates GROUP BY status').all(),
      },
      jobs: {
        total: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
        open: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'open'").get().count,
        upcoming: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE job_date >= ?").get(today).count,
        filledThisMonth: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'completed' AND job_date >= date('now', 'start of month')").get().count,
      },
      deployments: {
        total: db.prepare('SELECT COUNT(*) as count FROM deployments').get().count,
        confirmed: db.prepare("SELECT COUNT(*) as count FROM deployments WHERE status = 'confirmed'").get().count,
        completed: db.prepare("SELECT COUNT(*) as count FROM deployments WHERE status = 'completed'").get().count,
        upcoming: db.prepare(`
          SELECT COUNT(*) as count FROM deployments d
          JOIN jobs j ON d.job_id = j.id
          WHERE j.job_date >= ? AND d.status IN ('assigned', 'confirmed')
        `).get(today).count,
      },
      financials: {
        totalRevenue: db.prepare("SELECT COALESCE(SUM(gross_revenue), 0) as total FROM deployments WHERE status = 'completed'").get().total,
        totalProfit: db.prepare("SELECT COALESCE(SUM(gross_profit), 0) as total FROM deployments WHERE status = 'completed'").get().total,
        totalIncentives: db.prepare("SELECT COALESCE(SUM(incentive_amount), 0) as total FROM deployments WHERE status = 'completed'").get().total,
        pendingPayments: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE status = 'pending'").get().total,
        paidThisMonth: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM payments WHERE status = 'paid' AND paid_at >= date('now', 'start of month')").get().total,
      },
      tenders: {
        active: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status IN ('new', 'reviewing', 'bidding')").get().count,
        submitted: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'submitted'").get().count,
        won: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'won'").get().count,
        wonValue: db.prepare("SELECT COALESCE(SUM(our_bid_amount), 0) as total FROM tenders WHERE status = 'won'").get().total,
        pipelineValue: db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM tenders WHERE status IN ('new', 'reviewing', 'bidding', 'submitted')").get().total,
      },
      clients: {
        total: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
        active: db.prepare("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").get().count,
      },
    };

    // Calculate net profit
    analytics.financials.netProfit = analytics.financials.totalProfit - analytics.financials.totalIncentives;

    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get revenue analytics
router.get('/revenue', (req, res) => {
  try {
    const monthlyRevenue = db.prepare(`
      SELECT 
        strftime('%Y-%m', j.job_date) as month,
        SUM(d.gross_revenue) as revenue,
        SUM(d.candidate_pay) as costs,
        SUM(d.gross_profit) as profit,
        SUM(d.incentive_amount) as incentives,
        COUNT(*) as deployments
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.status = 'completed'
      GROUP BY strftime('%Y-%m', j.job_date)
      ORDER BY month ASC
    `).all();

    res.json({ success: true, data: { monthlyRevenue } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const leaderboard = db.prepare(`
      SELECT 
        id, name, xp, level, total_jobs_completed, rating, profile_photo
      FROM candidates 
      WHERE status = 'active'
      ORDER BY xp DESC
      LIMIT 20
    `).all();

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
