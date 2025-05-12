import React from 'react';
import { dropdownOption, mangaDetails } from '../types'
import { Modal, Box, Button, SvgIcon } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { fetchPath } from '../vars'
import { useQueryClient } from '@tanstack/react-query';

interface ChangeChapterModalProps {
  open: boolean;
  onClose: () => void;
  mangaInfo: Map<string, mangaDetails>;
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
  singleValue: (base: any) => ({
    ...base,
    color: 'white',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#2e2e2e',
    color: 'white',
  }),
};

export default function ChangeChapterModal({
  open,
  onClose,
  mangaInfo,
  mangaId,
}: ChangeChapterModalProps) {

  const queryClient = useQueryClient();

  const [newChapter, setChapter] = React.useState<dropdownOption | null>(null);

  React.useEffect(() => {
    if (mangaInfo && mangaId) {
      const latest = mangaInfo.get(mangaId)?.chapterTextList.at(-1); // last item before reversal = latest chapter
      if (latest) {
        setChapter({ value: latest, label: latest });
      }
    }
  }, [mangaInfo, mangaId]);

  const changeCurrChapter = async () => {
    const notif = toast.loading('Changing Chapter!');

    if (!newChapter) {
      return toast.update(notif, {
        render: 'No Chapter Selected!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }

    if (!mangaInfo || !mangaId) return;

    const newIndex = mangaInfo.get(mangaId)?.chapterTextList.indexOf(newChapter.label);
    if (newIndex === undefined ||newIndex === -1) {
      return toast.update(notif, {
        render: 'Internal Error Updating Chapter!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }

    try {
      const reply = await fetch(`${fetchPath}/api/data/update/updateCurrentIndex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mangaId: mangaId, newIndex: newIndex, currentChap: mangaInfo.get(mangaId)?.chapterTextList[newIndex] }),
      });

      if (reply.ok) {
        queryClient.invalidateQueries({queryKey: ['userManga']})

        toast.update(notif, {
          render: 'Chapter Successfully Changed!',
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        const data: { message: string; url?: string } = await reply.json();
        toast.update(notif, {
          render: data.message || 'Failed to update chapter.',
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

  if (!mangaInfo || !mangaId) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="chap-modal-title"
      aria-describedby="chap-modal-description"
    >
      <Box sx={{ width: '80vw', height: '25vh', ...modalStyle }}>
        <h2 id="chap-modal-title" style={{ color: 'white' }}>Choose a new Chapter</h2>

        <Select
          name="chap"
          id="chap"
          className="chapSelect"
          value={newChapter}
          onChange={setChapter}
          options={mangaInfo.get(mangaId)?.chapterTextList
            .slice()
            .reverse()
            .map(text => ({ value: text, label: text }))}
          styles={customStyles}
        />

        <Button
          onClick={() => {
            changeCurrChapter();
            onClose();
          }}
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Submit
        </Button>

        <SvgIcon onClick={onClose} sx={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer' }}>
          <CancelIcon sx={{ color: 'white' }} />
        </SvgIcon>
      </Box>
    </Modal>
  );
}
