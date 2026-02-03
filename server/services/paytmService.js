const https = require('https');
const PaytmChecksum = require('paytmchecksum');
// Note: The paytm-pg-node-sdk usually exports specific modules. 
// We will use standard REST calls with Checksum helper for maximum control as SDKs can be wrappers.
// Actually, let's use the official logic for checksum generation and standard https/axios for requests.

class PaytmService {
  constructor() {
    this.mid = process.env.PAYTM_MID;
    this.key = process.env.PAYTM_MERCHANT_KEY;
    this.website = process.env.PAYTM_WEBSITE || "WEBSTAGING";
    this.host = this.website === 'WEBSTAGING'
      ? 'securegw-stage.paytm.in'
      : 'securegw.paytm.in'; // Production host

    this.callbackUrl = process.env.PAYTM_CALLBACK_URL;
  }

  /**
   * Initiate Transaction to get Token
   * @param {String} orderId 
   * @param {String} amount 
   * @param {String} customerId 
   */
  async initiateTransaction(orderId, amount, customerId, customerEmail, customerPhone) {

    // [FIX] Use Paytm's internal callback to bypass localhost validation errors
    // Once this works, you must use NGROK for your local server to handle updates.
    const safeCallbackUrl = `https://securegw-stage.paytm.in/theia/paytmCallback?ORDER_ID=${orderId}`;

    const paytmParams = {
      body: {
        "requestType": "Payment",
        "mid": this.mid,
        "websiteName": this.website,
        "orderId": orderId,
        "callbackUrl": safeCallbackUrl, // <--- CHANGED THIS
        "txnAmount": {
          "value": amount.toString(),
          "currency": "INR",
        },
        "userInfo": {
          "custId": customerId.toString(),
          // [OPTIONAL] Comment these out if it still fails (some Test IDs dislike email/mobile)
          "mobile": customerPhone || "9999999999",
          "email": customerEmail || "test@example.com",
        },
        "channelId": "WEB",
        "industryTypeId": "Retail"
      }
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), this.key);
    paytmParams.head = {
      "signature": checksum
    };

    return this.makeRequest('/theia/api/v1/initiateTransaction', paytmParams);
  }
  /**
   * Verify Payment Status
   * @param {String} orderId 
   */
  async getTxnStatus(orderId) {
    const paytmParams = {
      body: {
        "mid": this.mid,
        "orderId": orderId,
      }
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), this.key);
    paytmParams.head = {
      "signature": checksum
    };

    return this.makeRequest('/v3/order/status', paytmParams);
  }

  /**
   * Initiate Refund
   * @param {String} orderId 
   * @param {String} txnId - Paytm Transaction ID from Payment
   * @param {String} refId - Unique Refund ID (e.g., REF_ORDERID)
   * @param {String} amount 
   */
  async initiateRefund(orderId, txnId, refId, amount) {
    const paytmParams = {
      body: {
        "mid": this.mid,
        "txnType": "REFUND",
        "orderId": orderId,
        "txnId": txnId,
        "refId": refId,
        "refundAmount": amount.toString(),
      }
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), this.key);
    paytmParams.head = {
      "signature": checksum
    };

    return this.makeRequest('/refund/apply', paytmParams);
  }

  /**
   * Get Refund Status
   * @param {String} orderId 
   * @param {String} refId 
   */
  async getRefundStatus(orderId, refId) {
    const paytmParams = {
      body: {
        "mid": this.mid,
        "orderId": orderId,
        "refId": refId,
      }
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), this.key);
    paytmParams.head = {
      "signature": checksum
    };

    return this.makeRequest('/v2/refund/status', paytmParams);
  }

  /**
   * Validate Webhook/Callback Checksum
   */
  async validateChecksum(params, checksum) {
    return PaytmChecksum.verifySignature(params, this.key, checksum);
  }

  // Helper for making HTTPS calls
  makeRequest(endpoint, params) {
    return new Promise((resolve, reject) => {
      const post_data = JSON.stringify(params);

      const options = {
        hostname: this.host,
        port: 443,
        path: `${endpoint}?mid=${this.mid}&orderId=${params.body.orderId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': post_data.length
        }
      };

      const req = https.request(options, (res) => {
        let response = "";
        res.on('data', (chunk) => {
          response += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(response));
          } catch (e) {
            console.error("Paytm Response Parse Error", response);
            reject(e);
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.write(post_data);
      req.end();
    });
  }
}

module.exports = new PaytmService();
