import { createFileRoute, Link } from '@tanstack/react-router'
import { LegalPage, Section } from '@/components/Legal'
import { BRAND, OPERATOR, SUPPORT_EMAIL } from '@/lib/brand'

// LEG-01: the agreement for using the product — what it is, what is yours, what is not allowed, credits, limits.
export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: `Terms of use — ${BRAND}` }, { name: 'description', content: `The terms for using ${BRAND}.` }] }),
  component: Terms,
})

function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      intro={
        <p>
          These terms are the agreement between you and {OPERATOR.name} ({OPERATOR.country}), who runs {BRAND}. By creating an account or using {BRAND} you agree to them. If you do not, please do
          not use it.
        </p>
      }
    >
      <Section title="The service">
        <p>{BRAND} uses AI models to design mobile app screens from your descriptions, lets you edit and preview them, and exports them as code, a prototype file or Figma layers. It is a design tool: what it makes is a starting point for you to check and build on.</p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>You must be at least 16 and give a real email address. One person, one account.</li>
          <li>You are responsible for what happens under your account. Tell us at once if you think someone else is using it.</li>
        </ul>
      </Section>

      <Section title="What is yours">
        <ul>
          <li>Your prompts and the designs made for you are yours, as far as the law lets AI-made work be owned. You may use, change and sell them.</li>
          <li>You give us the permission we need to run the service with them: to store, process, show them to you, and send them to the AI providers that make them. If you turn on a public link, you let anyone with it view that app.</li>
          <li>AI output can resemble other people's designs or contain mistakes, and similar prompts can give similar results. Check it before you rely on it, and do not assume it is unique.</li>
          <li>Photos in designs come from Pexels under the Pexels license. Exported code includes open-source libraries under their own licenses.</li>
        </ul>
      </Section>

      <Section title="What is not allowed">
        <ul>
          <li>Anything illegal, or designs meant to deceive: copies of real apps or brands to pass as them, phishing screens, fake receipts or records.</li>
          <li>Content that is hateful, sexual involving minors, or that harasses a real person.</li>
          <li>Getting around limits or credits, sharing an account, scraping, reselling access, or attacking the service.</li>
        </ul>
        <p>We may remove content or suspend an account that breaks these rules.</p>
      </Section>

      <Section title="Credits, plans and payment">
        <ul>
          <li>Generating uses credits. Prices are on the <Link to="/pricing" className="underline">pricing page</Link>. A new account gets free credits once.</li>
          <li>Credits pay for work that was delivered: if a generation fails or is stopped, the credits for what was not made come back automatically.</li>
          <li>Plan credits are given each month of the plan and what is left lapses when the next month's arrive. Credit packs do not expire. Credits have no cash value and cannot be transferred.</li>
          <li>Payments are handled by Polar, our merchant of record, which also handles tax and receipts. Plans renew until you cancel; cancelling keeps the plan to the end of the paid period.</li>
          <li>Refunds follow the <Link to="/refunds" className="underline">refund policy</Link>.</li>
        </ul>
      </Section>

      <Section title="Availability">
        <p>We work to keep {BRAND} running and your work safe, but it is provided as it is, without guarantees that it will always be available, error-free or fit for a particular purpose. We may change or stop features; if we stop the service we will give you notice to export your work.</p>
      </Section>

      <Section title="Liability">
        <p>As far as the law allows, we are not liable for indirect or consequential losses, and our total liability to you is limited to what you paid us in the 12 months before the claim. Nothing here limits rights you have as a consumer that cannot be limited.</p>
      </Section>

      <Section title="Ending">
        <p>You can delete your account at any time from the account menu. We may suspend or close an account that breaks these terms; if we close one without cause, we will refund unused paid credits.</p>
      </Section>

      <Section title="Changes and law">
        <p>If these terms change in a way that matters, we will post the new version here and tell you by email before it applies. These terms are governed by the laws of {OPERATOR.country}. Questions: <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.</p>
      </Section>
    </LegalPage>
  )
}
