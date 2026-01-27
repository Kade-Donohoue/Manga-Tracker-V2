import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../hooks/useAuthStatus';
import { Box, Button, TextField, Typography, Paper, Link as MuiLink } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [showVerificationDialog, setShowVerificationDialog] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await authClient.signIn.email({ email, password, callbackURL: '/tracked' });

    if (result.error) {
      if (result.error.code === 'EMAIL_NOT_VERIFIED') {
        setShowVerificationDialog(true);
        setLoading(false);
        return;
      }

      setError(result.error.message || 'Sign in failed');
      setLoading(false);
      return;
    }

    navigate('/tracked');
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#121212',
        color: '#f0f0f0',
        px: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          backgroundColor: '#1e1e1e',
          borderRadius: 2,
        }}
        elevation={3}
      >
        <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
          Sign In
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            InputProps={{ sx: { color: '#f0f0f0' } }}
            InputLabelProps={{ sx: { color: '#f0f0f0' } }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            InputProps={{ sx: { color: '#f0f0f0' } }}
            InputLabelProps={{ sx: { color: '#f0f0f0' } }}
          />
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <MuiLink
            component="button"
            variant="body2"
            onClick={() => navigate('/forgot-password')}
            sx={{ color: '#00bcd4', textAlign: 'center' }}
          >
            Forgot password?
          </MuiLink>
        </Box>

        <Box sx={{ my: 2, textAlign: 'center', color: '#888' }}>or</Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => authClient.signIn.social({ provider: 'google' })}
          >
            Continue with Google
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => authClient.signIn.social({ provider: 'discord' })}
          >
            Continue with Discord
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => authClient.signIn.social({ provider: 'twitter' })}
          >
            Continue with X-Twitter
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <MuiLink
            component="button"
            variant="body2"
            onClick={() => navigate('/sign-up')}
            sx={{ color: '#00bcd4' }}
          >
            Don't have an account? Sign Up
          </MuiLink>
        </Box>
      </Paper>

      <Dialog open={showVerificationDialog} onClose={() => setShowVerificationDialog(false)}>
        <DialogTitle>Verify your email</DialogTitle>

        <DialogContent>
          <Typography>A verification email has been sent to:</Typography>

          <Typography sx={{ mt: 1, fontWeight: 600 }}>{email}</Typography>

          <Typography sx={{ mt: 2, color: 'text.secondary' }}>
            Please check your inbox and click the verification link before signing in.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowVerificationDialog(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
