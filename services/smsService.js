const twilio = require('twilio');
const ErrorHandler = require('../utils/errorHandler');
const RetryService = require('../utils/retryService');

class SMSService {
  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendSMS(to, message, type = 'fallback') {
    const retryService = RetryService.create({ maxRetries: 3, baseDelay: 2000 });

    try {
      const result = await retryService.executeWithRetry(
        async () => {
          // Ensure message is within SMS limits (160 characters for single SMS)
          const truncatedMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;

          const messageResponse = await this.client.messages.create({
            body: truncatedMessage,
            from: this.fromNumber,
            to: to
          });

          console.log('SMS sent successfully:', messageResponse.sid);

          return {
            messageId: messageResponse.sid,
            success: true
          };
        },
        `SMS send to ${to}`,
        { to, type }
      );

      return result;
    } catch (error) {
      throw ErrorHandler.handleServiceError('sms', 'send', error);
    }
  }

  // Send urgent SMS with priority
  async sendUrgentSMS(to, message) {
    try {
      const urgentMessage = `URGENT: ${message}`;

      const messageResponse = await this.client.messages.create({
        body: urgentMessage,
        from: this.fromNumber,
        to: to,
        // Twilio doesn't have built-in priority, but we can use status callback for tracking
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL
      });

      return {
        messageId: messageResponse.sid,
        success: true
      };
    } catch (error) {
      throw ErrorHandler.handleServiceError('sms', 'send', error);
    }
  }

  // Alternative Fast2SMS integration
  async sendViaFast2SMS(to, message, type = 'fallback') {
    const axios = require('axios');

    try {
      const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'v3',
        sender_id: process.env.FAST2SMS_SENDER_ID,
        message: message,
        language: 'english',
        flash: 0,
        numbers: to
      }, {
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.return) {
        console.log('Fast2SMS sent successfully:', response.data.request_id);
        return {
          messageId: response.data.request_id,
          success: true
        };
      } else {
        throw new Error('Fast2SMS API returned false');
      }
    } catch (error) {
      throw ErrorHandler.handleServiceError('sms', 'send', error);
    }
  }

  // Send bulk SMS for fallback scenarios
  async sendBulkSMS(recipients, message, type = 'fallback') {
    try {
      const messages = recipients.map(recipient => ({
        body: message,
        from: this.fromNumber,
        to: recipient
      }));

      const results = [];
      for (const msg of messages) {
        try {
          const result = await this.client.messages.create(msg);
          results.push({ to: msg.to, messageId: result.sid, success: true });
        } catch (error) {
          results.push({ to: msg.to, error: error.message, success: false });
        }
      }

      return results;
    } catch (error) {
      throw ErrorHandler.handleServiceError('sms', 'send', error);
    }
  }

  // Check SMS delivery status
  async checkDeliveryStatus(messageId) {
    try {
      const message = await this.client.messages(messageId).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      throw ErrorHandler.handleServiceError('sms', 'status', error);
    }
  }
}

module.exports = new SMSService();