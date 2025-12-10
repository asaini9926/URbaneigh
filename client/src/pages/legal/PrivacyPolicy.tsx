const PrivacyPolicy = () => {
  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p>At Urbaneigh, we value your privacy and are committed to protecting your personal information. This policy outlines how we collect, use, and safeguard your data.</p>
        
        <h3 className="font-bold text-black mt-6">Information We Collect</h3>
        <p>We collect information you provide directly to us, such as when you create an account, place an order, subscribe to our newsletter, or contact customer support. This includes your name, email address, shipping address, and payment information.</p>

        <h3 className="font-bold text-black mt-6">How We Use Your Information</h3>
        <ul className="list-disc pl-5">
            <li>To process and fulfill your orders.</li>
            <li>To communicate with you about your order status.</li>
            <li>To improve our website and customer service.</li>
            <li>To send promotional emails (if opted in).</li>
        </ul>

        <h3 className="font-bold text-black mt-6">Data Security</h3>
        <p>We implement a variety of security measures to maintain the safety of your personal information. Your payment information is processed securely and is not stored on our servers.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;