import discordSdk from '../../discordSdk';
import {authStore} from '../../stores/authStore';
import ReactJsonView from '../../components/ReactJsonView';
import React, { useEffect } from "react"
import './removeManga.css'

export default function removeManga() {
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
      const mangaSelector = document.getElementById("manga-select") as HTMLSelectElement|null
      var id:string|null = null
      if (mangaSelector) id = mangaSelector.options[mangaSelector.selectedIndex].value

      console.log(id)

        const reply = await fetch('/api/data/remove/deleteUserManga', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            "access_token": auth.access_token,
            "authId": null,
            "mangaId": id
            }),
        })

        
        if (reply.status==200) {
            setShowSuccess(true)
            mangaSelector?.options[mangaSelector.selectedIndex].remove()
            setTimeout(() => {
            setShowSuccess(false)
            }, 5000)
        } else {
            const data:{message:string, url:string} = await reply.json()
            const errorField = document.getElementById('errorField') as HTMLLabelElement|null
            errorField!.innerHTML = `${data.message}`
        }

        setIsLoading(false)
    } catch (error) {
      setShowError(true)
      setIsLoading(false)
      console.error('Error fetching card', error)
    }
  } 
  
  async function retrieveMangaList() {
    const resp = await fetch('/api/data/pull/getUserManga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "access_token": auth.access_token,
          "authId": null,
          "userCat": "%"
        }),
      })

      const data:{"userData": [{"mangaName":string, "mangaId":string}]} = await resp.json()
    
    const selector = document.getElementById("manga-select") as HTMLSelectElement|null
    if (!selector || resp.status!=200) return undefined
    // emptySelector(selector)

    for (var i = data.userData.length-1; i >= 0; i--) {
        const option = document.createElement('option')
        option.value = data.userData[i].mangaId
        option.text = data.userData[i].mangaName
        selector.add(option)
    }
  }

  useEffect(() => {
    retrieveMangaList()
    setShowSuccess(false)
  }, [])

//   if (!mangaList) return <></>
  return (
    <div className="removeContainer">

      <label htmlFor="manga-select">Choose a Manga: </label>
      <select name="categories" id="manga-select">

      </select>
      <br></br>
      <button className="removeButton" type="submit" onClick={submitManga}>{isLoading? 'Loading...':'Remove Manga!'}</button>
      {showSuccess?<label className='removeConfirmation'>Manga Removed!</label>:<></>}
      {showError?<label className='removeError' id='errorField'></label>:<></>}
      <br></br>
    </div>
  );
}
