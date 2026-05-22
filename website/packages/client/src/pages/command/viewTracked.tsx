import React, { useRef, useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
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

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';

import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import MoveUpIcon from '@mui/icons-material/MoveUp';
import MoveDownIcon from '@mui/icons-material/MoveDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import Typography from '@mui/material/Typography';
import { useUISetting } from '../../hooks/useUiSetting';
import { width } from '@mui/system/sizing';
import Slide from '@mui/material/Slide';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import SpeedDial from '@mui/material/SpeedDial';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';

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
  const [compactCardsEnabled] = useUISetting('compactCardsEnabled', false);

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

  const [selectionMode, setSelectionMode] = useState(false);

  const [selectedMangaIds, setSelectedMangaIds] = useState<Set<string>>(() => new Set());

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
  const [titleOpen, setTitleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [coverSelectionOpen, setCoverSelectionOpen] = useState(false);

  const [speedDialOpen, setSpeedDialOpen] = useState(false);

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

      if (key === 'chapsUnread') {
        const unreadA = a.chapterTextList.length - a.currentIndex - 1;
        const unreadB = b.chapterTextList.length - b.currentIndex - 1;
        return (unreadA - unreadB) * orderVal;
      }

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

  function toggleSelect(mangaId: string) {
    setSelectedMangaIds((prev) => {
      const next = new Set(prev);

      if (next.has(mangaId)) {
        next.delete(mangaId);
      } else {
        next.add(mangaId);
      }

      return next;
    });
  }

  function clearSelection() {
    setSelectedMangaIds(new Set());
    setSelectionMode(false);
  }

  useEffect(() => {
    if (selectedMangaIds.size === 0) {
      setSelectionMode(false);
    }
  }, [selectedMangaIds]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;

      if (selectionMode) {
        clearSelection();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectionMode]);

  if (isLoading || error || !mangaInfo) {
    return (
      <div
        className="viewTrackerContainer"
        style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
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
      </div>
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
        titleOpen={titleOpen}
        setTitleOpen={setTitleOpen}
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        chapterOpen={chapterOpen}
        setChapterOpen={setChapterOpen}
        removeOpen={removeOpen}
        setRemoveOpen={setRemoveOpen}
        recommendOpen={recommendOpen}
        setRecommendOpen={setRecommendOpen}
        coverSelectionOpen={coverSelectionOpen}
        setCoverSelectionOpen={setCoverSelectionOpen}
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
              newTime: Date.now(),
            }),
          });
        }}
        clearSelection={clearSelection}
        selectedMangaIds={Array.from(selectedMangaIds)}
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
            selected={selectedMangaIds.has(data.mangaId)}
            selectionMode={selectionMode}
            onToggleSelect={() => toggleSelect(data.mangaId)}
            enableSelectionMode={() => setSelectionMode(true)}
          />
        ))}
        <Card
          sx={{
            width: 280,
            backgroundColor: 'black',
            color: 'white',
            border: '2px dashed rgba(255,255,255,0.3)', // subtle border hint
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: 'white',
              transform: 'scale(1.03)',
            },
          }}
        >
          <CardActionArea
            onClick={() => setAddOpen(true)}
            sx={{
              width: '100%',
              height: '100%',
              minHeight: compactCardsEnabled ? 230 : 'auto',
              aspectRatio: compactCardsEnabled ? 'auto' : '480 / 720',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AddCircleOutlinedIcon sx={{ fontSize: compactCardsEnabled ? 48 : 72, opacity: 0.6 }} />
            <Typography variant="h6" sx={{ opacity: 0.8 }}>
              Add Manga
            </Typography>
          </CardActionArea>
        </Card>

        <SpeedDial
          ariaLabel="tracked-actions"
          sx={{
            position: 'fixed',
            bottom: theme.spacing(8),
            right: theme.spacing(1),
            zIndex: 1300,
          }}
          open={speedDialOpen}
          onOpen={() => setSpeedDialOpen(true)}
          onClose={() => setSpeedDialOpen(false)}
          icon={
            <KeyboardArrowUp
              sx={{
                transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                transform: speedDialOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          }
          FabProps={{
            color: selectionMode ? 'secondary' : 'primary',
          }}
          hidden={selectionMode}
        >
          <SpeedDialAction
            icon={<AddIcon />}
            slotProps={{
              tooltip: {
                title: 'Add Manga',
              },
            }}
            onClick={() => {
              setAddOpen(true);
            }}
          />

          <SpeedDialAction
            icon={selectionMode ? <CloseIcon /> : <DoneAllIcon />}
            onClick={() => {
              if (selectionMode) {
                clearSelection();
              } else {
                setSelectionMode(true);
              }
            }}
            slotProps={{
              tooltip: {
                title: 'Select',
              },
            }}
          />

          {showScrollButton && (
            <SpeedDialAction
              icon={atBottom ? <MoveUpIcon /> : <MoveDownIcon />}
              slotProps={{
                tooltip: {
                  title: atBottom ? 'Scroll to Top' : 'Scroll to Bottom',
                },
              }}
              onClick={() => {
                const el = containerRef.current;

                if (!el) return;

                el.scrollTo({
                  top: atBottom ? 0 : el.scrollHeight,
                  behavior: 'smooth',
                });
              }}
            />
          )}
        </SpeedDial>

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
          onChangeTitle={() => {
            setTitleOpen(true);
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
          onChangeCover={() => {
            setCoverSelectionOpen(true);
            setAnchorPosition(null);
          }}
        />
      </Box>

      <Slide direction="up" in={selectionMode && selectedMangaIds.size > 0}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1400,

            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',

            px: 2,
            py: 1.5,

            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,

            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1">{selectedMangaIds.size} selected</Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Button variant="contained" onClick={() => setCatOpen(true)}>
              Category
            </Button>

            <Button variant="contained" onClick={() => setRecommendOpen(true)}>
              Recommend
            </Button>

            <Button variant="contained" color="error" onClick={() => setRemoveOpen(true)}>
              Remove
            </Button>

            <Button variant="outlined" onClick={clearSelection}>
              Cancel
            </Button>
          </Box>
        </Paper>
      </Slide>
    </div>
  );
}
