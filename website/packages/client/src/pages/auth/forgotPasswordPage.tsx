import * as React from 'react';
import { Box, Button, Paper, TextField, Typography, Divider } from '@mui/material';
import { authClient } from '../../hooks/useAuthStatus';
import { useNavigate } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authClient.forgetPassword({
        email,
        redirectTo: `${import.meta.env.VITE_SERVER_URL}/reset-password`,
      });
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" mt={8} flexDirection="column">
        <Typography variant="h6" gutterBottom>
          Reset Link Sent
        </Typography>
        <Typography textAlign="center">
          If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your
          inbox and spam folder.
        </Typography>

        <Button variant="text" size="medium" sx={{ mt: 2 }} onClick={() => navigate('/sign-in')}>
          Back to Sign In
        </Button>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      mt={8}
      flexDirection="column"
      px={2}
    >
      <Paper sx={{ p: 5, maxWidth: 400, width: '100%', borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h5" mb={3} textAlign="center">
          Forgot Password
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Box component="form" onSubmit={handleSubmit} display="flex" gap={2} flexDirection="column">
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </Box>

        <Button variant="text" size="small" sx={{ mt: 2 }} onClick={() => navigate('/sign-in')}>
          Back to Sign In
        </Button>
      </Paper>
    </Box>
  );
}
