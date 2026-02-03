/**
 * Worker Status Classifier
 *
 * Handles automatic classification of workers between pending and active status,
 * manages status transitions, and provides routing logic for SLM responses.
 */

const { db } = require('../db');
const { createLogger } = require('./structured-logger');

const logger = createLogger('worker-status-classifier');

class WorkerStatusClassifier {
  constructor() {
    this.statusRules = {
      // Rules for automatic status detection
      pending: {
        conditions: [
          'interview_stage = "not_started"',
          'interview_stage = "scheduled"',
          'worker_status = "pending"'
        ],
        slmMode: 'interview_scheduling'
      },
      active: {
        conditions: [
          'interview_stage = "passed"',
          'worker_status = "active"',
          'total_jobs_completed > 0'
        ],
        slmMode: 'standard_support'
      },
      inactive: {
        conditions: [
          'worker_status = "inactive"',
          'worker_status = "suspended"'
        ],
        slmMode: 'reactivation'
      }
    };

    // Transition rules for automatic status changes
    this.transitionRules = {
      'pending->active': {
        conditions: ['interview_stage = "passed"'],
        autoTrigger: true,
        reason: 'Interview passed'
      },
      'active->inactive': {
        conditions: ['last_seen < datetime("now", "-90 days")'],
        autoTrigger: false, // Requires manual review
        reason: 'Long period of inactivity'
      },
      'pending->inactive': {
        conditions: [
          'interview_stage = "failed"',
          'created_at < datetime("now", "-30 days") AND interview_stage = "not_started"'
        ],
        autoTrigger: false,
        reason: 'Interview failed or too long without interview'
      }
    };
  }

