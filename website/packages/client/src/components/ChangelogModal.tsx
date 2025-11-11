import * as React from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ChangelogModalProps {
  changelogs: {
    version: string;
    date: string;
    features: string[];
    fixes: string[];
    improvements: string[];
  }[];
}

export default function ChangelogModal({ changelogs }: ChangelogModalProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const seenVersion = localStorage.getItem('lastSeenVersion');
    if (seenVersion !== changelogs[0].version) {
      setOpen(true);
    }
  }, [changelogs[0].version]);

  const handleClose = () => {
    localStorage.setItem('lastSeenVersion', changelogs[0].version);
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={handleClose} aria-labelledby="changelog-title">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: {
            xs: '90%',
            sm: 400,
            md: 500,
          },
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography id="changelog-title" variant="h6" component="h2">
            What’s New — {changelogs[0].version}
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box key={changelogs[0].version} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            <Typography component="span">{changelogs[0].date}</Typography>
          </Typography>

          {changelogs[0].features.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Features
              </Typography>
              <List dense>
                {changelogs[0].features.map((item, i) => (
                  <ListItem key={i} sx={{ py: 0 }}>
                    <ListItemText primary={`• ${item}`} />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {changelogs[0].fixes.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Fixes
              </Typography>
              <List dense>
                {changelogs[0].fixes.map((item, i) => (
                  <ListItem key={i} sx={{ py: 0 }}>
                    <ListItemText primary={`• ${item}`} />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {changelogs[0].improvements.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Improvements
              </Typography>
              <List dense>
                {changelogs[0].improvements.map((item, i) => (
                  <ListItem key={i} sx={{ py: 0 }}>
                    <ListItemText primary={`• ${item}`} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            href={import.meta.env.VITE_DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join Discord for Support
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
