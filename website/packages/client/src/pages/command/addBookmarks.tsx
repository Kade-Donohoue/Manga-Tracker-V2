import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React, { useEffect } from "react"
import Select, { StylesConfig } from 'react-select'
import './addBookmarks.css'
import { fetchPath } from '../../vars';

import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserCategories } from '../../utils';

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
  
interface dropdownOption {
    "value":BookmarkNode|string, 
    "label": string
}

interface BookmarkNode {
  type: string
  title?: string
  name?: string
  url?: string
  uri?: string
  children?: BookmarkNode[]
  version?: number
}


export default function addBookmarks() {
  const { data: catOptions, isError } = useQuery<dropdownOption[], Error>({
      queryKey: ['userCategories'],
      queryFn: () => fetchUserCategories(),
      staleTime: 1000 * 60 * 60, 
      gcTime: Infinity,
    })

  const [files, setFiles] = React.useState<any>(undefined)
  const [folders, setFolders] = React.useState<dropdownOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedFolder, setSelectedFolder] = React.useState<dropdownOption|null>(null)
  const [selectedCat, setSelectedCat] = React.useState<dropdownOption | null>(catOptions?.[0]||null)
  const [showError, setShowError] = React.useState<boolean>(true)
  const [errorList, setErrorList] = React.useState<string[]>([])
  const [userChoice, setUserChoice] = React.useState<boolean>(false)
  const [addedMangaCount, setAddedMangaCount] = React.useState<number>(0)

  const queryClient = useQueryClient();

  /**
   * sends urls in selected folder to server 1 by 1 with provided category
   * @returns toast error or nothing
   */
  async function submitManga() {
    if (isLoading) return toast.error('Already adding!')
    let notif = toast.loading("Adding Manga!", {closeOnClick: true, draggable: true,})
    try {
      setIsLoading(true)
      setShowError(false)
      setErrorList([])
      // console.log(selectedFolder!.value)

      if (typeof selectedFolder!.value === 'string') return console.log('Wrong Type')
      var currentUrls:string[] = []
      pullUrlsFromFolder(selectedFolder!.value, currentUrls)
      // console.log(currentUrls)
      // return
      if (currentUrls.length < 1) {
         toast.update(notif, {
        render: "No Manga In Folder!", 
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


      var errorLog:string[] = []
      let addedCount = 0
      // for (var i = 0; i < currentUrls.length; i++) {
      const reply = await fetch(`${fetchPath}/api/data/add/addManga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "userCat": selectedCat?.value,
          "urls": currentUrls
        }),
      })

      if (!reply.ok) {
        toast.update(notif, {
          render: "An internal Server Error Ocurred!", 
          type: "error", 
          isLoading: false,
          autoClose: 5000, 
          hideProgressBar: false, 
          closeOnClick: true, 
          draggable: true,
          progress: 0
        })
        return
      }
      // }
      let {results}:{results:{message:String,url:string,success:boolean}[]} = await reply.json()

      for (let manga of results) {
        if (!manga.success) errorLog.push(`${manga.url}: ${manga.message}`)
        else addedCount++
      }

      setAddedMangaCount(addedCount)
      setUserChoice(true)
      // setFolders([])
      queryClient.invalidateQueries({ queryKey: ['userManga'] });
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

        // const errorField = document.getElementById('errorField') as HTMLLabelElement|null
        setErrorList(errorLog)
        // errorField!.innerHTML = errorLog.join("<br></br>")
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

  async function parseJson(file:any) {
    try {
      setSelectedFolder(null)
        // console.log(file.target.files[0])
        const loadedJson = await JSON.parse(await file.target.files[0].text())
        console.log(loadedJson)

        const folderNodes:dropdownOption[] = [] 
        await pullFolders(loadedJson, folderNodes)

        console.log(folderNodes)
        setFolders(folderNodes)
    } catch (err) {
        console.log(err)
        setFiles(undefined)
    }
  }

  /**
   * adds found folders with manga urls to provided folders array
   * @param node any bookmark node
   * @param folders array to add found folders to
   * @param path current path to folder
   */
  async function pullFolders(node:BookmarkNode, folders:dropdownOption[], path:string = "") {
    // console.log(node)
    if (!node.type) {
      for (const [key, value] of Object.entries(node)) {
        // console.log(key, value instanceof Object)
        if (value instanceof Object) await pullFolders(value, folders, path)
      }
    }
    else if ((node.type == 'folder' || node.type == 'text/x-moz-place-container') && node.children?.length! > 0) {
      if ((node.name || node.title)) path+=`/${(node.name || node.title)}`
      // console.log(path+=`/${(node.name || node.title)}`)
      if (checkForMangaUrl(node)) folders.push({value:node, label:path})
    }
    if (node.children) {
      for (const child of node.children) {
        await pullFolders(child, folders, path)
      }
    }
  }

  /**
   * checks if folder contains a manga url(reaper, manganato, mangadex, asura)
   * @param node bookmark folder
   * @returns true if manga url found otherwise false
   */
  function checkForMangaUrl(node:BookmarkNode) {
    for (const child of node.children!) {
      if (child.type=='url' || child.type=='text/x-moz-place') {
        let currentUrl = (child.url||child.uri!).toLowerCase()
        if (currentUrl.includes('manga')) return true
        if (currentUrl.includes('reaper')) return true
        if (currentUrl.includes('asura')) return true
        // console.log(currentUrl)
      }
    }
    return false
  }

  /**
   * ads found mangaUrls to provided folder
   * @param node bookmark folder
   * @param urls array to add found urls to
   */
  async function pullUrlsFromFolder(node:BookmarkNode, urls:string[]) {
    for (const child of node.children!) {
      // console.log(child.name)
      if (child.type=='url' || child.type=='text/x-moz-place') {
        let currentUrl = (child.url||child.uri!).toLowerCase()
        if (currentUrl.includes('manga') || currentUrl.includes('reaper') || currentUrl.includes('asura')) urls.push(currentUrl)
      }
    }
    
  }

  /**
   * Counts the number of urls in folder
   * @param node Bookmark Folder
   * @returns Number of urls in folder
   */
  function getUrlCount(node:BookmarkNode) {
    let count = 0
    for (const child of node.children!) {
      if (child.type=='url' || child.type=='text/x-moz-place') count++
    }
    return count
  }

  if (userChoice && folders.length > 0) return (
    <div style={{display:"flex", justifyContent:"center", flexDirection:'column', height:"100vh"}}>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <h2>{(typeof (selectedFolder?.value) === 'string' || typeof (selectedFolder?.value.children) === 'undefined' )?'':`Successfully added ${addedMangaCount} / ${getUrlCount(selectedFolder.value)} manga Added`}</h2>
      
        <br/>
        <label className='addError' id='errorField' style={{display:(showError?'block':'none')}}>{errorList.map(error => <div>{error}</div>)}</label>
      </div>
      <ButtonGroup variant='contained' sx={{padding: "10px 0", alignSelf:"center", width: "95%"}}>
          <Button sx={{width:"50%"}} onClick={(e) => {setUserChoice(false); setSelectedFolder(null); setSelectedCat(catOptions?.[0]||null)}}>Add More Manga</Button>
          <Button sx={{width:"50%"}} onClick={(e) => setFolders([])}>Change File</Button>
      </ButtonGroup>
    </div>
  )
  if (folders.length < 1) return (
    <div className='addBookmarksContainer'>
        <label htmlFor="manga-select">Upload Bookmarks: </label> <br/>
        <input type='file' onChange={parseJson} ></input><br/>

        <br/>
        <div className='instructionContainer'>
          <p className='title'>Instructions:</p>
          <br/>
          <ul>
            <li>Click Choose File. </li>
            <li>Find your bookmarks json file.  Windows Paths:
              <ul>
                <li>Chrome: <b>%localappdata%\Google\Chrome\User Data\Default\Bookmarks</b></li>
                <li>Firefox: Backup Bookmarks in manager</li>
                <li>Opera GX: <b>%appdata%\Opera Software\Opera GX Stable\Bookmarks</b></li>
              </ul>
            </li>
            <li>Select Folder you want imported.</li>
            <li>Select Category you want manga added to.</li>
            <li>Click Submit!</li>
          </ul>
        </div>
        
    </div>
  )
  return (
    <div className="addBookmarksContainer">

        <label htmlFor="folderSelect">Select a Folder:</label>
        <Select name="folderSelect" 
            id="folder-select" 
            className="folderSelect" 
            value={selectedFolder} 
            onChange={setSelectedFolder} 
            options={folders} 
            styles={customStyles} 
        />

        <label htmlFor="cat-select">Choose a Category: </label>
        <Select name="categories"   
            id="cat-select" 
            className="catSelect" 
            value={selectedCat} 
            onChange={setSelectedCat} 
            options={catOptions} 
            styles={customStyles} 
        />
      
        <button className="addButton" type="submit" onClick={submitManga} >{isLoading? 'Loading...':'Add Manga!'}</button>
    </div>
  );
}
