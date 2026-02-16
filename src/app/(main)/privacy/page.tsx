import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Thirdshot",
  description: "Privacy Policy for Thirdshot Pickleball court booking platform",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gray-900 text-white px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-300 text-sm">
            Last Updated: January 30, 2026
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Thirdshot ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our pickleball court booking platform and services (the "Service").
            </p>
            <p className="text-gray-700 mb-4">
              This Privacy Policy complies with the Personal Data Protection Act 2012 (PDPA) of Singapore and applies to all users of our Service in Singapore.
            </p>
            <p className="text-gray-700 mb-4">
              By using our Service, you consent to the collection and use of your information as described in this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Personal Information</h3>
            <p className="text-gray-700 mb-4">
              When you register for an account or make a booking, we collect:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Contact Information:</strong> Name, email address, phone number</li>
              <li><strong>Account Credentials:</strong> Email and password (encrypted)</li>
              <li><strong>Payment Information:</strong> Payment method details processed through our secure payment gateway (HitPay). We do not store your full credit card numbers</li>
              <li><strong>Booking Information:</strong> Court bookings, booking history, preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <p className="text-gray-700 mb-4">
              When you use our Service, we automatically collect:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages</li>
              <li><strong>IP Address:</strong> Your Internet Protocol address</li>
              <li><strong>Cookies:</strong> See Section 8 for details on cookies</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Information from Third Parties</h3>
            <p className="text-gray-700 mb-4">
              If you sign in using third-party authentication (e.g., Google), we receive basic profile information from that service in accordance with their privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">
              We use your personal information for the following purposes:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Service Provision</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Process and manage your court bookings</li>
              <li>Process payments and issue receipts</li>
              <li>Send booking confirmations and reminders</li>
              <li>Manage your account and provide customer support</li>
              <li>Communicate with you about your bookings</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Service Improvement</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Analyze usage patterns to improve our Service</li>
              <li>Understand user preferences and optimize court availability</li>
              <li>Develop new features and services</li>
              <li>Troubleshoot technical issues</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Communication</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Send transactional emails (booking confirmations, reminders, receipts)</li>
              <li>Send important service updates and announcements</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send promotional emails about our services (you can opt-out anytime)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Legal Compliance</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Comply with legal obligations under Singapore law</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Enforce our Terms of Service</li>
              <li>Respond to legal requests from authorities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. How We Share Your Information</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information to third parties. We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Service Providers</h3>
            <p className="text-gray-700 mb-4">
              We share information with trusted third-party service providers who help us operate our Service:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Payment Processing:</strong> HitPay for secure payment transactions</li>
              <li><strong>Email Services:</strong> Resend for transactional and reminder emails</li>
              <li><strong>Hosting Services:</strong> Vercel for web hosting and Supabase/Neon for database hosting</li>
              <li><strong>Authentication:</strong> Supabase for user authentication</li>
            </ul>
            <p className="text-gray-700 mb-4">
              These service providers are contractually obligated to protect your information and use it only for the purposes we specify.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Legal Requirements</h3>
            <p className="text-gray-700 mb-4">
              We may disclose your information if required by law, regulation, legal process, or governmental request, or to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Comply with Singapore legal obligations</li>
              <li>Protect the rights, property, or safety of Thirdshot, our users, or the public</li>
              <li>Prevent fraud or security issues</li>
              <li>Respond to court orders or law enforcement requests</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Business Transfers</h3>
            <p className="text-gray-700 mb-4">
              In the event of a merger, acquisition, or sale of assets, your personal information may be transferred to the acquiring entity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using SSL/TLS</li>
              <li><strong>Password Security:</strong> Passwords are hashed and encrypted before storage</li>
              <li><strong>Secure Payment Processing:</strong> Payment information is processed through PCI-DSS compliant payment gateways</li>
              <li><strong>Access Controls:</strong> Access to personal information is restricted to authorized personnel only</li>
              <li><strong>Regular Security Audits:</strong> We regularly review and update our security practices</li>
            </ul>
            <p className="text-gray-700 mb-4">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your personal information for as long as necessary to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Provide our Service to you</li>
              <li>Comply with legal obligations (e.g., tax and accounting requirements)</li>
              <li>Resolve disputes and enforce our agreements</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>Booking Records:</strong> We retain booking and payment records for at least 7 years to comply with Singapore accounting and tax regulations.
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Account Information:</strong> If you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Your Rights Under PDPA</h2>
            <p className="text-gray-700 mb-4">
              Under Singapore's Personal Data Protection Act (PDPA), you have the following rights:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.1 Right to Access</h3>
            <p className="text-gray-700 mb-4">
              You have the right to request access to your personal information that we hold. You can view most of your information in your account settings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.2 Right to Correction</h3>
            <p className="text-gray-700 mb-4">
              You have the right to request correction of inaccurate or incomplete personal information. You can update most information directly in your account settings.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.3 Right to Withdraw Consent</h3>
            <p className="text-gray-700 mb-4">
              You can withdraw your consent for us to collect, use, or disclose your personal information, subject to legal or contractual restrictions. However, this may affect our ability to provide services to you.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.4 Right to Data Portability</h3>
            <p className="text-gray-700 mb-4">
              You can request a copy of your personal information in a structured, commonly used format.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">7.5 Right to Object to Marketing</h3>
            <p className="text-gray-700 mb-4">
              You can opt-out of receiving promotional emails by clicking the "unsubscribe" link in any marketing email or by contacting us directly.
            </p>

            <p className="text-gray-700 mb-4 mt-6">
              To exercise any of these rights, please contact us at <strong>privacy@thirdshot.sg</strong>. We will respond to your request within 30 days as required by PDPA.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 mb-4">
              We use cookies and similar tracking technologies to enhance your experience on our Service:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Essential Cookies</h3>
            <p className="text-gray-700 mb-4">
              These cookies are necessary for the Service to function and cannot be disabled:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Authentication cookies (keep you logged in)</li>
              <li>Security cookies (protect against fraud)</li>
              <li>Session management cookies</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Analytics Cookies</h3>
            <p className="text-gray-700 mb-4">
              We use analytics cookies to understand how users interact with our Service and improve user experience. These cookies collect anonymous usage statistics.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.3 Managing Cookies</h3>
            <p className="text-gray-700 mb-4">
              You can control cookies through your browser settings. However, disabling certain cookies may limit your ability to use some features of our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Third-Party Links</h2>
            <p className="text-gray-700 mb-4">
              Our Service may contain links to third-party websites or services (e.g., payment gateways, social media). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our Service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your personal information may be transferred to and processed in countries outside of Singapore where our service providers are located. These countries may have different data protection laws. We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of significant changes by:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Posting the updated Privacy Policy on our Service</li>
              <li>Updating the "Last Updated" date at the top of this policy</li>
              <li>Sending an email notification for material changes</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Your continued use of the Service after changes are posted constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">13. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Data Protection Officer</strong></p>
              <p className="text-gray-700"><strong>Thirdshot Pickleball</strong></p>
              <p className="text-gray-700">Email: privacy@thirdshot.sg</p>
              <p className="text-gray-700">General Support: support@thirdshot.sg</p>
              <p className="text-gray-700">Singapore</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">14. Complaints</h2>
            <p className="text-gray-700 mb-4">
              If you have concerns about how we handle your personal information, please contact us first at <strong>privacy@thirdshot.sg</strong>. We will investigate and respond within 30 days.
            </p>
            <p className="text-gray-700 mb-4">
              If you are not satisfied with our response, you may lodge a complaint with the Personal Data Protection Commission (PDPC) of Singapore:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Personal Data Protection Commission</strong></p>
              <p className="text-gray-700">Website: <a href="https://www.pdpc.gov.sg" className="text-blue-600 hover:underline">www.pdpc.gov.sg</a></p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 italic">
              This Privacy Policy is designed to comply with Singapore's Personal Data Protection Act 2012 (PDPA). By using the Thirdshot booking platform, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
