import React from "react";
import LegalPage, { Section, Bullet } from "../components/LegalPage";

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="June 8, 2026">
      <p>
        This Privacy Policy describes how <strong>vishnuraghav.in</strong> (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
        collects, uses, stores, and protects your personal information when you visit our website, purchase our courses,
        enroll in any digital product, or otherwise interact with our services. We are committed to safeguarding your
        privacy in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security
        Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data
        Protection Act, 2023 of India.
      </p>

      <Section title="1. Information We Collect">
        <p>We collect information you provide directly to us, such as:</p>
        <ul className="space-y-1.5">
          <Bullet>Full name, email address, phone number, and city when you create an account, subscribe to our newsletter, or contact us.</Bullet>
          <Bullet>Billing information processed by our payment gateway partner Razorpay (we do not store card numbers, CVV, or banking credentials on our servers).</Bullet>
          <Bullet>Course progress, completed lessons, enrollment history, and other learning activity data.</Bullet>
          <Bullet>Messages, feedback, and other communications you send to us via the contact form or email.</Bullet>
        </ul>
        <p>We also automatically collect limited technical data such as IP address, browser type, device information, and pages visited to operate and improve the site.</p>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>Your information is used solely to:</p>
        <ul className="space-y-1.5">
          <Bullet>Provide and personalize access to our courses, ebooks, and digital products.</Bullet>
          <Bullet>Process payments, issue receipts, and grant lifetime access to purchased content.</Bullet>
          <Bullet>Send transactional communications such as enrollment confirmations, payment receipts, and important service updates.</Bullet>
          <Bullet>Send optional newsletters or educational content (you may unsubscribe at any time).</Bullet>
          <Bullet>Respond to your queries, support requests, and feedback.</Bullet>
          <Bullet>Comply with applicable Indian laws and respond to lawful requests from public authorities.</Bullet>
        </ul>
      </Section>

      <Section title="3. Sharing of Information">
        <p>
          We do <strong>not</strong> sell, rent, or trade your personal information. We share your data only with the
          following categories of trusted third parties, strictly to deliver our services:
        </p>
        <ul className="space-y-1.5">
          <Bullet><strong>Razorpay Software Private Limited</strong> — for processing payments. Razorpay handles your financial information under PCI-DSS-compliant standards. Refer to <a href="https://razorpay.com/privacy/" target="_blank" rel="noreferrer" className="text-brand-gold underline">Razorpay&apos;s privacy policy</a>.</Bullet>
          <Bullet><strong>Hosting and infrastructure providers</strong> (e.g., MongoDB Atlas, our cloud host) — for storing data securely. These providers act as data processors on our behalf.</Bullet>
          <Bullet><strong>Email service providers</strong> — for sending transactional and marketing emails when applicable.</Bullet>
          <Bullet><strong>Law enforcement or regulatory authorities</strong> — only when legally compelled to do so.</Bullet>
        </ul>
      </Section>

      <Section title="4. Data Security">
        <p>
          We use industry-standard security measures including HTTPS/SSL encryption, bcrypt password hashing, JWT-based
          authentication, and secure server-to-server communication for payment verification. Despite these measures, no
          system can be guaranteed 100% secure. You are responsible for keeping your account password confidential.
        </p>
      </Section>

      <Section title="5. Cookies and Tracking">
        <p>
          We use minimal cookies and browser storage strictly to keep you logged in and remember your preferences. We do
          not currently use third-party advertising or behavioral tracking cookies. If we introduce analytics in the future,
          we will update this policy and seek your consent where required by law.
        </p>
      </Section>

      <Section title="6. Your Rights">
        <p>As per applicable Indian privacy law, you have the right to:</p>
        <ul className="space-y-1.5">
          <Bullet>Access the personal information we hold about you.</Bullet>
          <Bullet>Request correction of inaccurate or outdated information.</Bullet>
          <Bullet>Request deletion of your account and associated data (subject to our legal obligation to retain payment records under Indian tax law for the statutory period).</Bullet>
          <Bullet>Withdraw consent for marketing communications at any time.</Bullet>
          <Bullet>Lodge a complaint with the relevant Indian data protection authority.</Bullet>
        </ul>
        <p>To exercise any of these rights, email us at <a href="mailto:support@vishnuraghav.in" className="text-brand-gold underline">support@vishnuraghav.in</a>.</p>
      </Section>

      <Section title="7. Data Retention">
        <p>
          We retain your account information for as long as your account remains active. Payment, invoice, and tax-related
          records are retained for the period required under the Income Tax Act and GST law (typically 7–8 years).
          After this period, data is permanently deleted or anonymized.
        </p>
      </Section>

      <Section title="8. Children&apos;s Privacy">
        <p>
          Our services are intended for users aged 18 years and above. If you are under 18, you may use the platform only
          with the consent and supervision of a parent or legal guardian. We do not knowingly collect data from children
          without verifiable parental consent.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top of this page
          will reflect the most recent revision. Continued use of the site after changes constitutes acceptance of the
          updated policy.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>
          For any questions, concerns, or requests regarding this Privacy Policy or your personal data, please reach out to:
        </p>
        <p className="bg-ink-900 border border-white/[0.07] rounded-xl p-4 text-sm">
          <strong>Vishnu Raghav</strong><br />
          Email: <a href="mailto:support@vishnuraghav.in" className="text-brand-gold underline">support@vishnuraghav.in</a><br />
          Website: <a href="https://vishnuraghav.in" className="text-brand-gold underline">vishnuraghav.in</a>
        </p>
      </Section>
    </LegalPage>
  );
}
