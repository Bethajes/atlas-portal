const axios = require('axios');

/**
 * AwashService handles integration with ArifPay for Awash Birr payments.
 */
class AwashService {
  constructor() {
    this.apiKey = process.env.ARIFPAY_API_KEY;
    this.baseUrl = process.env.ARIFPAY_BASE_URL || 'https://developer.arifpay.org/awash/transfer/direct';
  }

  /**
   * Initiates a payment via ArifPay
   * @param {Object} paymentData - { amount, phoneNumber, reference }
   * @returns {Promise<Object>} - The response from ArifPay
   */
  async initiatePayment(paymentData) {
    try {
      const payload = {
        amount: paymentData.amount,
        phone: paymentData.phoneNumber,
        msg: `Payment for New Generation University College - ${paymentData.reference}`,
        reference: paymentData.reference,
        beneficiary_name: 'New Generation University College',
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'x-arifpay-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10s timeout
      });

      // ArifPay typically returns a transaction ID or external reference
      // We expect the response structure to include a transaction ID
      if (response.data && response.data.data) {
        return {
          success: true,
          externalId: response.data.data.transactionId || response.data.data.id,
          status: 'PROCESSING',
          rawResponse: response.data,
        };
      }

      throw new Error('Invalid response from ArifPay');
    } catch (error) {
      console.error('Awash Initiation Error:', error.response?.data || error.message);
      
      // Implement basic retry logic for 5xx errors
      if (error.response?.status >= 500) {
        return this.retryInitiation(paymentData, 1);
      }

      throw new Error(error.response?.data?.message || 'Failed to initiate Awash payment');
    }
  }

  /**
   * Simple retry logic for failed API calls
   */
  async retryInitiation(paymentData, attempt) {
    if (attempt > 3) throw new Error('Failed to initiate payment after 3 attempts');
    
    console.log(`Retrying initiation attempt ${attempt}...`);
    await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    return this.initiatePayment(paymentData);
  }

  /**
   * Verifies a transaction status with ArifPay
   * @param {string} externalId - The transaction ID from ArifPay
   * @returns {Promise<Object>}
   */
  async verifyTransaction(externalId) {
    try {
      const verifyUrl = `https://developer.arifpay.org/awash/transfer/verify/${externalId}`;
      const response = await axios.get(verifyUrl, {
        headers: {
          'x-arifpay-key': this.apiKey,
        },
      });

      if (response.data && response.data.data) {
        return {
          success: response.data.data.status === 'SUCCESS',
          status: response.data.data.status,
          amount: response.data.data.amount,
          reference: response.data.data.reference,
          rawResponse: response.data,
        };
      }

      return { success: false, message: 'Verification failed' };
    } catch (error) {
      console.error('Awash Verification Error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifies the webhook signature
   * @param {Object} payload - The request body
   * @param {string} signature - The signature header
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const secret = process.env.ARIFPAY_WEBHOOK_SECRET;
    
    if (!secret || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return expectedSignature === signature;
  }
}

module.exports = new AwashService();
