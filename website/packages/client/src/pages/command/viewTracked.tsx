import React, { useRef, useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Box, Card, CardActionArea, Fade, IconButton, useTheme } from '@mui/material';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { dropdownOption, mangaDetails } from '../../types';

import { useUserManga } from '../../hooks/useUserManga';
import { useScrollHandler } from '../../hooks/useScrollHandler';

import { checkFilter } from '../../utils';
import { fetchPath } from '../../vars';

import SkeletonCard from '../../components/viewTracked/skeletonCard';
import ModalManager from '../../components/viewTracked/modalManager';
import MangaControls from '../../components/viewTracked/mangaControls';
import SeriesCard from '../../components/viewTracked/SeriesCard';
import MangaContextMenu from '../../components/viewTracked/MangaContextMenu';
import { useUserCategories } from '../../hooks/useUserCategories';

const combinedSortOptions: dropdownOption[] = [
  { value: 'mangaName_asc', label: 'Alphabetical (A → Z)' },
  { value: 'mangaName_desc', label: 'Alphabetical (Z → A)' },
  { value: 'interactTime_desc', label: 'Last Interacted (Newest)' },
  { value: 'interactTime_asc', label: 'Last Interacted (Oldest)' },
  { value: 'currentChap_desc', label: 'Chapters Read (Most)' },
  { value: 'currentChap_asc', label: 'Chapters Read (Least)' },
  { value: 'updateTime_desc', label: 'Last Updated (Recent)' },
  { value: 'updateTime_asc', label: 'Last Updated (Oldest)' },
  { value: 'search', label: 'Title Search' },
];

