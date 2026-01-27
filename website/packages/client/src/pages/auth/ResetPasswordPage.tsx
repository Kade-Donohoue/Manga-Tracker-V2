import * as React from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authClient } from '../../hooks/useAuthStatus';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authClient.resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box display="flex" justifyContent="center" mt={8} flexDirection="column" alignItems="center">
        <Typography variant="h6">Password Reset Successful!</Typography>
        <Typography> You can now log in with your new password.</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" mt={8} px={2}>
      <Paper sx={{ p: 5, maxWidth: 400, width: '100%', borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h5" mb={3} textAlign="center">
          Reset Password
        </Typography>

        <Box component="form" onSubmit={handleSubmit} display="flex" gap={2} flexDirection="column">
          <TextField
            label="New Password"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TextField
            label="Confirm Password"
            type="password"
            required
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </Button>
        </Box>
        <Button variant="text" size="small" sx={{ mt: 2 }} onClick={() => navigate('/sign-in')}>
          Back to Sign In
        </Button>
      </Paper>
    </Box>
  );
}
