import React, { useState } from 'react';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';

import Select, { StylesConfig } from 'react-select';
import CancelIcon from '@mui/icons-material/Cancel';

import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { dropdownOption } from '../types';
import { fetchPath } from '../vars';
import { modalStyle } from '../AppStyles';
import { customStyles } from '../styled/index';
import { useUserCategories } from '../hooks/useUserCategories';
import { submitManga } from '../utils';

interface AddMangaModalProps {
  open: boolean;
  onClose: () => void;
}

const AddMangaModal: React.FC<AddMangaModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const { data: catOptions, isLoading: isLoadingCats } = useUserCategories();

  const [selectedCat, setSelectedCat] = useState<dropdownOption | null>(null);
  const [urls, setUrls] = useState(''); // controlled input
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
    const notif = toast.loading('Adding Manga...', { closeOnClick: true, draggable: true });

    try {
      // Call the simplified submitManga function
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
          render: 'Some Manga Failed!',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
        setErrorMessages(errors.map((e) => `${e.url}: ${e.message}`));
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.update(notif, {
        render: 'An Unknown Error Occurred',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="cat-modal-title"
      aria-describedby="cat-modal-description"
    >
      <Box sx={{ width: '80vw', ...modalStyle }}>
        <label htmlFor="chapURL">Enter Chapter URL(s):</label>
        <input
          type="text"
          id="chapURL"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="https://mangaURL1.com/manga/chapter,https://mangaURL2.com/manga/chapter"
          style={{
            width: '100%',
            padding: '12px 20px',
            marginBottom: '8px',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
        <br />
        <label htmlFor="cat-select">Choose a Category:</label>
        <Select
          name="categories"
          id="cat-select"
          value={selectedCat}
          onChange={setSelectedCat}
          options={catOptions}
          styles={customStyles as StylesConfig<dropdownOption, false>}
          isSearchable={false}
        />
        <br />
        {errorMessages.length > 0 && (
          <Box sx={{ color: 'red', mb: 2 }}>
            {errorMessages.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </Box>
        )}
        <Button
          onClick={handleAddManga}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Loading...' : 'Add Manga!'}
        </Button>
        <SvgIcon onClick={onClose} sx={{ position: 'absolute', top: 10, right: 10 }}>
          <CancelIcon sx={{ color: 'white' }} />
        </SvgIcon>
      </Box>
    </Modal>
  );
};

export default AddMangaModal;
