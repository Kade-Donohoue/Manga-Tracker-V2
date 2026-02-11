import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export default function FindMangaTab() {
  const mangaSites = [
    { name: 'Manganato', url: 'https://www.manganato.gg/' },
    { name: 'Asura Scans', url: 'https://asuracomic.net/' },
    { name: 'MangaFire', url: 'https://mangafire.to/home' },
    { name: 'Mangadex', url: 'https://mangadex.org/' },
    { name: 'Comix', url: 'https://comix.to/home' },
    // { name: 'MangaPark', url: 'https://mangapark.org/' },
    // { name: 'Bato', url: 'https://bato.to/' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" mb={2}>
        Find Manga
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {mangaSites.map((site) => (
          <Button
            key={site.name}
            variant="outlined"
            onClick={() => window.open(site.url, '_blank')}
          >
            {site.name}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
