import * as React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Grid,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import { authClient, useAuthStatus } from '../../hooks/useAuthStatus'; // adjust import
import { useNavigate } from 'react-router-dom';
import { fetchPath } from '../../vars';

export default function AdminTools() {
  const navigate = useNavigate();
  const { isLoading, session, user, refresh } = useAuthStatus();

  const [impersonateId, setImpersonateId] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);

  const isImpersonating = Boolean(session?.impersonatedBy);

  const [banUserId, setBanUserId] = React.useState('');
  const [banReason, setBanReason] = React.useState('');
  const [banFeedback, setBanFeedback] = React.useState<string | null>(null);
  interface UserRequestItem {
    requestID: string;
    userID: string;
    mangaId: string;
    type: string;
    submittedTime: number;
    status: string;
    notes?: string;
  }

  const [requests, setRequests] = React.useState<UserRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(false);
  const [requestActionLoading, setRequestActionLoading] = React.useState<string | null>(null);
  const [requestFeedback, setRequestFeedback] = React.useState<string | null>(null);

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

  const loadRequests = async () => {
    setRequestsLoading(true);
    setRequestFeedback(null);

    try {
      const response = await fetch(`${fetchPath}/api/serverReq/data/getUserRequests`);
      if (!response.ok) {
        throw new Error('Unable to fetch user requests');
      }
      const json = (await response.json()) as { requests?: UserRequestItem[] };
      setRequests(json.requests || []);
    } catch (err) {
      console.error(err);
      setRequestFeedback('Failed to load user requests.');
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setRequestActionLoading(requestId);
    setRequestFeedback(null);

    const requestItem = requests.find((r) => r.requestID === requestId);
    if (!requestItem) {
      setRequestFeedback('Request not found');
      setRequestActionLoading(null);
      return;
    }

    try {
      if (action === 'approve') {
        // type-specific admin actions
        if (requestItem.type === 'altStats') {
          const resp = await fetch(
            `${fetchPath}/api/serverReq/data/enableAltStatCalc/${requestItem.mangaId}`,
            { method: 'POST' }
          );
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            const msg =
              typeof body === 'object' && body && 'message' in body
                ? (body as any).message
                : undefined;
            throw new Error(msg || 'Failed to enable alt stat calc');
          }
        }

        // mark request completed
        const changeResp = await fetch(
          `${fetchPath}/api/serverReq/data/changeRequestStatus/${requestId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newStatus: 'completed' }),
          }
        );

        if (!changeResp.ok) {
          const body = await changeResp.json().catch(() => ({}));
          const msg =
            typeof body === 'object' && body && 'message' in body
              ? (body as any).message
              : undefined;
          throw new Error(msg || 'Failed to update status');
        }

        setRequests((prev) =>
          prev.map((r) => (r.requestID === requestId ? { ...r, status: 'completed' } : r))
        );
        setRequestFeedback('Request approved successfully.');
      } else {
        const changeResp = await fetch(
          `${fetchPath}/api/serverReq/data/changeRequestStatus/${requestId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newStatus: 'denied' }),
          }
        );

        if (!changeResp.ok) {
          const body = await changeResp.json().catch(() => ({}));
          const msg =
            typeof body === 'object' && body && 'message' in body
              ? (body as any).message
              : undefined;
          throw new Error(msg || 'Failed to update status');
        }

        setRequests((prev) =>
          prev.map((r) => (r.requestID === requestId ? { ...r, status: 'denied' } : r))
        );
        setRequestFeedback('Request rejected successfully.');
      }
    } catch (err) {
      console.error(err);
      setRequestFeedback((err as Error).message || 'Unable to update request status.');
    } finally {
      setRequestActionLoading(null);
    }
  };

  React.useEffect(() => {
    loadRequests();
  }, []);

  return (
    <Box sx={{ p: 4, minHeight: '100vh', backgroundColor: '#121212', color: '#f0f0f0' }}>
      <Typography variant="h4" gutterBottom>
        Admin Tools
      </Typography>

      <Grid container spacing={3}>
        {/* Impersonate */}
        <Grid sx={{ xs: 12, md: 6 }}>
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
        <Grid sx={{ xs: 12, md: 6 }}>
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

        {/* User Requests */}
        <Grid sx={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">User Requests</Typography>
              <Divider sx={{ my: 2 }} />

              {requestFeedback && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {requestFeedback}
                </Alert>
              )}

              {requestsLoading ? (
                <Typography variant="body2">Loading requests…</Typography>
              ) : requests.length === 0 ? (
                <Typography variant="body2">No requests found.</Typography>
              ) : (
                <Stack spacing={2}>
                  {requests.map((request) => (
                    <Box
                      key={request.requestID}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {request.type} request
                      </Typography>
                      <Typography variant="body2">Request ID: {request.requestID}</Typography>
                      <Typography variant="body2">User ID: {request.userID}</Typography>
                      <Typography variant="body2">Manga ID: {request.mangaId}</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Status: {request.status}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Submitted: {new Date(request.submittedTime).toLocaleString()}
                      </Typography>
                      {request.notes && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Notes: {request.notes}
                        </Typography>
                      )}
                      {request.status === 'pending' ? (
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleRequestAction(request.requestID, 'approve')}
                            disabled={requestActionLoading === request.requestID}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleRequestAction(request.requestID, 'reject')}
                            disabled={requestActionLoading === request.requestID}
                          >
                            Reject
                          </Button>
                        </Stack>
                      ) : (
                        <Typography variant="body2">No actions available</Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Reports / Placeholder */}
        <Grid sx={{ xs: 12 }}>
          <Card>
            <CardContent>
              {/* <Button onClick={() => navigate('/admin/users')}>User Management</Button>
              <Button onClick={() => navigate('/admin/audit-log')}>Audit Logs</Button>
              <Button onClick={() => navigate('/admin/stats')}>Statistics</Button> */}
              <Button
                onClick={() =>
                  new Notification('Test', { body: 'This is a Local Notification Test' })
                }
              >
                Test Notif
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
