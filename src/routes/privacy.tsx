import { createFileRoute } from '@tanstack/react-router'
import { LegalPage, Section } from '@/components/Legal'
import { BRAND, OPERATOR, SUPPORT_EMAIL } from '@/lib/brand'

// LEG-02: what the product keeps about a person, who else sees it, and how to have it removed — as the code does it.
export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: `Privacy policy — ${BRAND}` }, { name: 'description', content: `What ${BRAND} collects, why, who processes it and how to delete it.` }] }),
  component: Privacy,
})

function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          {BRAND} turns a description of an app into designed screens. To do that we keep your account, what you ask for and what we make for you. We do not sell your data, show ads or use tracking
          cookies. {BRAND} is run by {OPERATOR.name} ({OPERATOR.country}); questions go to <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
        </p>
      }
    >
      <Section title="What we collect">
        <ul>
          <li><b>Account:</b> your name, email and profile picture from Google, or your email if you sign in with a link.</li>
          <li><b>Your work:</b> your prompts, projects, the screens and their earlier versions, the chat with the agent, and ratings you give screens.</li>
          <li><b>Usage:</b> each AI call made for you (which model, tokens, cost, time) — this is how credits and limits work.</li>
          <li><b>Requests and errors:</b> the page or action, status and time, with a shortened, one-way hash of your IP address — never the full address, request bodies or cookies. Kept for 7 days.</li>
          <li><b>Payments:</b> Polar processes payments. We receive the order (product, amount, date), never your card.</li>
          <li><b>Feedback and requests:</b> a rating and anything you write when you send feedback or ask for more credits, with the project it was about.</li>
          <li><b>Waitlist:</b> if you join it from a shared preview: your email, anything you wrote, and which link you came from.</li>
          <li><b>Emails we send you:</b> a record of each (address, subject, whether it was delivered).</li>
        </ul>
      </Section>

      <Section title="Why">
        <ul>
          <li>To run the product: generate and store your designs, sign you in, keep your credits and plan.</li>
          <li>To keep it working and fair: limits, spend caps, fixing errors, stopping abuse.</li>
          <li>To email you: sign-in links, the waitlist confirmation, and — only if you are on the waitlist or have an account — occasional product news, which you can unsubscribe from.</li>
        </ul>
      </Section>

      <Section title="Who else processes it">
        <p>To make designs, your prompt and the screens' code are sent to an AI model provider, under that provider's API terms. We use:</p>
        <ul>
          <li>OpenAI (United States) — the default model;</li>
          <li>DeepSeek (China) — the backup model when the default fails;</li>
          <li>Google (Gemini) and Anthropic (Claude), United States — only if we switch a feature to their models.</li>
        </ul>
        <p>Also: Google (sign-in), Pexels (photo searches — only the words describing a photo, never who you are), Polar (payments), Resend (sending email) and our hosting provider. Each receives only what its part needs.</p>
      </Section>

      <Section title="Cookies and storage">
        <p>One cookie keeps you signed in. Your browser also remembers a few preferences (light or dark, the phone in the preview, the sidebar). No analytics or advertising cookies.</p>
      </Section>

      <Section title="What others can see">
        <p>Your projects are private. If you turn on a public link for a preview, anyone with that link can view that app's screens — not edit, export or see your account. Turning the link off stops it working.</p>
      </Section>

      <Section title="How long we keep it, and deleting it">
        <ul>
          <li>Your work stays until you delete it or your account.</li>
          <li>To delete your account, write to us from its email address at <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>: we remove your account, sessions, projects, screens, versions and chat at once, within 30 days of the request.</li>
          <li>Payment and usage records are kept after that, without your work, because accounting and abuse prevention need them.</li>
          <li>You can export your designs at any time on a paid plan, and ask us for a copy of the data we hold about you.</li>
        </ul>
      </Section>

      <Section title="Your choices">
        <p>You can see and change your work in the product, ask us to delete your account, unsubscribe from product news with the link in any such email, and write to us to access or correct your data. If you are in the EU or UK you also have the rights the GDPR gives you, including to complain to your data protection authority.</p>
      </Section>

      <Section title="Children">
        <p>{BRAND} is not for children under 16, and we do not knowingly collect their data.</p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes in a way that matters, we will say so on this page and, for big changes, by email.</p>
      </Section>
    </LegalPage>
  )
}
