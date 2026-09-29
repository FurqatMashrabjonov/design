import { createFileRoute, Link } from '@tanstack/react-router'
import { LegalPage, Section } from '@/components/Legal'
import { BRAND, SUPPORT_EMAIL } from '@/lib/brand'

// LEG-03: when money comes back. Failed work already refunds itself in credits (BIL-06); this page is about money.
export const Route = createFileRoute('/refunds')({
  head: () => ({ meta: [{ title: `Refund policy — ${BRAND}` }, { name: 'description', content: `When and how ${BRAND} refunds a purchase.` }] }),
  component: Refunds,
})

function Refunds() {
  return (
    <LegalPage title="Refund policy" intro={<p>We want you to pay only for what worked for you. Here is when you get money back, and how.</p>}>
      <Section title="Failed generations — automatic">
        <p>If a generation fails or you stop it, the credits for anything that was not made come back to your balance at once. You do not need to ask.</p>
      </Section>

      <Section title="Credit packs">
        <p>A pack you have not used any credits from can be refunded in full within 14 days of buying it. Once credits from a pack are used, that pack is not refunded.</p>
      </Section>

      <Section title="Plans">
        <ul>
          <li><b>First payment:</b> within 14 days, if you have used less than 10% of the plan's credits, we refund it in full.</li>
          <li><b>Renewals:</b> cancel any time before the next renewal and you will not be charged again; the plan runs to the end of the period you paid for. If a renewal went through by mistake and you have not used that month's credits, write to us within 7 days for a refund.</li>
          <li>We do not refund part of a period that has been used.</li>
        </ul>
      </Section>

      <Section title="How to ask">
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a> from your account's address with the date of the purchase. We answer within two working days. Payments are
          handled by Polar, our merchant of record, so the refund goes back to the card or method you paid with, usually within 5–10 days.
        </p>
      </Section>

      <Section title="Your legal rights">
        <p>This policy adds to the rights consumer law gives you where you live; it does not take any away. Because credits are digital content delivered as soon as you buy, the EU 14-day right of withdrawal ends once you start using them — the refunds above apply either way.</p>
      </Section>

      <p className="text-sm text-muted-foreground">
        See also the <Link to="/terms" className="underline">terms of use</Link> and <Link to="/pricing" className="underline">pricing</Link>.
      </p>
    </LegalPage>
  )
}
