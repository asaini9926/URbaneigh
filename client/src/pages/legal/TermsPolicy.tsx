const TermsPolicy = () => {
  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms and Conditions</h1>
        <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

        <h3 className="font-bold text-black mt-6">1. Acceptance of Terms</h3>
        <p>By accessing or using the website urbaniegh.com ("Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you disagree with any part of the terms, then you may not access the Service. These terms constitute a legally binding agreement between you and Urbaneigh Fashions.</p>

        <h3 className="font-bold text-black mt-6">2. Definitions</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>"Company", "We", "Us", "Our"</strong> refers to Urbaneigh Fashions, the owner of the website.</li>
          <li><strong>"User", "You"</strong> refers to the person accessing the website and accepting the Company's terms and conditions.</li>
          <li><strong>"Products"</strong> refers to the clothing and apparel items available for purchase on the website.</li>
          <li><strong>"Service"</strong> refers to the website and the services provided by Urbaneigh Fashions.</li>
        </ul>

        <h3 className="font-bold text-black mt-6">3. User Eligibility & Obligations</h3>
        <p>The Service is available only to persons who can form legally binding contracts under the Indian Contract Act, 1872. Persons who are "incompetent to contract" within the meaning of the Indian Contract Act, 1872 including minors, un-discharged insolvents, etc. are not eligible to use the Service. If you are a minor i.e. under the age of above 15 years, you shall not register as a User of the website and shall not transact on or use the website.</p>
        <p>You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service.</p>

        <h3 className="font-bold text-black mt-6">4. Pricing & Payments</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>All prices listed on the website are in Indian Rupees (INR) and are inclusive of applicable taxes (GST), unless stated otherwise.</li>
          <li>We reserve the right to modify the prices of our products at any time without prior notice.</li>
          <li>Payments are processed through secure third-party payment gateways (Paytm). By initiating a transaction, you agree to the terms and conditions of the payment gateway service provider.</li>
          <li>In the event of a pricing error, we reserve the right to cancel any orders placed for the product listed at the incorrect price.</li>
        </ul>

        <h3 className="font-bold text-black mt-6">5. Intellectual Property Rights</h3>
        <p>The Service and its original content, features, and functionality are and will remain the exclusive property of Urbaneigh Fashions and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Urbaneigh Fashions.</p>

        <h3 className="font-bold text-black mt-6">6. Limitation of Liability</h3>
        <p>In no event shall Urbaneigh Fashions, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content.</p>

        <h3 className="font-bold text-black mt-6">7. Third-Party Links / Services Disclaimer</h3>
        <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by Urbaneigh Fashions. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party web sites or services. You further acknowledge and agree that Urbaneigh Fashions shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods or services available on or through any such web sites or services.</p>

        <h3 className="font-bold text-black mt-6">8. Termination Rights</h3>
        <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.</p>

        <h3 className="font-bold text-black mt-6">9. Governing Law & Jurisdiction</h3>
        <p>These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
        <p>Any dispute arising out of or in connection with these terms, including any question regarding its existence, validity, or termination, shall be subject to the exclusive jurisdiction of the <strong>District Courts of Jaipur, Rajasthan</strong>.</p>

        <h3 className="font-bold text-black mt-6">10. Modification Clause</h3>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>

        <h3 className="font-bold text-black mt-6">Contact Us</h3>
        <p>If you have any questions about these Terms, please contact us at:</p>
        <p className="mt-2 text-gray-600">
          <strong>Urbaneigh Fashions</strong><br />
          Email: urbaneigh@gmail.com<br />
          Phone: +91 70219 55071
        </p>
      </div>
    </div>
  );
};

export default TermsPolicy;