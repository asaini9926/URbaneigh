const PrivacyPolicy = () => {
  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <p>This Privacy Policy describes how Urbaneigh Fashions ("we," "us," or "our") collects, uses, and discloses your personal information when you visit or make a purchase from urbaneigh.com (the "Site"). We are committed to protecting your privacy and ensuring your personal data is handled in accordance with the Information Technology Act, 2000 and other applicable laws of India.</p>

        <h3 className="font-bold text-black mt-6">Jurisdiction</h3>
        <p>This Privacy Policy is governed by the laws of India. Any disputes arising out of this policy shall be subject to the exclusive jurisdiction of the courts located in Jaipur, Rajasthan.</p>

        <h3 className="font-bold text-black mt-6">Information We Collect</h3>
        <p>We collect various types of information to provide and improve our services to you:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Personal Information:</strong> When you make a purchase or attempt to make a purchase, we collect certain information from you, including your name, billing address, shipping address, payment information (processed via our secure payment gateway, Paytm), email address, and phone number.</li>
          <li><strong>Device Information:</strong> When you visit the Site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device.</li>
          <li><strong>Order Information:</strong> We collect information about the products you purchase, the date and time of your transaction, and your transaction history.</li>
        </ul>

        <h3 className="font-bold text-black mt-6">How We Use Your Information</h3>
        <p>We use the information we collect for the following purposes:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>To process and fulfill your orders, including processing payments, arranging for shipping, and providing you with invoices and/or order confirmations.</li>
          <li>To communicate with you regarding your order, account, or customer service inquiries.</li>
          <li>To screen our orders for potential risk or fraud.</li>
          <li>To improve and optimize our Site (for example, by generating analytics about how our customers browse and interact with the Site).</li>
          <li>To provide you with information or advertising relating to our products or services (if you have opted in to receive such communications).</li>
        </ul>

        <h3 className="font-bold text-black mt-6">Third-Party Disclosure</h3>
        <p>We respect your privacy and do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. However, we may share your information with trusted third parties who assist us in operating our website, conducting our business, or serving our users, so long as those parties agree to keep this information confidential. These include:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Payment Gateways:</strong> We use Paytm to process payments. Your payment data is handled in accordance with Paytm's privacy policy and security standards.</li>
          <li><strong>Logistics Partners:</strong> We share necessary shipping information (name, address, phone number) with our courier partners (e.g., Delhivery, Shiprocket) to deliver your orders.</li>
          <li><strong>Legal Requirements:</strong> We may also release information when it's release is appropriate to comply with the law, enforce our site policies, or protect ours or others' rights, property or safety.</li>
        </ul>

        <h3 className="font-bold text-black mt-6">Information Protection</h3>
        <p>We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems and are required to keep the information confidential. All sensitive/credit information you supply is encrypted via Secure Socket Layer (SSL) technology.</p>

        <h3 className="font-bold text-black mt-6">Cookies Policy</h3>
        <p>We use cookies to enhance your experience on our website. Cookies are small files that a site or its service provider transfers to your computer's hard drive through your Web browser (if you allow) that enables the site's or service provider's systems to recognize your browser and capture and remember certain information.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>We use cookies to help us remember and process the items in your shopping cart.</li>
          <li>We use cookies to understand and save your preferences for future visits.</li>
          <li>You can choose to have your computer warn you each time a cookie is being sent, or you can choose to turn off all cookies via your browser settings.</li>
        </ul>

        <h3 className="font-bold text-black mt-6">Rights of Users</h3>
        <p>As a user, you have the right to access, correct, or delete your personal information held by us. If you wish to exercise these rights, please contact us using the information below.</p>

        <h3 className="font-bold text-black mt-6">Changes to This Policy</h3>
        <p>We may update this privacy policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page.</p>

        <h3 className="font-bold text-black mt-6">Contact Us</h3>
        <p>For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us:</p>
        <p className="mt-2">
          <strong>Urbaneigh Fashions</strong><br />
          106C, 4c Scheme, Macheda, Jamna Puri,<br />
          Jaipur, Rajasthan 302013<br />
          Email: urbaneigh@gmail.com<br />
          Phone: +91 70219 55071
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;