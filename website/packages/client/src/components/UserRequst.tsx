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

interface UserRequestModalProps {
  open: boolean;
  onClose: () => void;
  mangaIds: string[];
}

const UserRequestModal: React.FC<UserRequestModalProps> = ({ open, onClose, mangaIds }) => {
  const types = [
    { label: 'Alternative Stats', value: 'altStats' },
    { label: 'Update Cover Image', value: 'updateCoverImage' },
    { label: 'Full Update', value: 'fullUpdate' },
    { label: 'Link Sites', value: 'linkSites' },
  ];
  const [selectedType, setSelectedType] = useState<dropdownOption | null>(types[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestSubmission = async () => {
    if (isLoading) return toast.error('Already submitting!');
    if (!selectedType) return toast.error('No Request Type selected!');

    setIsLoading(true);
    const notif = toast.loading('Submitting Request...', { closeOnClick: true, draggable: true });

    try {
      const response = await fetch(`${fetchPath}/api/data/add/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mangaIds,
          type: selectedType.value,
        }),
      });
    } catch (error) {
      toast.error('Failed to submit request!');
    } finally {
      setIsLoading(false);
      toast.dismiss(notif);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="type-modal-title"
      aria-describedby="type -modal-description"
    >
      <Box sx={{ width: '80vw', ...modalStyle }}>
        <label htmlFor="type-select">Choose a Request Type:</label>
        <Select
          name="types"
          id="type-select"
          value={selectedType}
          onChange={setSelectedType}
          options={types}
          styles={customStyles as StylesConfig<dropdownOption, false>}
          isSearchable={false}
        />
        <Button
          onClick={handleRequestSubmission}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Loading...' : 'Submit Request!'}
        </Button>
        <SvgIcon onClick={onClose} sx={{ position: 'absolute', top: 10, right: 10 }}>
          <CancelIcon sx={{ color: 'white' }} />
        </SvgIcon>
      </Box>
    </Modal>
  );
};

export default UserRequestModal;
