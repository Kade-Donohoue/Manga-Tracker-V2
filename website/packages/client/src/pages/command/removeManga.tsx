import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import React, { useEffect } from "react"
import Select, { StylesConfig } from 'react-select'
import './removeManga.css'
import { mangaDetails, mangaInfo } from '../../types'
import { fetchPath } from '../../vars'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
  const [isLoadingRemove, setIsLoadingRemove] = React.useState(false)
  const { data: mangaListOptions, isLoading: isMangaListLoading, error: mangaListError } = useQuery({
    queryKey: ['userManga', 'removeManga'],
    queryFn: fetchUserManga,
  })
  const [selectedOption, setSelectedOption] = React.useState<{value: string; label: string;} | null>(null)

  const queryClient = useQueryClient();

  async function removeManga() {
    setIsLoadingRemove(true)
    if (isLoadingRemove) return toast.error('Already Removing!')
    let notif = toast.loading("Removing Manga!")
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
      setIsLoadingRemove(false)
      return
    }

        const reply = await fetch(`${fetchPath}/api/data/remove/deleteUserManga`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            "mangaId": selectedOption.value
            }),
        })

        if (reply.status==200) {
            queryClient.invalidateQueries({ queryKey: ['userManga'] });
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

        setIsLoadingRemove(false)
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
      setIsLoadingRemove(false)
    }
  } 
  
  async function fetchUserManga(): Promise<dropdownOption[]> {
    const resp = await fetch(`${fetchPath}/api/data/pull/getUserManga`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userCat: "%" }),
    })
  
    if (!resp.ok) {
      const errData: { message: string; url: string } = await resp.json()
      toast.error(errData.message || "Unable to Fetch Manga! Reload the Page or Contact an Admin!")
      throw new Error(errData.message || 'Failed to fetch')
    }
  
    const data: { mangaDetails: mangaDetails[] } = await resp.json()
  
    return data.mangaDetails
      .slice()
      .reverse()
      .map((m) => ({
        value: m.mangaId,
        label: m.mangaName,
      }))
  }
  

//   if (!mangaList) return <></>
  return (
    <div className="removeContainer">

      <label htmlFor="manga-select">Choose a Manga: </label>
      <Select name="categories" 
        id="manga-select" 
        className="removeSelect" 
        value={selectedOption} 
        onChange={setSelectedOption} 
        options={mangaListOptions} 
        styles={customStyles} 
        isClearable={true} 
        isLoading={(mangaListOptions) ? false:true} 
        />
      <button className="removeButton" type="submit" onClick={removeManga}>{isLoadingRemove? 'Loading...':'Remove Manga!'}</button>
    </div>
  );
}
