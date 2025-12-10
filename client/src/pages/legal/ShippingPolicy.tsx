const ShippingPolicy = () => {
  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping Policy</h1>

        <h3 className="font-bold text-black mt-6">Domestic Shipping (within India)</h3>
        <ul className="list-disc pl-5">
            <li><strong>To metros:</strong> Estimated delivery within 2-4 business days.</li>
            <li><strong>To the rest of India:</strong> Estimated delivery within 3-6 business days.</li>
        </ul>

        <h3 className="font-bold text-black mt-6">Free Shipping</h3>
        <p>Enjoy free standard shipping on orders more then thousand rupees.</p>

        <h3 className="font-bold text-black mt-6">Order Tracking</h3>
        <p>Once your order has shipped, you will receive a shipping confirmation email with a tracking number. You can track your order using the provided tracking information.</p>
        <p>We deliver our products across the India via the major and the most trusted courier services. You will be able to track your order on the courier company website through the link in your shipping confirmation email.</p>

        <h3 className="font-bold text-black mt-6">Incorrect Shipping Information</h3>
        <p>Please ensure that your shipping address is accurate and complete. Urbaneigh is not responsible for orders shipped to incorrect or incomplete addresses provided by the customer. Any additional shipping charges incurred due to address errors will be the customer’s responsibility.</p>

        <h3 className="font-bold text-black mt-6">Delivery Issues</h3>
        <p>In the event of delivery issues, such as lost or damaged items, please contact our customer service team at <a href="mailto:urbaneigh@gmail.com" className="text-blue-600">urbaneigh@gmail.com</a> within 7 days of receiving your order. We will work to resolve the issue promptly.</p>
        <p>In case of damaged items, we kindly ask you to provide an unboxing video of the parcel right after it’s delivered for a smooth assistance provided which, you can select either a return/replacement of the product/s.</p>

        <p className="text-sm text-gray-500 mt-6 italic">
            *Note: Delivery time is subject to factors beyond our control including unexpected travel delays from our courier partners and transporters due to weather conditions and strikes.
        </p>
      </div>
    </div>
  );
};

export default ShippingPolicy;