import React from "react";
import LegalPage, { Section, Bullet } from "../components/LegalPage";
import { AlertTriangle } from "lucide-react";

export default function RefundPolicy() {
  return (
    <LegalPage title="Refund &amp; Cancellation Policy" lastUpdated="June 8, 2026">
      <div className="bg-red-500/[0.08] border border-red-500/30 rounded-xl p-4 sm:p-5 flex gap-3 not-prose">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.7} />
        <p className="text-sm leading-relaxed text-red-100">
          <strong className="text-red-300">All Sales Are Final.</strong> All courses, ebooks, downloadable materials, and
          digital products sold on <strong>vishnuraghav.in</strong> are <strong>strictly non-refundable</strong> and
          non-cancellable. Once access has been granted or content has been delivered, no refund, exchange, or
          cancellation will be provided under any circumstances.
        </p>
      </div>

      <p>
        This Refund &amp; Cancellation Policy applies to all purchases made on the Platform and forms an integral part of
        our <a href="/terms" className="text-brand-gold underline">Terms &amp; Conditions</a>. By completing a purchase,
        you acknowledge that you have read, understood, and agreed to this policy.
      </p>

      <Section title="1. Nature of Our Products">
        <p>
          All products sold on vishnuraghav.in — including but not limited to online courses, video lessons, ebooks (PDF
          or other formats), workbooks, audio sessions, guided meditations, certificates, and other downloadable or
          stream-only materials (collectively, &quot;Digital Products&quot;) — are digital goods.
        </p>
        <p>
          Because Digital Products are delivered electronically and become immediately accessible upon purchase, they
          cannot be &quot;returned&quot; in the conventional sense and are therefore exempt from any right of withdrawal,
          refund, or exchange, in line with widely accepted industry practice for digital content.
        </p>
      </Section>

      <Section title="2. No Refund Policy">
        <p>We do NOT offer refunds, partial refunds, credits, or exchanges for any of the following reasons:</p>
        <ul className="space-y-1.5">
          <Bullet>Change of mind after purchase.</Bullet>
          <Bullet>Failure to use, watch, or download the purchased content within any specific timeframe.</Bullet>
          <Bullet>Dissatisfaction with the content, teaching style, language, accent, pace, or subject matter (course details, sample content, and pricing are clearly disclosed on each product page before purchase).</Bullet>
          <Bullet>Lack of expected outcomes, results, income, weight loss, productivity gains, or any other personal goal — our courses are educational only and do not guarantee any specific result.</Bullet>
          <Bullet>Accidental, duplicate, or impulsive purchases. Please review your cart carefully before checkout.</Bullet>
          <Bullet>Insufficient device storage, lack of internet, or hardware incompatibility on your end.</Bullet>
          <Bullet>Forgotten passwords or inability to recover an account due to invalid contact details supplied at signup.</Bullet>
          <Bullet>Course content updates, revisions, or removal of older versions in favor of newer ones.</Bullet>
        </ul>
      </Section>

      <Section title="3. Cancellation">
        <p>
          Once a payment is successfully processed and access to the Digital Product is granted, the purchase cannot be
          cancelled. Since all products are delivered immediately upon payment confirmation, there is no
          &quot;cooling-off&quot; period.
        </p>
      </Section>

      <Section title="4. Carefully Review Before Purchasing">
        <p>We strongly encourage you to:</p>
        <ul className="space-y-1.5">
          <Bullet>Carefully read the course description, syllabus, lesson count, total duration, and any preview material before completing your purchase.</Bullet>
          <Bullet>Ensure the language of instruction, level (beginner/intermediate/advanced), and content topic match your expectations.</Bullet>
          <Bullet>Verify you have a compatible device and stable internet connection.</Bullet>
          <Bullet>Contact us at <a href="mailto:support@vishnuraghav.in" className="text-brand-gold underline">support@vishnuraghav.in</a> with any pre-purchase questions; we are happy to help you decide whether a course is right for you.</Bullet>
        </ul>
      </Section>

      <Section title="5. Technical Issues">
        <p>
          We are committed to providing reliable access to all purchased Digital Products. If you experience a genuine
          technical issue caused by our Platform — for example, video playback errors on our servers, inability to load
          your enrolled course, broken download links, or login problems — please contact our support team at <a href="mailto:support@vishnuraghav.in" className="text-brand-gold underline">support@vishnuraghav.in</a> within 7 days of encountering the issue.
        </p>
        <p>
          We will work in good faith to resolve all verifiable Platform-side technical issues by repair, replacement
          access, or other reasonable remedies at our sole discretion. <strong>Such issues will not be addressed
          through monetary refunds.</strong> Issues caused by your device, browser, network, or third-party software
          are outside our scope of support.
        </p>
      </Section>

      <Section title="6. Failed or Duplicate Payments">
        <p>
          If your payment was deducted but the course was not unlocked due to a technical failure during checkout, the
          amount will be automatically refunded by your bank or Razorpay within 5–7 business days. If you do not see the
          refund within this period, please contact us with your transaction ID at <a href="mailto:support@vishnuraghav.in" className="text-brand-gold underline">support@vishnuraghav.in</a> and we will assist in tracing the
          payment with Razorpay.
        </p>
        <p>
          Duplicate payments accidentally made for the same course (where access was already granted by the first
          payment) will be reviewed on a case-by-case basis and, if verified, the duplicate amount will be returned
          via the original payment method within 7–10 business days.
        </p>
      </Section>

      <Section title="7. Chargebacks">
        <p>
          Initiating a chargeback or payment dispute through your bank for a successfully delivered Digital Product
          constitutes a breach of these terms. In such cases, we reserve the right to:
        </p>
        <ul className="space-y-1.5">
          <Bullet>Immediately and permanently revoke access to all purchased content and your account.</Bullet>
          <Bullet>Recover the disputed amount, chargeback fees, and reasonable legal costs through appropriate channels.</Bullet>
          <Bullet>Report the matter to credit reporting agencies, payment networks, or law enforcement where applicable.</Bullet>
        </ul>
        <p>If you have a concern, please contact us first — we are committed to resolving genuine issues fairly.</p>
      </Section>

      <Section title="8. Promotional Offers &amp; Coupons">
        <p>
          Purchases made using promotional codes, discount coupons, or special offers are equally subject to this
          non-refundable policy. Coupons are non-transferable, cannot be exchanged for cash, and may not be combined
          unless explicitly stated.
        </p>
      </Section>

      <Section title="9. Modifications to This Policy">
        <p>
          We may update this Refund &amp; Cancellation Policy from time to time to reflect changes in our practices or
          legal requirements. The &quot;Last updated&quot; date at the top of this page will reflect any such revision.
          The version of this policy in effect on the date of your purchase shall govern that transaction.
        </p>
      </Section>

      <Section title="10. Contact &amp; Support">
        <p>
          For any pre-purchase queries, technical support, or clarifications on this policy, please reach out to:
        </p>
        <p className="bg-ink-900 border border-white/[0.07] rounded-xl p-4 text-sm">
          <strong>Vishnu Raghav — Support Team</strong><br />
          Email: <a href="mailto:support@vishnuraghav.in" className="text-brand-gold underline">support@vishnuraghav.in</a><br />
          Website: <a href="https://vishnuraghav.in" className="text-brand-gold underline">vishnuraghav.in</a><br />
          Response time: within 2 business days
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          By making a purchase on vishnuraghav.in, you confirm that you have read, understood, and agreed to this
          Refund &amp; Cancellation Policy, our <a href="/terms" className="text-brand-gold underline">Terms &amp;
          Conditions</a>, and our <a href="/privacy-policy" className="text-brand-gold underline">Privacy Policy</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
