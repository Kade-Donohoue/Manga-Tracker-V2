import React, { useEffect, useState } from 'react';
import { mangaDetails } from '../../types';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';
import CancelIcon from '@mui/icons-material/Cancel';
import Stack from '@mui/material/Stack';
import { toast } from 'react-toastify';
import { fetchPath } from '../../vars';
import { useQueryClient } from '@tanstack/react-query';
import ButtonBase from '@mui/material/ButtonBase';

interface SelectCoverModalProps {
  open: boolean;
  onClose: () => void;
  mangaInfo: Map<string, mangaDetails> | undefined;
  mangaId: string;
}

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: '#1f1f1f',
  border: '2px solid #000',
  borderRadius: '8px',
  boxShadow: 24,
  p: 4,
  maxHeight: '80vh',
  overflowY: 'auto',
};

export default function SelectCoverModal({
  open,
  onClose,
  mangaInfo,
  mangaId,
}: SelectCoverModalProps) {
  const queryClient = useQueryClient();

  const manga = mangaInfo?.get(mangaId);
  const [selected, setSelected] = useState<number | null>(
    manga?.userCoverIndex !== undefined && manga.userCoverIndex >= 0 ? manga.userCoverIndex : null
  );

  useEffect(() => {
    if (manga?.userCoverIndex !== undefined && manga.userCoverIndex >= 0) {
      setSelected(manga.userCoverIndex);
    } else {
      setSelected(null);
    }
  }, [mangaId, manga?.userCoverIndex]);

  if (!mangaInfo || !manga) return null;

  async function submitCover(newIndex: number) {
    const notif = toast.loading('Setting Title!', { closeOnClick: true, draggable: true });
    try {
      if (newIndex !== -1 && !manga?.imageIndexes.includes(newIndex)) {
        toast.update(notif, {
          render: 'Invalid Index',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: 0,
        });
        return;
      }

      const reply = await fetch(`${fetchPath}/api/data/update/userCover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mangaId: mangaId,
          index: newIndex,
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
        return;
      }

      toast.update(notif, {
        render: 'Success!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: 0,
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ['userManga'] });
      setSelected(null);
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
      setSelected(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="cover-modal-title">
      <Box
        sx={{
          width: '80vw',
          ...modalStyle,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 id="cover-modal-title" style={{ color: 'white', marginBottom: 10 }}>
          Select a Cover Image
        </h2>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            pr: 1, // keep scrollbar from overlapping images
          }}
        >
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={2}
            margin={2}
            justifyContent="flex-start"
            alignItems="flex-start"
          >
            {manga.imageIndexes.map((index) => {
              const imgUrl =
                `${import.meta.env.VITE_IMG_URL}/${manga.mangaId}/${index}` ||
                'mangaNotFoundImage.png';

              const isSelected = selected === index;

              return (
                <ButtonBase
                  key={index}
                  onClick={() => setSelected((prev) => (prev === index ? null : index))}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    outline: isSelected ? '3px solid #1976d2' : 'none',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      opacity: 0.85,
                    },
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={manga.mangaName}
                    style={{
                      width: '180px',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                </ButtonBase>
              );
            })}
          </Stack>
        </Box>

        <Stack
          direction="row"
          justifyContent="flex-end"
          gap={2}
          mt={2}
          sx={{ pt: 2, borderTop: '1px solid #333' }}
        >
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              submitCover(-1); //set to latest chap
              onClose();
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const indexToSend = selected === null ? -1 : selected;
              submitCover(indexToSend);
              onClose();
            }}
          >
            Set Cover
          </Button>
        </Stack>

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
