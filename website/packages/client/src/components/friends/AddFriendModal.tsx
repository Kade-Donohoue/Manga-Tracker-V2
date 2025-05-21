import React, { useState } from 'react';
import { Modal, Box, Button, SvgIcon } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { fetchPath } from '../../vars';
import { modalStyle } from '../../AppStyles';

interface addFriendModalProps {
  open: boolean;
  onClose: () => void;
}

const AddFriendModal: React.FC<addFriendModalProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);

  async function submitRequest() {
    setIsLoading(true);
    const notif = toast.loading('Sending Request!', { closeOnClick: true, draggable: true });

    const userName = (document.getElementById('UIn') as HTMLInputElement)?.value;

    const results = await fetch(`${fetchPath}/api/friends/sendRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: userName.trim(),
      }),
    });

    setIsLoading(false);
    if (!results.ok) {
      return toast.update(notif, {
        render: ((await results.json()) as any).message,
        type: 'error',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: 0,
      });
    }

    toast.update(notif, {
      render: 'Request Sent!',
      type: 'success',
      isLoading: false,
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      draggable: true,
      progress: 0,
    });

    queryClient.invalidateQueries({ queryKey: ['friends'] });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="cat-modal-title"
      aria-describedby="cat-modal-description"
    >
      <Box sx={{ width: '80vw', height: '28vh', ...modalStyle }}>
        <label htmlFor="UIn">Enter Friends Name:</label>
        <input type="text" id="UIn" name="iIn" placeholder="Person1234" autoComplete="off" />
        <br />
        <Button
          onClick={() => {
            submitRequest();
            onClose();
          }}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Loading...' : 'Send Request!'}
        </Button>
        <SvgIcon onClick={onClose} sx={{ position: 'absolute', top: 10, right: 10 }}>
          <CancelIcon sx={{ color: 'white' }} />
        </SvgIcon>
      </Box>
    </Modal>
  );
};

export default AddFriendModal;
