const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const telegramService = require('../services/telegramService');
const smsService = require('../services/smsService');
const InputValidator = require('../utils/inputValidator');
const deliveryLogger = require('../utils/deliveryLogger');

module.exports = (eventEmitter) => {
  // Helper function to determine message type for failed events
  function getMessageTypeForChannel(channel, data) {
    switch (channel) {
      case 'email':
        return data.subject && data.subject.includes('Order') ? 'Order Update' : 'Report';
      case 'whatsapp':
        return (data.type || 'delivery') === 'delivery' ? 'Delivery Alert' : 'CRM Alert';
      case 'telegram':
        return (data.type || 'notification') === 'notification' ? 'Quick Notification' : 'Command Response';
      case 'sms':
        return (data.type || 'fallback') === 'fallback' ? 'Fallback Update' : 'Urgent Update';
      default:
        return 'General Message';
    }
  }
  // Send email
  router.post('/email', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('email', req.body);
      const { to, subject, body, type = process.env.DEFAULT_EMAIL_TYPE || 'transactional' } = validatedPayload;
      const result = await emailService.sendEmail(to, subject, body, type);

      // Log successful delivery
      await deliveryLogger.logSuccessfulDelivery({
        channel: 'email',
        recipient: validatedPayload.to,
        userId: validatedPayload.userId,
        messageType: subject.includes('Order') ? 'Order Update' : 'Report',
        messageId: result.messageId
      });

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
      // Log failed delivery
      await deliveryLogger.logFailedDelivery({
        channel: 'sms',
        recipient: req.body.to,
        userId: req.body.userId,
        messageType: (req.body.type || 'fallback') === 'fallback' ? 'Fallback Update' : 'Urgent Update'
      }, error);

      // Emit failed karma event
      eventEmitter.emit('communicationSent', {
        userId: req.body.userId,
        channel: 'sms',
        type: req.body.type || 'fallback',
        messageType: (req.body.type || 'fallback') === 'fallback' ? 'Fallback Update' : 'Urgent Update',
        success: false
      });

      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send WhatsApp message
  router.post('/whatsapp', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('whatsapp', req.body);
      const { to, message, type = process.env.DEFAULT_WHATSAPP_TYPE || 'delivery' } = validatedPayload;
      const result = await whatsappService.sendMessage(to, message, type);

      // Log successful delivery
      await deliveryLogger.logSuccessfulDelivery({
        channel: 'whatsapp',
        recipient: validatedPayload.to,
        userId: validatedPayload.userId,
        messageType: type === 'delivery' ? 'Delivery Alert' : 'CRM Alert',
        messageId: result.messageId
      });

      eventEmitter.emit('communicationSent', {
        userId: validatedPayload.userId,
        channel: 'whatsapp',
        type: type,
        messageType: type === 'delivery' ? 'Delivery Alert' : 'CRM Alert',
        success: true
      });

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      // Log failed delivery
      await deliveryLogger.logFailedDelivery({
        channel: 'telegram',
        recipient: req.body.chatId,
        userId: req.body.userId,
        messageType: (req.body.type || 'notification') === 'notification' ? 'Quick Notification' : 'Command Response'
      }, error);

      // Emit failed karma event
      eventEmitter.emit('communicationSent', {
        userId: req.body.userId,
        channel: 'telegram',
        type: req.body.type || 'notification',
        messageType: (req.body.type || 'notification') === 'notification' ? 'Quick Notification' : 'Command Response',
        success: false
      });

      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send Telegram message
  router.post('/telegram', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('telegram', req.body);
      const { chatId, message, type = process.env.DEFAULT_TELEGRAM_TYPE || 'notification' } = validatedPayload;
      const result = await telegramService.sendMessage(chatId, message, type);

      // Log successful delivery
      await deliveryLogger.logSuccessfulDelivery({
        channel: 'telegram',
        recipient: validatedPayload.chatId,
        userId: validatedPayload.userId,
        messageType: type === 'notification' ? 'Quick Notification' : 'Command Response',
        messageId: result.messageId
      });

      eventEmitter.emit('communicationSent', {
        userId: validatedPayload.userId,
        channel: 'telegram',
        type: type,
        messageType: type === 'notification' ? 'Quick Notification' : 'Command Response',
        success: true
      });

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      // Log failed delivery
      await deliveryLogger.logFailedDelivery({
        channel: 'email',
        recipient: req.body.to,
        userId: req.body.userId,
        messageType: req.body.subject && req.body.subject.includes('Order') ? 'Order Update' : 'Report'
      }, error);

      // Emit failed karma event
      eventEmitter.emit('communicationSent', {
        userId: req.body.userId,
        channel: 'email',
        type: req.body.type || 'transactional',
        messageType: req.body.subject && req.body.subject.includes('Order') ? 'Order Update' : 'Report',
        success: false
      });

      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send SMS
  router.post('/sms', async (req, res) => {
    try {
      const validatedPayload = InputValidator.validateAndSanitizePayload('sms', req.body);
      const { to, message, type = process.env.DEFAULT_SMS_TYPE || 'fallback' } = validatedPayload;
      const result = await smsService.sendSMS(to, message, type);

      // Log successful delivery
      await deliveryLogger.logSuccessfulDelivery({
        channel: 'sms',
        recipient: validatedPayload.to,
        userId: validatedPayload.userId,
        messageType: type === 'fallback' ? 'Fallback Update' : 'Urgent Update',
        messageId: result.messageId
      });

      eventEmitter.emit('communicationSent', {
        userId: validatedPayload.userId,
        channel: 'sms',
        type: type,
        messageType: type === 'fallback' ? 'Fallback Update' : 'Urgent Update',
        success: true
      });

      res.json({ success: true, messageId: result.messageId });
    } catch (error) {
      // Log failed delivery
      await deliveryLogger.logFailedDelivery({
        channel: 'whatsapp',
        recipient: req.body.to,
        userId: req.body.userId,
        messageType: (req.body.type || 'delivery') === 'delivery' ? 'Delivery Alert' : 'CRM Alert'
      }, error);

      // Emit failed karma event
      eventEmitter.emit('communicationSent', {
        userId: req.body.userId,
        channel: 'whatsapp',
        type: req.body.type || 'delivery',
        messageType: (req.body.type || 'delivery') === 'delivery' ? 'Delivery Alert' : 'CRM Alert',
        success: false
      });

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

      // Log successful delivery
      await deliveryLogger.logSuccessfulDelivery({
        channel: channel,
        recipient: messageData.to || messageData.chatId,
        userId: messageData.userId,
        messageType: messageType,
        messageId: result.messageId
      });

      eventEmitter.emit('communicationSent', {
        userId: messageData.userId,
        channel: channel,
        type: messageData.type || 'general',
        messageType: messageType,
        success: true
      });

      res.json({ success: true, channel, messageId: result.messageId });
    } catch (error) {
      // Log failed delivery
      await deliveryLogger.logFailedDelivery({
        channel: req.body.channel,
        recipient: req.body.to || req.body.chatId,
        userId: req.body.userId,
        messageType: getMessageTypeForChannel(req.body.channel, req.body)
      }, error);

      // Emit failed karma event for unified endpoint
      eventEmitter.emit('communicationSent', {
        userId: req.body.userId,
        channel: req.body.channel,
        type: req.body.type || 'general',
        messageType: getMessageTypeForChannel(req.body.channel, req.body),
        success: false
      });

      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};