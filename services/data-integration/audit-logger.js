/**
 * Audit Logger
 *
 * Comprehensive logging and monitoring for data access patterns
 * with security audit capabilities.
 */

const { db } = require('../../db');
const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
  constructor() {
    this.logDirectory = process.env.AUDIT_LOG_DIR || path.join(__dirname, '..', '..', 'logs', 'audit');
    this.initializeAuditTables();
    this.ensureLogDirectory();
  }

  /**
   * Initialize audit tables in database
   */
  initializeAuditTables() {
    try {
      // Create audit logs table
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          event_type TEXT NOT NULL,
          user_id TEXT,
          candidate_id TEXT,
          data_type TEXT,
          action TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          success BOOLEAN DEFAULT TRUE,
          error_message TEXT,
          sensitive_data BOOLEAN DEFAULT FALSE,
          retention_date DATETIME,
          metadata TEXT, -- JSON
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create security events table
      db.exec(`
        CREATE TABLE IF NOT EXISTS security_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          event_type TEXT NOT NULL,
          severity TEXT DEFAULT 'low', -- low, medium, high, critical
          user_id TEXT,
          ip_address TEXT,
          description TEXT NOT NULL,
          additional_data TEXT, -- JSON
          resolved BOOLEAN DEFAULT FALSE,
          resolved_at DATETIME,
          resolved_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create access statistics table
      db.exec(`
        CREATE TABLE IF NOT EXISTS access_statistics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          data_type TEXT NOT NULL,
          total_requests INTEGER DEFAULT 0,
          successful_requests INTEGER DEFAULT 0,
          failed_requests INTEGER DEFAULT 0,
          unique_users INTEGER DEFAULT 0,
          cache_hits INTEGER DEFAULT 0,
          cache_misses INTEGER DEFAULT 0,
          avg_response_time REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date, data_type)
        )
      `);

      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_candidate ON audit_logs(user_id, candidate_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_data_type ON audit_logs(data_type);
        CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
        CREATE INDEX IF NOT EXISTS idx_access_stats_date ON access_statistics(date);
      `);

    } catch (error) {
      console.error('Failed to initialize audit tables:', error);
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }

  /**
   * Log data access event
   * @param {string} candidateId - Candidate ID
   * @param {string} requestType - Type of data request
   * @param {string} source - Source of data (cache_hit, database_fetch, etc.)
   * @param {Object} [options] - Additional options
   * @returns {Promise<void>}
   */
  async logDataAccess(candidateId, requestType, source, options = {}) {
    try {
      const {
        userId = 'SYSTEM',
        ipAddress = null,
        userAgent = null,
        sessionId = null,
        responseTime = null,
        dataFields = [],
        success = true,
        errorMessage = null
      } = options;

      // Determine if this involves sensitive data
      const sensitiveData = this.containsSensitiveData(dataFields);

      // Insert into audit logs
      const auditId = db.prepare(`
        INSERT INTO audit_logs (
          event_type, user_id, candidate_id, data_type, action,
          ip_address, user_agent, session_id, success, error_message,
          sensitive_data, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'data_access',
        userId,
        candidateId,
        requestType,
        source,
        ipAddress,
        userAgent,
        sessionId,
        success ? 1 : 0,
        errorMessage,
        sensitiveData ? 1 : 0,
        JSON.stringify({
          dataFields,
          responseTime,
          timestamp: new Date().toISOString()
        })
      ).lastInsertRowid;

      // Update daily statistics
      await this.updateAccessStatistics(requestType, source, success, responseTime);

      // Write to file log for critical events
      if (sensitiveData || !success) {
        await this.writeFileLog('data_access', {
          auditId,
          candidateId,
          requestType,
          source,
          userId,
          success,
          errorMessage,
          sensitiveData,
          timestamp: new Date().toISOString()
        });
      }

      // Check for suspicious activity
      await this.checkSuspiciousActivity(userId, candidateId, requestType);

    } catch (error) {
      console.error('Failed to log data access:', error);
      // Write to emergency log file
      await this.writeEmergencyLog('audit_error', { error: error.message });
    }
  }

  /**
   * Log security event
   * @param {string} eventType - Type of security event
   * @param {string} severity - Event severity (low, medium, high, critical)
   * @param {string} description - Event description
   * @param {Object} [options] - Additional options
   * @returns {Promise<void>}
   */
  async logSecurityEvent(eventType, severity, description, options = {}) {
    try {
      const {
        userId = null,
        ipAddress = null,
        additionalData = {}
      } = options;

      // Insert security event
      const eventId = db.prepare(`
        INSERT INTO security_events (
          event_type, severity, user_id, ip_address, description, additional_data
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        eventType,
        severity,
        userId,
        ipAddress,
        description,
        JSON.stringify(additionalData)
      ).lastInsertRowid;

      // Write to file log for high severity events
      if (['high', 'critical'].includes(severity)) {
        await this.writeFileLog('security_event', {
          eventId,
          eventType,
          severity,
          description,
          userId,
          ipAddress,
          additionalData,
          timestamp: new Date().toISOString()
        });
      }

      // Send alerts for critical events
      if (severity === 'critical') {
        await this.sendSecurityAlert(eventType, description, options);
      }

    } catch (error) {
      console.error('Failed to log security event:', error);
      await this.writeEmergencyLog('security_error', { error: error.message });
    }
  }

  /**
   * Log error event
   * @param {string} candidateId - Candidate ID
   * @param {string} requestType - Type of request that failed
   * @param {string} errorMessage - Error message
   * @param {Object} [options] - Additional options
   * @returns {Promise<void>}
   */
  async logError(candidateId, requestType, errorMessage, options = {}) {
    await this.logDataAccess(candidateId, requestType, 'error', {
      ...options,
      success: false,
      errorMessage
    });
  }

  /**
   * Get access statistics
   * @param {Object} [filters] - Optional filters
   * @returns {Promise<Object>} Access statistics
   */
  async getAccessStatistics(filters = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        dataType = null,
        userId = null
      } = filters;

      // Build base statistics query
      let query = `
        SELECT
          COUNT(*) as total_requests,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT candidate_id) as unique_candidates
        FROM audit_logs
        WHERE 1=1
      `;

      const params = [];

      if (startDate) {
        query += ' AND DATE(timestamp) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(timestamp) <= ?';
        params.push(endDate);
      }

      if (dataType) {
        query += ' AND data_type = ?';
        params.push(dataType);
      }

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      const overall = db.prepare(query).get(...params);

      // Get statistics by data type
      const byDataType = db.prepare(`
        SELECT
          data_type,
          COUNT(*) as requests,
          AVG(CASE WHEN json_extract(metadata, '$.responseTime') IS NOT NULL
              THEN CAST(json_extract(metadata, '$.responseTime') AS REAL)
              ELSE NULL END) as avg_response_time
        FROM audit_logs
        WHERE timestamp >= datetime('now', '-30 days')
        ${dataType ? 'AND data_type = ?' : ''}
        GROUP BY data_type
        ORDER BY requests DESC
      `).all(...(dataType ? [dataType] : []));

      // Get recent activity
      const recentActivity = db.prepare(`
        SELECT
          timestamp,
          event_type,
          data_type,
          action,
          success,
          user_id,
          candidate_id
        FROM audit_logs
        WHERE timestamp >= datetime('now', '-24 hours')
        ORDER BY timestamp DESC
        LIMIT 50
      `).all();

      // Get security events summary
      const securitySummary = db.prepare(`
        SELECT
          severity,
          COUNT(*) as count
        FROM security_events
        WHERE timestamp >= datetime('now', '-30 days')
        GROUP BY severity
      `).all();

      return {
        period: {
          start: startDate || 'All time',
          end: endDate || 'Now'
        },
        overall,
        byDataType,
        recentActivity,
        security: securitySummary,
        cachePerformance: await this.getCacheStatistics(),
        trends: await this.getAccessTrends()
      };

    } catch (error) {
      console.error('Failed to get access statistics:', error);
      throw error;
    }
  }

  /**
   * Update daily access statistics
   * @param {string} dataType - Data type
   * @param {string} source - Source (cache_hit, database_fetch, etc.)
   * @param {boolean} success - Request success
   * @param {number} [responseTime] - Response time in ms
   */
  async updateAccessStatistics(dataType, source, success, responseTime = null) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Insert or update daily statistics
      db.prepare(`
        INSERT INTO access_statistics (
          date, data_type, total_requests, successful_requests,
          failed_requests, cache_hits, cache_misses
        ) VALUES (?, ?, 1, ?, ?, ?, ?)
        ON CONFLICT(date, data_type) DO UPDATE SET
          total_requests = total_requests + 1,
          successful_requests = successful_requests + ?,
          failed_requests = failed_requests + ?,
          cache_hits = cache_hits + ?,
          cache_misses = cache_misses + ?
      `).run(
        today,
        dataType,
        success ? 1 : 0,
        source === 'cache_hit' ? 1 : 0,
        source === 'database_fetch' ? 1 : 0,
        success ? 1 : 0,
        success ? 0 : 1,
        source === 'cache_hit' ? 1 : 0,
        source === 'database_fetch' ? 1 : 0
      );

      // Update response time if provided
      if (responseTime && success) {
        db.prepare(`
          UPDATE access_statistics
          SET avg_response_time = (
            CASE WHEN avg_response_time = 0 THEN ?
                 ELSE (avg_response_time + ?) / 2
            END
          )
          WHERE date = ? AND data_type = ?
        `).run(responseTime, responseTime, today, dataType);
      }

    } catch (error) {
      console.error('Failed to update access statistics:', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   * @param {string} userId - User ID
   * @param {string} candidateId - Candidate ID
   * @param {string} requestType - Request type
   */
  async checkSuspiciousActivity(userId, candidateId, requestType) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Check for excessive requests from same user
      const userRequests = db.prepare(`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE user_id = ? AND timestamp >= ?
      `).get(userId, oneHourAgo.toISOString());

      if (userRequests.count > 100) {
        await this.logSecurityEvent(
          'excessive_requests',
          'medium',
          `User ${userId} made ${userRequests.count} requests in the last hour`,
          { userId, candidateId, requestType }
        );
      }

      // Check for access to multiple different candidates
      if (userId !== candidateId && !userId.startsWith('ADM_') && !userId.startsWith('SUP_')) {
        const candidateAccess = db.prepare(`
          SELECT COUNT(DISTINCT candidate_id) as count
          FROM audit_logs
          WHERE user_id = ? AND timestamp >= ?
        `).get(userId, oneHourAgo.toISOString());

        if (candidateAccess.count > 5) {
          await this.logSecurityEvent(
            'multiple_candidate_access',
            'high',
            `User ${userId} accessed ${candidateAccess.count} different candidate records in the last hour`,
            { userId, candidateCount: candidateAccess.count }
          );
        }
      }

      // Check for failed requests pattern
      const failedRequests = db.prepare(`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE user_id = ? AND success = 0 AND timestamp >= ?
      `).get(userId, oneHourAgo.toISOString());

      if (failedRequests.count > 20) {
        await this.logSecurityEvent(
          'excessive_failures',
          'medium',
          `User ${userId} had ${failedRequests.count} failed requests in the last hour`,
          { userId, failureCount: failedRequests.count }
        );
      }

    } catch (error) {
      console.error('Failed to check suspicious activity:', error);
    }
  }

  /**
   * Write log entry to file
   * @param {string} logType - Type of log
   * @param {Object} data - Log data
   */
  async writeFileLog(logType, data) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDirectory, `${logType}-${date}.log`);

      const logEntry = JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }) + '\n';

      await fs.appendFile(logFile, logEntry);

    } catch (error) {
      console.error('Failed to write file log:', error);
    }
  }

  /**
   * Write emergency log when normal logging fails
   * @param {string} eventType - Event type
   * @param {Object} data - Log data
   */
  async writeEmergencyLog(eventType, data) {
    try {
      const emergencyFile = path.join(this.logDirectory, 'emergency.log');
      const logEntry = JSON.stringify({
        eventType,
        ...data,
        timestamp: new Date().toISOString()
      }) + '\n';

      await fs.appendFile(emergencyFile, logEntry);

    } catch (error) {
      console.error('Failed to write emergency log:', error);
    }
  }

  /**
   * Send security alert for critical events
   * @param {string} eventType - Event type
   * @param {string} description - Event description
   * @param {Object} options - Additional options
   */
  async sendSecurityAlert(eventType, description, options) {
    try {
      // In a real implementation, this would send alerts via email, SMS, Slack, etc.
      console.warn(`🚨 SECURITY ALERT: ${eventType}`, {
        description,
        timestamp: new Date().toISOString(),
        ...options
      });

      // Log the alert attempt
      await this.writeFileLog('security_alert', {
        eventType,
        description,
        options,
        alertSent: true
      });

    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * Get cache performance statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStatistics() {
    try {
      const stats = db.prepare(`
        SELECT
          SUM(CASE WHEN action = 'cache_hit' THEN 1 ELSE 0 END) as hits,
          SUM(CASE WHEN action = 'database_fetch' THEN 1 ELSE 0 END) as misses
        FROM audit_logs
        WHERE timestamp >= datetime('now', '-24 hours')
      `).get();

      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

      return {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        total
      };

    } catch (error) {
      return { hits: 0, misses: 0, hitRate: 0, total: 0 };
    }
  }

  /**
   * Get access trends over time
   * @returns {Promise<Array>} Trend data
   */
  async getAccessTrends() {
    try {
      return db.prepare(`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as requests,
          COUNT(DISTINCT candidate_id) as unique_candidates,
          AVG(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100 as success_rate
        FROM audit_logs
        WHERE timestamp >= datetime('now', '-30 days')
        GROUP BY DATE(timestamp)
        ORDER BY date
      `).all();

    } catch (error) {
      return [];
    }
  }

  /**
   * Check if data fields contain sensitive information
   * @param {Array} dataFields - Data fields
   * @returns {boolean} Contains sensitive data
   */
  containsSensitiveData(dataFields) {
    const sensitiveFields = [
      'bank_account',
      'nric_last4',
      'phone',
      'email',
      'address',
      'date_of_birth',
      'payment_details',
      'earnings'
    ];

    return dataFields.some(field => sensitiveFields.includes(field));
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs() {
    try {
      const retentionDays = process.env.AUDIT_RETENTION_DAYS || 2555; // ~7 years default

      // Clean up database logs
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deleted = db.prepare(`
        DELETE FROM audit_logs
        WHERE timestamp < ? AND sensitive_data = 0
      `).run(cutoffDate.toISOString());

      console.log(`Cleaned up ${deleted.changes} old audit log entries`);

      // Clean up old log files
      const files = await fs.readdir(this.logDirectory);
      const oldFiles = files.filter(file => {
        const match = file.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const fileDate = new Date(match[1]);
          return fileDate < cutoffDate;
        }
        return false;
      });

      for (const file of oldFiles) {
        await fs.unlink(path.join(this.logDirectory, file));
        console.log(`Deleted old log file: ${file}`);
      }

    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

module.exports = AuditLogger;