import {authStore} from '../../stores/authStore';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React, { useEffect } from "react"
import Select, { StylesConfig } from 'react-select'
import './removeManga.css'

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
    "value":string, 
    "label": string
  }

export default function removeManga() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [dropOptions, setDropOptions] = React.useState<dropdownOption[]>()
  const [selectedOption, setSelectedOption] = React.useState<{value: string; label: string;} | null>(null)

  const auth = authStore.getState();
  // console.log(auth)
  if (!auth) {
    console.log("No Auth!!!!!!!!!!!!!!!!")
    return <></>;
  }

  async function submitManga() {
    const notif = toast.loading("Removing Manga!")
    try {
      // console.log(selectedOption)
     if (!selectedOption) {
      toast.update(notif, {
        render: "No Manga Selected!", 
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

        const reply = await fetch('/api/data/remove/deleteUserManga', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            "access_token": auth.access_token,
            "authId": null,
            "mangaId": selectedOption.value
            }),
        })

        if (reply.status==200) {
            toast.update(notif, {
              render: "Manga Successfully Removed!", 
              type: "success", 
              isLoading: false, 
              autoClose: 5000, 
              hideProgressBar: false, 
              closeOnClick: true, 
              draggable: true,
              progress: 0
            })
            retrieveMangaList()
            setSelectedOption(null)
        } else {
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
      setIsLoading(false)
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

    if (resp.status!=200) return toast.error((await resp.json()).message||"Unable to Fetch Manga! Reload the Page or Contact an Admin!")
    const data:{"userData": [{"mangaName":string, "mangaId":string}]} = await resp.json()
    var options:dropdownOption[] = []
    for (var i = data.userData.length-1; i >= 0; i--) {
      options.push({value: data.userData[i].mangaId, label: data.userData[i].mangaName})
    }
    setDropOptions(options)
  }

  useEffect(() => {
    retrieveMangaList()
  }, [])

//   if (!mangaList) return <></>
  return (
    <div className="removeContainer">

      <label htmlFor="manga-select">Choose a Manga: </label>
      <Select name="categories" 
        id="manga-select" 
        className="removeSelect" 
        value={selectedOption} 
        onChange={setSelectedOption} 
        options={dropOptions} 
        styles={customStyles} 
        isClearable={true} 
        isLoading={(dropOptions) ? false:true} 
        />
      <button className="removeButton" type="submit" onClick={submitManga}>{isLoading? 'Loading...':'Remove Manga!'}</button>
    </div>
  );
}
