const axios = require('axios');

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_API_URL = process.env.CHAPA_API_URL || 'https://api.chapa.co/v1';

/**
 * Initialize a payment with Chapa
 * @param {Object} paymentData - { amount, email, first_name, last_name, tx_ref, callback_url, return_url }
 * @returns {Promise<Object>} - Chapa response data
 */
const initializePayment = async (paymentData) => {
  try {
    const response = await axios.post(
      `${CHAPA_API_URL}/transaction/initialize`,
      {
        ...paymentData,
        currency: 'ETB',
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Chapa Initialization Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initialize payment with Chapa');
  }
};

/**
 * Verify a transaction with Chapa
 * @param {string} tx_ref - Transaction reference
 * @returns {Promise<Object>} - Verification data
 */
const verifyTransaction = async (tx_ref) => {
  try {
    const response = await axios.get(
      `${CHAPA_API_URL}/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Chapa Verification Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to verify transaction with Chapa');
  }
};

module.exports = {
  initializePayment,
  verifyTransaction,
};
