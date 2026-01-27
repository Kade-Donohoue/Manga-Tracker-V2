import Button from '@mui/material/Button';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';

import LogoutIcon from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import { CategoryManager } from '../components/CategoryManager';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useUISetting } from '../hooks/useUiSetting';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';
import React from 'react';
import ListItemText from '@mui/material/ListItemText';

import changeLog from '../changelog.json';
import Box from '@mui/material/Box';
import {
  authClient,
  useAuthStatus,
  authActions,
  UseAuthStatusInterface,
} from '../hooks/useAuthStatus';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';

const uiSettingsConfig = [
  {
    key: 'progressBarEnabled',
    label: 'Reading Progress Bar',
    default: true,
    tooltip:
      'Displays a progress bar on tracked cards to show how much of each chapter you’ve read.',
  },
  {
    key: 'compactCardsEnabled',
    label: 'Compact Cards',
    default: false,
    tooltip:
      'Reduces the height of card images to show more cards at once. (Warning: cuts off images!)',
  },
  {
    key: 'inlineFiltersEnabled',
    label: 'Show Filters Inline',
    default: false,
    tooltip:
      'Places the Category filter dropdown next to the search bar instead of inside the filter menu',
  },
];

export default function settings() {
  const authStatus = useAuthStatus();
  const navigate = useNavigate();

  return (
    <div style={{ padding: 32, width: '100%' }}>
      <div>
        <h1>Settings</h1> <br />
        <Accordion sx={{ backgroundColor: '#1e1e1e', color: '#ffffff', width: '80%' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}
            id="panel-category-header"
          >
            UI Settings
          </AccordionSummary>
          <AccordionDetails>
            {uiSettingsConfig.map((setting) => {
              const [value, setValue] = useUISetting(setting.key, setting.default);

              const labelContent = setting.tooltip ? (
                <Tooltip title={setting.tooltip} arrow>
                  <Typography>{setting.label}</Typography>
                </Tooltip>
              ) : (
                <Typography>{setting.label}</Typography>
              );

              return (
                <FormControlLabel
                  key={setting.key}
                  control={
                    <Switch checked={!!value} onChange={(e) => setValue(e.target.checked)} />
                  }
                  label={labelContent}
                />
              );
            })}
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ backgroundColor: '#1e1e1e', color: '#ffffff', width: '80%' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}
            id="panel-category-header"
          >
            Categories V3
          </AccordionSummary>
          <AccordionDetails>
            <CategoryManager />
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ backgroundColor: '#1e1e1e', color: '#ffffff', width: '80%' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}
            id="panel-changelog-header"
          >
            Changelog
          </AccordionSummary>

          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {changeLog
                .sort((a, b) => (a.version < b.version ? 1 : -1)) // newest first
                .map((log) => (
                  <Accordion
                    key={log.version}
                    sx={{
                      backgroundColor: '#2a2a2a',
                      color: '#ffffff',
                      borderRadius: 1,
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}
                      id={`panel-${log.version}-header`}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {log.version} — {log.date}
                      </Typography>
                    </AccordionSummary>

                    <AccordionDetails>
                      <List dense>
                        {log.features?.length > 0 && (
                          <>
                            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                              Features:
                            </Typography>
                            {log.features.map((item, i) => (
                              <ListItemText key={i} primary={`• ${item}`} sx={{ pl: 2 }} />
                            ))}
                          </>
                        )}

                        {log.improvements?.length > 0 && (
                          <>
                            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                              Improvements:
                            </Typography>
                            {log.improvements.map((item, i) => (
                              <ListItemText key={i} primary={`• ${item}`} sx={{ pl: 2 }} />
                            ))}
                          </>
                        )}

                        {log.fixes?.length > 0 && (
                          <>
                            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                              Fixes:
                            </Typography>
                            {log.fixes.map((item, i) => (
                              <ListItemText key={i} primary={`• ${item}`} sx={{ pl: 2 }} />
                            ))}
                          </>
                        )}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
            </Box>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ backgroundColor: '#1e1e1e', color: '#ffffff', width: '80%' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}
            id="panel-user-header"
          >
            <Typography>User</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {authStatus.isLoading ? (
              <Typography sx={{ opacity: 0.7 }}>Loading session...</Typography>
            ) : !authStatus.isLoggedIn ? (
              <Typography sx={{ opacity: 0.7 }}>No user logged in</Typography>
            ) : (
              <UserAccountSection authStatus={authStatus} />
            )}
          </AccordionDetails>

          {/* <AccordionDetails>
            {isLoading ? (
              <Typography sx={{ opacity: 0.7 }}>Loading session...</Typography>
            ) : !isLoggedIn ? (
              <Typography sx={{ opacity: 0.7 }}>No user logged in</Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.6 }}>
                    Name
                  </Typography>
                  <Typography>{user?.name ?? 'N/A'}</Typography>
                </Box>

                <Divider sx={{ backgroundColor: '#444' }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.6 }}>
                    Email
                  </Typography>
                  <Typography>{user?.email ?? 'N/A'}</Typography>
                </Box>

                <Divider sx={{ backgroundColor: '#444' }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.6 }}>
                    Creation Date
                  </Typography>
                  <Typography>{user?.createdAt.toDateString() ?? 'N/A'}</Typography>
                </Box>

                <Divider sx={{ backgroundColor: '#444' }} />

                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.6 }}>
                    User ID
                  </Typography>
                  <Typography>{user?.id ?? 'N/A'}</Typography>
                </Box>

                <Divider sx={{ backgroundColor: '#444' }} />

                <Button
                  startIcon={<LogoutIcon />}
                  variant="outlined"
                  color="error"
                  onClick={async () => {
                    await authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          navigate('/home');
                        },
                        onError: () => {
                          toast.error('Unable To Sign Out!');
                        },
                      },
                    });
                    navigate('/home');
                  }}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Logout
                </Button>
              </Box>
            )}
          </AccordionDetails> */}
        </Accordion>
        <Accordion sx={{ backgroundColor: '#1e1e1e', color: '#ffffff', width: '80%' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}
            id="panel-discord-header"
          >
            Join the Community
          </AccordionSummary>
          <AccordionDetails>
            <Typography sx={{ mb: 2 }}>
              Need help, have suggestions, or just want to chat? Join our Discord server!
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{
                textTransform: 'none',
                backgroundColor: '#5865F2',
                '&:hover': { backgroundColor: '#4752C4' },
                width: 'fit-content',
              }}
              href={import.meta.env.VITE_DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Discord
            </Button>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
}

function UserAccountSection({ authStatus }: { authStatus: UseAuthStatusInterface }) {
  const { isLoading, isLoggedIn, user, session, refresh } = authStatus;
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [editingName, setEditingName] = React.useState(false);
  const [name, setName] = React.useState(user.name);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasPassword = user.emailVerified === true;

  React.useEffect(() => {
    authActions.listSessions().then((res) => {
      if (res.data) setSessions(res.data);
    });
  }, []);

  const saveName = async () => {
    await authActions.updateProfile({ name });
    toast.success('Username updated');
    setEditingName(false);
  };

  const uploadAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/user/avatar', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      toast.error('Failed to upload avatar');
      return;
    }

    const { url } = (await res.json()) as { url: string };

    await authActions.updateProfile({ image: url });

    refresh();
    toast.success('Avatar updated');
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          src={user.image ?? `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.id}`}
          sx={{ width: 64, height: 64, cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => e.target.files && uploadAvatar(e.target.files[0])}
        />

        <Box>
          <Typography variant="h6">{user.name}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            {user.email}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      {/* Profile */}
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Profile
        </Typography>

        <Stack spacing={2} maxWidth={420}>
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
              size="small"
              label="Username"
              value={name}
              disabled={!editingName}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <IconButton onClick={editingName ? saveName : () => setEditingName(true)}>
              {editingName ? <SaveIcon /> : <EditIcon />}
            </IconButton>
          </Box>

          <TextField size="small" label="User ID" value={user.id} InputProps={{ readOnly: true }} />
          <TextField
            size="small"
            label="Email"
            value={user.email}
            InputProps={{ readOnly: true }}
          />

          <TextField
            size="small"
            label="Account Created"
            value={user.createdAt.toDateString()}
            InputProps={{ readOnly: true }}
          />
        </Stack>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      {/* Security */}
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Security
        </Typography>

        <Stack spacing={2} maxWidth={420}>
          {!hasPassword ? (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              You signed in with SSO. You can set a password to log in directly without SSO.
            </Typography>
          ) : (
            // null}
            <div>
              <TextField
                size="small"
                label={hasPassword ? 'Current Password' : 'New Password'}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <TextField
                size="small"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <br />
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    // if (!hasPassword) {
                    //   // Set password for first time
                    //   await authActions.setPassword(newPassword);
                    //   toast.success('Password set successfully!');
                    // } else {
                    // Normal password change
                    await authActions.changePassword(currentPassword, newPassword, false);
                    toast.success('Password updated!');
                    // }
                  } catch (err) {
                    toast.error('Failed to update password');
                  }
                }}
              >
                {hasPassword ? 'Update Password' : 'Set Password'}
              </Button>
            </div>
          )}
        </Stack>
      </Box>

      <Divider sx={{ backgroundColor: '#444' }} />

      {/* Sessions */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Active Sessions
        </Typography>

        <Stack spacing={1}>
          {sessions.map((s) => (
            <Box key={s.id} display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {s.userAgent ?? 'Unknown device'}
                  {s.id === session.id}
                </Typography>
                <Chip label="Current" size="small" color="primary" sx={{ height: 20 }} />
              </Box>

              {s.id !== session.id && (
                <Button size="small" color="error" onClick={() => authActions.revokeSession(s.id)}>
                  Revoke
                </Button>
              )}
            </Box>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
