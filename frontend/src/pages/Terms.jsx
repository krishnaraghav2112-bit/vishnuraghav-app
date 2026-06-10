import React from "react";
import LegalPage, { Section, Bullet } from "../components/LegalPage";

export default function Terms() {
  return (
    <LegalPage title="Terms &amp; Conditions" lastUpdated="June 8, 2026">
      <p>
        Welcome to <strong>vishnuraghav.in</strong> (the &quot;Platform&quot;). These Terms &amp; Conditions
        (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;you&quot;, &quot;the User&quot;)
        and Vishnu Raghav (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) governing your access to and use of the
        Platform, including all courses, ebooks, downloadable resources, and other digital products offered.
      </p>
      <p>
        By creating an account, making a purchase, or otherwise using the Platform, you confirm that you have read,
        understood, and agree to be bound by these Terms, our <a href="/privacy-policy" className="text-brand-gold underline">Privacy Policy</a>,
        and our <a href="/refund-policy" className="text-brand-gold underline">Refund &amp; Cancellation Policy</a>.
        If you do not agree, please do not use the Platform.
      </p>

      <Section title="1. Eligibility">
        <p>
          You must be at least 18 years of age and capable of entering into a legally binding contract under the Indian
          Contract Act, 1872 to use the Platform. Users below 18 may only use the Platform with the explicit consent and
          supervision of a parent or legal guardian.
        </p>
      </Section>

      <Section title="2. Account Registration">
        <ul className="space-y-1.5">
          <Bullet>You must provide accurate, current, and complete information during registration.</Bullet>
          <Bullet>You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</Bullet>
          <Bullet>You must promptly notify us of any unauthorized access or breach of security.</Bullet>
          <Bullet>One account per individual. Sharing of credentials or simultaneous use from multiple locations may result in suspension of access without refund.</Bullet>
        </ul>
      </Section>

      <Section title="3. Purchase of Digital Products">
        <p>
          All courses, ebooks, downloadable resources, and other digital products available on the Platform
          (&quot;Digital Products&quot;) are licensed, not sold, to you for personal, non-commercial use only.
          Upon successful payment, you are granted a non-exclusive, non-transferable, revocable licence to access
          and use the purchased Digital Product as described on its product page.
        </p>
        <p>
          All prices are displayed in Indian Rupees (INR) and are inclusive of applicable taxes unless otherwise stated.
          Payments are processed securely through Razorpay; we do not store your payment card details.
        </p>
      </Section>

      <Section title="4. Refunds &amp; Cancellations">
        <p>
          All purchases of Digital Products are <strong>strictly non-refundable</strong> and non-cancellable once access
          has been granted. Please review the full <a href="/refund-policy" className="text-brand-gold underline">Refund &amp; Cancellation Policy</a> before purchasing.
        </p>
      </Section>

      <Section title="5. Intellectual Property">
        <p>
          All content on the Platform — including but not limited to course videos, audio, text, graphics, logos, ebooks,
          workbooks, and downloadable materials — is the exclusive intellectual property of Vishnu Raghav and is protected
          under the Copyright Act, 1957 and other applicable Indian and international laws.
        </p>
        <p>You agree NOT to:</p>
        <ul className="space-y-1.5">
          <Bullet>Copy, reproduce, redistribute, resell, sublicense, publicly perform, or create derivative works of any content.</Bullet>
          <Bullet>Share your account credentials or allow any third party to access purchased content.</Bullet>
          <Bullet>Record, screen-capture, download (except where explicitly offered), or upload our content to any other platform, including YouTube, Telegram, file-sharing sites, or torrent networks.</Bullet>
          <Bullet>Use the content for any commercial purpose, including teaching, reselling, or building competing products.</Bullet>
        </ul>
        <p>
          Violation of this clause will result in immediate termination of access without refund and may attract civil and
          criminal liability under applicable laws.
        </p>
      </Section>

      <Section title="6. User Conduct">
        <p>You agree not to:</p>
        <ul className="space-y-1.5">
          <Bullet>Use the Platform for any unlawful, fraudulent, abusive, or harmful purpose.</Bullet>
          <Bullet>Attempt to gain unauthorized access to our systems, other users&apos; accounts, or any data not intended for you.</Bullet>
          <Bullet>Upload viruses, malware, or any code designed to disrupt the Platform.</Bullet>
          <Bullet>Post or transmit content that is defamatory, obscene, hateful, or violates any third-party rights.</Bullet>
          <Bullet>Use automated tools (bots, scrapers, crawlers) to access the Platform without our written permission.</Bullet>
        </ul>
      </Section>

      <Section title="7. Availability &amp; Modifications">
        <p>
          We strive to keep the Platform available 24/7 but do not guarantee uninterrupted access. We may suspend,
          modify, or discontinue any feature, course, or service at any time without prior notice. We may also update,
          improve, or revise course content periodically; such updates are made at our sole discretion and do not create
          any right to a refund.
        </p>
      </Section>

      <Section title="8. Disclaimer of Warranties">
        <p>
          The Platform and all Digital Products are provided on an &quot;as-is&quot; and &quot;as-available&quot; basis.
          While we put great care into the quality and accuracy of our content, we make no warranties — express or
          implied — regarding specific outcomes, results, income, or success that you may achieve from using our courses.
          The content is for educational and informational purposes only and does not constitute professional, medical,
          legal, or financial advice.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, in no event shall Vishnu Raghav or vishnuraghav.in be liable for any
          indirect, incidental, consequential, special, or punitive damages arising out of or related to your use of the
          Platform. Our total aggregate liability, if any, shall not exceed the amount actually paid by you for the
          specific Digital Product giving rise to the claim.
        </p>
      </Section>

      <Section title="10. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless Vishnu Raghav, his affiliates, and representatives from any
          claims, damages, losses, liabilities, costs, or expenses (including reasonable legal fees) arising from your
          breach of these Terms, misuse of the Platform, or violation of any law or third-party rights.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          We reserve the right to suspend or terminate your account and access to any Digital Products at our sole
          discretion, without prior notice and without refund, if you breach these Terms, engage in piracy or content
          theft, share access credentials, or use the Platform in a manner that harms us, other users, or third parties.
        </p>
      </Section>

      <Section title="12. Governing Law &amp; Jurisdiction">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of India, without regard to its
          conflict of laws principles. Any dispute arising out of or in connection with these Terms shall be subject to
          the exclusive jurisdiction of the competent courts located in <strong>Ghaziabad, Uttar Pradesh, India</strong>.
        </p>
      </Section>

      <Section title="13. Changes to These Terms">
        <p>
          We may revise these Terms from time to time. The &quot;Last updated&quot; date at the top of this page will
          reflect the most recent revision. Continued use of the Platform after changes constitutes acceptance of the
          updated Terms. We encourage you to review this page periodically.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          For any questions about these Terms, please contact:
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
