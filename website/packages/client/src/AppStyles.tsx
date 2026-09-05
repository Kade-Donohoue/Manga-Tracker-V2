import { styled, SxProps } from '@mui/system';
import { Link as RouterLink } from 'react-router';
import { Box } from '@mui/material';

// ---- Scrollable Navigation ----
export const Navigation = styled(Box)(({ theme }) => ({
  height: '100vh', // full viewport height
  width: 300, // fixed sidebar width
  overflowY: 'auto', // scroll vertically
  border: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
}));

// ---- List Wrapper ----
export const Ul = styled('ul')({
  display: 'flex',
  flexDirection: 'column',
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

// ---- List Item ----
export const Li = styled(RouterLink, {
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'expanded',
})<{ selected?: boolean; expanded?: boolean }>(({ theme, selected, expanded }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: expanded ? 'flex-start' : 'center', // <-- key
  gap: expanded ? theme.spacing(1) : 0,
  height: 56, // fixed row height
  paddingLeft: expanded ? theme.spacing(2) : 0,
  paddingRight: expanded ? theme.spacing(2) : 0,
  textDecoration: 'none',
  borderRadius: theme.shape.borderRadius,
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
  backgroundColor: selected
    ? theme.palette.mode === 'dark'
      ? theme.palette.primary.dark
      : theme.palette.primary.light
    : 'transparent',
  '&:hover': {
    backgroundColor: selected
      ? theme.palette.mode === 'dark'
        ? theme.palette.primary.dark
        : theme.palette.primary.light
      : theme.palette.action.hover,
  },
}));

// ---- Site Wrapper ----
export const SiteWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100vh',
  color: theme.palette.text.primary,
  flexDirection: 'row',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
  [theme.breakpoints.down('xs')]: {
    flexDirection: 'column',
  },
}));

// ---- Modal Style ----
export const modalStyle: SxProps = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  width: { xs: '90vw', sm: '75vw' }, // responsive
};
