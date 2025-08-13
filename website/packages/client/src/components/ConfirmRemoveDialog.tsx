import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

interface ConfirmRemoveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
}

export default function ConfirmRemoveDialog({
  open,
  onClose,
  onConfirm,
  itemName = 'this item',
}: ConfirmRemoveDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Removal</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove {itemName}? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}
