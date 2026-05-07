const awashService = require('./providers/awashService');
const prisma = require('./prisma');

/**
 * PaymentService provides an abstraction layer over different payment providers.
 */
class PaymentService {
  constructor() {
    this.providers = {
      AWASH: awashService,
      // Future providers can be added here
      // TELEBIRR: telebirrService,
      // CBE: cbeService,
    };
  }

  /**
   * Initiates a payment process
   * @param {Object} data - { studentId, amount, phoneNumber, provider }
   */
  async initiate(data) {
    const { studentId, amount, phoneNumber, provider } = data;
    
    const providerService = this.providers[provider];
    if (!providerService) {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }

    // 1. Generate reference: ATLAS-{provider}-{studentId}-{timestamp}
    const timestamp = Date.now();
    const reference = `ATLAS-${provider}-${studentId}-${timestamp}`;

    // 2. Save payment as PENDING
    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        phoneNumber,
        provider,
        reference,
        status: 'PENDING',
        expiresAt: new Date(timestamp + 30 * 60 * 1000), // 30 minutes expiration
      },
    });

    try {
      // 3. Call provider-specific service
      const result = await providerService.initiatePayment({
        amount,
        phoneNumber,
        reference,
        studentId,
      });

      // 4. Update payment with external reference from provider
      return await prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: result.externalId,
          status: result.status || 'PROCESSING',
        },
      });
    } catch (error) {
      console.error(`Payment initiation failed for ${reference}:`, error.message);
      
      // Update status to FAILED if initiation fails
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'FAILED',
          notes: error.message 
        },
      });
      
      throw error;
    }
  }

  /**
   * Gets the current status of a payment and verifies with provider if needed
   * @param {string} reference 
   */
  async getStatus(reference) {
    const payment = await prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // If already successful or failed, return as is
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
      return payment;
    }

    // Check for expiration
    if (payment.expiresAt && new Date() > payment.expiresAt) {
      return await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'EXPIRED' },
      });
    }

    // If in PROCESSING state, try to verify with provider
    if (payment.status === 'PROCESSING' && payment.externalId) {
      const providerService = this.providers[payment.provider];
      const verification = await providerService.verifyTransaction(payment.externalId);

      if (verification.success) {
        return await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(),
          },
        });
      }
    }

    return payment;
  }

  /**
   * Handles webhook updates from providers
   * @param {string} provider 
   * @param {Object} payload 
   * @param {string} signature 
   */
  async handleWebhook(provider, payload, signature) {
    const providerService = this.providers[provider];
    if (!providerService) {
      throw new Error(`Unsupported provider for webhook: ${provider}`);
    }

    // 1. Verify signature
    const isValid = providerService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // 2. Extract transaction details (Implementation depends on provider payload)
    // For ArifPay/Awash example:
    const { reference, externalId, status } = this.extractDetailsFromPayload(provider, payload);

    // 3. Find payment record
    const payment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { reference: reference },
          { externalId: externalId }
        ]
      },
    });

    if (!payment) {
      throw new Error('Payment not found for webhook');
    }

    // 4. Idempotency: Don't re-process successful payments
    if (payment.status === 'SUCCESS') {
      return payment;
    }

    // 5. Verify with Provider API (Never trust webhook alone)
    const verification = await providerService.verifyTransaction(externalId || payment.externalId);

    if (verification.success) {
      return await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          paidAt: new Date(),
          externalId: externalId || payment.externalId, // ensure we have it
        },
      });
    } else if (status === 'FAILED') {
      return await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }

    return payment;
  }

  /**
   * Helper to normalize payload data across providers
   */
  extractDetailsFromPayload(provider, payload) {
    if (provider === 'AWASH') {
      return {
        reference: payload.reference || payload.data?.reference,
        externalId: payload.transactionId || payload.data?.transactionId || payload.data?.id,
        status: payload.status || payload.data?.status,
      };
    }
    return {};
  }
}

module.exports = new PaymentService();
