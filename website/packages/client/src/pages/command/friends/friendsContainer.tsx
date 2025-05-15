import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import React from 'react';

import FriendsPanel from './FriendsPanel'

import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import GroupIcon from '@mui/icons-material/Group';
import IncommingFriendsPanel from './IncommingFriendsPanel';
import { Badge } from '@mui/material';
import OutgoingFriendsPanel from './OutgoingFriendsPanel';

function TabPanel({ value, index, children }: { value: number, index: number, children: React.ReactNode }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box p={2}>{children}</Box>}
    </div>
  );
}

export default function friends() {
  const [value, setValue] = React.useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <Tabs value={value} onChange={handleChange} centered variant="fullWidth" TabIndicatorProps={{ style: { display: 'none' } }}>
        <Tab icon={<Badge badgeContent={0} color="primary"><GroupIcon/></Badge>} label="Friends"/>
        <Tab icon={<Badge badgeContent={1} color="primary"><ArchiveIcon/></Badge>} label="Incomming"/>  
        <Tab icon={<Badge badgeContent={1}color="primary"><UnarchiveIcon/></Badge>} label="Outgoing"/>
      </Tabs>

      <TabPanel value={value} index={0}><FriendsPanel/></TabPanel>
      <TabPanel value={value} index={1}><IncommingFriendsPanel/></TabPanel>
      <TabPanel value={value} index={2}><OutgoingFriendsPanel/></TabPanel>
    </Box>

  );
}
