import React, { useState } from 'react';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';

import CancelIcon from '@mui/icons-material/Cancel';

import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { fetchPath } from '../vars';
import { modalStyle } from '../AppStyles';

interface SetUserTitleModalProps {
  open: boolean;
  onClose: () => void;
  mangaId: string;
}

const SetUserTitleModal: React.FC<SetUserTitleModalProps> = ({ open, onClose, mangaId }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  async function submitTitle() {
    if (isLoading) return toast.error('Already setting!');
    const notif = toast.loading('Setting Title!', { closeOnClick: true, draggable: true });
    try {
      setIsLoading(true);
      const titleBox = document.getElementById('titleInput') as HTMLInputElement | null;
      let title: string | null = titleBox?.value.trim() || null;

      if (title?.length ? title.length > 192 : false) {
        toast.update(notif, {
          render: 'Title is To Long, max length of 192',
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

      const reply = await fetch(`${fetchPath}/api/data/update/userTitle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mangaId: mangaId,
          newTitle: title,
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

      titleBox!.value = '';

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
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ['userManga'] });
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="cat-modal-title"
      aria-describedby="cat-modal-description"
    >
      <Box sx={{ width: '80vw', ...modalStyle }}>
        <label htmlFor="titleInput">Enter New Title</label>
        <input
          type="text"
          id="titleInput"
          name="titleInput"
          placeholder="Best Manga in The World! Leave Blank to reset"
          style={{
            width: '100%',
            padding: '12px 20px',
            marginBottom: '8px',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
        <br />
        <Button
          onClick={() => {
            submitTitle();
            onClose();
          }}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Loading...' : 'Submit!'}
        </Button>
        <SvgIcon onClick={onClose} sx={{ position: 'absolute', top: 10, right: 10 }}>
          <CancelIcon sx={{ color: 'white' }} />
        </SvgIcon>
      </Box>
    </Modal>
  );
};

export default SetUserTitleModal;
