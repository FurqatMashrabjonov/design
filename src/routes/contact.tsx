import { createFileRoute } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { LegalPage, Section } from '@/components/Legal'
import { BRAND, SUPPORT_EMAIL } from '@/lib/brand'

// LEG-04: one way to reach a person, linked from the footer and the account menu.
export const Route = createFileRoute('/contact')({
  head: () => ({ meta: [{ title: `Contact & support — ${BRAND}` }, { name: 'description', content: `How to reach the people behind ${BRAND}.` }] }),
  component: Contact,
})

function Contact() {
  return (
    <LegalPage title="Contact & support" intro={<p>A person reads every message. We answer within two working days, usually sooner.</p>}>
      <Section title="Email us">
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 font-medium shadow-1 hover:bg-muted">
            <Mail className="size-4" /> {SUPPORT_EMAIL}
          </a>
        </p>
        <p>Write from your account's email if it is about your account, credits or a payment, and say which project if it is about a design — a link to it helps.</p>
      </Section>
      <Section title="Good to know">
        <ul>
          <li>A generation that failed has already returned its credits to your balance.</li>
          <li>Refunds: see the refund policy. Your data and deleting it: see the privacy policy.</li>
          <li>Found a security problem? Email us with “Security” in the subject; please do not test on other people's accounts.</li>
        </ul>
      </Section>
    </LegalPage>
  )
}
