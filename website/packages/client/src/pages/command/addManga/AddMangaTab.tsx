import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';
import { Box, Button, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useUserCategories } from '../../../hooks/useUserCategories';
import { dropdownOption } from '../../../types';
import { customStyles } from '../../../styled/index';
import { fetchPath } from '../../../vars';

export default function AddMangaTab() {
  const { data: catOptions } = useUserCategories();
  const [selectedCat, setSelectedCat] = useState<dropdownOption | null>(catOptions?.[0] || null);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const queryClient = useQueryClient();

  async function submitManga() {
    if (isLoading) return toast.error('Already adding!');
    const notif = toast.loading('Adding Manga!');
    try {
      setIsLoading(true);
      setShowError(false);

      const urlBox = document.getElementById('chapURL') as HTMLInputElement | null;
      const urls = urlBox?.value.replace(/\s/g, '');
      if (!urls) {
        toast.update(notif, {
          render: 'No Manga Provided!',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
        setIsLoading(false);
        return;
      }

      const urlList = urls.split(',');

      const res = await fetch(`${fetchPath}/api/data/add/addManga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCat: selectedCat?.value, urls: urlList }),
      });

      if (!res.ok) throw new Error('Internal server error');
      const { results }: { results: { url: string; message: string; success: boolean }[] } =
        await res.json();

      const errorLog: string[] = [];
      for (const manga of results) {
        if (!manga.success) errorLog.push(`${manga.url}: ${manga.message}`);
      }

      queryClient.invalidateQueries({ queryKey: ['userManga'] });
      if (urlBox) urlBox.value = '';

      if (errorLog.length === 0) {
        toast.update(notif, {
          render: 'Manga Successfully Added!',
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        setShowError(true);
        toast.update(notif, {
          render: 'Unable to Add 1 or More Manga!',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('An Unknown Error has Occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h6" mb={1}>
        Enter Manga URL(s)
      </Typography>
      <input
        id="chapURL"
        type="text"
        placeholder="https://mangaURL1.com/chapter,https://mangaURL2.com/chapter"
        style={{
          width: '100%',
          padding: '12px 20px',
          marginBottom: '8px',
          borderRadius: '4px',
          boxSizing: 'border-box',
        }}
      />
      <Box sx={{ mb: 2 }}>
        <Typography>Choose a Category:</Typography>
        <Select
          value={selectedCat}
          onChange={(cat) => setSelectedCat(cat as dropdownOption)}
          options={catOptions}
          styles={customStyles}
          isSearchable={false}
        />
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={submitManga}
        sx={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: '4px',
          backgroundColor: '#22346e',
          '&:hover': { backgroundColor: '#273e89' },
        }}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Add Manga!'}
      </Button>
      {showError && (
        <Typography color="error" mt={1}>
          One or more manga could not be added.
        </Typography>
      )}
    </Box>
  );
}
