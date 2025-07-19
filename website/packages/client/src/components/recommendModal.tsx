import React from 'react';
import { Modal, Box, Button, SvgIcon } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { fetchPath } from '../vars';
import { dropdownOption, mangaDetails } from '../types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserCategories } from '../hooks/useUserCategories';
import { useFriends } from '../hooks/useFriends';

interface RecommendModalProps {
  open: boolean;
  onClose: () => void;
  manga: mangaDetails | null;
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

const sendRecommendation = async (mangaId: string, friendId: string | undefined) => {
  if (!friendId) toast.error('Select a Friend!', { closeOnClick: true, draggable: true });
  const notif = toast.loading('Sending Recommendation!', { closeOnClick: true, draggable: true });

  const result = await fetch(`${fetchPath}/api/friends/recomendManga`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mangaId: mangaId,
      friendId: friendId,
    }),
  });

  if (!result.ok) {
    return toast.update(notif, {
      render: ((await result.json()) as any).message,
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
    render: 'Recommendation Sent!',
    type: 'success',
    isLoading: false,
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    draggable: true,
    progress: 0,
  });
};

export default function RecommendModal({ open, onClose, manga }: RecommendModalProps) {
  const { data: friends, isLoading, isError } = useFriends();

  const friendOptions: dropdownOption[] | undefined = friends?.data.map((f) => {
    return { label: f.userName, value: f.userID } as dropdownOption;
  });

  const [friend, setFriend] = React.useState<dropdownOption | null>();

  friends?.data;
  if (!manga) return <div />;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="cat-modal-title"
      aria-describedby="cat-modal-description"
    >
      <Box sx={{ width: '80vw', ...modalStyle }}>
        <h2 id="cat-modal-title" style={{ color: 'white' }}>
          Select A friend
        </h2>

        <Select
          name="friend"
          id="friend"
          className="friendSelect"
          value={friend}
          onChange={setFriend}
          options={friendOptions}
          styles={customStyles}
          isSearchable={true}
        />

        <Button
          onClick={() => {
            sendRecommendation(manga.mangaId, friend?.value);
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
