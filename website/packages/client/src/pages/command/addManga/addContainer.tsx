import React from 'react';

import PostAddIcon from '@mui/icons-material/PostAdd';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import SearchIcon from '@mui/icons-material/Search';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import AddMangaTab from './AddMangaTab';
import FindMangaTab from './FindMangaTab';
import AddBookmarksTab from './AddBookmarksTab';

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

export default function addContainer() {
  const [value, setValue] = React.useState(1);

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
        <Tab icon={<SearchIcon />} label="Find Manga" />
        <Tab icon={<PostAddIcon />} label="Add Manga" />
        <Tab icon={<BookmarkAddIcon />} label="Import Bookmarks" />
      </Tabs>

      <TabPanel value={value} index={0}>
        <FindMangaTab />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <AddMangaTab />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <AddBookmarksTab />
      </TabPanel>
    </Box>
  );
}
