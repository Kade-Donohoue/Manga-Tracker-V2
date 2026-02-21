import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useState, useEffect } from 'react';

// Hook to store the user's push notification preference in localStorage
export function usePushNotificationsSetting() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('pushNotificationsEnabled');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pushNotificationsEnabled', enabled ? 'true' : 'false');
  }, [enabled]);

  return [enabled, setEnabled] as const;
}

export default function NotificationsSettingsAccordion() {
  const [enabled, setEnabled] = usePushNotificationsSetting();

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);

    if (checked) {
      // Only request permission if the user enabled it
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          // User denied notifications, turn off the switch
          setEnabled(false);
        }
      }
    }
  };

  return (
    <Accordion sx={{ backgroundColor: '#1e1e1e', color: '#ffffff', width: '80%' }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: '#ffffff' }} />}
        id="panel-notifications-header"
      >
        Push Notifications
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={(e) => handleToggle(e.target.checked)} />}
          label={
            <Tooltip title="Enable or disable push notifications for this device" arrow>
              <Typography>Enable Push Notifications</Typography>
            </Tooltip>
          }
        />
      </AccordionDetails>
    </Accordion>
  );
}
