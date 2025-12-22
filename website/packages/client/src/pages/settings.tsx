import Button from '@mui/material/Button';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';

import LogoutIcon from '@mui/icons-material/Logout';
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
import { authClient, useAuthStatus } from '../hooks/useAuthStatus';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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
  const { isLoggedIn, isLoading, session, user } = useAuthStatus();
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
          </AccordionDetails>
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
