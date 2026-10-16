import React from "react";
import { Link } from "react-router-dom";
import LegalPage, { Section, Bullet } from "../components/LegalPage";

const EMAIL = "vishnuraghav955@gmail.com";
const Mail = () => <a href={`mailto:${EMAIL}`} className="text-brand-gold underline">{EMAIL}</a>;
const Whatsapp = () => <a href="https://wa.me/918439111502" target="_blank" rel="noopener noreferrer" className="text-brand-gold underline">+91 84391 11502</a>;

export default function Terms() {
  return (
    <LegalPage title="Terms & Conditions" lastUpdated="October 16, 2026">
      <p>
        Welcome to <strong>authorvishnuraghav.in</strong> (the &quot;Platform&quot;). These Terms &amp; Conditions
        (&quot;Terms&quot;) are a legally binding agreement between you (&quot;you&quot;, &quot;the User&quot;) and
        Vishnu Raghav (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) for your use of the Platform, including all
        courses, eBooks, printed books, downloadable resources and other products offered.
      </p>
      <p>
        By creating an account, making a purchase or otherwise using the Platform, you agree to these Terms, our{" "}
        <Link to="/privacy-policy" className="text-brand-gold underline">Privacy Policy</Link>, our{" "}
        <Link to="/refund-policy" className="text-brand-gold underline">Refund &amp; Cancellation Policy</Link> and our{" "}
        <Link to="/shipping-policy" className="text-brand-gold underline">Shipping &amp; Delivery Policy</Link>. If you do
        not agree, please do not use the Platform.
      </p>

      <Section title="1. Eligibility">
        <p>
          You must be at least 18 years old and able to enter into a binding contract under the Indian Contract Act, 1872.
          Users below 18 may use the Platform only with the consent and supervision of a parent or legal guardian.
        </p>
      </Section>

      <Section title="2. Account Registration">
        <ul className="space-y-1.5">
          <Bullet>You must give accurate and complete information, including your name, email and mobile number.</Bullet>
          <Bullet>You are responsible for keeping your login details safe and for all activity on your account.</Bullet>
          <Bullet>Please tell us immediately about any unauthorised use of your account.</Bullet>
          <Bullet>One account per person. Sharing login details may lead to suspension of access without refund.</Bullet>
        </ul>
      </Section>

      <Section title="3. Digital Products">
        <p>
          Courses, video lessons, eBooks, workbooks, certificates and other online or downloadable content (&quot;Digital
          Products&quot;) are licensed, not sold, to you for personal, non-commercial use only. After successful payment, you
          get a non-exclusive, non-transferable, revocable licence to use the purchased Digital Product as described on its
          product page.
        </p>
      </Section>

      <Section title="4. Printed Books">
        <ul className="space-y-1.5">
          <Bullet>Printed books are shipped to addresses within India, sold on their own or included with a course.</Bullet>
          <Bullet>Dispatch and delivery times, shipping charges and tracking are explained in our <Link to="/shipping-policy" className="text-brand-gold underline">Shipping &amp; Delivery Policy</Link>.</Bullet>
          <Bullet>You must give a correct and complete delivery address, pincode and mobile number at checkout.</Bullet>
          <Bullet>Ownership of a printed book passes to you on delivery.</Bullet>
        </ul>
      </Section>

      <Section title="5. Pricing, Discounts & Payment">
        <ul className="space-y-1.5">
          <Bullet>All prices are in Indian Rupees (INR) and include applicable taxes unless stated otherwise.</Bullet>
          <Bullet>Where a higher price is shown crossed out, it is the regular price at which the product has been offered and sold on the Platform. The lower price is a discounted offer price.</Bullet>
          <Bullet>Any shipping charge for printed books is shown at checkout before you pay.</Bullet>
          <Bullet>Payments are processed securely by Razorpay. We do not store your card or bank details.</Bullet>
        </ul>
      </Section>

      <Section title="6. Refunds & Cancellations">
        <p>
          Digital Products are non-refundable once access is given. Printed book orders can be cancelled for a full refund
          before dispatch, and damaged or wrong books are replaced free of cost. Full details are in our{" "}
          <Link to="/refund-policy" className="text-brand-gold underline">Refund &amp; Cancellation Policy</Link>.
        </p>
      </Section>

      <Section title="7. Communication & Consent">
        <p>
          By sharing your mobile number and email on the Platform (for example when registering, purchasing, joining a
          waitlist or requesting a free sample), you agree that Vishnu Raghav and his team may contact you by phone call,
          WhatsApp, SMS or email about your order, course access, support, free resources and related offers. You can ask us
          to stop non-essential messages at any time by replying STOP on WhatsApp or emailing <Mail />.
        </p>
      </Section>

      <Section title="8. Intellectual Property">
        <p>
          All content on the Platform, including course videos, audio, text, graphics, logos, eBooks, books, workbooks and
          downloadable materials, is the exclusive intellectual property of Vishnu Raghav and is protected under the
          Copyright Act, 1957 and other applicable laws.
        </p>
        <p>You agree NOT to:</p>
        <ul className="space-y-1.5">
          <Bullet>Copy, reproduce, redistribute, resell, sublicense or create derivative works of any content.</Bullet>
          <Bullet>Share your login details or allow anyone else to access purchased content.</Bullet>
          <Bullet>Record, screen-capture, download (except where explicitly offered) or upload our content to any other platform, including YouTube, Telegram, file-sharing sites or torrent networks.</Bullet>
          <Bullet>Use the content for any commercial purpose, including teaching, reselling or building competing products.</Bullet>
        </ul>
        <p>
          Breaking this clause will result in immediate termination of access without refund and may attract civil and
          criminal liability under applicable laws.
        </p>
      </Section>

      <Section title="9. User Conduct">
        <p>You agree not to:</p>
        <ul className="space-y-1.5">
          <Bullet>Use the Platform for any unlawful, fraudulent, abusive or harmful purpose.</Bullet>
          <Bullet>Try to gain unauthorised access to our systems, other user accounts or any data not meant for you.</Bullet>
          <Bullet>Upload viruses, malware or any code designed to disrupt the Platform.</Bullet>
          <Bullet>Post content that is defamatory, obscene, hateful or violates anyone else&apos;s rights.</Bullet>
          <Bullet>Use bots, scrapers or crawlers on the Platform without our written permission.</Bullet>
        </ul>
      </Section>

      <Section title="10. Availability & Changes">
        <p>
          We try to keep the Platform available at all times but do not guarantee uninterrupted access. We may change,
          update or discontinue any feature, course or service. Course content may be updated or improved from time to time;
          such updates do not create any right to a refund.
        </p>
      </Section>

      <Section title="11. Disclaimer">
        <p>
          The Platform and all products are provided on an &quot;as-is&quot; and &quot;as-available&quot; basis. Our content
          is for educational and informational purposes only. It is not professional, medical, psychological, legal or
          financial advice, and we do not guarantee any specific result or outcome.
        </p>
      </Section>

      <Section title="12. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Vishnu Raghav and authorvishnuraghav.in shall not be liable for any
          indirect, incidental, consequential, special or punitive damages arising from your use of the Platform. Our total
          liability, if any, shall not exceed the amount you actually paid for the specific product giving rise to the claim.
        </p>
      </Section>

      <Section title="13. Indemnification">
        <p>
          You agree to indemnify and hold harmless Vishnu Raghav and his representatives from any claims, losses or expenses
          (including reasonable legal fees) arising from your breach of these Terms, misuse of the Platform or violation of
          any law or third-party rights.
        </p>
      </Section>

      <Section title="14. Termination">
        <p>
          We may suspend or terminate your account and access to any Digital Products, without refund, if you breach these
          Terms, engage in piracy or content theft, share login details or use the Platform in a way that harms us, other
          users or third parties.
        </p>
      </Section>

      <Section title="15. Governing Law & Jurisdiction">
        <p>
          These Terms are governed by the laws of India. Any dispute shall be subject to the exclusive jurisdiction of the
          courts at <strong>Ghaziabad, Uttar Pradesh, India</strong>.
        </p>
      </Section>

      <Section title="16. Changes to These Terms">
        <p>
          We may revise these Terms from time to time. The &quot;Last updated&quot; date at the top shows the latest version.
          Continuing to use the Platform after changes means you accept the updated Terms.
        </p>
      </Section>

      <Section title="17. Grievance Officer">
        <p>
          For any complaint about a product, order, payment or content, please contact our Grievance Officer. We will
          acknowledge your complaint within 48 hours and try to resolve it within 1 month.
        </p>
        <p className="bg-ink-900 border border-white/[0.07] rounded-xl p-4 text-sm">
          <strong>Grievance Officer: Vishnu Raghav</strong><br />
          Email: <Mail /><br />
          Phone / WhatsApp: <Whatsapp /><br />
          Address: Ghaziabad, Uttar Pradesh, India
        </p>
      </Section>

      <Section title="18. Contact">
        <p className="bg-ink-900 border border-white/[0.07] rounded-xl p-4 text-sm">
          <strong>Vishnu Raghav — Support</strong><br />
          Email: <Mail /><br />
          Phone / WhatsApp: <Whatsapp /><br />
          Address: Ghaziabad, Uttar Pradesh, India<br />
          Website: <a href="https://authorvishnuraghav.in" className="text-brand-gold underline">authorvishnuraghav.in</a><br />
          Response time: within 2 working days
        </p>
      </Section>
    </LegalPage>
  );
}
