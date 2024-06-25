import discordSdk from '../../discordSdk';
import {authStore} from '../../stores/authStore';
import ReactJsonView from '../../components/ReactJsonView';
import React, { useEffect } from "react"
import './feed.css'

interface userData {
  "userID": string,
  "mangaName": string,
  "mangaId": string,
  "currentIndex": number,
  "userCat": string,
  "interactTime": number
}

interface mangaData {
  "mangaId": string,
  "mangaName": string,
  "urlList": string[],
  "chapterTextList": string[], 
  "updateTime": string
}

interface responseData {
  "userData": userData[]
  "mangaData": mangaData[]
}

export default function feed() {
  const [response, setResponse] = React.useState<responseData | null>(
    {
      "userData": [],
      "mangaData": []
    }
  );
  const [currentCard, setCurrentCard] = React.useState(0);
  const [currentImg, setCurrentImg] = React.useState(null);
  const [isLoadingStart, setIsLoadingStart] = React.useState(false);
  const [isLoadingUpdate, setIsLoadingUpdate] = React.useState(false);
  const [showError,setShowError] = React.useState(true)
  const auth = authStore.getState();

  async function updateCard() {
    try {
      setIsLoadingStart(true)
      const catSelector = document.getElementById("cat-select") as HTMLSelectElement|null
      var cat = "%"
      if (catSelector) cat = catSelector.options[catSelector.selectedIndex].value

      const orderSelector = document.getElementById("sort-order") as HTMLSelectElement|null
      var ord = "ASC"
      if (orderSelector) ord = orderSelector.options[orderSelector.selectedIndex].value

      const methodSelector = document.getElementById("sort-method") as HTMLSelectElement|null
      var meth = "interactTime"
      if (methodSelector) meth = methodSelector.options[methodSelector.selectedIndex].value

      console.log(cat)
      const resp = await fetch("/api/data/pull/getUnread", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "access_token": auth.access_token,
          "authId": null,
          "userCat": cat,
          "sortOrd": ord,
          "sortMeth": meth
        }),
      });
      console.log(resp)
      if (resp.status!=200) {
        const errorData:{message:string} = await resp.json()
        setIsLoadingStart(false)
        return setError(errorData.message) 
      }
      setCurrentCard(0)
      setIsLoadingStart(false)
      const data:responseData = await resp.json();
      console.log(data)
      setResponse(data)
      
      
      if (response!.userData.length < 1) setError("No Manga Found") 
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

    if (!response) return 
    setCurrentCard(currentCard+increment)

    console.log(await resp)
  }

  function emptySelector(selector:HTMLSelectElement) {
    while (selector.options.length > 0) {
      selector.remove(0);
    }
  }

  function addMangaUrlsModal() {
    const selector = document.getElementById("curr-select") as HTMLSelectElement|null
    if (!selector || !response) return undefined
    emptySelector(selector)
    const links = response.mangaData[currentCard].urlList
    const text = response.mangaData[currentCard].chapterTextList
    if (!links || !text) return undefined

    for (var i = links.length-1; i >= 0; i--) {
      const option = document.createElement('option')
      option.value = i.toString()
      option.text = text[i]
      if (links[i] == links[response.userData[currentCard].currentIndex]) option.selected = true
      selector.add(option)
    }
  }
  
  function openReadModal() {
    addMangaUrlsModal()
    const modal = document.getElementById("updateCurrentModal")
    if (modal) modal.style.display = "block"
    return undefined
  }

  function closeReadModal() {
    const modal = document.getElementById("updateCurrentModal")
    if (modal) modal.style.display = "none"
    return undefined
  }

  window.onclick = function(event) {
    const modal = document.getElementById("updateCurrentModal")
    if (event.target == modal) {
      if (modal) modal.style.display = "none";
    }
    return undefined
  } 



  async function submitManga(newIndex:number) {
    console.log(response?.mangaData[currentCard].urlList[newIndex])
    setIsLoadingUpdate(true)
    const newData:any = await fetch('/api/data/update/updateCurrentIndex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "access_token": auth.access_token,
        "authId": null,
        "newIndex": newIndex,
        "mangaId": response?.mangaData[currentCard].mangaId
      }),
    })

    if (!response || newData.status!=200) return
    // console.log(mangaDataDict)
    var tmp = {...response}
    tmp.userData[currentCard].interactTime = Date.now()
    tmp.userData[currentCard].currentIndex = newIndex
    setResponse(tmp)
    // setCurrentCard(0)
    setIsLoadingUpdate(false)
  }

  useEffect(() => {
    closeReadModal()
  }, [])


  if (!auth) {
    console.log("No Auth!!!!!!!!!!!!!!!!")
    return <></>
  }
  if (!response) return <></>
  console.log(response)
  if (response.userData.length <= 0) return (
    <div className="feedOptionContainer">
      <label htmlFor="cat-select">Choose a Category: </label>
      <select name="categories" id="cat-select">
        <option value="reading">Reading</option>
        <option value="notreading">Not Reading</option>
        <option value="hold">Hold</option>
        <option value="hiatus">Hiatus</option>
        <option value="finished">Finished</option>
        <option value="inqueue">In Queue</option>
        <option value="other">Other</option>
        <option value="unsorted">Uncategorized</option>
        <option value="%">Any</option>
      </select>
      <br></br>

      <label>Choose a sort Order: </label>
      <select name="sortOrd" id="sort-order">
        <option value="ASC">Ascending</option>
        <option value="DESC">descending</option>
      </select>
      <br></br>

      <label>Choose a sort Method: </label>
      <select name="sortMeth" id="sort-method">
      <option value="interactTime">Time</option>
        <option value="mangaName">Alphabetical</option>
      </select>
      
      <button className="addButton" type="submit" onClick={updateCard}>{isLoadingStart? 'Loading...':'Start Feed'}</button>
      {showError?<label className='addError' id='errorField'></label>:<></>}
    </div>
  )
  return (
    <div style={{padding: 32}}>
      <label className='feedMangaTitle'>{response.userData[currentCard].mangaName}</label>
      <div className='mangaContainer'>
        {response ? <img src={`/image/${response!.userData[currentCard].mangaId}`} alt="Manga Icon" className='cover-image' /> : <p>Loading...</p>}
        <div className="button-container">
          <div className="button-wrapper">
            <button className="action-button" 
              onClick={(e) => {
              // e.preventDefault();
              const links = response.mangaData[currentCard].urlList
              console.log(links[response.userData[currentCard].currentIndex])
              discordSdk.commands.openExternalLink({url: links[response.userData[currentCard].currentIndex+1]});
            }}
            >Read Next</button>
            <span className="chapter-number">{ 
            ( response.userData[currentCard].currentIndex+1 < response.mangaData[currentCard].chapterTextList.length ) ? response.mangaData[currentCard].chapterTextList[response.userData[currentCard].currentIndex+1] : response.mangaData[currentCard].chapterTextList[response.mangaData[currentCard].chapterTextList.length-1]
            }</span>
          </div>
          <div className="button-wrapper">
            <button className="action-button" 
              onClick={(e) => {
              // e.preventDefault();
              const links = response.mangaData[currentCard].urlList
              discordSdk.commands.openExternalLink({url: links[links.length-1]!});
            }}>Read Latest</button>
            <span className="chapter-number">{response.mangaData[currentCard].chapterTextList[response.mangaData[currentCard].chapterTextList.length-1]}</span>
          </div>
          <div className="button-wrapper">
            <button className="action-button" 
              onClick={(e) => {
              // e.preventDefault();
              discordSdk.commands.openExternalLink({url: response.mangaData[currentCard].urlList[response.userData[currentCard].currentIndex]});
            }}>Read Current</button>
            <span className="chapter-number">{response.mangaData[currentCard].chapterTextList[response.userData[currentCard].currentIndex]}</span>
          </div>
        </div>
      </div>

      <div id="updateCurrentModal" className="modal"> 
        <div className="modal-content"> 
          <span className='close' onClick={(e) => {closeReadModal()}}>&times;</span>
          <p className='modal-title'>Select your Current Chapter</p>
          <select name="setCurrentSelect" id="curr-select"></select>
          <button disabled={isLoadingUpdate} type="submit" className='currentButtonSubmit' onClick={async (e) => {
            const submitURL = document.getElementById("curr-select") as HTMLSelectElement|null
            if (submitURL) await submitManga(parseInt(submitURL.value))
            closeReadModal()
          }}>{isLoadingUpdate? "Loading please wait!": "Submit!"}</button>
          {/* {isLoading && <p>Loading...</p>} */}
        </div>
      </div>

      <div className='controlButtonContainer'>
        <button className='prev mangaFeedControlButton' onClick={(e) => {
          if (currentCard > 0) updateCardIndex(-1)
            console.log(currentCard)
          }}>Prev
        </button>
        <button className='setCurrent mangaFeedControlButton' onClick={(e) => {
            openReadModal()
            console.log('CLICK')
          }}>Mark As Read
        </button>
        <button className='next mangaFeedControlButton' onClick={(e) => {
          if (currentCard < response.mangaData.length - 1) updateCardIndex(1)
          console.log(currentCard)
          }}>Next
        </button>
      </div>
      
      <br></br>
      <button className='feedChangeOptionButton' onClick={(e) => {
        setResponse(
          {
            "userData": [],
            "mangaData": []
          }
        )
      }}>Change Options</button>
      {/* {auth ? <ReactJsonView src={auth} /> : null} */}
      {/* {response ? <ReactJsonView src={response} collapsed={true} /> : null} */}
    </div>
  );
}
