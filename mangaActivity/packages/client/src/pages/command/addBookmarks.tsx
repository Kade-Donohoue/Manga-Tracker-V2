import {authStore} from '../../stores/authStore';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React, { useEffect } from "react"
import Select, { StylesConfig } from 'react-select'
import './addBookmarks.css'
import { catOptions } from '../../vars';

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
  const [files, setFiles] = React.useState<any>(undefined)
  const [folders, setFolders] = React.useState<dropdownOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedFolder, setSelectedFolder] = React.useState<dropdownOption|null>(null)
  const [selectedCat, setSelectedCat] = React.useState<dropdownOption | null>(catOptions[0])
  const [showError, setShowError] = React.useState<boolean>(true)

  const auth = authStore.getState();
  // console.log(auth)
  if (!auth) {
    console.log("No Auth!!!!!!!!!!!!!!!!")
    return <></>;
  }

  async function submitManga() {
    let notif = toast.loading("Adding Manga!", {closeOnClick: true, draggable: true,})
    try {
      setIsLoading(true)
      setShowError(false)
      console.log(selectedFolder!.value)

      if (typeof selectedFolder!.value === 'string') return console.log('Wrong Type')
      var currentUrls:string[] = []
      pullUrlsFromFolder(selectedFolder!.value, currentUrls)
      console.log(currentUrls)
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


      var errorLog = []
      for (var i = 0; i < currentUrls.length; i++) {
        const reply = await fetch('/api/data/add/addManga', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            "access_token": auth.access_token,
            "authId": null,
            "userCat": selectedCat?.value,
            "url": currentUrls[i]
          }),
        })

        if (reply.status!=200) {
          // console.log(await reply.json())
          const data:{message:string, url:string} = await reply.json()
          errorLog.push(`${data.url}: ${data.message}`)
        }
      }


      setFolders([])
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
      folders.push({value:node, label:path})
    }
    if (node.children) {
      for (const child of node.children) {
        await pullFolders(child, folders, path)
      }
    }
  }

  async function pullUrlsFromFolder(node:BookmarkNode, urls:string[]) {
    for (const child of node.children!) {
      console.log(child.name)
      if (child.type=='url' || child.type=='text/x-moz-place') urls.push(child.url||child.uri!)
    }
    
  }

  useEffect(() => {
    
  }, [])

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
        {showError?<label className='addError' id='errorField'></label>:<></>}
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
      
        <button className="addButton" type="submit" onClick={submitManga}>{isLoading? 'Loading...':'Add Manga!'}</button>
    </div>
  );
}
