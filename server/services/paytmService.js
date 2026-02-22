const Paytm = require('paytm-pg-node-sdk');

class PaytmService {
  constructor() {
    this.mid = process.env.PAYTM_MID;
    this.key = process.env.PAYTM_MERCHANT_KEY;
    this.website = process.env.PAYTM_WEBSITE || "WEBSTAGING";

    // Initialize the official Node SDK globally
    const environment = process.env.PAYTM_ENV === 'PROD'
      ? Paytm.LibraryConstants.PRODUCTION_ENVIRONMENT
      : Paytm.LibraryConstants.STAGING_ENVIRONMENT;

    Paytm.MerchantProperties.initialize(environment, this.mid, this.key, this.website);

    // CRITICAL: Override the SDK's default callback URL
    // SDK default: https://pg-staging.paytm.in/MerchantSite/bankResponse
    // This causes SESSION_EXPIRED because CheckoutJS/showPaymentPage runs on securegw-stage.paytm.in
    // Must use the SAME domain for the callback
    if (process.env.PAYTM_CALLBACK_URL && process.env.PAYTM_CALLBACK_URL.trim() !== '') {
      Paytm.MerchantProperties.setCallbackUrl(process.env.PAYTM_CALLBACK_URL);
    } else {
      const defaultCallback = process.env.PAYTM_ENV === 'PROD'
        ? 'https://secure.paytmpayments.com/theia/paytmCallback?ORDER_ID='
        : 'https://securestage.paytmpayments.com/theia/paytmCallback?ORDER_ID=';
      Paytm.MerchantProperties.setCallbackUrl(defaultCallback);
    }

    console.log(`PaytmService initialized: MID=${this.mid}, ENV=${process.env.PAYTM_ENV}, WEBSITE=${this.website}`);
    console.log(`Callback URL: ${Paytm.MerchantProperties.getCallbackUrl()}`);
  }

  async initiateTransaction(orderId, amount, customerId, customerEmail, customerPhone) {
    const channelId = Paytm.EChannelId.WEB;
    const txnAmount = Paytm.Money.constructWithCurrencyAndValue(Paytm.EnumCurrency.INR, amount.toString());
    const userInfo = new Paytm.UserInfo(customerId.toString());

    if (customerEmail) userInfo.setEmail(customerEmail);
    if (customerPhone) userInfo.setMobile(customerPhone);

    const paymentDetailBuilder = new Paytm.PaymentDetailBuilder(channelId, orderId, txnAmount, userInfo);
    const paymentDetail = paymentDetailBuilder.build();

    console.log("--- PAYTM PAYLOAD ---", JSON.stringify(paymentDetail, null, 2));

    try {
      const response = await Paytm.Payment.createTxnToken(paymentDetail);

      // Map SDK response back to match previous expectations in paymentController
      const body = response.responseObject.body;
      const head = response.responseObject.head;

      if (body && body.resultInfo && body.resultInfo.resultStatus === 'S') {
        return {
          body: {
            resultInfo: body.resultInfo,
            txnToken: body.txnToken
          },
          head: head
        };
      }

      return { body: body };

    } catch (error) {
      console.error("Paytm SDK Init Error:", error);
      throw error;
    }
  }

  async getTxnStatus(orderId) {
    const paymentStatusDetailBuilder = new Paytm.PaymentStatusDetailBuilder(orderId);
    const paymentStatusDetail = paymentStatusDetailBuilder.build();

    try {
      const response = await Paytm.Payment.getPaymentStatus(paymentStatusDetail);
      const body = response.responseObject.body;

      // Map SDK response to previous expectations
      return {
        body: {
          resultInfo: body.resultInfo,
          txnId: body.txnId,
          bankTxnId: body.bankTxnId,
          paymentMode: body.paymentMode
        }
      };
    } catch (error) {
      console.error("Paytm SDK Status Error:", error);
      throw error;
    }
  }

  async initiateRefund(orderId, txnId, refId, amount) {
    const refundAmount = Paytm.Money.constructWithCurrencyAndValue(Paytm.EnumCurrency.INR, amount.toString());
    const refundDetailBuilder = new Paytm.RefundDetailBuilder(orderId, refId, txnId, refundAmount);
    const refundDetail = refundDetailBuilder.build();

    try {
      const response = await Paytm.Refund.initiateRefund(refundDetail);
      return { body: response.responseObject.body };
    } catch (error) {
      console.error("Paytm SDK Refund Error:", error);
      throw error;
    }
  }

  async getRefundStatus(orderId, refId) {
    const refundStatusDetailBuilder = new Paytm.RefundStatusDetailBuilder(orderId, refId);
    const refundStatusDetail = refundStatusDetailBuilder.build();

    try {
      const response = await Paytm.Refund.getRefundStatus(refundStatusDetail);
      return { body: response.responseObject.body };
    } catch (error) {
      console.error("Paytm SDK Refund Status Error:", error);
      throw error;
    }
  }

  async validateChecksum(params, checksum) {
    const PaytmChecksum = require('paytmchecksum');
    return PaytmChecksum.verifySignature(params, this.key, checksum);
  }
}

module.exports = new PaytmService();
