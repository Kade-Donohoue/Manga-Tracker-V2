import Button from '@mui/material/Button';

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import LogoutIcon from '@mui/icons-material/Logout';
import { SignOutButton, UserProfile } from '@clerk/clerk-react';
import { CategoryManager } from '../components/CategoryManager';

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
            <UserProfile />
            <SignOutButton>
              <Button startIcon={<LogoutIcon />}>Logout</Button>
            </SignOutButton>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
}
