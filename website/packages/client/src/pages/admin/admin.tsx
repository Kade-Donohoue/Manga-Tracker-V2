import * as React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  GridLegacy as Grid,
  Alert,
  Divider,
} from '@mui/material';
import { authClient, useAuthStatus } from '../../hooks/useAuthStatus'; // adjust import
import { useNavigate } from 'react-router-dom';

export default function AdminTools() {
  const navigate = useNavigate();
  const { isLoading, session, user, refresh } = useAuthStatus();

  const [impersonateId, setImpersonateId] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);

  const isImpersonating = Boolean(session?.impersonatedBy);

  const [banUserId, setBanUserId] = React.useState('');
  const [banReason, setBanReason] = React.useState('');
  const [banFeedback, setBanFeedback] = React.useState<string | null>(null);

  const handleImpersonate = async () => {
    try {
      setStatus(null);
      await authClient.admin.impersonateUser({ userId: impersonateId });
      refresh();
    } catch {
      setStatus('Failed to impersonate user');
    }
  };

  const handleStopImpersonating = async () => {
    try {
      setStatus(null);
      await authClient.admin.stopImpersonating();
      refresh();
    } catch {
      setStatus('Failed to stop impersonation');
    }
  };

  const handleBan = async () => {
    try {
      setBanFeedback(null);
      await authClient.admin.banUser({
        userId: banUserId,
        banReason: banReason || undefined,
      });
      setBanFeedback('User banned successfully');
    } catch (err) {
      console.error(err);
      setBanFeedback('Error banning user');
    }
  };

  const handleUnban = async () => {
    try {
      setBanFeedback(null);
      await authClient.admin.unbanUser({ userId: banUserId });
      setBanFeedback('User unbanned successfully');
    } catch (err) {
      console.error(err);
      setBanFeedback('Error unbanning user');
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', backgroundColor: '#121212', color: '#f0f0f0' }}>
      <Typography variant="h4" gutterBottom>
        Admin Tools
      </Typography>

      <Grid container spacing={3}>
        {/* Impersonate */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Impersonation
              </Typography>

              {isLoading && <Typography variant="body2">Loading session…</Typography>}

              {!isLoading && isImpersonating && user && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Currently impersonating</Typography>
                  <Typography variant="body2">
                    User: {user.name ?? user.email ?? 'Unknown'}
                  </Typography>
                  <Typography variant="body2">User ID: {user.id}</Typography>
                </Alert>
              )}

              {!isLoading && !isImpersonating && (
                <TextField
                  fullWidth
                  label="User ID to impersonate"
                  size="small"
                  value={impersonateId}
                  onChange={(e) => setImpersonateId(e.target.value)}
                />
              )}

              {status && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {status}
                </Alert>
              )}
            </CardContent>

            <CardActions>
              {!isImpersonating ? (
                <Button variant="contained" onClick={handleImpersonate} disabled={!impersonateId}>
                  Start Impersonation
                </Button>
              ) : (
                <Button variant="outlined" color="warning" onClick={handleStopImpersonating}>
                  End Impersonation
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>

        {/* Ban / Unban */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Ban / Unban User</Typography>

              <TextField
                fullWidth
                value={banUserId}
                onChange={(e) => setBanUserId(e.target.value)}
                label="User ID"
                size="small"
                sx={{ mb: 1 }}
              />

              <TextField
                fullWidth
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                label="Ban Reason"
                size="small"
                sx={{ mb: 1 }}
              />

              {banFeedback && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {banFeedback}
                </Alert>
              )}
            </CardContent>

            <CardActions>
              <Button color="error" onClick={handleBan}>
                Ban User
              </Button>
              <Button color="success" onClick={handleUnban}>
                Unban User
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Reports / Placeholder */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6">Reports</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2">
                Flagged content or reported users will show here.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Navigation Utilities */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              {/* <Button onClick={() => navigate('/admin/users')}>User Management</Button>
              <Button onClick={() => navigate('/admin/audit-log')}>Audit Logs</Button>
              <Button onClick={() => navigate('/admin/stats')}>Statistics</Button> */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
