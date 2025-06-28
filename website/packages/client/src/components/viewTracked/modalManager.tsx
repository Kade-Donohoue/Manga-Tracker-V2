// src/components/ModalManager.tsx
import React from 'react';
import AddMangaModal from '../addMangaModal';
import SeriesModal from './SeriesModal';
import ConfirmRemovalModal from '../confirmRemoveMangaModal';
import ChangeChapterModal from '../changeChapterModal';
import ChangeCategoryModal from '../changeCategoryModal';
import { mangaDetails } from '../../types';

interface ModalManagerProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  catOpen: boolean;
  setCatOpen: (open: boolean) => void;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  chapterOpen: boolean;
  setChapterOpen: (open: boolean) => void;
  removeOpen: boolean;
  setRemoveOpen: (open: boolean) => void;
  currentMangaId: string | null;
  mangaInfo: Map<string, mangaDetails> | undefined;
  handleRemoveOpen: () => void;
  handleCatOpen: () => void;
  handleChapterOpen: () => void;
  handleModalClose: () => Promise<void>;
}

const ModalManager: React.FC<ModalManagerProps> = ({
  modalOpen,
  setModalOpen,
  catOpen,
  setCatOpen,
  addOpen,
  setAddOpen,
  chapterOpen,
  setChapterOpen,
  removeOpen,
  setRemoveOpen,
  currentMangaId,
  mangaInfo,
  handleRemoveOpen,
  handleCatOpen,
  handleChapterOpen,
  handleModalClose,
}) => {
  return (
    <div className="mangaOverviewModal" id="overviewModal">
      <SeriesModal
        open={modalOpen}
        manga={mangaInfo?.get(currentMangaId || '') ?? null}
        onUnsetManga={handleModalClose}
        onRemove={handleRemoveOpen}
        onChangeCategory={handleCatOpen}
        onChangeChap={handleChapterOpen}
      />
      <ChangeCategoryModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        mangaId={currentMangaId || ''}
      />
      <ChangeChapterModal
        open={chapterOpen}
        onClose={() => setChapterOpen(false)}
        mangaInfo={mangaInfo}
        mangaId={currentMangaId || ''}
      />
      <ConfirmRemovalModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        mangaId={currentMangaId || ''}
      />
      <AddMangaModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default ModalManager;