export default function Tracked() {
  const { data: mangaInfo, isLoading, error } = useUserManga();

  const { data: catOptions, isLoading: isLoadingCats, isError } = useUserCategories();

  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const [currentMangaId, setCurrentMangaId] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<dropdownOption[]>(() => {
    const stored = localStorage.getItem('filterOptions');
    return stored ? JSON.parse(stored) : [];
  });
  const [sortSelection, setSortSelection] = useState<dropdownOption>(() => {
    const stored = localStorage.getItem('sortSelection');
    return stored ? JSON.parse(stored) : combinedSortOptions[0];
  });
  const [currentSearch, setSearch] = useState<string>('');
  const [unreadChecked, setUnreadChecked] = useState<boolean>(() => {
    const stored = localStorage.getItem('unreadChecked');
    return stored ? JSON.parse(stored) : false;
  });

  // Save to localStorage on change
  React.useEffect(() => {
    localStorage.setItem('filterOptions', JSON.stringify(filterOptions));
  }, [filterOptions]);
  React.useEffect(() => {
    localStorage.setItem('sortSelection', JSON.stringify(sortSelection));
  }, [sortSelection]);
  React.useEffect(() => {
    localStorage.setItem('unreadChecked', JSON.stringify(unreadChecked));
  }, [unreadChecked]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);

  // Context menu state
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);

  // Filter and sort manga list
  const mangaList = useMemo(() => {
    if (!mangaInfo) return [];

    let rawList = Array.from(mangaInfo.values()).filter((manga) =>
      checkFilter(manga, filterOptions, unreadChecked)
    );

    // Filter by search using Fuse.js
    if (currentSearch.trim() !== '') {
      const fuse = new Fuse(rawList, {
        keys: ['mangaName'],
        threshold: 0.4,
      });
      rawList = fuse.search(currentSearch).map((result) => result.item);
    }

    // If sorting by 'search', return rawList immediately
    if (sortSelection?.value === 'search' && currentSearch.trim() !== '') {
      return rawList;
    }

    // Sort the filtered list
    return [...rawList].sort((a, b) => {
      const [key, direction] = (sortSelection?.value || '').split('_');
      if (!key || !direction) return 0;

      const orderVal = direction === 'desc' ? -1 : 1;
      const valA = a[key as keyof mangaDetails];
      const valB = b[key as keyof mangaDetails];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * orderVal;
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * orderVal;
      }

      return 0;
    });
  }, [mangaInfo, sortSelection, currentSearch, filterOptions, unreadChecked]);

  const { showScrollButton, atBottom } = useScrollHandler(containerRef, [mangaList]);

  // Scroll handler for context menu
  function handleContextMenu(event: React.MouseEvent, mangaId: string) {
    event.preventDefault();
    setCurrentMangaId(mangaId);
    setAnchorPosition({ top: event.clientY, left: event.clientX });
  }

  // Handlers for context menu and modals here...

  if (isLoading || error || !mangaInfo) {
    return (
      <Box
        className="cardContainer"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          justifyItems: 'center',
          overflowY: 'scroll',
          minHeight: 0,
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px',
        }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </Box>
    );
  }

  return (
    <div
      className="viewTrackerContainer"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <ModalManager
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        catOpen={catOpen}
        setCatOpen={setCatOpen}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        chapterOpen={chapterOpen}
        setChapterOpen={setChapterOpen}
        removeOpen={removeOpen}
        setRemoveOpen={setRemoveOpen}
        recommendOpen={recommendOpen}
        setRecommendOpen={setRecommendOpen}
        currentMangaId={currentMangaId}
        mangaInfo={mangaInfo}
        handleRemoveOpen={() => setRemoveOpen(true)}
        handleCatOpen={() => setCatOpen(true)}
        handleChapterOpen={() => setChapterOpen(true)}
        handleModalClose={async () => {
          setModalOpen(false);
          if (!currentMangaId) return;
          setCurrentMangaId(null);

          await fetch(`${fetchPath}/api/data/update/updateInteractTime`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mangaId: currentMangaId,
              interactionTime: Date.now(),
            }),
          });
        }}
      />

      <MangaControls
        currentSearch={currentSearch}
        setSearch={setSearch}
        filterOptions={filterOptions}
        setFilterOptions={setFilterOptions}
        sortSelection={sortSelection}
        setSortSelection={setSortSelection}
        unreadChecked={unreadChecked}
        setUnreadChecked={setUnreadChecked}
        catOptions={catOptions}
      />

      <Box
        ref={containerRef}
        className="cardContainer"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          justifyItems: 'center',
          overflowY: 'scroll',
          minHeight: 0,
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px',
        }}
      >
        {mangaList.map((data) => (
          <SeriesCard
            key={data.mangaId}
            data={data}
            handleContextMenu={handleContextMenu}
            openMangaOverview={() => {
              setCurrentMangaId(data.mangaId);
              setModalOpen(true);
            }}
            catOptions={catOptions}
          />
        ))}

        <Card sx={{ width: 320, height: 350, backgroundColor: 'black', color: 'white' }}>
          <CardActionArea
            onClick={() => setAddOpen(true)}
            sx={{ height: '100%' }}
            className="addManga viewTracked"
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <AddCircleOutlinedIcon sx={{ width: 200, height: 200 }} />
            </Box>
          </CardActionArea>
        </Card>

        <Fade in={showScrollButton}>
          <Box
            sx={{
              position: 'absolute',
              bottom: theme.spacing(2),
              right: theme.spacing(2),
              zIndex: 1,
            }}
          >
            <IconButton
              color="primary"
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                el.scrollTo({ top: atBottom ? 0 : el.scrollHeight, behavior: 'smooth' });
              }}
              sx={{
                bgcolor: '#90caf9',
                color: 'background.paper',
                boxShadow: 3,
                '&:hover': { bgcolor: '#0c81e0' },
              }}
            >
              {atBottom ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Box>
        </Fade>

        <MangaContextMenu
          anchorPosition={anchorPosition}
          onClose={() => setAnchorPosition(null)}
          onOpen={() => {
            if (!mangaInfo || !currentMangaId) return;
            const manga = mangaInfo.get(currentMangaId);
            if (!manga) return;

            const nextSlug = manga.slugList[manga.currentIndex + 1] ?? manga.slugList.at(-1);
            const currentUrl = `${manga.urlBase}${nextSlug}`;
            window.open(currentUrl);
            setAnchorPosition(null);
          }}
          onChangeCategory={() => {
            setCatOpen(true);
            setAnchorPosition(null);
          }}
          onMarkRead={() => {
            setChapterOpen(true);
            setAnchorPosition(null);
          }}
          onRemove={() => {
            setRemoveOpen(true);
            setAnchorPosition(null);
          }}
          onRecommend={() => {
            setRecommendOpen(true);
            setAnchorPosition(null);
          }}
        />
      </Box>
    </div>
  );
}
