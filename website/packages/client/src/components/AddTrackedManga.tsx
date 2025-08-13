import React, { useState } from 'react';
import { dropdownOption } from '../types';
import CancelIcon from '@mui/icons-material/Cancel';
import Select, { StylesConfig } from 'react-select';
import { toast } from 'react-toastify';
import { fetchPath } from '../vars';
import { useQueryClient } from '@tanstack/react-query';
import { useUserCategories } from '../hooks/useUserCategories';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';

interface ChangeChapterModalProps {
  open: boolean;
  onClose: () => void;
  manga: {
    mangaName: string;
    mangaId: string;
    urlBase: string;
    slugList: string[];
    chapterTextList: string[];
  } | null;
  friendId: string;
}

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: '#1f1f1f',
  border: '2px solid #000',
  borderRadius: '8px',
  boxShadow: '24',
  p: 4,
};

const customStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: '#2e2e2e',
    color: '#fff',
  }),
  singleValue: (base: any, { data }: any) => ({
    ...base,
    color: data.color || 'white',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#2e2e2e',
    color: 'white',
  }),
  option: (base: any, { data }: any) => ({
    ...base,
    color: data.color || 'white', // Apply color to options
  }),
};

export default function AddTrackedManga({
  open,
  onClose,
  manga,
  friendId,
}: ChangeChapterModalProps) {
  const queryClient = useQueryClient();

  const [newChapter, setChapter] = React.useState<dropdownOption | null>(null);

  const { data: catOptions, isLoading: isLoadingCats, isError } = useUserCategories();
  const [selectedCat, setSelectedCat] = useState<dropdownOption | null>(
    catOptions ? catOptions[0] : null
  );

  React.useEffect(() => {
    if (manga) {
      const latest = manga.chapterTextList.at(-1); // last item before reversal = latest chapter
      if (latest) {
        setChapter({ value: latest, label: latest });
      }
    }
  }, [manga]);

  const addExistingManga = async () => {
    const notif = toast.loading('Changing Chapter!');

    if (!newChapter) {
      return toast.update(notif, {
        render: 'No Chapter Selected!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }

    if (!manga) return;

    const index = manga.chapterTextList.indexOf(newChapter.label);
    if (index === undefined || index === -1) {
      return toast.update(notif, {
        render: 'Internal Error Adding Manga!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }

    try {
      const reply = await fetch(`${fetchPath}/api/data/add/existingManga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mangaId: manga.mangaId,
          index: index,
          currentChap: manga.chapterTextList[index],
          userCat: selectedCat?.value,
        }),
      });

      if (reply.ok) {
        queryClient.invalidateQueries({ queryKey: ['userManga'] });
        queryClient.invalidateQueries({ queryKey: [friendId] });

        const replyBody: { message: string } = await reply.json();

        toast.update(notif, {
          render: replyBody.message,
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        const data: { message: string; url?: string } = await reply.json();
        toast.update(notif, {
          render: data.message || 'Failed to Add Manga.',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      toast.update(notif, {
        render: 'An Unknown Error has Occurred',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  if (!manga) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="chap-modal-title"
      aria-describedby="chap-modal-description"
    >
      <Box sx={{ width: '80vw', ...modalStyle }}>
        <h1 style={{ color: 'white' }}>{manga.mangaName}</h1>
        <h2 id="chap-modal-title" style={{ color: 'white' }}>
          Select the Last Chapter You’ve Read
        </h2>
        Chapter:
        <Select
          name="chap"
          id="chap"
          className="chapSelect"
          value={newChapter}
          onChange={setChapter}
          options={manga?.chapterTextList
            .slice()
            .reverse()
            .map((text) => ({ value: text, label: text }))}
          styles={customStyles}
        />
        Category:
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
        <Button
          onClick={() => {
            addExistingManga();
            onClose();
          }}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Submit
        </Button>
        <SvgIcon
          onClick={onClose}
          sx={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer' }}
        >
          <CancelIcon sx={{ color: 'white' }} />
        </SvgIcon>
      </Box>
    </Modal>
  );
}
