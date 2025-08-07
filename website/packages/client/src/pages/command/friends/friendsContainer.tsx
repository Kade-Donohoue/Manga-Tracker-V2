import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import React from 'react';

import FriendsPanel from './FriendsPanel';

import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import GroupIcon from '@mui/icons-material/Group';
import IncommingFriendsPanel from './IncommingFriendsPanel';
import { Badge } from '@mui/material';
import OutgoingFriendsPanel from './OutgoingFriendsPanel';
import { useQuery } from '@tanstack/react-query';
import { fetchPath } from '../../../vars';
import { toast } from 'react-toastify';

function TabPanel({
  value,
  index,
  children,
}: {
  value: number;
  index: number;
  children: React.ReactNode;
}) {
  return <div hidden={value !== index}>{value === index && <Box p={2}>{children}</Box>}</div>;
}

async function fetchCount(): Promise<{
  message: string;
  data: { friendCount: number; incomingCount: number; outgoingCount: number };
}> {
  const resp = await fetch(`${fetchPath}/api/friends/getCount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    // toast.error('Unable To fetch friends!');
    throw new Error('Unable to fetch friend Counts!');
  }
  return resp.json();
}

export default function friends() {
  const [value, setValue] = React.useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends', 'count'],
    queryFn: fetchCount,
    meta: {
      errorMessage: 'Failed to get Friend Counts!',
      disableToast: true,
    },
    staleTime: 10 * 1000,
  });

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // if (isLoading || isError) return (<div/>)
  return (
    <Box>
      <Tabs
        value={value}
        onChange={handleChange}
        centered
        variant="fullWidth"
        TabIndicatorProps={{ style: { display: 'none' } }}
      >
        <Tab
          icon={
            <Badge badgeContent={data?.data.friendCount} color="primary">
              <GroupIcon />
            </Badge>
          }
          label="Friends"
        />
        <Tab
          icon={
            <Badge badgeContent={data?.data.incomingCount} color="primary">
              <ArchiveIcon />
            </Badge>
          }
          label="Incomming"
        />
        <Tab
          icon={
            <Badge badgeContent={data?.data.outgoingCount} color="primary">
              <UnarchiveIcon />
            </Badge>
          }
          label="Outgoing"
        />
      </Tabs>

      <TabPanel value={value} index={0}>
        <FriendsPanel />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <IncommingFriendsPanel />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <OutgoingFriendsPanel />
      </TabPanel>
    </Box>
  );
}
