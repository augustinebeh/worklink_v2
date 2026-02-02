/**
 * Scraping Status Monitor and Error Handler
 * Monitors scraping operations and provides detailed status reporting
 */

const fs = require('fs').promises;
const path = require('path');

class ScrapingMonitor {
  constructor() {
    this.sessions = new Map();
    this.globalStats = {
      totalSessions: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      totalTendersScraped: 0,
      totalErrors: 0,
      averageScrapingTime: 0,
      lastSuccessfulScrape: null,
      captchasSolved: 0,
      rateLimitHits: 0
    };

    this.errorLog = [];
    this.maxErrorLogSize = 100;
    this.logFilePath = path.join(process.cwd(), 'data', 'scraping-logs.json');
  }

  startSession(sessionId, config = {}) {
    const session = {
      id: sessionId,
      startTime: Date.now(),
      endTime: null,
      status: 'running',
      config: config,
      stats: {
        requestsMade: 0,
        tendersFound: 0,
        errorsEncountered: 0,
        captchasSolved: 0,
        rateLimitHits: 0,
        retryAttempts: 0
      },
      errors: [],
      milestones: []
    };

    this.sessions.set(sessionId, session);
    this.globalStats.totalSessions++;

    this.addMilestone(sessionId, 'session_started', 'Scraping session initiated');
    return session;
  }

