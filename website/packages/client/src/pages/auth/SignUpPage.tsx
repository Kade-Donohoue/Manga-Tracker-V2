import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../hooks/useAuthStatus';
import { Box, Button, TextField, Typography, Paper, Link as MuiLink } from '@mui/material';
import { FormControlLabel, Checkbox } from '@mui/material';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [agreed, setAgreed] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!agreed) {
      setError('You must agree to the Privacy Policy and Terms to continue');
      return;
    }

    if (!name.trim()) {
      setError('Username is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const result = await authClient.signUp.email({ name, email, password });

    if (result.error) {
      setError(result.error.message || 'Sign Up failed');
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
          Sign Up
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
            label="Username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            InputProps={{ sx: { color: '#f0f0f0' } }}
            InputLabelProps={{ sx: { color: '#f0f0f0' } }}
          />
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
          <TextField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
            InputProps={{ sx: { color: '#f0f0f0' } }}
            InputLabelProps={{ sx: { color: '#f0f0f0' } }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                sx={{ color: '#00bcd4' }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#ccc' }}>
                I agree to the{' '}
                <MuiLink href="/privacy-policy" target="_blank" sx={{ color: '#00bcd4' }}>
                  Privacy Policy
                </MuiLink>{' '}
                and{' '}
                <MuiLink href="/tos" target="_blank" sx={{ color: '#00bcd4' }}>
                  Terms of Service
                </MuiLink>{' '}
                and{' '}
                <MuiLink href="/cookies-policy" target="_blank" sx={{ color: '#00bcd4' }}>
                  Cookies Policy
                </MuiLink>
              </Typography>
            }
          />
          <Button type="submit" variant="contained" color="primary" disabled={loading || !agreed}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </Box>

        <Box sx={{ my: 2, textAlign: 'center', color: '#888' }}>or create account with</Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => authClient.signIn.social({ provider: 'google' })}
          >
            Google
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => authClient.signIn.social({ provider: 'discord' })}
          >
            Discord
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <MuiLink
            component="button"
            variant="body2"
            onClick={() => navigate('/sign-in')}
            sx={{ color: '#00bcd4' }}
          >
            Already have an account? Sign In
          </MuiLink>
        </Box>
      </Paper>
    </Box>
  );
}
