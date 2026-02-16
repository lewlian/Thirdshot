import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Thirdshot",
  description: "Terms of Service for Thirdshot Pickleball court booking platform",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gray-900 text-white px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
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
              Welcome to Thirdshot ("we," "our," or "us"). These Terms of Service ("Terms") govern your use of our pickleball court booking platform and services (collectively, the "Service"). By accessing or using our Service, you agree to be bound by these Terms.
            </p>
            <p className="text-gray-700 mb-4">
              Thirdshot operates two (2) pickleball courts in Singapore and provides an online booking platform for court reservations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <p className="text-gray-700 mb-4">
              You must be at least 18 years old to use our Service. By using our Service, you represent and warrant that you meet this age requirement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. Account Registration</h2>
            <p className="text-gray-700 mb-4">
              To book courts, you must create an account with accurate and complete information. You are responsible for:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your contact information is current and accurate</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. Court Bookings</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Booking Process</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Bookings are available up to 7 days in advance</li>
              <li>Each user may book up to 3 consecutive hours per day</li>
              <li>Bookings are subject to court availability</li>
              <li>You must complete payment within 10 minutes to confirm your booking</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Payment</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>All payments must be made through our secure payment gateway (PayNow via HitPay)</li>
              <li>Prices are displayed in Singapore Dollars (SGD)</li>
              <li>Peak hour rates may apply as indicated during booking</li>
              <li>Payment must be completed to confirm your booking</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Booking Confirmation</h3>
            <p className="text-gray-700 mb-4">
              Once payment is successfully processed, you will receive a booking confirmation email. This email serves as your proof of booking. Please bring your booking confirmation (digital or printed) when you arrive at the court.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-red-600">5. Cancellation and Refund Policy</h2>

            <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4">
              <p className="font-semibold text-red-800 mb-2">NO CANCELLATIONS OR REFUNDS</p>
              <p className="text-red-700">
                All bookings are final once payment is confirmed. We do not offer cancellations, modifications, or refunds under any circumstances.
              </p>
            </div>

            <p className="text-gray-700 mb-4">
              This policy applies to all bookings, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Personal emergencies</li>
              <li>Weather conditions (unless courts are officially closed by management)</li>
              <li>Changes in personal schedule</li>
              <li>Illness or injury</li>
              <li>No-shows or late arrivals</li>
            </ul>

            <p className="text-gray-700 mb-4">
              <strong>Exception:</strong> Refunds will only be issued if Thirdshot cancels a booking due to court maintenance, facility closure, or other circumstances within our control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. Court Usage Rules</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.1 General Rules</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Arrive on time. Late arrivals will not receive extra time</li>
              <li>Court time starts and ends at the scheduled booking time</li>
              <li>Wear appropriate court shoes (non-marking soles)</li>
              <li>Respect other players and facility property</li>
              <li>No food or beverages on court (water bottles allowed)</li>
              <li>Clean up after yourself</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Equipment</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Bring your own paddles and balls</li>
              <li>Equipment rental (if available) is not included in court booking fees</li>
              <li>You are responsible for any damage caused by misuse of equipment</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Safety</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Play at your own risk</li>
              <li>Report any court hazards or damaged equipment immediately</li>
              <li>Follow all posted safety guidelines</li>
              <li>Do not play if you have a medical condition that may be aggravated by physical activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. Prohibited Conduct</h2>
            <p className="text-gray-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Make fraudulent bookings or payments</li>
              <li>Create multiple accounts to circumvent booking limits</li>
              <li>Resell or transfer bookings to third parties for profit</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems (bots) to make bookings</li>
              <li>Harass, abuse, or harm other users or staff</li>
              <li>Damage or vandalize facility property</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. Liability and Disclaimers</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.1 Assumption of Risk</h3>
            <p className="text-gray-700 mb-4">
              Pickleball is a physical sport that involves inherent risks of injury. By using our courts, you acknowledge and accept these risks. You agree to play at your own risk.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.2 Limitation of Liability</h3>
            <p className="text-gray-700 mb-4">
              To the maximum extent permitted by Singapore law, Thirdshot and its owners, employees, and agents shall not be liable for:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Any injuries, death, or property damage occurring on the premises</li>
              <li>Loss or theft of personal belongings</li>
              <li>Interruptions to service or court availability</li>
              <li>Technical issues with the booking platform</li>
              <li>Any indirect, incidental, or consequential damages</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">8.3 Indemnification</h3>
            <p className="text-gray-700 mb-4">
              You agree to indemnify and hold harmless Thirdshot from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">9. Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              All content on the Service, including text, graphics, logos, and software, is the property of Thirdshot and protected by Singapore and international intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">10. Privacy</h2>
            <p className="text-gray-700 mb-4">
              Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to suspend or terminate your account at any time, without notice, for violation of these Terms, suspected fraudulent activity, or any other reason at our sole discretion.
            </p>
            <p className="text-gray-700 mb-4">
              Upon termination, your right to use the Service will immediately cease. Any confirmed bookings prior to termination will remain valid.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">12. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We may update these Terms from time to time. We will notify you of significant changes by posting a notice on our Service or sending an email to your registered email address. Your continued use of the Service after changes are posted constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">13. Governing Law and Dispute Resolution</h2>
            <p className="text-gray-700 mb-4">
              These Terms are governed by the laws of Singapore. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Singapore.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">14. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Thirdshot Pickleball</strong></p>
              <p className="text-gray-700">Email: support@thirdshot.sg</p>
              <p className="text-gray-700">Singapore</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">15. Severability</h2>
            <p className="text-gray-700 mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that the Terms shall otherwise remain in full force and effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">16. Entire Agreement</h2>
            <p className="text-gray-700 mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Thirdshot regarding the use of our Service.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 italic">
              By using the Thirdshot booking platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
