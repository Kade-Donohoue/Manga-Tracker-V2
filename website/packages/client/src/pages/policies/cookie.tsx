import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function CookiePolicy() {
  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto', color: '#f0f0f0' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Cookie Policy
      </Typography>

      <Typography paragraph>Last Updated: 2/22/2026</Typography>

      <Typography paragraph>
        We use cookies and similar technologies to operate and improve our service.
      </Typography>

      <Typography variant="h6" sx={{ mt: 3 }}>
        Types of Storage Used
      </Typography>
      <ul>
        <li>Session cookies for authentication</li>
        <li>Local storage for preferences</li>
        <li>Push subscription storage for notifications</li>
      </ul>

      <Typography paragraph>
        Disabling cookies may prevent certain features from functioning properly.
      </Typography>
    </Box>
  );
}
