import React from "react";
import { Link } from "react-router-dom";
import LegalPage, { Section, Bullet } from "../components/LegalPage";
import { AlertTriangle } from "lucide-react";

const EMAIL = "vishnuraghav955@gmail.com";
const Mail = () => <a href={`mailto:${EMAIL}`} className="text-brand-gold underline">{EMAIL}</a>;
const Whatsapp = () => <a href="https://wa.me/918439111502" target="_blank" rel="noopener noreferrer" className="text-brand-gold underline">+91 84391 11502</a>;

export default function RefundPolicy() {
  return (
    <LegalPage title="Refund & Cancellation Policy" lastUpdated="October 16, 2026">
      <div className="bg-red-500/[0.08] border border-red-500/30 rounded-xl p-4 sm:p-5 flex gap-3 not-prose">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.7} />
        <p className="text-sm leading-relaxed text-red-100">
          <strong className="text-red-300">Summary.</strong> Digital products (online courses, video lessons, eBooks and
          downloads) sold on <strong>authorvishnuraghav.in</strong> are non-refundable once access is given. Printed books
          can be cancelled for a full refund before dispatch, and are replaced free of cost if they arrive damaged or wrong.
        </p>
      </div>

      <p>
        This policy applies to all purchases made on authorvishnuraghav.in and is part of our{" "}
        <Link to="/terms" className="text-brand-gold underline">Terms & Conditions</Link>. By completing a purchase, you
        agree to this policy.
      </p>

      <Section title="1. What We Sell">
        <ul className="space-y-1.5">
          <Bullet><strong>Digital Products:</strong> online courses, video lessons, eBooks (PDF), workbooks, certificates and other downloadable or online content.</Bullet>
          <Bullet><strong>Printed Books:</strong> physical books shipped to your address, sold on their own or included with a course.</Bullet>
        </ul>
      </Section>

      <Section title="2. Digital Products: No Refund">
        <p>Digital Products are delivered instantly after payment and cannot be returned. We do not offer refunds, partial refunds or exchanges for:</p>
        <ul className="space-y-1.5">
          <Bullet>Change of mind after purchase.</Bullet>
          <Bullet>Not using, watching or downloading the content.</Bullet>
          <Bullet>Dissatisfaction with the content, teaching style, language or pace (details and free samples are shown before purchase).</Bullet>
          <Bullet>Not getting a personal result. Our courses and books are educational and do not guarantee any specific outcome.</Bullet>
          <Bullet>Accidental purchases, or problems with your own device or internet connection.</Bullet>
        </ul>
        <p>Once access to a Digital Product is given, the purchase cannot be cancelled.</p>
      </Section>

      <Section title="3. Printed Books">
        <ul className="space-y-1.5">
          <Bullet><strong>Cancellation before dispatch:</strong> you can cancel a printed book order any time before it is dispatched by contacting us. You will get a full refund to your original payment method within 5–7 working days.</Bullet>
          <Bullet><strong>After dispatch:</strong> orders cannot be cancelled or refunded once they have been dispatched.</Bullet>
          <Bullet><strong>Damaged or wrong book:</strong> we will send a free replacement if you share a clear photo or unboxing video within 48 hours of delivery, by email or WhatsApp, along with your name and order details.</Bullet>
          <Bullet><strong>Book not delivered:</strong> if your order has not arrived within 15 working days of dispatch, contact us. We will trace it with the courier and send a free replacement if it is lost.</Bullet>
          <Bullet><strong>Wrong address or refused delivery:</strong> if a parcel comes back to us because of an incorrect address or because nobody accepted it, re-shipping charges may apply.</Bullet>
          <Bullet><strong>Courses that include printed books:</strong> course access is a Digital Product (Section 2). Books in such orders are replaced free of cost if they arrive damaged, wrong or are lost, as described above.</Bullet>
        </ul>
        <p>See our <Link to="/shipping-policy" className="text-brand-gold underline">Shipping & Delivery Policy</Link> for delivery times and charges.</p>
      </Section>

      <Section title="4. Technical Issues">
        <p>
          If you face a genuine problem caused by our website (for example a course that does not open, a broken download link
          or login problems), contact us at <Mail /> within 7 days. We will fix it or give you replacement access. Such issues
          are resolved by repair, not by monetary refund.
        </p>
      </Section>

      <Section title="5. Failed or Duplicate Payments">
        <p>
          If money was deducted but your order was not completed, the amount is usually returned automatically by your bank or
          Razorpay within 5–7 working days. If not, send us your transaction ID at <Mail /> and we will help trace it.
          Duplicate payments for the same product are refunded to the original payment method within 7–10 working days after
          verification.
        </p>
      </Section>

      <Section title="6. Chargebacks">
        <p>
          Please contact us before raising a dispute with your bank. If a chargeback is raised for a product that was
          successfully delivered, we may suspend access to the purchased content and your account while the dispute is reviewed.
        </p>
      </Section>

      <Section title="7. Offers & Coupons">
        <p>Purchases made with discounts or coupons follow this same policy. Coupons cannot be exchanged for cash.</p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p>We may update this policy from time to time. The version in effect on the date of your purchase applies to that order.</p>
      </Section>

      <Section title="9. Contact & Support">
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
