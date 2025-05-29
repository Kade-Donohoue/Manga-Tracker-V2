import React, { useState } from 'react';
import { Modal, Box, Button, SvgIcon, SxProps, Theme } from '@mui/material';
import Select from 'react-select';
import CancelIcon from '@mui/icons-material/Cancel';
import { toast } from 'react-toastify';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dropdownOption } from '../types';
import { fetchPath } from '../vars';
import { modalStyle } from '../AppStyles';
import { customStyles } from '../styled/index';
import { fetchUserCategories } from '../utils';

interface AddMangaModalProps {
  open: boolean;
  onClose: () => void;
}

const AddMangaModal: React.FC<AddMangaModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();

  const { data: catOptions, isError } = useQuery<dropdownOption[], Error>({
    queryKey: ['userCategories'],
    queryFn: () => fetchUserCategories(),
    staleTime: 1000 * 60 * 60,
    gcTime: Infinity,
  });

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
      <Box sx={{ width: '80vw', height: '28vh', ...modalStyle }}>
        <label htmlFor="chapURL">Enter Chapter URL(s):</label>
        <input
          type="text"
          id="chapURL"
          name="chapURL"
          placeholder="https://mangaURL1.com/manga/chapter,https://mangaURL2.com/manga/chapter"
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
          styles={customStyles}
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
