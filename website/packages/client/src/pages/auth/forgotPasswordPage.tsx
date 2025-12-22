import * as React from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { authClient } from '../../hooks/useAuthStatus';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // await authClient.forgetPassword()

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <Typography>
          If an account exists for this email, a reset link has been sent.
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" mb={2}>
          Reset Password
        </Typography>

        <Box component="form" onSubmit={handleSubmit} display="flex" gap={2} flexDirection="column">
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
