// src/components/ModalManager.tsx
import React from 'react';
import AddMangaModal from '../addMangaModal';
import SeriesModal from './SeriesModal';
import ConfirmRemovalModal from '../confirmRemoveMangaModal';
import ChangeChapterModal from '../changeChapterModal';
import ChangeCategoryModal from '../changeCategoryModal';
import { mangaDetails } from '../../types';
import RecommendModal from '../recommendModal';
import SetUserTitleModal from '../SetUserTitleModal';
import SelectCoverModal from './SelectCoverModal';

interface ModalManagerProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  catOpen: boolean;
  setCatOpen: (open: boolean) => void;
  titleOpen: boolean;
  setTitleOpen: (open: boolean) => void;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  chapterOpen: boolean;
  setChapterOpen: (open: boolean) => void;
  removeOpen: boolean;
  setRemoveOpen: (open: boolean) => void;
  recommendOpen: boolean;
  setRecommendOpen: (open: boolean) => void;
  currentMangaId: string | null;
  mangaInfo: Map<string, mangaDetails> | undefined;
  handleRemoveOpen: () => void;
  handleCatOpen: () => void;
  handleChapterOpen: () => void;
  handleModalClose: () => Promise<void>;

  coverSelectionOpen: boolean;
  setCoverSelectionOpen: (open: boolean) => void;
}

const ModalManager: React.FC<ModalManagerProps> = ({
  modalOpen,
  setModalOpen,
  catOpen,
  setCatOpen,
  titleOpen,
  setTitleOpen,
  addOpen,
  setAddOpen,
  chapterOpen,
  setChapterOpen,
  recommendOpen,
  setRecommendOpen,
  removeOpen,
  setRemoveOpen,
  currentMangaId,
  mangaInfo,
  handleRemoveOpen,
  handleCatOpen,
  handleChapterOpen,
  handleModalClose,
  coverSelectionOpen,
  setCoverSelectionOpen,
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
        onChangeCover={() => setCoverSelectionOpen(true)}
      />
      <ChangeCategoryModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        mangaId={currentMangaId || ''}
      />
      <SetUserTitleModal
        open={titleOpen}
        onClose={() => setTitleOpen(false)}
        mangaId={currentMangaId || ''}
      />
      <RecommendModal
        open={recommendOpen}
        onClose={() => setRecommendOpen(false)}
        manga={mangaInfo?.get(currentMangaId || '') ?? null}
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
      <SelectCoverModal
        open={coverSelectionOpen}
        onClose={() => setCoverSelectionOpen(false)}
        mangaInfo={mangaInfo}
        mangaId={currentMangaId || ''}
      />
    </div>
  );
};

export default ModalManager;
