import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select, { StylesConfig } from 'react-select';
import { Box, Button, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useUserCategories } from '../../../hooks/useUserCategories';
import { dropdownOption } from '../../../types';
import { customStyles } from '../../../styled/index';
import { submitManga } from '../../../utils'; // <-- use shared function

export default function AddMangaTab() {
  const queryClient = useQueryClient();
  const { data: catOptions } = useUserCategories();

  const [selectedCat, setSelectedCat] = useState<dropdownOption | null>(null);
  const [urls, setUrls] = useState('');
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (catOptions && !selectedCat) {
      setSelectedCat(catOptions[0] || null);
    }
  }, [catOptions, selectedCat]);

  const handleAddManga = async () => {
    if (isLoading) return toast.error('Already adding!');

    const urlList = urls
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    if (!urlList.length) return toast.error('No Manga URLs provided');

    setIsLoading(true);
    setErrorMessages([]);

    const notif = toast.loading('Adding Manga!');

    try {
      const errors = await submitManga(urlList, selectedCat?.value || 'reading');

      queryClient.invalidateQueries({ queryKey: ['userManga'] });

      if (errors.length === 0) {
        toast.update(notif, {
          render: 'Manga Successfully Added!',
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
        setUrls('');
      } else {
        toast.update(notif, {
          render: 'Unable to Add 1 or More Manga!',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });

        setErrorMessages(errors.map((e) => `${e.url}: ${e.message}`));
      }
    } catch (err) {
      console.error(err);
      toast.update(notif, {
        render: 'An Unknown Error has Occurred',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h6" mb={1}>
        Enter Manga URL(s)
      </Typography>

      <input
        id="chapURL"
        type="text"
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
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
          onChange={setSelectedCat}
          options={catOptions}
          styles={customStyles as StylesConfig<dropdownOption, false>}
          isSearchable={false}
        />
      </Box>

      {errorMessages.length > 0 && (
        <Box sx={{ color: 'error.main', mb: 2 }}>
          {errorMessages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleAddManga}
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
    </Box>
  );
}
