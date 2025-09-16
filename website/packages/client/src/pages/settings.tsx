import Button from '@mui/material/Button';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import LogoutIcon from '@mui/icons-material/Logout';
import { SignOutButton, UserButton, UserProfile } from '@clerk/clerk-react';
import { CategoryManager } from '../components/CategoryManager';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useUISetting } from '../hooks/useUiSetting';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

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
            id="panel-category-header"
          >
            User
          </AccordionSummary>
          <AccordionDetails>
            <div
              className="clerk-profile-wrapper"
              style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}
            >
              {window.matchMedia('(max-width: 768px)').matches ? (
                <UserButton showName={true} />
              ) : (
                <div>
                  <UserProfile />
                  <SignOutButton>
                    <Button startIcon={<LogoutIcon />}>Logout</Button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
}
