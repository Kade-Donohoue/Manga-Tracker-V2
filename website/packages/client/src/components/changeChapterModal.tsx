import React from 'react';
import { dropdownOption, mangaDetails } from '../types';
import { Modal, Box, Button, SvgIcon, Stack, TextField } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { fetchPath } from '../vars';
import { useQueryClient } from '@tanstack/react-query';

interface ChangeChapterModalProps {
  open: boolean;
  onClose: () => void;
  mangaInfo: Map<string, mangaDetails> | undefined;
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
  singleValue: (base: any, state: any) => ({
    ...base,
    color: 'white',
    backgroundColor: state.isFocused ? '#444' : '#2e2e2e',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: '#2e2e2e',
    color: 'white',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#22346e' : state.isFocused ? '#444' : '#2e2e2e',
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
  const [chapterOptions, setChapterOptions] = React.useState<dropdownOption[]>([]);

  React.useEffect(() => {
    if (mangaInfo && mangaId) {
      const list = mangaInfo.get(mangaId)?.chapterTextList ?? [];
      const opts = list
        .slice()
        .reverse()
        .map((text) => ({ value: text, label: text }));
      setChapterOptions(opts);

      const latestOpt = opts[0];
      if (latestOpt) {
        setChapter(latestOpt);
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
    if (newIndex === undefined || newIndex === -1) {
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
        body: JSON.stringify({
          mangaId: mangaId,
          newIndex: newIndex,
          currentChap: mangaInfo.get(mangaId)?.chapterTextList[newIndex],
        }),
      });

      if (reply.ok) {
        queryClient.invalidateQueries({ queryKey: ['userManga'] });

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
    <Modal open={open} onClose={onClose} aria-labelledby="chap-modal-title">
      <Box sx={{ width: '80vw', ...modalStyle }}>
        <h2 id="chap-modal-title" style={{ color: 'white', marginBottom: 5 }}>
          Select the Last Chapter You’ve Read
        </h2>

        <Stack spacing={2}>
          <Select
            name="chap"
            value={newChapter}
            onChange={setChapter}
            options={chapterOptions}
            styles={customStyles}
            isSearchable
          />

          <h3 id="chap-modal-title" style={{ color: 'white' }}>
            Jump To
          </h3>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setChapter(chapterOptions.at(-1) ?? null)}>
              First
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                if (!newChapter) return setChapter(chapterOptions.at(-1) ?? null);
                const curIndex = chapterOptions.indexOf(newChapter);
                const newIndex = curIndex + 1 >= chapterOptions.length ? 0 : curIndex + 1;
                setChapter(chapterOptions[newIndex]);
              }}
            >
              prev
            </Button>
            <Button
              variant="outlined"
              onClick={() =>
                setChapter(
                  chapterOptions[
                    Math.abs(
                      (mangaInfo?.get(mangaId)?.currentIndex || 0) - chapterOptions.length + 1
                    )
                  ]
                )
              }
            >
              Current
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                if (!newChapter) return setChapter(chapterOptions.at(-1) ?? null);
                const curIndex = chapterOptions.indexOf(newChapter);
                const newIndex = curIndex - 1 < 0 ? chapterOptions.length - 1 : curIndex - 1;
                setChapter(chapterOptions[newIndex]);
              }}
            >
              next
            </Button>
            <Button variant="outlined" onClick={() => setChapter(chapterOptions[0])}>
              Latest
            </Button>
            {/* Search for chapter */}
            {/* <TextField
              label="Jump to..."
              variant="outlined"
              size="small"
              value={jumpTo}
              onChange={(e) => setJumpTo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = chapterOptions.find((opt) => opt.label === jumpTo);
                  if (target) setChapter(target);
                }
              }}
              sx={{
                input: { color: 'white' },
                label: { color: 'white' },
              }}
            /> */}
          </Stack>

          <Button
            onClick={() => {
              changeCurrChapter();
              onClose();
            }}
            variant="contained"
            color="primary"
            fullWidth
          >
            Submit
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
