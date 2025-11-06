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

interface AddMangaModalProps {
  open: boolean;
  onClose: () => void;
}

const AddMangaModal: React.FC<AddMangaModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();

  const { data: catOptions, isLoading: isLoadingCats, isError } = useUserCategories();

  const [selectedCat, setSelectedCat] = useState<dropdownOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submitManga() {
    if (isLoading) return toast.error('Already adding!');
    const notif = toast.loading('Adding Manga!', { closeOnClick: true, draggable: true });
    try {
      setIsLoading(true);
      const urlBox = document.getElementById('chapURL') as HTMLInputElement | null;
      let urls: string | null = urlBox?.value.replace(/\s/g, '') || null;

      if (!urls) {
        toast.update(notif, {
          render: 'No Manga Provided!',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: 0,
        });
        setIsLoading(false);
        return;
      }

      const urlList = urls.split(',');
      const errorLog: string[] = [];

      const reply = await fetch(`${fetchPath}/api/data/add/addManga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCat: selectedCat?.value,
          urls: urlList,
        }),
      });

      if (!reply.ok) {
        toast.update(notif, {
          render: 'An Internal Server Error Occurred!',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: 0,
        });
        setIsLoading(false);
        return;
      }

      const { results }: { results: { message: string; url: string; success: boolean }[] } =
        await reply.json();

      for (const manga of results) {
        if (!manga.success) errorLog.push(`${manga.url}: ${manga.message}`);
      }

      urlBox!.value = '';
      if (errorLog.length === 0) {
        queryClient.invalidateQueries({ queryKey: ['userManga'] });
        toast.update(notif, {
          render: 'Manga Successfully Added!',
          type: 'success',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: 0,
        });
      } else {
        toast.update(notif, {
          render: 'Unable to Add 1 or More Manga!',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: 0,
        });

        const errorField = document.getElementById('errorField') as HTMLLabelElement | null;
        if (errorField) {
          errorField.innerHTML = errorLog.join('<br/>');
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error adding manga: ', error);
      toast.update(notif, {
        render: 'An Unknown Error has Occurred',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: 0,
      });
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    if (catOptions && !selectedCat) {
      setSelectedCat(catOptions[0] || null);
    }
  }, [catOptions, selectedCat]);

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
          name="chapURL"
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
          className="catSelect"
          value={selectedCat}
          onChange={(e) => setSelectedCat(e)}
          options={catOptions}
          styles={customStyles as StylesConfig<dropdownOption, false>}
          isSearchable={false}
        />
        <br />
        <Button
          onClick={() => {
            submitManga();
            onClose();
          }}
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
