import React from "react";
import { Link } from "react-router-dom";
import LegalPage, { Section, Bullet } from "../components/LegalPage";

const EMAIL = "vishnuraghav955@gmail.com";
const Mail = () => <a href={`mailto:${EMAIL}`} className="text-brand-gold underline">{EMAIL}</a>;
const Whatsapp = () => <a href="https://wa.me/918439111502" target="_blank" rel="noopener noreferrer" className="text-brand-gold underline">+91 84391 11502</a>;

export default function ShippingPolicy() {
  return (
    <LegalPage title="Shipping & Delivery Policy" lastUpdated="October 16, 2026">
      <p>
        This policy explains how orders placed on authorvishnuraghav.in are delivered. It is part of our{" "}
        <Link to="/terms" className="text-brand-gold underline">Terms & Conditions</Link>.
      </p>

      <Section title="1. Digital Products (Courses & eBooks)">
        <ul className="space-y-1.5">
          <Bullet>Delivered instantly online after successful payment. Nothing is shipped.</Bullet>
          <Bullet>Courses open in your Dashboard after you log in. eBooks are available to download right after payment.</Bullet>
          <Bullet>There are no shipping charges for digital products.</Bullet>
        </ul>
      </Section>

      <Section title="2. Printed Books: Where We Ship">
        <p>We currently ship printed books to addresses within India only.</p>
      </Section>

      <Section title="3. Dispatch & Delivery Time">
        <ul className="space-y-1.5">
          <Bullet><strong>Dispatch:</strong> within 2–3 working days after your order is confirmed.</Bullet>
          <Bullet><strong>Delivery:</strong> usually 5–7 working days after dispatch.</Bullet>
          <Bullet>Working days are Monday to Saturday, excluding public holidays. Remote areas may take a little longer.</Bullet>
        </ul>
      </Section>

      <Section title="4. Shipping Charges">
        <p>Any shipping charge is shown clearly at checkout before you pay and is included in the final amount.</p>
      </Section>

      <Section title="5. Tracking">
        <p>Once your order is dispatched, we share the courier and tracking details by WhatsApp or email where available. You can also contact us any time to know your order status.</p>
      </Section>

      <Section title="6. Address & Delivery">
        <ul className="space-y-1.5">
          <Bullet>Please enter your full address, pincode and a working mobile number at checkout.</Bullet>
          <Bullet>If a parcel comes back to us because of a wrong address or because nobody accepted it, re-shipping charges may apply.</Bullet>
        </ul>
      </Section>

      <Section title="7. Delays">
        <p>Delays caused by the courier, weather, strikes, festivals or other events outside our control can happen. We will help you follow up with the courier.</p>
      </Section>

      <Section title="8. Damaged, Wrong or Missing Books">
        <ul className="space-y-1.5">
          <Bullet>Send a clear photo or unboxing video within 48 hours of delivery and we will send a free replacement.</Bullet>
          <Bullet>If your order has not arrived within 15 working days of dispatch, contact us. We will trace it and send a free replacement if it is lost.</Bullet>
          <Bullet>Orders can be cancelled for a full refund only before dispatch. See our <Link to="/refund-policy" className="text-brand-gold underline">Refund & Cancellation Policy</Link>.</Bullet>
        </ul>
      </Section>

      <Section title="9. Contact">
        <p className="bg-ink-900 border border-white/[0.07] rounded-xl p-4 text-sm">
          <strong>Vishnu Raghav — Support</strong><br />
          Email: <Mail /><br />
          Phone / WhatsApp: <Whatsapp /><br />
          Address: Ghaziabad, Uttar Pradesh, India<br />
          Response time: within 2 working days
        </p>
      </Section>
    </LegalPage>
  );
}