  /**
   * Classify worker status based on current data and rules
   */
  async classifyWorkerStatus(candidateId) {
    try {
      const candidate = await this.getCandidateData(candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      const currentStatus = candidate.worker_status;
      const suggestedStatus = await this.determineStatusFromRules(candidate);

      logger.info('Worker status classification', {
        candidateId,
        currentStatus,
        suggestedStatus,
        interviewStage: candidate.interview_stage,
        hasCompletedJobs: candidate.total_jobs_completed > 0
      });

      // Check if automatic transition should occur
      if (currentStatus !== suggestedStatus) {
        const transitionKey = `${currentStatus}->${suggestedStatus}`;
        const transitionRule = this.transitionRules[transitionKey];

        if (transitionRule?.autoTrigger) {
          await this.changeWorkerStatus(
            candidateId,
            suggestedStatus,
            'system',
            transitionRule.reason
          );

          logger.info('Automatic status transition executed', {
            candidateId,
            from: currentStatus,
            to: suggestedStatus,
            reason: transitionRule.reason
          });
        }
      }

      return {
        candidateId,
        currentStatus: currentStatus,
        suggestedStatus,
        slmMode: this.statusRules[suggestedStatus]?.slmMode || 'standard_support',
        requiresInterview: suggestedStatus === 'pending' && candidate.interview_stage === 'not_started',
        transitionAvailable: currentStatus !== suggestedStatus
      };

    } catch (error) {
      logger.error('Worker status classification failed', {
        candidateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Determine status based on classification rules
   */
  async determineStatusFromRules(candidate) {
    // Check active conditions first (highest priority)
    if (this.evaluateStatusConditions(candidate, 'active')) {
      return 'active';
    }

    // Check inactive conditions
    if (this.evaluateStatusConditions(candidate, 'inactive')) {
      return 'inactive';
    }

    // Default to pending
    return 'pending';
  }

  /**
   * Evaluate status conditions for a given status type
   */
  evaluateStatusConditions(candidate, statusType) {
    const rules = this.statusRules[statusType];
    if (!rules) return false;

    // For now, implement simplified rule evaluation
    // In production, you might want a more sophisticated rule engine

    switch (statusType) {
      case 'active':
        return (
          candidate.interview_stage === 'passed' ||
          (candidate.worker_status === 'active' && candidate.total_jobs_completed > 0)
        );

      case 'inactive':
        return (
          candidate.worker_status === 'inactive' ||
          candidate.worker_status === 'suspended'
        );

      case 'pending':
        return (
          candidate.interview_stage === 'not_started' ||
          candidate.interview_stage === 'scheduled' ||
          (candidate.worker_status === 'pending' && candidate.interview_stage !== 'passed')
        );

      default:
        return false;
    }
  }

  /**
   * Change worker status with audit logging
   */
  async changeWorkerStatus(candidateId, newStatus, changedBy = 'system', reason = '') {
    try {
      const candidate = await this.getCandidateData(candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      const oldStatus = candidate.worker_status;

      if (oldStatus === newStatus) {
        logger.info('Status change skipped - no change needed', {
          candidateId,
          status: newStatus
        });
        return { success: true, changed: false };
      }

      // Update candidate record
      db.prepare(`
        UPDATE candidates
        SET worker_status = ?,
            worker_status_changed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, candidateId);

      // Log the status change
      const changeId = `CHG_${candidateId}_${Date.now()}`;
      db.prepare(`
        INSERT INTO worker_status_changes
        (id, candidate_id, from_status, to_status, changed_by, reason, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        changeId,
        candidateId,
        oldStatus,
        newStatus,
        changedBy,
        reason,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          automatic: changedBy === 'system'
        })
      );

      // Update SLM routing context
      await this.updateSLMRoutingContext(candidateId, newStatus);

      logger.info('Worker status changed successfully', {
        candidateId,
        from: oldStatus,
        to: newStatus,
        changedBy,
        reason,
        changeId
      });

      return {
        success: true,
        changed: true,
        from: oldStatus,
        to: newStatus,
        changeId
      };

    } catch (error) {
      logger.error('Failed to change worker status', {
        candidateId,
        newStatus,
        changedBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update SLM routing context based on worker status
   */
  async updateSLMRoutingContext(candidateId, workerStatus) {
    try {
      const routingContext = {
        workerStatus,
        slmMode: this.statusRules[workerStatus]?.slmMode || 'standard_support',
        lastUpdated: new Date().toISOString(),
        autoScheduling: workerStatus === 'pending'
      };

      db.prepare(`
        UPDATE candidates
        SET slm_routing_context = ?
        WHERE id = ?
      `).run(JSON.stringify(routingContext), candidateId);

      logger.debug('SLM routing context updated', {
        candidateId,
        routingContext
      });

    } catch (error) {
      logger.error('Failed to update SLM routing context', {
        candidateId,
        workerStatus,
        error: error.message
      });
    }
  }

  /**
   * Get candidate data for classification
   */
  async getCandidateData(candidateId) {
    try {
      return db.prepare(`
        SELECT
          id,
          name,
          worker_status,
          interview_stage,
          interview_completed_at,
          total_jobs_completed,
          status,
          created_at,
          last_seen,
          slm_routing_context,
          worker_status_changed_at
        FROM candidates
        WHERE id = ?
      `).get(candidateId);
    } catch (error) {
      logger.error('Failed to get candidate data', {
        candidateId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get SLM routing information for a candidate
   */
  async getSLMRoutingInfo(candidateId) {
    try {
      const candidate = await this.getCandidateData(candidateId);
      if (!candidate) {
        return {
          mode: 'standard_support',
          workerStatus: 'unknown',
          requiresInterview: false
        };
      }

      let routingContext = {};
      try {
        routingContext = JSON.parse(candidate.slm_routing_context || '{}');
      } catch (e) {
        logger.warn('Invalid SLM routing context JSON', {
          candidateId,
          context: candidate.slm_routing_context
        });
      }

      const classification = await this.classifyWorkerStatus(candidateId);

      return {
        mode: classification.slmMode,
        workerStatus: classification.currentStatus,
        suggestedStatus: classification.suggestedStatus,
        requiresInterview: classification.requiresInterview,
        transitionAvailable: classification.transitionAvailable,
        routingContext: routingContext,
        lastClassified: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get SLM routing info', {
        candidateId,
        error: error.message
      });

      // Return safe defaults
      return {
        mode: 'standard_support',
        workerStatus: 'pending',
        requiresInterview: true,
        error: error.message
      };
    }
  }

  /**
   * Batch classify multiple candidates
   */
  async batchClassifyWorkers(candidateIds = []) {
    try {
      let candidates = candidateIds;

      // If no specific candidates provided, get all active candidates
      if (candidates.length === 0) {
        const rows = db.prepare(`
          SELECT id FROM candidates
          WHERE status != 'inactive'
          ORDER BY created_at DESC
          LIMIT 100
        `).all();

        candidates = rows.map(row => row.id);
      }

      const results = [];

      for (const candidateId of candidates) {
        try {
          const classification = await this.classifyWorkerStatus(candidateId);
          results.push(classification);
        } catch (error) {
          logger.warn('Batch classification failed for candidate', {
            candidateId,
            error: error.message
          });

          results.push({
            candidateId,
            error: error.message,
            currentStatus: 'unknown'
          });
        }
      }

      logger.info('Batch worker classification completed', {
        totalCandidates: candidates.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
      });

      return {
        success: true,
        totalProcessed: candidates.length,
        results
      };

    } catch (error) {
      logger.error('Batch classification failed', {
        candidateCount: candidateIds.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get status change history for a candidate
   */
  async getStatusChangeHistory(candidateId, limit = 10) {
    try {
      const changes = db.prepare(`
        SELECT *
        FROM worker_status_changes
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(candidateId, limit);

      return changes.map(change => ({
        ...change,
        metadata: JSON.parse(change.metadata || '{}')
      }));

    } catch (error) {
      logger.error('Failed to get status change history', {
        candidateId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Manual override for admin use
   */
  async manualStatusOverride(candidateId, newStatus, adminId, reason) {
    try {
      const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}. Valid options: ${validStatuses.join(', ')}`);
      }

      const result = await this.changeWorkerStatus(
        candidateId,
        newStatus,
        adminId,
        `Manual override: ${reason}`
      );

      logger.info('Manual status override completed', {
        candidateId,
        newStatus,
        adminId,
        reason,
        result
      });

      return result;

    } catch (error) {
      logger.error('Manual status override failed', {
        candidateId,
        newStatus,
        adminId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get statistics about worker status distribution
   */
  async getStatusStatistics() {
    try {
      const stats = db.prepare(`
        SELECT
          worker_status,
          COUNT(*) as count,
          COUNT(CASE WHEN interview_stage = 'not_started' THEN 1 END) as needs_interview,
          COUNT(CASE WHEN last_seen > datetime('now', '-7 days') THEN 1 END) as active_week,
          COUNT(CASE WHEN total_jobs_completed > 0 THEN 1 END) as has_worked
        FROM candidates
        GROUP BY worker_status
      `).all();

      const total = stats.reduce((sum, stat) => sum + stat.count, 0);

      return {
        total,
        breakdown: stats,
        summary: {
          pending: stats.find(s => s.worker_status === 'pending')?.count || 0,
          active: stats.find(s => s.worker_status === 'active')?.count || 0,
          inactive: stats.find(s => s.worker_status === 'inactive')?.count || 0,
          suspended: stats.find(s => s.worker_status === 'suspended')?.count || 0
        },
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get status statistics', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = WorkerStatusClassifier;