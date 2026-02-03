const axios = require('axios');

class ShiprocketService {
  constructor() {
    this.email = process.env.SHIPROCKET_EMAIL;
    this.password = process.env.SHIPROCKET_PASSWORD;
    this.baseUrl = 'https://apiv2.shiprocket.in/v1/external';
    this.token = null;
    this.tokenExpiresAt = null;
  }

  async authenticate() {
    // Return existing token if valid (buffer of 5 mins)
    if (this.token && this.tokenExpiresAt > Date.now() + 300000) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email: this.email,
        password: this.password,
      });

      this.token = response.data.token;
      // Token usually lasts 10 days, but we'll refresh every 24 hours to be safe
      this.tokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; 
      return this.token;
    } catch (error) {
      console.error('Shiprocket Auth Error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Shiprocket');
    }
  }

  async getHeaders() {
    const token = await this.authenticate();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // --- Core Logistics ---

  /**
   * Create a forward shipping order
   * @param {Object} orderData - Mapped order object
   */
  async createOrder(orderData) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/orders/create/adhoc`, orderData, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Create Order');
    }
  }

  /**
   * Cancel an order on Shiprocket
   * @param {Array} ids - Array of Shiprocket Order IDs
   */
  async cancelOrder(ids) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/orders/cancel`, { ids }, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Cancel Order');
    }
  }

  /**
   * Track a shipment by AWB
   * @param {String} awb 
   */
  async trackShipment(awb) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/courier/track/awb/${awb}`, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Track Shipment');
    }
  }

  /**
   * Check Serviceability for a pincode
   * @param {String} pickupPincode 
   * @param {String} deliveryPincode 
   * @param {Number} weight 
   * @param {Number} cod - 1 for COD, 0 for Prepaid
   */
  async checkServiceability(pickupPincode, deliveryPincode, weight, cod = 0) {
    try {
      const headers = await this.getHeaders();
      const url = `${this.baseUrl}/courier/serviceability?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&cod=${cod}&weight=${weight}`;
      const response = await axios.get(url, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Check Serviceability');
    }
  }

  /**
   * Generate AWB for a Shipment ID
   * @param {String} shipmentId 
   */
  async generateAWB(shipmentId) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/courier/assign/awb`, { shipment_id: shipmentId }, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Generate AWB');
    }
  }

  /**
   * Request Pickup
   * @param {Array} shipmentIds 
   */
  async requestPickup(shipmentIds) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/courier/generate/pickup`, { shipment_id: shipmentIds }, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Request Pickup');
    }
  }
  
  /**
   * Generate Label URL
   * @param {Array} shipmentIds 
   */
  async generateLabel(shipmentIds) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/courier/generate/label`, { shipment_id: shipmentIds }, { headers });
      return response.data; // Returns { label_created: 1, label_url: "..." }
    } catch (error) {
      this.handleError(error, 'Generate Label');
    }
  }

  // --- Returns ---

  /**
   * Create a return order
   * @param {Object} returnData 
   */
  async createReturnOrder(returnData) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/orders/create/return`, returnData, { headers });
      return response.data;
    } catch (error) {
      this.handleError(error, 'Create Return Order');
    }
  }

  handleError(error, context) {
    console.error(`Shiprocket ${context} Error:`, error.response?.data || error.message);
    const msg = error.response?.data?.message || error.message;
    throw new Error(`Shiprocket ${context} Failed: ${msg}`);
  }
}

module.exports = new ShiprocketService();
