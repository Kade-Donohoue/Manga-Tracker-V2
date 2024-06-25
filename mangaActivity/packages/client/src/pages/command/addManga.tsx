import discordSdk from '../../discordSdk';
import {authStore} from '../../stores/authStore';
import ReactJsonView from '../../components/ReactJsonView';
import React, { useEffect } from "react"
import './addManga.css'

interface cardData {
  "name": string,
  "chapter": string,
  "url": string
}

// Note: we're still using the anchor tag, to ensure standard accessibility UX
export default function addManga() {
  const [showSuccess,setShowSuccess] = React.useState(false)
  const [showError,setShowError] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)

  const auth = authStore.getState();
  console.log(auth)
  if (!auth) {
    console.log("No Auth!!!!!!!!!!!!!!!!")
    return <></>;
  }

  async function submitManga() {
    try {
      setIsLoading(true)
      setShowError(false)
      const catSelector = document.getElementById("cat-select") as HTMLSelectElement|null
      var cat:string|null = null
      if (catSelector) cat = catSelector.options[catSelector.selectedIndex].value

      const urlBox = document.getElementById("chapURL") as HTMLTextAreaElement|null
      var url:string|null = null
      if (urlBox) url = urlBox.value

      if (!url) return
      const urlList:string[] = url.split(',')

      console.log(cat)


      var errorLog = []
      for (var i = 0; i < urlList.length; i++) {
        const reply = await fetch('/api/data/add/addManga', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            "access_token": auth.access_token,
            "authId": null,
            "userCat": cat,
            "url": urlList[i]
          }),
        })

        if (reply.status!=200) {
          const data:{message:string, url:string} = await reply.json()
          errorLog.push(`${data.url}: ${data.message}`)
        }
      }


      urlBox!.value = ""
      if (errorLog.length == 0) {
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
        }, 5000)
      } else {
        setShowError(true)

        const errorField = document.getElementById('errorField') as HTMLLabelElement|null
        errorField!.innerHTML = errorLog.join("<br></br>")
      }
      setIsLoading(false)
    } catch (error) {
      setShowError(true)
      setIsLoading(false)
      console.error('Error fetching card', error)
    }
  }  

  useEffect(() => {
    setShowSuccess(false)
  }, [])


  // console.log(response)
  // if (!response) setResponse(
  //   {
  //   "name": "string",
  //   "chapter": "string",
  //   "url": "string"
  //   })
  // if (!response) return <></>
  return (
    <div className="addContainer">
      <label htmlFor="chapURL">Enter Chapter URL(s):</label>
      <input type="text" id="chapURL" name="chapURL" placeholder='https://mangaURL1.com/manga/chapter,https://mangaURL2.com/manga/chapter'></input> <br></br>

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
      </select>
      <br></br>
      <button className="addButton" type="submit" onClick={submitManga}>{isLoading? 'Loading...':'Add Manga!'}</button>
      {showSuccess?<label className='addConfirmation'>Manga Added!</label>:<></>}
      {showError?<label className='addError' id='errorField'></label>:<></>}
      <br></br>
      {/* {auth ? <ReactJsonView src={auth} /> : null} */}
      {/*response ? <ReactJsonView src={response} /> : null*/}
    </div>
  );
}
