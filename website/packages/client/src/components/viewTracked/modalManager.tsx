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
import UserRequestModal from '../UserRequst';

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
  clearSelection: () => void;

  coverSelectionOpen: boolean;
  setCoverSelectionOpen: (open: boolean) => void;
  userRequestOpen: boolean;
  setUserRequestOpen: (open: boolean) => void;
  selectedMangaIds: string[];
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
  userRequestOpen,
  setUserRequestOpen,
  currentMangaId,
  mangaInfo,
  handleRemoveOpen,
  handleCatOpen,
  handleChapterOpen,
  handleModalClose,
  coverSelectionOpen,
  setCoverSelectionOpen,
  selectedMangaIds,
  clearSelection,
}) => {
  const effectiveIds =
    selectedMangaIds.length > 0 ? selectedMangaIds : currentMangaId ? [currentMangaId] : [];

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
        mangaIds={effectiveIds}
        onSuccess={() => clearSelection()}
      />
      <SetUserTitleModal
        open={titleOpen}
        onClose={() => setTitleOpen(false)}
        mangaId={effectiveIds[0] || ''}
      />
      <RecommendModal
        open={recommendOpen}
        onClose={() => setRecommendOpen(false)}
        mangaIds={effectiveIds}
        onSuccess={() => clearSelection()}
      />
      <ChangeChapterModal
        open={chapterOpen}
        onClose={() => setChapterOpen(false)}
        mangaInfo={mangaInfo}
        mangaIds={effectiveIds}
      />
      <ConfirmRemovalModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        mangaIds={effectiveIds}
        afterRemove={() => {
          clearSelection();
        }}
      />
      <AddMangaModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SelectCoverModal
        open={coverSelectionOpen}
        onClose={() => setCoverSelectionOpen(false)}
        mangaInfo={mangaInfo}
        mangaId={effectiveIds[0] || ''}
      />
      <UserRequestModal
        open={userRequestOpen}
        onClose={() => setUserRequestOpen(false)}
        mangaIds={effectiveIds}
      />
    </div>
  );
};

export default ModalManager;
