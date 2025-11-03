# Logistics Manager Communication Service - API Documentation

## Overview

The Logistics Manager Communication Service provides a unified API for multi-channel communication including Email, WhatsApp, Telegram, and SMS. The service integrates with karma tracking to reward successful communications.

## Base URL
```
http://localhost:3000/api/communication
```

## Authentication
Currently, no authentication is required. In production, implement proper authentication mechanisms.

## API Endpoints

### 1. Send Email
**POST** `/email`

Send transactional or report emails via Zoho Mail.

#### Request Body
```json
{
  "to": "recipient@example.com",
  "subject": "Order Update #12345",
  "body": "<h1>Your order has been updated</h1><p>Details here...</p>",
  "type": "transactional",
  "userId": "user-123"
}
```

#### Parameters
- `to` (string, required): Recipient email address
- `subject` (string, required): Email subject (max 200 chars)
- `body` (string, required): HTML email body (max 10,000 chars)
- `type` (string, optional): "transactional" or "report" (default: "transactional")
- `userId` (string, required): User identifier for karma tracking

#### Response
```json
{
  "success": true,
  "messageId": "email-message-id-123"
}
```

### 2. Send WhatsApp Message
**POST** `/whatsapp`

Send WhatsApp messages via Cloud API or Twilio.

#### Request Body
```json
{
  "to": "+1234567890",
  "message": "Your delivery is on the way! 🚚",
  "type": "delivery",
  "userId": "user-456"
}
```

#### Parameters
- `to` (string, required): Recipient phone number (international format)
- `message` (string, required): Message content (max 4,096 chars)
- `type` (string, optional): "delivery" or "crm" (default: "delivery")
- `userId` (string, required): User identifier for karma tracking

#### Response
```json
{
  "success": true,
  "messageId": "whatsapp-message-id-456"
}
```

### 3. Send Telegram Message
**POST** `/telegram`

Send messages via Telegram Bot API.

#### Request Body
```json
{
  "chatId": "123456789",
  "message": "Quick notification: Order processed ✅",
  "type": "notification",
  "userId": "user-789"
}
```

#### Parameters
- `chatId` (string, required): Telegram chat ID (numeric)
- `message` (string, required): Message content (max 4,096 chars)
- `type` (string, optional): "notification" or "command" (default: "notification")
- `userId` (string, required): User identifier for karma tracking

#### Response
```json
{
  "success": true,
  "messageId": 1234567890
}
```

### 4. Send SMS
**POST** `/sms`

Send SMS via Twilio or Fast2SMS.

#### Request Body
```json
{
  "to": "+1234567890",
  "message": "Urgent: Delivery delayed due to weather",
  "type": "urgent",
  "userId": "user-101"
}
```

#### Parameters
- `to` (string, required): Recipient phone number (international format)
- `message` (string, required): Message content (max 160 chars, auto-truncated)
- `type` (string, optional): "fallback" or "urgent" (default: "fallback")
- `userId` (string, required): User identifier for karma tracking

#### Response
```json
{
  "success": true,
  "messageId": "sms-message-id-789"
}
```

### 5. Unified Send Endpoint
**POST** `/send`

Send messages through any configured channel using a unified interface.

#### Request Body
```json
{
  "channel": "email",
  "to": "recipient@example.com",
  "subject": "Order Confirmation",
  "body": "<p>Your order has been confirmed.</p>",
  "type": "transactional",
  "userId": "user-202"
}
```

#### Supported Channels
- `email`: Requires `to`, `subject`, `body`
- `whatsapp`: Requires `to`, `message`
- `telegram`: Requires `chatId`, `message`
- `sms`: Requires `to`, `message`

#### Response
```json
{
  "success": true,
  "channel": "email",
  "messageId": "message-id-999"
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": {
    "id": "ERR-1704123456789-abc123def",
    "message": "Failed to send email. Please try again later.",
    "timestamp": "2025-01-01T12:34:56.789Z"
  }
}
```

## Karma Points System

Successful communications earn karma points based on message type:

| Message Type | Points |
|-------------|--------|
| Order Update | 2 |
| Delivery Alert | 3 |
| CRM Alert | 1 |
| Quick Notification | 1 |
| Command Response | 2 |
| Fallback Update | 1 |
| Urgent Update | 4 |
| Report | 2 |

Failed communications result in -1 karma point penalty.

## Health Check

**GET** `/health`

Returns service health status.

#### Response
```json
{
  "status": "OK",
  "message": "Logistics Manager Communication Service is running"
}
```

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting in production based on:
- Per-user limits
- Per-channel limits
- Global API limits

## Webhook Integration

### Twilio Status Callbacks

Configure `TWILIO_STATUS_CALLBACK_URL` to receive SMS delivery status updates.

### WhatsApp Webhooks

Set up webhooks in Meta Developer Console to receive:
- Message delivery status
- User responses
- Message failures

### Telegram Webhooks

Configure webhook URL in BotFather to receive:
- User messages
- Callback queries
- Inline query responses

## Monitoring and Logging

### Delivery Logs

All message deliveries are logged to `./logs/delivery.log` with:
- Success/failure status
- Channel and recipient information
- Message IDs
- Error details for failures

### Error Logs

Detailed error information is logged to `./logs/errors.log` for debugging.

### Karma Events

All communication events are logged to the configured Karma Tracker API.

## Configuration

See `.env.sample` for all configuration options and setup instructions.

## Testing

Run integration tests with:
```bash
npm test
```

Run specific tests:
```bash
node integration-test.js
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure all required environment variables
3. Set up proper SSL/TLS certificates
4. Implement authentication and authorization
5. Configure monitoring and alerting
6. Set up log rotation for delivery logs
7. Configure rate limiting
8. Set up webhook endpoints for status callbacks