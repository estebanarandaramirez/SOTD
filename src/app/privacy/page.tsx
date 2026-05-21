export const metadata = {
  title: 'Privacy Policy – Song of the Day',
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#e5e5e5' }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: May 21, 2026</em></p>

      <p>Song of the Day ("the App") is operated by Esteban Aranda. This policy explains what information we collect, how we use it, and your choices.</p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> email address and username when you sign up.</li>
        <li><strong>Spotify data:</strong> your Spotify display name and the track you choose to share each day, via Spotify's API. We do not store your Spotify credentials.</li>
        <li><strong>Usage data:</strong> posts, likes, comments, and follows you create inside the App.</li>
        <li><strong>Device token:</strong> a push notification token to deliver activity alerts to your device. This token is linked to your account and stored securely.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To operate the App — showing your posts, your followers' posts, and social interactions.</li>
        <li>To send push notifications about likes, comments, follows, and daily reminders (you can disable these in your device settings at any time).</li>
        <li>We do not sell your data or use it for advertising.</li>
      </ul>

      <h2>Third-Party Services</h2>
      <ul>
        <li><strong>Supabase</strong> – database and authentication hosting.</li>
        <li><strong>Spotify</strong> – music data via OAuth. Governed by <a href="https://www.spotify.com/us/legal/privacy-policy/">Spotify's Privacy Policy</a>.</li>
        <li><strong>Firebase Cloud Messaging</strong> – push notification delivery. Governed by <a href="https://firebase.google.com/support/privacy">Google's Privacy Policy</a>.</li>
      </ul>

      <h2>Data Retention</h2>
      <p>Your data is retained as long as your account exists. You can delete your account and all associated data by contacting us.</p>

      <h2>Children's Privacy</h2>
      <p>The App is not directed at children under 13. We do not knowingly collect data from children under 13.</p>

      <h2>Contact</h2>
      <p>Questions? Email us at <a href="mailto:itzvan98@hotmail.com">itzvan98@hotmail.com</a>.</p>
    </main>
  )
}
