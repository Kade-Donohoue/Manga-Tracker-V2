import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function TermsOfService() {
  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto', color: '#f0f0f0' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Terms of Service
      </Typography>

      <Typography component="p" sx={{ mb: 2 }}>
        Last Updated: 2/22/2026
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        1. Acceptance of Terms
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        By creating an account or using this service, you agree to these Terms.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        2. Use of the Service
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        You agree to use the service responsibly and not:
      </Typography>
      <ul>
        <li>Attempt to exploit or disrupt the service</li>
        <li>Abuse system resources</li>
        <li>Attempt unauthorized access</li>
      </ul>

      <Typography variant="h6" sx={{ mt: 3 }}>
        3. Accounts
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        You are responsible for maintaining the security of your account.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        4. Suspension & Termination
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        We reserve the right to suspend or terminate accounts that violate these Terms.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        5. Disclaimer
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        The service is provided "as is" without warranties of any kind.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        6. Limitation of Liability
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        We are not liable for any damages arising from use of the service.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        7. Changes to Terms
      </Typography>
      <Typography component="p" sx={{ mb: 2 }}>
        We may modify these Terms at any time. Continued use of the service constitutes acceptance
        of the updated Terms.
      </Typography>
    </Box>
  );
}
