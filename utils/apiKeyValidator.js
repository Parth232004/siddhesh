const axios = require('axios');

class APIKeyValidator {
  constructor() {
    this.validationCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Validate Zoho Mail API key
  async validateZohoAPI() {
    if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
      console.warn('⚠️  Zoho Mail credentials not configured');
      return false;
    }

    const cacheKey = 'zoho';
    if (this.isValidCache(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    try {
      // Test SMTP connection by attempting to create transporter
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ZOHO_EMAIL,
          pass: process.env.ZOHO_PASSWORD
        }
      });

      // Verify connection
      await transporter.verify();
      console.log('✅ Zoho Mail API validation successful');
      this.setCache(cacheKey, true);
      return true;
    } catch (error) {
      console.error('❌ Zoho Mail API validation failed:', error.message);
      this.setCache(cacheKey, false);
      return false;
    }
  }

  // Validate WhatsApp API key
  async validateWhatsAppAPI() {
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
      console.warn('⚠️  WhatsApp Cloud API not configured');
      return false;
    }

    const cacheKey = 'whatsapp';
    if (this.isValidCache(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
          },
          timeout: 5000
        }
      );

      if (response.data.id) {
        console.log('✅ WhatsApp Cloud API validation successful');
        this.setCache(cacheKey, true);
        return true;
      }
    } catch (error) {
      console.error('❌ WhatsApp Cloud API validation failed:', error.response?.data?.error?.message || error.message);
      this.setCache(cacheKey, false);
      return false;
    }
  }

  // Validate Twilio API keys
  async validateTwilioAPI() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('⚠️  Twilio API not configured');
      return false;
    }

    const cacheKey = 'twilio';
    if (this.isValidCache(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      // Test API connection by fetching account info
      await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      console.log('✅ Twilio API validation successful');
      this.setCache(cacheKey, true);
      return true;
    } catch (error) {
      console.error('❌ Twilio API validation failed:', error.message);
      this.setCache(cacheKey, false);
      return false;
    }
  }

  // Validate Telegram Bot API
  async validateTelegramAPI() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn('⚠️  Telegram Bot API not configured');
      return false;
    }

    const cacheKey = 'telegram';
    if (this.isValidCache(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
        { timeout: 5000 }
      );

      if (response.data.ok && response.data.result.is_bot) {
        console.log('✅ Telegram Bot API validation successful');
        this.setCache(cacheKey, true);
        return true;
      }
    } catch (error) {
      console.error('❌ Telegram Bot API validation failed:', error.response?.data?.description || error.message);
      this.setCache(cacheKey, false);
      return false;
    }
  }

  // Validate Fast2SMS API key
  async validateFast2SMSAPI() {
    if (!process.env.FAST2SMS_API_KEY) {
      console.warn('⚠️  Fast2SMS API not configured');
      return false;
    }

    const cacheKey = 'fast2sms';
    if (this.isValidCache(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    try {
      const response = await axios.get(
        'https://www.fast2sms.com/dev/wallet',
        {
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY
          },
          timeout: 5000
        }
      );

      if (response.data.wallet) {
        console.log('✅ Fast2SMS API validation successful');
        this.setCache(cacheKey, true);
        return true;
      }
    } catch (error) {
      console.error('❌ Fast2SMS API validation failed:', error.response?.data?.message || error.message);
      this.setCache(cacheKey, false);
      return false;
    }
  }

  // Validate Karma Tracker API
  async validateKarmaTrackerAPI() {
    if (!process.env.KARMA_TRACKER_BASE_URL || !process.env.KARMA_TRACKER_API_KEY) {
      console.warn('⚠️  Karma Tracker API not configured');
      return false;
    }

    const cacheKey = 'karma';
    if (this.isValidCache(cacheKey)) {
      return this.validationCache.get(cacheKey);
    }

    try {
      // Test API connection with a simple ping or health check
      const response = await axios.get(
        `${process.env.KARMA_TRACKER_BASE_URL}/health`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.KARMA_TRACKER_API_KEY}`
          },
          timeout: 5000
        }
      );

      if (response.status === 200) {
        console.log('✅ Karma Tracker API validation successful');
        this.setCache(cacheKey, true);
        return true;
      }
    } catch (error) {
      // If health endpoint doesn't exist, try a different validation
      try {
        // Attempt to get karma for a test user (this might fail but will validate API key)
        await axios.get(
          `${process.env.KARMA_TRACKER_BASE_URL}/api/users/test-user/karma`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.KARMA_TRACKER_API_KEY}`
            },
            timeout: 3000
          }
        );
        console.log('✅ Karma Tracker API validation successful');
        this.setCache(cacheKey, true);
        return true;
      } catch (innerError) {
        console.error('❌ Karma Tracker API validation failed:', error.message);
        this.setCache(cacheKey, false);
        return false;
      }
    }
  }

  // Validate all configured APIs
  async validateAllAPIs() {
    console.log('🔍 Validating API keys and configurations...');

    const validations = await Promise.allSettled([
      this.validateZohoAPI(),
      this.validateWhatsAppAPI(),
      this.validateTwilioAPI(),
      this.validateTelegramAPI(),
      this.validateFast2SMSAPI(),
      this.validateKarmaTrackerAPI()
    ]);

    const results = {
      zoho: validations[0].status === 'fulfilled' ? validations[0].value : false,
      whatsapp: validations[1].status === 'fulfilled' ? validations[1].value : false,
      twilio: validations[2].status === 'fulfilled' ? validations[2].value : false,
      telegram: validations[3].status === 'fulfilled' ? validations[3].value : false,
      fast2sms: validations[4].status === 'fulfilled' ? validations[4].value : false,
      karmaTracker: validations[5].status === 'fulfilled' ? validations[5].value : false
    };

    // Check if at least one communication provider is working
    const hasCommunicationProvider = results.zoho || results.whatsapp || results.twilio || results.telegram || results.fast2sms;

    if (!hasCommunicationProvider) {
      console.error('❌ CRITICAL: No communication providers are properly configured!');
      console.error('   At least one of: Zoho Mail, WhatsApp, Twilio, Telegram, or Fast2SMS must be working');
    }

    if (!results.karmaTracker) {
      console.error('❌ CRITICAL: Karma Tracker API is not accessible!');
      console.error('   Karma tracking is required for the service to function properly');
    }

    const summary = {
      communicationProviders: {
        total: 5,
        working: Object.values(results).slice(0, 5).filter(Boolean).length,
        details: {
          zoho: results.zoho,
          whatsapp: results.whatsapp,
          twilio: results.twilio,
          telegram: results.telegram,
          fast2sms: results.fast2sms
        }
      },
      karmaTracker: results.karmaTracker,
      overall: hasCommunicationProvider && results.karmaTracker
    };

    console.log('📊 API Validation Summary:');
    console.log(`   Communication Providers: ${summary.communicationProviders.working}/${summary.communicationProviders.total} working`);
    console.log(`   Karma Tracker: ${summary.karmaTracker ? '✅ Working' : '❌ Failed'}`);
    console.log(`   Overall Status: ${summary.overall ? '✅ Ready for production' : '❌ Configuration issues detected'}`);

    return summary;
  }

  // Check if cache entry is still valid
  isValidCache(key) {
    if (!this.validationCache.has(key)) return false;

    const entry = this.validationCache.get(key);
    return (Date.now() - entry.timestamp) < this.cacheTimeout;
  }

  // Set cache entry
  setCache(key, value) {
    this.validationCache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  // Clear validation cache
  clearCache() {
    this.validationCache.clear();
    console.log('🧹 API validation cache cleared');
  }
}

module.exports = new APIKeyValidator();