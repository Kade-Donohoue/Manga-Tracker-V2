import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Select, { StylesConfig } from 'react-select'
import React, { useEffect } from "react"
import './addManga.css'
import { fetchPath } from '../../vars'
import { dropdownOption } from '../../types'
import {customStyles} from '../../styled/index'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function addManga() {

  const { data: catOptions, isError } = useQuery<dropdownOption[], Error>({
    queryKey: ['userCategories'],
  })

  const [showError,setShowError] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedCat, setSelectedCat] = React.useState<dropdownOption | null>(catOptions?.[0]||null)

  const queryClient = useQueryClient();

  async function submitManga() {
    if (isLoading) return toast.error('Already adding!')
    let notif = toast.loading("Adding Manga!", {closeOnClick: true, draggable: true,})
    try {
      setIsLoading(true)
      setShowError(false)

      const urlBox = document.getElementById("chapURL") as HTMLTextAreaElement|null
      var urls:string|null = null
      if (urlBox) urls = urlBox.value.replace(" ", "")

      if (!urls) {
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
      const urlList:string[] = urls.split(',')


      var errorLog:string[] = []
      const reply = await fetch(`${fetchPath}/api/data/add/addManga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "userCat": selectedCat?.value,
          "urls": urlList
        }),
      })

      if (!reply.ok) {
        toast.update(notif, {
          render: "An Internal Server Error Ocurred!", 
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
      let {results}:{results:{message:String,url:string,success:boolean}[]} = await reply.json()

      for (let manga of results) {
        if (!manga.success) errorLog.push(`${manga.url}: ${manga.message}`)
      }


      queryClient.invalidateQueries({ queryKey: ['userManga'] });
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
        render: "An Unknown Error has Occurred", 
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
