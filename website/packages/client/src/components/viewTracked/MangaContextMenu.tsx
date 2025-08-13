// src/components/MangaContextMenu.tsx
import React from 'react';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

interface MangaContextMenuProps {
  anchorPosition: { top: number; left: number } | null;
  onClose: () => void;
  onOpen: () => void;
  onChangeCategory: () => void;
  onRemove: () => void;
  onMarkRead: () => void;
  onRecommend: () => void;
}

const MangaContextMenu: React.FC<MangaContextMenuProps> = ({
  anchorPosition,
  onClose,
  onOpen,
  onChangeCategory,
  onRemove,
  onMarkRead,
  onRecommend,
}) => {
  return (
    <Menu
      open={anchorPosition !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        anchorPosition ? { top: anchorPosition.top, left: anchorPosition.left } : undefined
      }
    >
      <MenuItem onClick={onOpen}>Open</MenuItem>
      <MenuItem onClick={onMarkRead}>Mark Chapters as Read…</MenuItem>
      <MenuItem onClick={onChangeCategory}>Change Category</MenuItem>
      <MenuItem onClick={onRecommend}>Recommend</MenuItem>
      <MenuItem onClick={onRemove} sx={{ color: 'error.main' }}>
        Remove
      </MenuItem>
    </Menu>
  );
};

export default MangaContextMenu;
