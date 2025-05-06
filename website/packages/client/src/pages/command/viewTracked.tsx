import { dropdownOption, mangaDetails } from '../../types';
import { customStyles } from '../../styled/index';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Select from 'react-select';
import {
  CardActionArea,
  Checkbox,
  FormControlLabel,
  Menu,
  MenuItem,
  Skeleton,
  TextField,
} from '@mui/material';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import { fetchPath } from '../../vars';

import AddMangaModal from '../../components/addMangaModal';

import './viewTracker.css';
import SeriesModal from '../../components/SeriesModal';
import ConfirmRemovalModal from '../../components/confirmRemovealModal';
import ChangeChapterModal from '../../components/changeChapterModal';
import ChangeCategoryModal from '../../components/changeCategoryModal';
import { useQuery } from '@tanstack/react-query';
import SeriesCard from '../../components/SeriesCard';
import { fetchUserCategories, getStoredValue } from '../../utils';

const sortOptions: { label: string; value: keyof mangaDetails | 'search' }[] = [
  { label: 'Title Search', value: 'search' },
  { label: 'Title', value: 'mangaName' },
  { label: 'Updated', value: 'updateTime' },
  { label: 'Interacted', value: 'interactTime' },
  { label: 'Read Chapters', value: 'currentIndex' },
];

