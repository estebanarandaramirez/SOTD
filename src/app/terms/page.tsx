export const metadata = {
  title: 'Terms of Service – Song of the Day',
}

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#e5e5e5' }}>
      <h1>Terms of Service</h1>
      <p><em>Last updated: October 22, 2026</em></p>

      <p>Song of the Day ("SOTD", "the App") is operated by Esteban Aranda. By creating an account, you agree to these terms.</p>

      <h2>Your Account</h2>
      <ul>
        <li>You're responsible for the content you post, including your daily song, notes, and comments.</li>
        <li>You can delete your account at any time from Settings. This permanently removes your profile, posts, comments, likes, and follows.</li>
      </ul>

      <h2>Content Standards</h2>
      <p>SOTD has <strong>zero tolerance for objectionable content or abusive behavior</strong>. This includes harassment, hate speech, threats, sexually explicit content, and anything illegal. We reserve the right to remove content and suspend or terminate accounts that violate this policy.</p>

      <h2>Reporting and Blocking</h2>
      <ul>
        <li>You can report any post, comment, or user you believe violates these terms using the report option available throughout the App.</li>
        <li>You can block another user at any time from their profile — this removes their content from your feed immediately and prevents further interaction.</li>
        <li>We review reports and act on violations, including removing content and ejecting offending users, within 24 hours.</li>
      </ul>

      <h2>Third-Party Content</h2>
      <p>SOTD displays music metadata and album artwork from the Spotify Web API, used under Spotify's Developer Terms of Service. You're responsible for complying with Spotify's own terms when connecting your account.</p>

      <h2>Termination</h2>
      <p>We may suspend or terminate accounts that violate these terms, without notice, in serious or repeated cases.</p>

      <h2>Contact</h2>
      <p>Questions? Email us at <a href="mailto:support@sotd.dev">support@sotd.dev</a>.</p>
    </main>
  )
}
