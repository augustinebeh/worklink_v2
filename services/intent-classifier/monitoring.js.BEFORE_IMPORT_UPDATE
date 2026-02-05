/**
 * Intent Classifier Monitoring System
 *
 * Real-time monitoring and alerting for the intent classification system.
 * Tracks performance, accuracy, and system health.
 */

const { db } = require('../../db/database');
const EventEmitter = require('events');

class IntentClassifierMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      totalClassifications: 0,
      avgResponseTime: 0,
      currentHourClassifications: 0,
      errorCount: 0,
      slowClassifications: 0
    };

    this.alertThresholds = {
      maxResponseTime: 100, // ms
      maxErrorRate: 0.05,   // 5%
      maxSlowRate: 0.1      // 10%
    };

    this.startPerformanceTracking();
  }

  /**
   * Record a classification event
   */
  recordClassification(candidateId, message, result, error = null) {
    const timestamp = new Date();

    // Update metrics
    this.metrics.totalClassifications++;
    this.updateAverageResponseTime(result.processingTimeMs);

    // Track slow classifications
    if (result.processingTimeMs > this.alertThresholds.maxResponseTime) {
      this.metrics.slowClassifications++;
      this.emit('slow_classification', {
        candidateId,
        message: message.substring(0, 100),
        responseTime: result.processingTimeMs,
        timestamp
      });
    }

    // Track errors
    if (error) {
      this.metrics.errorCount++;
      this.emit('classification_error', {
        candidateId,
        message: message.substring(0, 100),
        error: error.message,
        timestamp
      });
    }

    // Store detailed metrics in database
    this.storeMetrics(candidateId, message, result, error, timestamp);

    // Check alert conditions
    this.checkAlerts();
  }

  /**
   * Update average response time using moving average
   */
  updateAverageResponseTime(newTime) {
    const alpha = 0.1; // Smoothing factor
    this.metrics.avgResponseTime =
      this.metrics.avgResponseTime * (1 - alpha) + newTime * alpha;
  }

  /**
   * Store metrics in database for historical analysis
   */
  storeMetrics(candidateId, message, result, error, timestamp) {
    try {
      // Create metrics table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS intent_classification_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME,
          candidate_id TEXT,
          message_length INTEGER,
          intent TEXT,
          confidence REAL,
          processing_time_ms INTEGER,
          pattern_matched TEXT,
          context_quality REAL,
          escalation_required INTEGER,
          error TEXT,
          hour_bucket INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const hourBucket = Math.floor(timestamp.getTime() / (1000 * 60 * 60));

      db.prepare(`
        INSERT INTO intent_classification_metrics
        (timestamp, candidate_id, message_length, intent, confidence, processing_time_ms,
         pattern_matched, context_quality, escalation_required, error, hour_bucket)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        timestamp.toISOString(),
        candidateId,
        message.length,
        result.intent,
        result.confidence,
        result.processingTimeMs,
        result.matchedPattern,
        result.contextInfo?.contextQuality?.score || 0,
        result.priority >= 3 ? 1 : 0,
        error ? error.message : null,
        hourBucket
      );
    } catch (dbError) {
      console.error('Failed to store metrics:', dbError.message);
    }
  }

  /**
   * Check alert conditions and emit warnings
   */
  checkAlerts() {
    const recentClassifications = Math.max(100, this.metrics.totalClassifications);

    // Check error rate
    const errorRate = this.metrics.errorCount / recentClassifications;
    if (errorRate > this.alertThresholds.maxErrorRate) {
      this.emit('high_error_rate', {
        errorRate: errorRate * 100,
        threshold: this.alertThresholds.maxErrorRate * 100,
        totalErrors: this.metrics.errorCount,
        totalClassifications: this.metrics.totalClassifications
      });
    }

    // Check slow classification rate
    const slowRate = this.metrics.slowClassifications / recentClassifications;
    if (slowRate > this.alertThresholds.maxSlowRate) {
      this.emit('high_slow_rate', {
        slowRate: slowRate * 100,
        threshold: this.alertThresholds.maxSlowRate * 100,
        slowCount: this.metrics.slowClassifications,
        avgResponseTime: this.metrics.avgResponseTime
      });
    }

    // Check if average response time is trending upward
    if (this.metrics.avgResponseTime > this.alertThresholds.maxResponseTime) {
      this.emit('degraded_performance', {
        avgResponseTime: this.metrics.avgResponseTime,
        threshold: this.alertThresholds.maxResponseTime
      });
    }
  }

  /**
   * Get real-time metrics dashboard data
   */
  getDashboardMetrics() {
    const hourlyStats = this.getHourlyStats();
    const intentDistribution = this.getIntentDistribution();
    const performanceMetrics = this.getPerformanceMetrics();

    return {
      overview: {
        totalClassifications: this.metrics.totalClassifications,
        avgResponseTime: Math.round(this.metrics.avgResponseTime * 100) / 100,
        errorRate: (this.metrics.errorCount / Math.max(1, this.metrics.totalClassifications) * 100).toFixed(2),
        slowRate: (this.metrics.slowClassifications / Math.max(1, this.metrics.totalClassifications) * 100).toFixed(2)
      },
      hourlyStats,
      intentDistribution,
      performanceMetrics,
      alerts: this.getActiveAlerts(),
      health: this.getHealthStatus()
    };
  }

  /**
   * Get hourly classification statistics
   */
  getHourlyStats() {
    try {
      const stats = db.prepare(`
        SELECT
          hour_bucket,
          COUNT(*) as count,
          AVG(processing_time_ms) as avg_time,
          AVG(confidence) as avg_confidence,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors
        FROM intent_classification_metrics
        WHERE timestamp > datetime('now', '-24 hours')
        GROUP BY hour_bucket
        ORDER BY hour_bucket DESC
        LIMIT 24
      `).all();

      return stats.map(stat => ({
        hour: new Date(stat.hour_bucket * 1000 * 60 * 60).getHours(),
        classifications: stat.count,
        avgResponseTime: Math.round(stat.avg_time * 100) / 100,
        avgConfidence: Math.round(stat.avg_confidence * 100) / 100,
        errorCount: stat.errors
      }));
    } catch (error) {
      console.error('Failed to get hourly stats:', error.message);
      return [];
    }
  }

  /**
   * Get intent distribution statistics
   */
  getIntentDistribution() {
    try {
      const distribution = db.prepare(`
        SELECT
          intent,
          COUNT(*) as count,
          AVG(confidence) as avg_confidence,
          AVG(processing_time_ms) as avg_time,
          SUM(escalation_required) as escalations
        FROM intent_classification_metrics
        WHERE timestamp > datetime('now', '-7 days')
        GROUP BY intent
        ORDER BY count DESC
      `).all();

      const total = distribution.reduce((sum, item) => sum + item.count, 0);

      return distribution.map(item => ({
        intent: item.intent,
        count: item.count,
        percentage: ((item.count / total) * 100).toFixed(1),
        avgConfidence: Math.round(item.avg_confidence * 100) / 100,
        avgResponseTime: Math.round(item.avg_time * 100) / 100,
        escalationRate: ((item.escalations / item.count) * 100).toFixed(1)
      }));
    } catch (error) {
      console.error('Failed to get intent distribution:', error.message);
      return [];
    }
  }

  /**
   * Get detailed performance metrics
   */
  getPerformanceMetrics() {
    try {
      const metrics = db.prepare(`
        SELECT
          MIN(processing_time_ms) as min_time,
          MAX(processing_time_ms) as max_time,
          AVG(processing_time_ms) as avg_time,
          percentile_90,
          percentile_95,
          percentile_99
        FROM (
          SELECT
            processing_time_ms,
            NTILE(100) OVER (ORDER BY processing_time_ms) as percentile
          FROM intent_classification_metrics
          WHERE timestamp > datetime('now', '-1 hour')
        ) t
        WHERE percentile IN (90, 95, 99)
      `).get();

      return {
        minResponseTime: metrics?.min_time || 0,
        maxResponseTime: metrics?.max_time || 0,
        avgResponseTime: Math.round((metrics?.avg_time || 0) * 100) / 100,
        p90: metrics?.percentile_90 || 0,
        p95: metrics?.percentile_95 || 0,
        p99: metrics?.percentile_99 || 0,
        targetMet: (metrics?.avg_time || 0) < this.alertThresholds.maxResponseTime
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error.message);
      return {
        minResponseTime: 0,
        maxResponseTime: 0,
        avgResponseTime: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        targetMet: false
      };
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    const alerts = [];

    if (this.metrics.avgResponseTime > this.alertThresholds.maxResponseTime) {
      alerts.push({
        type: 'performance',
        level: 'warning',
        message: `Average response time (${this.metrics.avgResponseTime.toFixed(1)}ms) exceeds threshold`,
        threshold: this.alertThresholds.maxResponseTime,
        current: this.metrics.avgResponseTime
      });
    }

    const errorRate = this.metrics.errorCount / Math.max(1, this.metrics.totalClassifications);
    if (errorRate > this.alertThresholds.maxErrorRate) {
      alerts.push({
        type: 'errors',
        level: 'critical',
        message: `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold`,
        threshold: this.alertThresholds.maxErrorRate * 100,
        current: errorRate * 100
      });
    }

    return alerts;
  }

  /**
   * Get overall health status
   */
  getHealthStatus() {
    const alerts = this.getActiveAlerts();
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    const warningAlerts = alerts.filter(a => a.level === 'warning');

    if (criticalAlerts.length > 0) {
      return {
        status: 'critical',
        message: 'Critical issues detected',
        details: criticalAlerts
      };
    }

    if (warningAlerts.length > 0) {
      return {
        status: 'warning',
        message: 'Performance degradation detected',
        details: warningAlerts
      };
    }

    return {
      status: 'healthy',
      message: 'All systems operational',
      details: []
    };
  }

  /**
   * Start background performance tracking
   */
  startPerformanceTracking() {
    // Reset hourly metrics
    setInterval(() => {
      this.metrics.currentHourClassifications = 0;
    }, 60 * 60 * 1000); // Every hour

    // Clean up old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // Every day
  }

  /**
   * Clean up metrics older than 30 days
   */
  cleanupOldMetrics() {
    try {
      const deleted = db.prepare(`
        DELETE FROM intent_classification_metrics
        WHERE timestamp < datetime('now', '-30 days')
      `).run();

      console.log(`Cleaned up ${deleted.changes} old metric records`);
    } catch (error) {
      console.error('Failed to cleanup old metrics:', error.message);
    }
  }

  /**
   * Generate performance report
   */
  generateReport(days = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    try {
      const report = db.prepare(`
        SELECT
          COUNT(*) as total_classifications,
          AVG(processing_time_ms) as avg_response_time,
          MIN(processing_time_ms) as min_response_time,
          MAX(processing_time_ms) as max_response_time,
          AVG(confidence) as avg_confidence,
          SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as total_errors,
          SUM(escalation_required) as total_escalations,
          COUNT(DISTINCT candidate_id) as unique_users,
          SUM(CASE WHEN processing_time_ms > ? THEN 1 ELSE 0 END) as slow_classifications
        FROM intent_classification_metrics
        WHERE timestamp BETWEEN ? AND ?
      `).get(
        this.alertThresholds.maxResponseTime,
        startDate.toISOString(),
        endDate.toISOString()
      );

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days
        },
        summary: {
          totalClassifications: report.total_classifications || 0,
          uniqueUsers: report.unique_users || 0,
          avgResponseTime: Math.round((report.avg_response_time || 0) * 100) / 100,
          minResponseTime: report.min_response_time || 0,
          maxResponseTime: report.max_response_time || 0,
          avgConfidence: Math.round((report.avg_confidence || 0) * 100) / 100,
          errorRate: ((report.total_errors || 0) / Math.max(1, report.total_classifications)) * 100,
          escalationRate: ((report.total_escalations || 0) / Math.max(1, report.total_classifications)) * 100,
          slowClassificationRate: ((report.slow_classifications || 0) / Math.max(1, report.total_classifications)) * 100
        },
        performanceStatus: {
          targetMet: (report.avg_response_time || 0) < this.alertThresholds.maxResponseTime,
          target: `< ${this.alertThresholds.maxResponseTime}ms`,
          actual: `${Math.round((report.avg_response_time || 0) * 100) / 100}ms`
        }
      };
    } catch (error) {
      console.error('Failed to generate report:', error.message);
      return null;
    }
  }
}

// Create singleton instance
const monitor = new IntentClassifierMonitor();

// Set up alert handlers
monitor.on('slow_classification', (data) => {
  console.warn(`🐌 Slow classification detected: ${data.responseTime}ms for "${data.message}"`);
});

monitor.on('classification_error', (data) => {
  console.error(`❌ Classification error for "${data.message}": ${data.error}`);
});

monitor.on('high_error_rate', (data) => {
  console.error(`🚨 High error rate alert: ${data.errorRate.toFixed(1)}% (threshold: ${data.threshold}%)`);
});

monitor.on('high_slow_rate', (data) => {
  console.warn(`⚠️ High slow classification rate: ${data.slowRate.toFixed(1)}% (threshold: ${data.threshold}%)`);
});

monitor.on('degraded_performance', (data) => {
  console.warn(`⏱️ Performance degradation: ${data.avgResponseTime.toFixed(1)}ms avg (threshold: ${data.threshold}ms)`);
});

module.exports = monitor;