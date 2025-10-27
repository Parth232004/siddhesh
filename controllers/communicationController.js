const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const telegramService = require('../services/telegramService');
const smsService = require('../services/smsService');
const InputValidator = require('../utils/inputValidator');

module.exports = (eventEmitter) => {
  // Send email
  router.post('/email', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('email', req.body);
      const { to, subject, body, type = process.env.DEFAULT_EMAIL_TYPE || 'transactional' } = validatedPayload;
      const result = await emailService.sendEmail(to, subject, body, type);

      // Emit karma event
      eventEmitter.emit('communicationSent', {
        userId: validatedPayload.userId,
        channel: 'email',
        type: type,
        messageType: subject.includes('Order') ? 'Order Update' : 'Report',
        success: true
      });

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send WhatsApp message
  router.post('/whatsapp', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('whatsapp', req.body);
      const { to, message, type = process.env.DEFAULT_WHATSAPP_TYPE || 'delivery' } = validatedPayload;
      const result = await whatsappService.sendMessage(to, message, type);

      eventEmitter.emit('communicationSent', {
        userId: validatedPayload.userId,
        channel: 'whatsapp',
        type: type,
        messageType: type === 'delivery' ? 'Delivery Alert' : 'CRM Alert',
        success: true
      });

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send Telegram message
  router.post('/telegram', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('telegram', req.body);
      const { chatId, message, type = process.env.DEFAULT_TELEGRAM_TYPE || 'notification' } = validatedPayload;
      const result = await telegramService.sendMessage(chatId, message, type);

      eventEmitter.emit('communicationSent', {
        userId: validatedPayload.userId,
        channel: 'telegram',
        type: type,
        messageType: type === 'notification' ? 'Quick Notification' : 'Command Response',
        success: true
      });

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send SMS
  router.post('/sms', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('sms', req.body);
      const { to, message, type = process.env.DEFAULT_SMS_TYPE || 'fallback' } = validatedPayload;
      const result = await smsService.sendSMS(to, message, type);

      eventEmitter.emit('communicationSent', {
        userId: validatedPayload.userId,
        channel: 'sms',
        type: type,
        messageType: type === 'fallback' ? 'Fallback Update' : 'Urgent Update',
        success: true
      });

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Unified send endpoint
  router.post('/send', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('unified', req.body);
      const { channel, ...messageData } = validatedPayload;
      let result;
      let messageType;

      switch (channel) {
        case 'email':
          result = await emailService.sendEmail(messageData.to, messageData.subject, messageData.body, messageData.type);
          messageType = messageData.subject && messageData.subject.includes('Order') ? 'Order Update' : 'Report';
          break;
        case 'whatsapp':
          result = await whatsappService.sendMessage(messageData.to, messageData.message, messageData.type);
          messageType = messageData.type === 'delivery' ? 'Delivery Alert' : 'CRM Alert';
          break;
        case 'telegram':
          result = await telegramService.sendMessage(messageData.chatId, messageData.message, messageData.type);
          messageType = messageData.type === 'notification' ? 'Quick Notification' : 'Command Response';
          break;
        case 'sms':
          result = await smsService.sendSMS(messageData.to, messageData.message, messageData.type);
          messageType = messageData.type === 'fallback' ? 'Fallback Update' : 'Urgent Update';
          break;
        default:
          throw new Error('Invalid channel specified');
      }

      eventEmitter.emit('communicationSent', {
        userId: messageData.userId,
        channel: channel,
        type: messageData.type || 'general',
        messageType: messageType,
        success: true
      });

      res.json({ success: true, channel, messageId: result.messageId });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};