  updateSessionStats(sessionId, statsUpdate) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    Object.assign(session.stats, statsUpdate);
    return true;
  }

  addMilestone(sessionId, type, message, data = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const milestone = {
      timestamp: Date.now(),
      type: type,
      message: message,
      data: data
    };

    session.milestones.push(milestone);
    console.log(`[${sessionId}] ${type}: ${message}`);
    return true;
  }

  reportError(sessionId, error, context = {}) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.stats.errorsEncountered++;
      session.errors.push({
        timestamp: Date.now(),
        error: error.message || error,
        stack: error.stack,
        context: context
      });
    }

    // Add to global error log
    const errorEntry = {
      timestamp: Date.now(),
      sessionId: sessionId,
      error: error.message || error,
      context: context
    };

    this.errorLog.push(errorEntry);
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    this.globalStats.totalErrors++;
    console.error(`[${sessionId}] ERROR:`, error.message || error);
  }

  reportCaptcha(sessionId, solved = false) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.stats.captchasSolved += solved ? 1 : 0;
    }

    if (solved) {
      this.globalStats.captchasSolved++;
      this.addMilestone(sessionId, 'captcha_solved', 'CAPTCHA successfully solved');
    } else {
      this.addMilestone(sessionId, 'captcha_failed', 'CAPTCHA solving failed');
    }
  }

  reportRateLimit(sessionId, waitTime) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.stats.rateLimitHits++;
    }

    this.globalStats.rateLimitHits++;
    this.addMilestone(sessionId, 'rate_limited', `Rate limit hit, waiting ${waitTime}ms`);
  }

  reportRetry(sessionId, attempt, maxAttempts, reason) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.stats.retryAttempts++;
    }

    this.addMilestone(sessionId, 'retry_attempt',
      `Retry attempt ${attempt}/${maxAttempts}: ${reason}`);
  }

  endSession(sessionId, success = true, finalStats = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.endTime = Date.now();
    session.status = success ? 'completed' : 'failed';
    session.duration = session.endTime - session.startTime;

    Object.assign(session.stats, finalStats);

    // Update global stats
    if (success) {
      this.globalStats.successfulScrapes++;
      this.globalStats.totalTendersScraped += session.stats.tendersFound || 0;
      this.globalStats.lastSuccessfulScrape = new Date().toISOString();
    } else {
      this.globalStats.failedScrapes++;
    }

    // Update average scraping time
    const completedSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'completed' && s.duration);

    if (completedSessions.length > 0) {
      const totalTime = completedSessions.reduce((sum, s) => sum + s.duration, 0);
      this.globalStats.averageScrapingTime = Math.round(totalTime / completedSessions.length);
    }

    this.addMilestone(sessionId, 'session_ended',
      `Session ${success ? 'completed successfully' : 'failed'} in ${session.duration}ms`);

    // Persist logs
    this.persistLogs();

    return session;
  }

  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const status = {
      ...session,
      currentDuration: session.endTime ? session.duration : Date.now() - session.startTime,
      recentMilestones: session.milestones.slice(-5),
      recentErrors: session.errors.slice(-3)
    };

    return status;
  }

  getAllSessionsStatus() {
    const sessions = Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      status: session.status,
      duration: session.endTime ? session.duration : Date.now() - session.startTime,
      tendersFound: session.stats.tendersFound,
      errorsEncountered: session.stats.errorsEncountered,
      startTime: session.startTime,
      endTime: session.endTime
    }));

    return {
      globalStats: this.globalStats,
      sessions: sessions.sort((a, b) => b.startTime - a.startTime),
      recentErrors: this.errorLog.slice(-10)
    };
  }

  getHealthStatus() {
    const recentSessions = Array.from(this.sessions.values())
      .filter(s => s.startTime > Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const successRate = recentSessions.length > 0
      ? recentSessions.filter(s => s.status === 'completed').length / recentSessions.length * 100
      : 100;

    const avgErrorRate = recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + s.stats.errorsEncountered, 0) / recentSessions.length
      : 0;

    let healthLevel = 'healthy';
    if (successRate < 50 || avgErrorRate > 5) {
      healthLevel = 'critical';
    } else if (successRate < 80 || avgErrorRate > 2) {
      healthLevel = 'warning';
    }

    return {
      healthLevel: healthLevel,
      successRate: Math.round(successRate),
      averageErrorRate: avgErrorRate.toFixed(1),
      recentSessionCount: recentSessions.length,
      lastSuccessfulScrape: this.globalStats.lastSuccessfulScrape,
      recommendations: this.getHealthRecommendations(healthLevel, successRate, avgErrorRate)
    };
  }

  getHealthRecommendations(healthLevel, successRate, errorRate) {
    const recommendations = [];

    if (healthLevel === 'critical') {
      recommendations.push('Consider increasing retry delays and timeout values');
      recommendations.push('Check if GeBIZ website structure has changed');
      recommendations.push('Verify network connectivity and proxy settings');
    }

    if (successRate < 70) {
      recommendations.push('Review and update CSS selectors for data extraction');
      recommendations.push('Implement more robust error handling');
    }

    if (errorRate > 3) {
      recommendations.push('Reduce scraping frequency to avoid being blocked');
      recommendations.push('Implement better anti-bot detection measures');
    }

    if (this.globalStats.captchasSolved > this.globalStats.successfulScrapes * 0.5) {
      recommendations.push('CAPTCHA frequency is high - consider using residential proxies');
    }

    if (recommendations.length === 0) {
      recommendations.push('Scraping performance is good - maintain current settings');
    }

    return recommendations;
  }

  async persistLogs() {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        globalStats: this.globalStats,
        recentErrors: this.errorLog.slice(-20),
        sessionSummaries: Array.from(this.sessions.values()).map(session => ({
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          duration: session.duration,
          stats: session.stats,
          errorCount: session.errors.length
        }))
      };

      await fs.writeFile(this.logFilePath, JSON.stringify(logData, null, 2));
    } catch (error) {
      console.error('Failed to persist scraping logs:', error);
    }
  }

  async loadPersistedLogs() {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf8');
      const logData = JSON.parse(data);

      if (logData.globalStats) {
        this.globalStats = { ...this.globalStats, ...logData.globalStats };
      }

      if (logData.recentErrors) {
        this.errorLog = logData.recentErrors;
      }

      console.log('Loaded persisted scraping logs');
    } catch (error) {
      console.log('No persisted scraping logs found, starting fresh');
    }
  }

  cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAge;
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < cutoff && session.status !== 'running') {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    console.log(`Cleaned up ${cleaned} old scraping sessions`);
    return cleaned;
  }
}

// Singleton instance
const scrapingMonitor = new ScrapingMonitor();

// Load persisted data on startup
scrapingMonitor.loadPersistedLogs().catch(console.error);

// Cleanup old sessions every hour
setInterval(() => {
  scrapingMonitor.cleanupOldSessions();
}, 60 * 60 * 1000);

module.exports = scrapingMonitor;