export default function tracked() {
  const { data: mangaInfo, isLoading: isLoadingMangaInfo, error: errorMangaInfo } = useUserManga();
  const [currentMangaId, setCurrentMangaId] = React.useState<string|null>(null);

  const { data: catOptions, isError } = useQuery<dropdownOption[], Error>({
      queryKey: ['userCategories'],
      queryFn: () => fetchUserCategories(),
      staleTime: 1000 * 60 * 60, 
      gcTime: Infinity,
    })

  const [filterOption, setFilterOption] = React.useState<dropdownOption | null>(getStoredValue('filterOption')||catOptions?.[8]||null);
  const [methodOption, setMethodOption] = React.useState<{
    label: string;
    value: string;
  } | null>(getStoredValue('methodOption')||sortOptions[0]);
  const [orderOption, setOrderOption] = React.useState<{
    value: string;
    label: string;
  } | null>(getStoredValue('orderOption')||{ value: '1', label: 'Ascending' });

  React.useEffect(() => {
    localStorage.setItem('filterOption', JSON.stringify(filterOption));
  }, [filterOption]);

  React.useEffect(() => {
    localStorage.setItem('methodOption', JSON.stringify(methodOption));
  }, [methodOption]);

  React.useEffect(() => {
    localStorage.setItem('orderOption', JSON.stringify(orderOption));
  }, [orderOption]);

  const [currentSearch, setSearch] = React.useState<string>('');
  const [unreadChecked, setUnreadChecked] = React.useState<boolean>(getStoredValue('unreadChecked')||false);

  React.useEffect(() => {
    localStorage.setItem('unreadChecked', JSON.stringify(unreadChecked));
  }, [unreadChecked]);

  //right click menu
  const [anchorPosition, setAnchorPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  const handleContextMenu = async (event: React.MouseEvent, mangaId: string) => {
    if (anchorPosition) {
      setAnchorPosition(null);
      return;
    }

    event.preventDefault();
    // console.log(mangaInfo);
    // console.log(mangaId);
    // let index = mangaInfo?.findIndex((manga) => manga.mangaId === mangaId);
    // console.log(index);

    // if (index !== 0 && (!index || index === -1)) return;
    if (!mangaId) return;
    setCurrentMangaId(mangaId);
    setAnchorPosition({ top: event.clientY, left: event.clientX });
  };

  const handleContextClose = () => {
    setAnchorPosition(null);
  };

  async function openMangaOverview(mangaId: string) {
    console.log('opening Series Modal!');
    // if (!mangaInfo) return;
    // let mangaIndex = mangaInfo.get(currentMangaId);
    setCurrentMangaId(mangaId);
    setModalOpen(true);
  }
  
  function useUserManga() {
    return useQuery({
      queryKey: ['userManga', 'viewTracked'],
      queryFn: async (): Promise<Map<string, mangaDetails>> => {
        const response = await fetch(`${fetchPath}/api/data/pull/getUserManga`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
  
        if (!response.ok) {
          const errorData: { message?: string } = await response.json();
          throw new Error(errorData.message || 'Failed to fetch manga');
        }
  
        const results = await response.json()  as { mangaDetails: mangaDetails[] };
        const mangaMap:Map<string, mangaDetails> = new Map(results.mangaDetails.map(manga => [manga.mangaId, manga]))
        if (results.mangaDetails.length <= 0) {
          toast.info("No Manga!");
        }
  
        return mangaMap;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    });
  }  

  function fuzzyMatch(pattern: string, str: string): number {
    pattern = pattern.toLowerCase();
    str = str.toLowerCase();

    let score = 0;
    let lastIndex = -1;

    if (str === pattern) return 0;
    if (str.startsWith(pattern)) return 1;

    for (let char of pattern) {
      const index = str.indexOf(char, lastIndex + 1);
      if (index === -1) return 100; // No match found for letter return -1, possible subtract score instead of -1

      score += index - lastIndex;
      lastIndex = index;
    }

    // const lengthDifference = str.length-pattern.length
    // score += lengthDifference*0.5

    return score;
  }

  function fuzzyWordMatch(pattern: string, str: string): number {
    const patternWords = pattern.toLowerCase().split(/\s+/);
    const strWords = str.toLowerCase().split(/\s+/);
  
    console.log(strWords)

    let totalScore = 0;
    for (const pWord of patternWords) {
      let bestScore = Infinity;
      for (const sWord of strWords) {
        const score = fuzzyMatch(pWord, sWord); 
        if (score < bestScore) bestScore = score;
      }
      totalScore += bestScore;
    }
    if (totalScore === Infinity) return -1
    console.log(`Matching "${pattern}" to "${str}" =>`, totalScore);
    return totalScore;
  }
  

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  function checkFilter(manga: mangaDetails) {
    if (unreadChecked) {
      if (manga.chapterTextList.length - 1 <= manga.currentIndex) return false;
    }
    if (!filterOption || filterOption.value === '%' || manga.userCat === filterOption.value) {
      if (currentSearch) {
        return fuzzyWordMatch(currentSearch, manga.mangaName) >= 0;
      } else return true;
    }

    return false;
  }

  //modal control
  const [modalOpen, setModalOpen] = useState(false)
  const handleModalClose = async () => {
    if (!currentMangaId) return
    let mangaId = currentMangaId
    setModalOpen(false)
    setCurrentMangaId(null)

    await fetch(`${fetchPath}/api/data/update/updateInteractTime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mangaId: mangaId,
        interactionTime: Date.now(),
      }),
    });

  };
  const [catOpen, setCatOpen] = React.useState(false);
  const handleCatOpen = () => setCatOpen(true);
  const handleCatClose = () => setCatOpen(false);

  const [addOpen, setAddOpen] = React.useState(false);
  const handleAddOpen = () => setAddOpen(true);
  const handleAddClose = () => setAddOpen(false);

  const [chapterOpen, setChapterOpen] = React.useState(false);
  const handleChapterOpen = () => setChapterOpen(true);
  const handleChapterClose = () => setChapterOpen(false);

  const [removeOpen, setRemoveOpen] = React.useState(false);
  const handleRemoveOpen = () => setRemoveOpen(true);
  const handleRemoveClose = () => setRemoveOpen(false);

  const handleContextChapter = () => {
    handleChapterOpen();
    handleContextClose();
  };

  const handleContextCategory = () => {
    handleCatOpen();
    handleContextClose();
  };

  const handleContextRemove = () => {
    handleRemoveOpen();
    handleContextClose();
  };

  const handleContextOpen = () => {
    if (!mangaInfo || !currentMangaId) return;

    const manga = mangaInfo.get(currentMangaId);
    if (!manga) return;

    const nextSlug = manga.slugList[manga.currentIndex + 1] ?? manga.slugList.at(-1);
    const currentUrl = `${manga.urlBase}${nextSlug}`;

    window.open(currentUrl);
    handleContextClose();
  };

  const SkeletonCard = () => (
    <Card sx={{ width: 320, height: 350, backgroundColor: 'black', color: 'white' }}>
      <CardActionArea sx={{ height: '100%' }}>
        <Skeleton variant="rectangular" height={200} />
        <CardContent>
          <Skeleton variant="text" height={30} width="80%" />
          <Skeleton variant="text" height={20} width="60%" />
          <Skeleton variant="text" height={20} width="40%" />
        </CardContent>
      </CardActionArea>
    </Card>
  );

  if (isLoadingMangaInfo || errorMangaInfo || !mangaInfo)
    return (
      <div
        className="cardContainer"
        style={{
          display: 'flex',
          justifyContent: 'center',
          justifyItems: 'center',
        }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </div>
    );

  return (
    <div
      className="viewTrackerContainer"
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <div className="mangaOverviewModal" id="overviewModal">
      <SeriesModal
        open={modalOpen}
        manga={mangaInfo.get(currentMangaId||'') ?? null}
        onUnsetManga={() => handleModalClose()}
        onRemove={() => handleRemoveOpen()}
        onChangeCategory={() => handleCatOpen()}
        onChangeChap={() => handleChapterOpen()}
      />


        <ChangeCategoryModal
          open={catOpen}
          onClose={handleCatClose}
          mangaId={currentMangaId||''}
        />
        <ChangeChapterModal
          open={chapterOpen}
          onClose={handleChapterClose}
          mangaInfo={mangaInfo}
          mangaId={currentMangaId||''}
        />
        <ConfirmRemovalModal
          open={removeOpen}
          onClose={handleRemoveClose}
          mangaId={currentMangaId||''}
        />

        <AddMangaModal
          open={addOpen}
          onClose={handleAddClose}
        />
      </div>

      <div className="cardControls">
        <TextField
          id="search"
          label="Search"
          value={currentSearch}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
          // className="inputField"
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#cccccc', // Default outline color
              },
              '&:hover fieldset': {
                borderColor: '#b3b3b3', // Outline color when hovered
              },
              '&.Mui-focused fieldset': {
                borderColor: '#2684ff', // Outline color when focused
              },
            },
          }}
          InputProps={{
            sx: { background: 'inherit', borderColor: '#ccc' },
          }}
        />

        <Select
          value={filterOption}
          onChange={setFilterOption}
          options={catOptions}
          styles={customStyles}
          className="selectField"
        />

        <Select
          value={methodOption}
          onChange={setMethodOption}
          options={sortOptions}
          styles={customStyles}
          className="selectField"
        />

        <Select
          value={orderOption}
          onChange={setOrderOption}
          options={[
            { value: '1', label: 'Ascending' },
            { value: '-1', label: 'Descending' },
          ]}
          styles={customStyles}
          className="selectField"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={unreadChecked}
              onChange={(e) => setUnreadChecked(e.target.checked)}
              sx={{
                color: '#ddd', // Default color
                '&.Mui-checked': { color: '#22346e' }, // Checked color
              }}
            />
          }
          label="Unread"
          sx={{ color: 'inherit' }} // Matches surrounding text color
        />
      </div>

      <div
        className="cardContainer"
        style={{
          display: 'flex',
          justifyContent: 'center',
          justifyItems: 'center',
        }}
      >
        {Array.from(mangaInfo.values())
          .filter((manga) => checkFilter(manga))
          .sort((a, b) => {
            let key: keyof mangaDetails | 'search' = methodOption?.value as
              | keyof mangaDetails
              | 'search';
            let orderVal = parseInt(orderOption ? orderOption.value : '0');

            if (!key || !orderVal) return 0;

            if (methodOption?.value === 'search') {
              if (currentSearch) {
                const scoreA = fuzzyMatch(currentSearch, a.mangaName);
                const scoreB = fuzzyMatch(currentSearch, b.mangaName);

                if (scoreA > scoreB) return 1 * orderVal;
                if (scoreA < scoreB) return -1 * orderVal;
              } else {
                if (a.mangaName > b.mangaName) return 1 * orderVal;
                if (a.mangaName < b.mangaName) return -1 * orderVal;
              }
              return 0;
            }
            key = key as keyof mangaDetails;
            if (a[key] > b[key]) return 1 * orderVal;
            if (a[key] < b[key]) return -1 * orderVal;
            return 0;
          })
          .map((data, i) => (
            <SeriesCard
              data={data}
              handleContextMenu={handleContextMenu}
              openMangaOverview={openMangaOverview}
              key={data.mangaId}
            />
          ))}

        <Card
          sx={{
            width: 320,
            height: 350,
            backgroundColor: 'black',
            color: 'white',
          }}
        >
          <CardActionArea onClick={(e) => handleAddOpen()} sx={{ height: '100%' }}>
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

        <Menu
          open={anchorPosition !== null}
          onClose={handleContextClose}
          anchorReference="anchorPosition"
          anchorPosition={
            anchorPosition ? { top: anchorPosition.top, left: anchorPosition.left } : undefined
          }
        >
          <MenuItem onClick={handleContextOpen}>Open</MenuItem>
          <MenuItem onClick={handleContextChapter}>Change Chapter</MenuItem>
          <MenuItem onClick={handleContextCategory}>Change Category</MenuItem>
          <MenuItem onClick={handleContextRemove} sx={{ color: 'error.main' }}>
            Remove
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}
