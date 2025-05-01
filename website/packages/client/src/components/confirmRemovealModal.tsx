import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { toast } from 'react-toastify';
import { fetchPath } from '../vars'
import { useQueryClient } from '@tanstack/react-query';

interface ConfirmRemovalDialogProps {
  open: boolean;
  onClose: () => void;
  mangaId: string;
  afterRemove?: () => void; // optional callback after successful removal
}

export default function ConfirmRemovalModal({
  open,
  onClose,
  mangaId,
  afterRemove,
}: ConfirmRemovalDialogProps) {

  const queryClient = useQueryClient();
  
  async function removeManga(mangaId: string) {
    let notif = toast.loading("Removing Manga!");

    try {
      if (!mangaId) {
        toast.update(notif, {
          render: "No Manga Selected!",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      const reply = await fetch(`${fetchPath}/api/data/remove/deleteUserManga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mangaId }),
      });

      if (reply.ok) {
        toast.update(notif, {
          render: "Manga Successfully Removed!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });

        queryClient.invalidateQueries({ queryKey: ['userManga'] });

      } else {
        const data:{message?:string} = await reply.json();
        toast.update(notif, {
          render: data?.message || "Failed to remove manga.",
          type: "error",
          isLoading: false,
          autoClose: 5000,
        });
      }

    } catch (error) {
      console.error('Remove manga error:', error);
      toast.update(notif, {
        render: "An Unknown Error has Occurred",
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="remove-dialog-title"
      aria-describedby="remove-dialog-description"
    >
      <DialogTitle id="remove-dialog-title" sx={{ bgcolor: "#1f1f1f", color: "#ffffff" }}>
        Remove Manga?
      </DialogTitle>
      <DialogContent sx={{ bgcolor: "#1f1f1f" }}>
        <DialogContentText id="remove-dialog-description" sx={{ color: "lightgrey" }}>
          Are you sure you no longer want to track this manga? Your data related to this manga will be PERMANENTLY removed!
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ bgcolor: "#1f1f1f" }}>
        <Button onClick={onClose} autoFocus>Cancel</Button>
        <Button
          onClick={async () => {
            await removeManga(mangaId);
            onClose();
          }}
          sx={{ color: "#ffffff" }}
          variant="contained"
          color="error"
        >
          Remove!
        </Button>
      </DialogActions>
    </Dialog>
  );
}
