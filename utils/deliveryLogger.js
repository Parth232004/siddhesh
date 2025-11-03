const fs = require('fs').promises;
const path = require('path');

class DeliveryLogger {
  constructor(logDir = './logs') {
    this.logDir = logDir;
    this.deliveryLogFile = path.join(logDir, 'delivery.log');
    this.errorLogFile = path.join(logDir, 'errors.log');
  }

  // Initialize log directory
  async initialize() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  // Log successful delivery
  async logSuccessfulDelivery(deliveryData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'SUCCESS',
      ...deliveryData,
      status: 'delivered'
    };

    await this.writeToFile(this.deliveryLogFile, logEntry);
    console.log(`✅ Delivery logged: ${deliveryData.channel} to ${deliveryData.recipient}`);
  }

  // Log failed delivery
  async logFailedDelivery(deliveryData, error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'FAILED',
      ...deliveryData,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        details: error.response?.data
      },
      retryCount: deliveryData.retryCount || 0,
      status: 'failed'
    };

    await this.writeToFile(this.deliveryLogFile, logEntry);
    await this.writeToFile(this.errorLogFile, logEntry);

    console.error(`❌ Delivery failed: ${deliveryData.channel} to ${deliveryData.recipient} - ${error.message}`);
  }

  // Log retry attempt
  async logRetryAttempt(deliveryData, attemptNumber, error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'RETRY',
      attemptNumber,
      ...deliveryData,
      error: {
        message: error.message,
        code: error.code
      },
      status: 'retrying'
    };

    await this.writeToFile(this.deliveryLogFile, logEntry);
    console.warn(`🔄 Retry ${attemptNumber}: ${deliveryData.channel} to ${deliveryData.recipient}`);
  }

  // Get delivery statistics
  async getDeliveryStats(timeRange = '24h') {
    try {
      const logs = await this.readLogFile(this.deliveryLogFile);
      const now = new Date();
      const timeLimit = this.getTimeLimit(now, timeRange);

      const stats = {
        total: 0,
        successful: 0,
        failed: 0,
        retried: 0,
        byChannel: {},
        timeRange
      };

      logs.forEach(entry => {
        const entryTime = new Date(entry.timestamp);
        if (entryTime >= timeLimit) {
          stats.total++;

          if (entry.type === 'SUCCESS') {
            stats.successful++;
          } else if (entry.type === 'FAILED') {
            stats.failed++;
          } else if (entry.type === 'RETRY') {
            stats.retried++;
          }

          // Channel statistics
          const channel = entry.channel;
          if (!stats.byChannel[channel]) {
            stats.byChannel[channel] = { total: 0, successful: 0, failed: 0 };
          }
          stats.byChannel[channel].total++;
          if (entry.type === 'SUCCESS') {
            stats.byChannel[channel].successful++;
          } else if (entry.type === 'FAILED') {
            stats.byChannel[channel].failed++;
          }
        }
      });

      stats.successRate = stats.total > 0 ? (stats.successful / stats.total * 100).toFixed(2) + '%' : '0%';
      return stats;
    } catch (error) {
      console.error('Failed to get delivery stats:', error);
      return { error: 'Failed to read delivery statistics' };
    }
  }

  // Get recent failed deliveries
  async getRecentFailures(limit = 10) {
    try {
      const logs = await this.readLogFile(this.deliveryLogFile);
      return logs
        .filter(entry => entry.type === 'FAILED')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent failures:', error);
      return [];
    }
  }

  // Write to log file
  async writeToFile(filePath, data) {
    try {
      const logLine = JSON.stringify(data) + '\n';
      await fs.appendFile(filePath, logLine, 'utf8');
    } catch (error) {
      console.error(`Failed to write to log file ${filePath}:`, error);
    }
  }

  // Read log file
  async readLogFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter(entry => entry !== null);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // File doesn't exist yet
      }
      throw error;
    }
  }

  // Get time limit for filtering
  getTimeLimit(now, timeRange) {
    const limits = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const ms = limits[timeRange] || limits['24h'];
    return new Date(now.getTime() - ms);
  }

  // Clean old logs (keep last 30 days)
  async cleanOldLogs() {
    try {
      const files = [this.deliveryLogFile, this.errorLogFile];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      for (const file of files) {
        const logs = await this.readLogFile(file);
        const recentLogs = logs.filter(entry =>
          new Date(entry.timestamp) >= cutoffDate
        );

        if (recentLogs.length !== logs.length) {
          // Rewrite file with only recent logs
          const content = recentLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
          await fs.writeFile(file, content, 'utf8');
          console.log(`Cleaned ${logs.length - recentLogs.length} old log entries from ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }
}

module.exports = new DeliveryLogger();