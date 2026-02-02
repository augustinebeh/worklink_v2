/**
 * CAPACITY MANAGEMENT SYSTEM
 * Prevents consultant overwhelm - Core Pain Point #1 Solution
 *
 * This system ensures you NEVER get overwhelmed by too many candidates
 * while scaling to 100x performance safely.
 */

const { db } = require('../db');

class CapacityManagementSystem {
  constructor() {
    this.dailyCapacity = 20;      // Max new candidates per day
    this.weeklyCapacity = 100;    // Max weekly processing limit
    this.alertThresholds = {
      warning: 0.8,   // 80% capacity
      critical: 0.9,  // 90% capacity
      emergency: 0.95 // 95% capacity
    };
  }

  /**
   * Check current capacity utilization
   */
  async getCurrentCapacity() {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = this.getWeekStart();

    // Count active candidates requiring attention
    const dailyCount = db.prepare(`
      SELECT COUNT(*) as count FROM candidates
      WHERE DATE(created_at) = ? AND status IN ('new', 'screening', 'pending')
    `).get(today).count;

    const weeklyCount = db.prepare(`
      SELECT COUNT(*) as count FROM candidates
      WHERE DATE(created_at) >= ? AND status IN ('new', 'screening', 'pending')
    `).get(weekStart).count;

    // Calculate active workload (candidates requiring your attention)
    const activeWorkload = db.prepare(`
      SELECT COUNT(*) as count FROM candidates
      WHERE status IN ('active', 'deployed', 'follow_up_needed')
    `).get().count;

    return {
      daily: {
        current: dailyCount,
        capacity: this.dailyCapacity,
        utilization: dailyCount / this.dailyCapacity,
        available: Math.max(0, this.dailyCapacity - dailyCount)
      },
      weekly: {
        current: weeklyCount,
        capacity: this.weeklyCapacity,
        utilization: weeklyCount / this.weeklyCapacity,
        available: Math.max(0, this.weeklyCapacity - weeklyCount)
      },
      workload: {
        active: activeWorkload,
        maxRecommended: 150, // Max candidates you can actively manage
        utilization: activeWorkload / 150
      }
    };
  }

  /**
   * Determine if new candidates can be accepted
   */
  async canAcceptNewCandidates() {
    const capacity = await this.getCurrentCapacity();

    return {
      daily: capacity.daily.utilization < this.alertThresholds.critical,
      weekly: capacity.weekly.utilization < this.alertThresholds.critical,
      workload: capacity.workload.utilization < this.alertThresholds.emergency,
      canAccept: capacity.daily.available > 0 &&
                 capacity.weekly.available > 0 &&
                 capacity.workload.utilization < this.alertThresholds.emergency
    };
  }

  /**
   * Get recommended sourcing rate based on current capacity
   */
  async getRecommendedSourcingRate() {
    const capacity = await this.getCurrentCapacity();
    const utilization = Math.max(
      capacity.daily.utilization,
      capacity.weekly.utilization,
      capacity.workload.utilization
    );

    if (utilization >= this.alertThresholds.emergency) {
      return {
        rate: 0,
        message: "STOP SOURCING - At capacity limit",
        action: "emergency_brake"
      };
    } else if (utilization >= this.alertThresholds.critical) {
      return {
        rate: 3,
        message: "Reduce sourcing - High capacity",
        action: "throttle_heavy"
      };
    } else if (utilization >= this.alertThresholds.warning) {
      return {
        rate: 8,
        message: "Normal sourcing - Moderate capacity",
        action: "throttle_light"
      };
    } else {
      return {
        rate: 15,
        message: "Boost sourcing - Low capacity",
        action: "accelerate"
      };
    }
  }

  /**
   * Alert system for capacity monitoring
   */
  async checkCapacityAlerts() {
    const capacity = await this.getCurrentCapacity();
    const alerts = [];

    // Daily capacity alerts
    if (capacity.daily.utilization >= this.alertThresholds.emergency) {
      alerts.push({
        type: 'EMERGENCY',
        message: `Daily capacity at ${Math.round(capacity.daily.utilization * 100)}% - STOP NEW SOURCING`,
        action: 'emergency_brake'
      });
    } else if (capacity.daily.utilization >= this.alertThresholds.critical) {
      alerts.push({
        type: 'CRITICAL',
        message: `Daily capacity at ${Math.round(capacity.daily.utilization * 100)}% - Reduce sourcing`,
        action: 'throttle_heavy'
      });
    }

    // Workload capacity alerts
    if (capacity.workload.utilization >= this.alertThresholds.critical) {
      alerts.push({
        type: 'WARNING',
        message: `Managing ${capacity.workload.active} active candidates - Consider automation`,
        action: 'increase_automation'
      });
    }

    return alerts;
  }

  /**
   * Log capacity metrics for analysis
   */
  async logCapacityMetrics() {
    const capacity = await this.getCurrentCapacity();
    const sourcing = await this.getRecommendedSourcingRate();

    db.prepare(`
      INSERT INTO capacity_logs (
        date, daily_count, daily_utilization, weekly_count, weekly_utilization,
        workload_count, workload_utilization, recommended_rate, action_taken
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      capacity.daily.current,
      capacity.daily.utilization,
      capacity.weekly.current,
      capacity.weekly.utilization,
      capacity.workload.active,
      capacity.workload.utilization,
      sourcing.rate,
      sourcing.action
    );

    return {
      capacity,
      sourcing,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Emergency brake - stop all automated sourcing
   */
  async emergencyBrake() {
    console.log('🚨 EMERGENCY BRAKE ACTIVATED - Stopping all sourcing automation');

    // Update job scheduler to pause sourcing jobs
    db.prepare(`
      UPDATE job_configurations
      SET enabled = 0, last_paused = ?
      WHERE job_name IN ('candidate-sourcing', 'lead-generation', 'outreach-automation')
    `).run(new Date().toISOString());

    // Log emergency action
    db.prepare(`
      INSERT INTO emergency_logs (type, reason, action_taken, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(
      'capacity_overload',
      'Candidate capacity exceeded emergency threshold',
      'Paused all sourcing automation',
      new Date().toISOString()
    );

    return {
      success: true,
      message: 'Emergency brake activated - All sourcing paused',
      nextAction: 'Process existing candidates before resuming'
    };
  }

  /**
   * Resume sourcing after emergency
   */
  async resumeSourcing() {
    const canResume = await this.canAcceptNewCandidates();

    if (canResume.canAccept) {
      db.prepare(`
        UPDATE job_configurations
        SET enabled = 1, last_resumed = ?
        WHERE job_name IN ('candidate-sourcing', 'lead-generation', 'outreach-automation')
      `).run(new Date().toISOString());

      return {
        success: true,
        message: 'Sourcing automation resumed',
        recommendedRate: (await this.getRecommendedSourcingRate()).rate
      };
    } else {
      return {
        success: false,
        message: 'Cannot resume - Still at capacity',
        capacity: await this.getCurrentCapacity()
      };
    }
  }

  /**
   * Get week start date
   */
  getWeekStart() {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  }
}

module.exports = { CapacityManagementSystem };