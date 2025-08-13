import React from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { fetchPath } from '../vars';
import { dropdownOption, mangaDetails } from '../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserCategories } from '../hooks/useUserCategories';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';
import CancelIcon from '@mui/icons-material/Cancel';

interface ChangeCategoryModalProps {
  open: boolean;
  onClose: () => void;
  mangaId: string;
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

export default function ChangeCategoryModal({ open, onClose, mangaId }: ChangeCategoryModalProps) {
  const queryClient = useQueryClient();

  const { data: catOptions, isLoading, isError } = useUserCategories();

  const [newCat, setNewCat] = React.useState<dropdownOption | null>(
    catOptions ? catOptions[0] : null
  );

  const changeUserCatMutation = useMutation({
    mutationFn: async () => {
      if (!newCat) throw new Error('No Category Selected!');
      if (!mangaId) throw new Error('No manga selected.');

      const response = await fetch(`${fetchPath}/api/data/update/changeMangaCat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mangaId: mangaId,
          newCat: newCat.value,
        }),
      });

      if (!response.ok) {
        const data: { message?: string } = await response.json();
        throw new Error(data.message ?? 'Failed to update category.');
      }

      return newCat.value; // Return new category value for use in onSuccess
    },
    onMutate: () => {
      const toastId = toast.loading('Changing Category!');
      return toastId;
    },
    onSuccess: (newCatValue, _variables, toastId) => {
      toast.update(toastId, {
        render: 'Category Successfully Changed!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });

      // Option 1: Optimistically update local UI (if using useState still)
      // Option 2: Invalidate the query to refetch
      queryClient.invalidateQueries({ queryKey: ['userManga'] });
    },
    onError: (error: Error, _variables, toastId) => {
      if (toastId)
        toast.update(toastId, {
          render: error.message,
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
    },
  });

  if (!mangaId) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="cat-modal-title"
      aria-describedby="cat-modal-description"
    >
      <Box sx={{ width: '80vw', ...modalStyle }}>
        <h2 id="cat-modal-title" style={{ color: 'white' }}>
          Choose a new Category
        </h2>

        <Select
          name="cat"
          id="cat"
          className="catSelect"
          value={newCat}
          onChange={setNewCat}
          options={catOptions}
          styles={customStyles}
          isSearchable={false}
        />

        <Button
          onClick={() => {
            changeUserCatMutation.mutate();
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
