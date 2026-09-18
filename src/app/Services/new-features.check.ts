import assert from 'node:assert'
import { DesignSystemService } from './DesignSystemService.ts'
import { SkillService } from './SkillService.ts'
import { composeSystemPrompt, composeElementEditPrompt } from './PromptComposer.ts'
import { annotateHtml } from '../../lib/element-annotator.ts'
import { extractElement, patchElement, listElementIds } from '../../lib/element-patcher.ts'
import { THRESHOLD, WEIGHTS } from './CritiqueService.ts'

console.log('Testing Design Systems...')
const systems = DesignSystemService.list()
assert.ok(systems.length >= 30, `Expected at least 30 design systems, got ${systems.length}`)
assert.ok(DesignSystemService.exists('openai'), 'openai design system must exist')
assert.ok(DesignSystemService.exists('linear-app'), 'linear-app design system must exist')
assert.ok(DesignSystemService.exists('apple'), 'apple design system must exist')
assert.ok(DesignSystemService.exists('stripe'), 'stripe design system must exist')

// Test token CSS presence and prompt injection
const linearTokens = DesignSystemService.readTokensCss('linear-app')
assert.ok(linearTokens.length > 0, 'linear-app should have tokens.css')
const promptWithTokens = composeSystemPrompt('linear-app', 'desktop')
assert.ok(promptWithTokens.includes('Design tokens (CSS custom properties)'), 'Prompt must contain tokens')
assert.ok(promptWithTokens.includes('Element targeting'), 'Prompt must contain data-od-id instruction')

console.log('Testing Skills...')
const skills = SkillService.list()
assert.ok(skills.length >= 10, `Expected at least 10 skills, got ${skills.length}`)
assert.ok(SkillService.exists('frontend-design'), 'frontend-design skill must exist')
assert.ok(SkillService.exists('landing-page'), 'landing-page skill must exist')
assert.ok(SkillService.exists('dashboard'), 'dashboard skill must exist')
assert.ok(SkillService.exists('email-template'), 'email-template skill must exist')
assert.ok(SkillService.exists('pricing-page'), 'pricing-page skill must exist')

const landingPrompt = composeSystemPrompt('minimal', 'desktop', 'landing-page')
assert.ok(landingPrompt.includes('landing-page'), 'Prompt must resolve custom skill')

console.log('Testing Element Annotation & Patching...')
const rawHtml = `<!doctype html>
<html>
<body>
  <header class="navbar"><h1>Logo</h1></header>
  <section class="hero"><p>Welcome</p></section>
  <div class="pricing-card"><h3>$10</h3></div>
  <footer class="footer"><p>Bye</p></footer>
</body>
</html>`

const annotated = annotateHtml(rawHtml)
assert.ok(annotated.includes('data-od-id="navbar"'), 'header should get navbar id')
assert.ok(annotated.includes('data-od-id="hero"'), 'section should get hero id')
assert.ok(annotated.includes('data-od-id="footer"'), 'footer should get footer id')

const ids = listElementIds(annotated)
assert.ok(ids.includes('navbar'), 'navbar id listed')
assert.ok(ids.includes('hero'), 'hero id listed')

// Test element extraction
const heroHtml = extractElement(annotated, 'hero')
assert.ok(heroHtml !== null, 'Hero element must be extracted')
assert.ok(heroHtml!.includes('Welcome'), 'Extracted hero should contain content')

// Test element patching
const newHero = '<section class="hero" data-od-id="hero"><h2>Welcome to Next-Gen Design</h2></section>'
const patched = patchElement(annotated, 'hero', newHero)
assert.ok(patched.includes('Welcome to Next-Gen Design'), 'Patched HTML should contain new element')
assert.ok(patched.includes('data-od-id="navbar"'), 'Navbar must be untouched')
assert.ok(patched.includes('data-od-id="footer"'), 'Footer must be untouched')

// Test composeElementEditPrompt
const elementEditPrompt = composeElementEditPrompt('minimal', 'desktop', annotated, 'hero', heroHtml!, 'Make headline bolder')
assert.ok(elementEditPrompt.includes('data-od-id="hero"'), 'Prompt must specify target element id')
assert.ok(elementEditPrompt.includes('Return ONLY the updated element HTML'), 'Prompt must require scoped output')

console.log('Testing Critique Config...')
assert.equal(THRESHOLD, 8.0, 'Threshold must be 8.0')
const totalWeight = WEIGHTS.layout + WEIGHTS.brandCompliance + WEIGHTS.accessibility + WEIGHTS.copyQuality
assert.ok(Math.abs(totalWeight - 1.0) < 0.001, 'Weights must sum to 1.0')

console.log('Testing App Coherence & Navigation Shell...')
const { parsePlan } = await import('./PlannerService.ts')
const multiPlan = parsePlan(
  JSON.stringify({
    appName: 'SnapCal',
    summary: 'AI nutrition tracker',
    navigation: {
      type: 'bottom-tabs',
      tabs: [
        { id: 'home', label: 'Home', icon: 'home' },
        { id: 'snap', label: 'Snap', icon: 'camera', isAction: true },
        { id: 'stats', label: 'Stats', icon: 'bar-chart-2' },
        { id: 'profile', label: 'Profile', icon: 'user' },
      ],
    },
    screens: [
      { name: 'Home View', description: 'Dashboard', screenType: 'root-tab', activeTabId: 'home' },
      { name: 'Meal Analysis', description: 'Detail', screenType: 'detail-view', parentScreen: 'Home View' },
    ],
  })
)
assert.equal(multiPlan.navigation.tabs.length, 4, 'Must have 4 navigation tabs')
assert.equal(multiPlan.navigation.tabs[1].label, 'Snap', 'Action button tab present')
assert.equal(multiPlan.screens[0].screenType, 'root-tab', 'Screen 1 is root-tab')
assert.equal(multiPlan.screens[1].screenType, 'detail-view', 'Screen 2 is detail-view')

// Verify mobile-screen prompt includes app-consistency craft rules
const mobilePrompt = composeSystemPrompt('minimal', 'mobile')
assert.ok(mobilePrompt.includes('Shared Navigation Shell'), 'Mobile prompt must contain App Consistency craft rules')
assert.ok(mobilePrompt.includes('Consistent Bottom Navigation Bar'), 'Mobile prompt must contain bottom nav bar rules')

console.log('All new features and App Coherence verified successfully! ✅')

