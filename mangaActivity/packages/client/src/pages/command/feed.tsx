import discordSdk from '../../discordSdk'
import {authStore} from '../../stores/authStore'
import {customStyles} from '../../styled/index'
import {LoadingScreen} from '../../components/LoadingScreen'
import Select from 'react-select'
import React from "react"
import './feed.css'
import { mangaInfo, dropdownOption } from '../../types'
import { catOptions, ordOptions, methodOptions } from '../../vars'
import { RPCCloseCodes } from '@discord/embedded-app-sdk'
import Box from '@mui/material/Box'
import Modal from '@mui/material/Modal'
import Button from '@mui/material/Button'
import SvgIcon from '@mui/material/SvgIcon'
import CircularProgress from '@mui/material/CircularProgress'
import { toast } from 'react-toastify'
import CancelIcon from '@mui/icons-material/Cancel'
import {modalStyle} from '../../AppStyles'

export default function feed():JSX.Element {
  const [response, setResponse] = React.useState<mangaInfo | null>(
    {
      "userInfo": [],
      "mangaData": []
    }
  );
  const [currentCard, setCurrentCard] = React.useState(0)
  const [isLoadingStart, setIsLoadingStart] = React.useState(false)
  const [showError,setShowError] = React.useState(true)
  const auth = authStore.getState()

  const [selectedCat, setSelectedCat] = React.useState<dropdownOption | null>(catOptions[0])
  const [selectedOrd, setSelectedOrd] = React.useState<dropdownOption | null>(ordOptions[0])
  const [selectedMethod, setSelectedMethod] = React.useState<dropdownOption | null>(methodOptions[0])
  const [newChapter, setChapter] = React.useState<dropdownOption | null>(null)

  async function updateCard() {
    try {
      setIsLoadingStart(true)

      const resp = await fetch("/api/data/pull/getUnread", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "access_token": auth.access_token,
          "authId": null,
          "userCat": selectedCat?.value,
          "sortOrd": selectedOrd?.value,
          "sortMeth": selectedMethod?.value
        }),
      })

      console.log(resp)
      if (resp.status!=200) {
        const errorData:{message:string} = await resp.json()
        setIsLoadingStart(false)
        return setError(errorData.message) 
      }
      setCurrentCard(0)
      setIsLoadingStart(false)
      const data:mangaInfo = await resp.json();
      console.log(data)
      setResponse(data)
      
      
      if (response!.userInfo.length < 1) setError("No Manga Found") 
      else setShowError(false) 
    }
    catch (error) {
      console.log(error)
      setError('An unknown error Occurred! Try restarting the activity.')
      setIsLoadingStart(false)
    }
  }  

  function setError(message:string) {
    const errorField = document.getElementById('errorField') as HTMLLabelElement|null
    console.log(message)
    if (!errorField) return
    errorField!.innerHTML = message
    setShowError(true)
  }

  async function updateCardIndex(increment:number) {

    const resp = fetch(`/api/data/update/updateInteractTime`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          "access_token": auth.access_token,
          "authId": null,
          "mangaId": response!.mangaData[currentCard].mangaId,
          "interactionTime": Date.now()
      }),
    })

    if (!response) return LoadingScreen
    setCurrentCard(currentCard+increment)
    setChapter(null)

    console.log(await resp)
  }

  async function submitManga(mangaId:string) {
    console.log(mangaId)
    let notif = toast.loading("Updating Chapter!")
    const newIndex = response?.mangaData[currentCard].chapterTextList.indexOf(newChapter!.label)
    if (!newIndex || newIndex == -1) return toast.update(notif, {
        render: "Internal Error Updating Chapter!", 
        type: "error", 
        isLoading: false,
        autoClose: 5000, 
        hideProgressBar: false, 
        closeOnClick: true, 
        draggable: true,
        progress: 0
    })

    const reply:any = await fetch('/api/data/update/updateCurrentIndex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "access_token": auth.access_token,
        "authId": null,
        "newIndex": newIndex,
        "mangaId": mangaId
      }),
    })

    if (reply.ok && response) {
      var tmp = {...response}
      tmp.userInfo[currentCard].interactTime = Date.now()
      tmp.userInfo[currentCard].currentIndex = newIndex
      setResponse(tmp)
      setChapter(null)

      return toast.update(notif, {
        render: "Chapter Successfully Changed!", 
        type: "success", 
        isLoading: false, 
        autoClose: 5000, 
        hideProgressBar: false, 
        closeOnClick: true, 
        draggable: true,
        progress: 0
      })
    }

    const data:{message:string, url:string} = await reply.json()

    toast.update(notif, {
        render: data.message, 
        type: "error", 
        isLoading: false,
        autoClose: 5000, 
        hideProgressBar: false, 
        closeOnClick: true, 
        draggable: true,
        progress: 0
    })
  }

  if (!auth) {
    console.log("No Auth!!!!!!!!!!!!!!!!")
    discordSdk.close(RPCCloseCodes.TOKEN_REVOKED, "Restart Activity to Continue!")
    return <div>Restart Activity</div>
  }
  if (!response || !response.userInfo) {
    console.log(response)
    return <></>
  }

  const [chapterOpen, setChapterOpen] = React.useState(false)
  const handleChapterOpen = () => setChapterOpen(true)
  const handleChapterClose = () => setChapterOpen(false)

  // console.log(response)
  if (response.userInfo.length <= 0) return (
    <div className="feedOptionContainer">
      <label htmlFor="cat-select">Choose a Category: </label>
      <Select name="categories" 
        id="cat-select" 
        className="catSelect" 
        value={selectedCat} 
        onChange={setSelectedCat} 
        options={catOptions} 
        styles={customStyles} 
      />
      <br></br>

      <label>Choose a sort Order: </label>
      <Select name="sortOrd" 
        id="sort-order" 
        className="ordSelect" 
        value={selectedOrd} 
        onChange={setSelectedOrd} 
        options={ordOptions} 
        styles={customStyles} 
      />
      <br></br>

      <label>Choose a sort Method: </label>
      <Select name="sortMeth" 
        id="sort-method" 
        className="methodSelect" 
        value={selectedMethod} 
        onChange={setSelectedMethod} 
        options={methodOptions} 
        styles={customStyles} 
      />
      
      <button className="addButton" type="submit" onClick={updateCard}>{isLoadingStart? <><CircularProgress size="1.2rem"/><label>Loading</label></>:'Start Feed'}</button>
      {showError?<label className='addError' id='errorField'></label>:<></>}
    </div>
  )
  return (
    <div style={{padding: 32}}>
      <label className='feedMangaTitle'>{response!.userInfo[currentCard].mangaName}</label>
      <div className='mangaContainer'>
        {response ? <img src={`/image/${response!.userInfo[currentCard].mangaId}`} alt="Manga Icon" className='cover-image' /> : <p>Loading...</p>}
        <div className="button-container">
          <div className="button-wrapper">
            <button className="action-button" 
              onClick={(e) => {
              const links = response.mangaData[currentCard].urlList
              console.log(links[response.userInfo[currentCard].currentIndex])
              discordSdk.commands.openExternalLink({url: links[response.userInfo[currentCard].currentIndex+1]});
            }}
            >Read Next</button>
            <span className="chapter-number">{ 
            ( response.userInfo[currentCard].currentIndex+1 < response.mangaData[currentCard].chapterTextList.length ) ? response.mangaData[currentCard].chapterTextList[response.userInfo[currentCard].currentIndex+1] : response.mangaData[currentCard].chapterTextList[response.mangaData[currentCard].chapterTextList.length-1]
            }</span>
          </div>
          <div className="button-wrapper">
            <button className="action-button" 
              onClick={(e) => {
              const links = response.mangaData[currentCard].urlList
              discordSdk.commands.openExternalLink({url: links[links.length-1]!});
            }}>Read Latest</button>
            <span className="chapter-number">{response.mangaData[currentCard].chapterTextList[response.mangaData[currentCard].chapterTextList.length-1]}</span>
          </div>
          <div className="button-wrapper">
            <button className="action-button" 
              onClick={(e) => {
              discordSdk.commands.openExternalLink({url: response.mangaData[currentCard].urlList[response.userInfo[currentCard].currentIndex]});
            }}>Read Current</button>
            <span className="chapter-number">{response.mangaData[currentCard].chapterTextList[response.userInfo[currentCard].currentIndex]}</span>
          </div>
        </div>
      </div>

      <Modal
          open={chapterOpen}
          onClose={handleChapterClose}
          aria-labelledby="chap-modal-title"
          aria-describedby="chap-modal-description"
      >
          <Box sx={{width: "80vw", height: "25vh", ...modalStyle}}>
          <h2 id="chap-modal-title">Choose a new Chapter</h2>
          <Select name="chap" 
              id="chap" 
              className="chapSelect" 
              value={newChapter} 
              onChange={setChapter} 
              options={response?.mangaData[currentCard].chapterTextList.toReversed().map((text, i) => {
                  return {value: text, label: text}
              })} 
              styles={customStyles} 
          />
          <Button onClick={(e) => {
              submitManga(response!.userInfo[currentCard].mangaId)
              handleChapterClose()
          }}>Submit</Button>
          <SvgIcon onClick={handleChapterClose} sx={{position: "absolute", top: 10, right: 10}}>
              <CancelIcon sx={{color: "white"}}/>
          </SvgIcon>
          </Box>
      </Modal>

      <div className='controlButtonContainer'>
        <button className='prev mangaFeedControlButton' onClick={(e) => {
          if (currentCard > 0) updateCardIndex(-1)
            console.log(currentCard)
          }}
          disabled={(currentCard==0)}
          >Prev
        </button>
        <button className='setCurrent mangaFeedControlButton' onClick={(e) => {
            handleChapterOpen()
            console.log('CLICK')
          }}>Mark As Read
        </button>
        <button className='next mangaFeedControlButton' onClick={(e) => {
          if (currentCard < response.mangaData.length - 1) updateCardIndex(1)
          console.log(currentCard)
          }}
          disabled={(response.mangaData.length <= currentCard+1)}
          >Next
        </button>
      </div>
      
      <br></br>
      <button className='feedChangeOptionButton' onClick={(e) => {
        //remove response data 
        setResponse(
          {
            "userInfo": [],
            "mangaData": []
          }
        )
      }}>Change Options</button>
    </div>
  )
}
