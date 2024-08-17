import discordSdk from '../../discordSdk'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {authStore} from '../../stores/authStore'
import Select, { StylesConfig } from 'react-select'
import React, { useEffect } from "react"
import './addManga.css'
import { catOptions } from '../../vars'
import { dropdownOption } from '../../types'

const customStyles: StylesConfig<dropdownOption, false> = {
  control: (provided, state) => ({
    ...provided,
    width: '100%',
    backgroundColor: '#121212',
    margin: "8px 0",
  }),
  input: (provided) => ({
    ...provided,
    color: '#fff',
    margin: '0', // Remove default margin to match regular select
    padding: '2px', // Adjust padding to prevent overflow
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#fff',
    margin: '0', // Remove default margin to prevent overflow
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '0',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#121212',
    borderRadius: '4px',
    marginTop: '0',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#6b6b6b' : '#121212',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#6b6b6b',
    },
    padding: '12px 20px', // Match padding of regular select options
  }),
}

// Note: we're still using the anchor tag, to ensure standard accessibility UX
export default function addManga() {
  const [showError,setShowError] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedCat, setSelectedCat] = React.useState<dropdownOption | null>(catOptions[0])

  const auth = authStore.getState();
  // console.log(auth)
  if (!auth) {
    console.log("No Auth!")
    return <></>;
  }

  async function submitManga() {
    if (isLoading) return toast.error('Already adding!')
    let notif = toast.loading("Adding Manga!", {closeOnClick: true, draggable: true,})
    try {
      setIsLoading(true)
      setShowError(false)

      const urlBox = document.getElementById("chapURL") as HTMLTextAreaElement|null
      var url:string|null = null
      if (urlBox) url = urlBox.value.replace(" ", "")

      if (!url) {
         toast.update(notif, {
        render: "No Manga Provided!", 
        type: "error", 
        isLoading: false,
        autoClose: 5000, 
        hideProgressBar: false, 
        closeOnClick: true, 
        draggable: true,
        progress: 0
       })
       setIsLoading(false)
       return
      }
      const urlList:string[] = url.split(',')


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
            "userCat": selectedCat?.value,
            "url": urlList[i]
          }),
        })

        if (reply.status!=200) {
          // console.log(await reply.json())
          const data:{message:string, url:string} = await reply.json()
          errorLog.push(`${data.url}: ${data.message}`)
        }
      }


      urlBox!.value = ""
      if (errorLog.length == 0) {
        toast.update(notif, {
          render: "Manga Successfully Added!", 
          type: "success", 
          isLoading: false, 
          autoClose: 5000, 
          hideProgressBar: false, 
          closeOnClick: true, 
          draggable: true,
          progress: 0
        })
      } else {
        setShowError(true)
        toast.update(notif, {
          render: "Unable to Add 1 or More Manga!", 
          type: "error", 
          isLoading: false,
          autoClose: 5000, 
          hideProgressBar: false, 
          closeOnClick: true, 
          draggable: true,
          progress: 0
        })

        const errorField = document.getElementById('errorField') as HTMLLabelElement|null
        errorField!.innerHTML = errorLog.join("<br></br>")
      }
      setIsLoading(false)
    } catch (error) {
      toast.update(notif, {
        render: "An Unknown Error has Occured", 
        type: "error", 
        isLoading: false,
        autoClose: 5000, 
        hideProgressBar: false, 
        closeOnClick: true, 
        draggable: true,
        progress: 0
      })
      // setShowError(true)
      setIsLoading(false)
      console.error('Error Adding manga: ', error)
    }
  }  

  useEffect(() => {
  }, [])


  return (
    <div className="addContainer">
      <label htmlFor="chapURL">Enter Chapter URL(s):</label>
      <input type="text" id="chapURL" name="chapURL" placeholder='https://mangaURL1.com/manga/chapter,https://mangaURL2.com/manga/chapter'></input> <br></br>

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
      <button className="addButton" type="submit" onClick={submitManga}>{isLoading? 'Loading...':'Add Manga!'}</button>
      <label style={{display:(showError?'block':'none')}} className='addError' id='errorField'></label>
    </div>
  );
}
