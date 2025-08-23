import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

const SCROLLBAR_SIZE = 10;

export const Root = styled(Box)({
  overflow: 'hidden',
  height: '100%',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
});

export const Viewport = styled(Box)({
  flex: 1, // fill remaining space
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
  overflowY: 'auto', // vertical scrolling
  overflowX: 'hidden',
  '&::-webkit-scrollbar': {
    width: SCROLLBAR_SIZE,
    height: SCROLLBAR_SIZE,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: SCROLLBAR_SIZE / 2,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
});

export const Scrollbar = styled('div')({}); // optional, no longer needed

export const Thumb = styled('div')({}); // optional, no longer needed
