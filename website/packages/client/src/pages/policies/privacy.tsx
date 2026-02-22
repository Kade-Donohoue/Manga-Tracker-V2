import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function PrivacyPolicy() {
  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto', color: '#f0f0f0' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Privacy Policy
      </Typography>

      <Typography paragraph>Last Updated: 2/22/2026</Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        1. Information We Collect
      </Typography>
      <Typography paragraph>When you create an account, we collect:</Typography>
      <ul>
        <li>Username</li>
        <li>Email address</li>
        <li>Authentication data (via Google or Discord, if used)</li>
        <li>Your manga tracking data (titles, progress, categories, preferences)</li>
      </ul>

      <Typography variant="h6" sx={{ mt: 3 }}>
        2. Push Notifications
      </Typography>
      <Typography paragraph>
        If you enable notifications, we store a push subscription linked to your account. This is
        used solely to send notifications related to your tracked content.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        3. Cookies & Local Storage
      </Typography>
      <Typography paragraph>We use cookies and browser storage to:</Typography>
      <ul>
        <li>Maintain login sessions</li>
        <li>Remember preferences</li>
        <li>Improve performance</li>
      </ul>

      <Typography variant="h6" sx={{ mt: 3 }}>
        4. Third-Party Services
      </Typography>
      <Typography paragraph>
        We use third-party authentication providers such as Google and Discord. These providers may
        collect data according to their own privacy policies.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        5. Data Storage & Security
      </Typography>
      <Typography paragraph>
        Data is stored securely using Cloudflare infrastructure. We take reasonable measures to
        protect your information.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        6. Data Deletion
      </Typography>
      <Typography paragraph>
        You may request deletion of your account and associated data at any time. Upon deletion,
        your stored data will be permanently removed.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        7. Changes
      </Typography>
      <Typography paragraph>
        We may update this policy from time to time. Continued use of the service after changes
        constitutes acceptance of the updated policy.
      </Typography>
    </Box>
  );
}
