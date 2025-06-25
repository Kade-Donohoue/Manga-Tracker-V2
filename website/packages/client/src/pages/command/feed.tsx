import { customStyles } from '../../styled/index';
import { LoadingScreen } from '../../components/LoadingScreen';
import Select, { StylesConfig } from 'react-select';
import React from 'react';
import './feed.css';
import { mangaDetails, dropdownOption } from '../../types';
import { ordOptions, methodOptions, fetchPath } from '../../vars';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';
import CircularProgress from '@mui/material/CircularProgress';
import { toast } from 'react-toastify';
import CancelIcon from '@mui/icons-material/Cancel';
import { modalStyle } from '../../AppStyles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserCategories } from '../../utils';
import ChangeChapterModal from '../../components/changeChapterModal';

export default function feed(): JSX.Element {
  const { data: catOptions, isError } = useQuery<dropdownOption[], Error>({
    queryKey: ['userCategories'],
    queryFn: () => fetchUserCategories(),
    staleTime: 1000 * 60 * 60,
    gcTime: Infinity,
  });

  const [mangaDetails, setMangaDetails] = React.useState<mangaDetails[]>([]);
  const [currentCard, setCurrentCard] = React.useState(0);
  const [isLoadingStart, setIsLoadingStart] = React.useState(false);
  const [showError, setShowError] = React.useState(true);

  const [selectedCat, setSelectedCat] = React.useState<dropdownOption | null>(
    catOptions?.[0] || null
  );
  const [selectedOrd, setSelectedOrd] = React.useState<dropdownOption | null>(ordOptions[0]);
  const [selectedMethod, setSelectedMethod] = React.useState<dropdownOption | null>(
    methodOptions[0]
  );
  const [newChapter, setChapter] = React.useState<dropdownOption | null>(null);

  const queryClient = useQueryClient();

  async function updateCard() {
    try {
      setIsLoadingStart(true);

      const resp = await fetch(`${fetchPath}/api/data/pull/getUnread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userCat: selectedCat?.value,
          sortOrd: selectedOrd?.value,
          sortMeth: selectedMethod?.value,
        }),
      });

      // console.log(resp)
      if (!resp.ok) {
        const errorData: { message: string } = await resp.json();
        setIsLoadingStart(false);
        return setError(errorData.message);
      }
      setCurrentCard(0);
      setIsLoadingStart(false);
      const data: { mangaDetails: mangaDetails[] } = await resp.json();
      // console.log(data)
      setMangaDetails(data.mangaDetails);

      if (data.mangaDetails.length < 1) setError('No Manga Found');
      else setShowError(false);
    } catch (error) {
      console.error(error);
      setError('An unknown error Occurred! Try restarting the activity.');
      setIsLoadingStart(false);
    }
  }

  function setError(message: string) {
    const errorField = document.getElementById('errorField') as HTMLLabelElement | null;
    // console.log(message)
    if (!errorField) return;
    errorField!.innerHTML = message;
    setShowError(true);
  }

  async function updateCardIndex(increment: number) {
    // console.log(increment)
    const resp = fetch(`${fetchPath}/api/data/update/updateInteractTime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mangaId: mangaDetails[currentCard].mangaId,
        interactionTime: Date.now(),
      }),
    });

    if (!mangaDetails) return LoadingScreen;
    setCurrentCard(currentCard + increment);
    setChapter(null);
    await resp;

    // console.log(await resp)
  }

  function style(chapterText: string) {
    let newStyle = customStyles;

    newStyle.option = (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#6b6b6b' : '#121212',
      color: state.data.label === chapterText ? '#28A745' : '#fff',
      fontWeight: state.data.label === chapterText ? 'bold' : 'normal',
      '&:hover': {
        backgroundColor: '#6b6b6b',
      },
      padding: '12px 20px',
    });
    return newStyle;
  }

  async function submitManga(mangaId: string) {
    // console.log(mangaId)
    let notif = toast.loading('Updating Chapter!');
    const newIndex = mangaDetails[currentCard].chapterTextList.indexOf(newChapter!.label);
    if (!newIndex || newIndex == -1)
      return toast.update(notif, {
        render: 'Internal Error Updating Chapter!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: 0,
      });

    const reply: any = await fetch(`${fetchPath}/api/data/update/updateCurrentIndex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newIndex: newIndex,
        mangaId: mangaId,
        currentChap: mangaDetails.find((manga) => manga.mangaId === mangaId)?.chapterTextList[
          newIndex
        ],
      }),
    });

    if (reply.ok && mangaDetails) {
      queryClient.invalidateQueries({ queryKey: ['userManga'] });
      var tmp: mangaDetails[] = [...mangaDetails];
      tmp[currentCard].interactTime = Date.now();
      tmp[currentCard].currentIndex = newIndex;
      // console.log(tmp)
      setMangaDetails(tmp);
      setChapter(null);

      return toast.update(notif, {
        render: 'Chapter Successfully Changed!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: 0,
      });
    }

    const data: { message: string; url: string } = await reply.json();

    toast.update(notif, {
      render: data.message,
      type: 'error',
      isLoading: false,
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      draggable: true,
      progress: 0,
    });
  }

  const [chapterOpen, setChapterOpen] = React.useState(false);
  const handleChapterOpen = () => setChapterOpen(true);
  const handleChapterClose = () => setChapterOpen(false);

  // console.log(response)
  if (mangaDetails.length <= 0)
    return (
      <div className="feedOptionContainer">
        <label htmlFor="cat-select">Choose a Category: </label>
        <Select
          name="categories"
          id="cat-select"
          className="catSelect"
          value={selectedCat}
          onChange={setSelectedCat}
          options={catOptions}
          styles={customStyles as StylesConfig<dropdownOption, false>}
          isSearchable={false}
        />
        <br></br>

        <label>Choose a sort Order: </label>
        <Select
          name="sortOrd"
          id="sort-order"
          className="ordSelect"
          value={selectedOrd}
          onChange={setSelectedOrd}
          options={ordOptions}
          styles={customStyles as StylesConfig<dropdownOption, false>}
          isSearchable={false}
        />
        <br></br>

        <label>Choose a sort Method: </label>
        <Select
          name="sortMeth"
          id="sort-method"
          className="methodSelect"
          value={selectedMethod}
          onChange={setSelectedMethod}
          options={methodOptions}
          styles={customStyles as StylesConfig<dropdownOption, false>}
          isSearchable={false}
        />

        <button className="addButton" type="submit" onClick={updateCard}>
          {isLoadingStart ? (
            <>
              <CircularProgress size="1.2rem" />
              <label>Loading</label>
            </>
          ) : (
            'Start Feed'
          )}
        </button>
        {showError ? <label className="addError" id="errorField"></label> : <></>}
      </div>
    );
  return (
    <div style={{ padding: 32, maxWidth: '100%' }}>
      <label className="feedMangaTitle">{mangaDetails[currentCard].mangaName}</label>
      <div className="mangaContainer">
        {mangaDetails ? (
          <img
            src={`${fetchPath === '/.proxy' ? '/.proxy/image' : import.meta.env.VITE_IMG_URL}/${mangaDetails[currentCard].mangaId}/${mangaDetails[currentCard].imageIndexes.at(-1) || 0}`}
            alt="Manga Icon"
            className="cover-image"
          />
        ) : (
          <p>Loading...</p>
        )}
        <div className="button-container">
          <div className="button-wrapper">
            <button
              className="action-button"
              onClick={(e) => {
                const slugs = mangaDetails[currentCard].slugList;
                // console.log(links[mangaDetails[currentCard].currentIndex])
                window.open(
                  mangaDetails[currentCard].urlBase +
                    slugs[mangaDetails[currentCard].currentIndex + 1]
                );
              }}
            >
              Read Next
            </button>
            <span className="chapter-number">
              Chapter{' '}
              {mangaDetails[currentCard].currentIndex + 1 <
              mangaDetails[currentCard].chapterTextList.length
                ? mangaDetails[currentCard].chapterTextList[
                    mangaDetails[currentCard].currentIndex + 1
                  ]
                : mangaDetails[currentCard].chapterTextList[
                    mangaDetails[currentCard].chapterTextList.length - 1
                  ]}
            </span>
          </div>
          <div className="button-wrapper">
            <button
              className="action-button"
              onClick={(e) => {
                const slugs = mangaDetails[currentCard].slugList;
                window.open(mangaDetails[currentCard].urlBase + slugs[slugs.length - 1]!);
              }}
            >
              Read Latest
            </button>
            <span className="chapter-number">
              Chapter{' '}
              {
                mangaDetails[currentCard].chapterTextList[
                  mangaDetails[currentCard].chapterTextList.length - 1
                ]
              }
            </span>
          </div>
          <div className="button-wrapper">
            <button
              className="action-button"
              onClick={(e) => {
                window.open(
                  mangaDetails[currentCard].urlBase +
                    mangaDetails[currentCard].slugList[mangaDetails[currentCard].currentIndex]
                );
              }}
            >
              Read Current
            </button>
            <span className="chapter-number">
              Chapter{' '}
              {mangaDetails[currentCard].chapterTextList[mangaDetails[currentCard].currentIndex]}
            </span>
          </div>
        </div>
      </div>

      <ChangeChapterModal
        open={chapterOpen}
        onClose={handleChapterClose}
        mangaInfo={new Map().set(mangaDetails[currentCard].mangaId, mangaDetails[currentCard])}
        mangaId={mangaDetails[currentCard].mangaId}
      />

      <div className="controlButtonContainer">
        <button
          className="prev mangaFeedControlButton"
          onClick={(e) => {
            if (currentCard > 0) updateCardIndex(-1);
            // console.log(currentCard)
          }}
          disabled={currentCard == 0}
        >
          Prev
        </button>
        <button
          className="setCurrent mangaFeedControlButton"
          onClick={(e) => {
            handleChapterOpen();
            // console.log('CLICK')
          }}
        >
          Mark As Read
        </button>
        <button
          className="next mangaFeedControlButton"
          onClick={(e) => {
            if (currentCard < mangaDetails.length - 1) updateCardIndex(1);
            else console.log('end of range', currentCard, mangaDetails.length);
            // console.log(currentCard)
          }}
          disabled={mangaDetails.length <= currentCard + 1}
        >
          Next
        </button>
      </div>

      <br></br>
      <Button
        sx={{ position: 'absolute', bottom: '1rem', right: '1rem' }}
        variant="contained"
        color="primary"
        onClick={(e) => {
          //remove response data
          setMangaDetails([]);
        }}
      >
        Change Options
      </Button>
    </div>
  );
}
