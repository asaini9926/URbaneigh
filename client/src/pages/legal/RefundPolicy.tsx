const RefundPolicy = () => {
  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund and Returns Policy</h1>
        
        <p>At Urbaneigh, we strive for 100% customer satisfaction. If, for any reason, you are not completely satisfied with your purchase, we offer a hassle-free return process.</p>

        <h3 className="font-bold text-black mt-6">Domestic Orders</h3>
        <p>We stand by our products with a 100% Satisfaction Guarantee. No questions asked. However, unique return policies may apply to heavily discounted items or during specific campaigns.</p>

        <h3 className="font-bold text-black mt-6">Exclusions – ‘Final Sale’ Items</h3>
        <p>Items from the ‘Final Sale’ section are not eligible for Return & Exchange.</p>

        <h3 className="font-bold text-black mt-6">Contact Information</h3>
        <p>If you wish to initiate a return or have any concerns, kindly reach out to us at <a href="mailto:urbaneigh@gmail.com" className="text-blue-600">urbaneigh@gmail.com</a> or WhatsApp us at +91 7021955071.</p>

        <h3 className="font-bold text-black mt-6">Return Process</h3>
        <p>Pick-up will be attempted. If unsuccessful, kindly send the shipment back to our company address. Reverse Pick Up is subject to service availability in your area pin code.</p>
        <p className="bg-yellow-50 p-4 rounded-md text-sm border-l-4 border-yellow-400 mt-2">
            <strong>Important:</strong> Kindly ensure that all tags, accessories (such as zippers), and original packaging are included with the return. Missing items may delay or affect the approval of your return, exchange, or refund.
        </p>

        <h3 className="font-bold text-black mt-6">Exchange/Refund</h3>
        <p>Customer have to pay extra <strong>Rs 70</strong> for exchange. We cannot provide exchange/refund for products that have already been exchanged.</p>

        <h3 className="font-bold text-black mt-6">Timeframe for Returns</h3>
        <p>You can exchange or return a product within <strong>48 Hours</strong> from the date of receiving the order.</p>

        <h3 className="font-bold text-black mt-6">Payment Refund Details</h3>
        <ul className="list-disc pl-5">
            <li>Delivery Charges or any discount coupon amount will not be refunded.</li>
            <li>For prepaid orders, a 3% processing fee will be deducted in case of a refund.</li>
            <li>After receiving Product your payment initiate in 24 Hours in your bank Account.</li>
        </ul>
      </div>
    </div>
  );
};

export default RefundPolicy;