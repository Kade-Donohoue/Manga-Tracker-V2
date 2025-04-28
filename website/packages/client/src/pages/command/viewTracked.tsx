import {dropdownOption, mangaDetails, } from '../../types'
import {customStyles} from '../../styled/index'
import React, { ChangeEvent, useEffect } from "react"
import { toast } from 'react-toastify'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import Modal from '@mui/material/Modal'
import Button from '@mui/material/Button'
import CancelIcon from '@mui/icons-material/Cancel'
import SvgIcon from '@mui/material/SvgIcon'
import Select from 'react-select'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { CardActionArea, Checkbox, FormControlLabel, Menu, MenuItem, Skeleton, TextField } from '@mui/material'
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import { catOptions, fetchPath } from '../../vars'

import './viewTracker.css'
import {modalStyle} from '../../AppStyles'
import SeriesModal from '../../components/SeriesModal'

const sortOptions:{label:string,value:keyof mangaDetails | "search"}[] = [
    {label: "Title Search", value: "search"},
    {label: "Title", value: "mangaName"},
    {label: "Updated", value: "updateTime"},
    {label: "Interacted", value: "interactTime"},
    {label: "Read Chapters", value: "currentIndex"},
]

export default function tracked() {
    const [mangaInfo, setMangaInfo] = React.useState<mangaDetails[] | null>(null);
    const [modalIndex, SetModalIndex] = React.useState<number>(-1)
    const [newCat, setNewCat] = React.useState<dropdownOption | null>(catOptions[0])
    const [newChapter, setChapter] = React.useState<dropdownOption | null>(null)

    const [filterOption, setFilterOption] = React.useState<dropdownOption | null>(catOptions[8])
    const [methodOption, setMethodOption] = React.useState<{label:string,value:string} | null>(sortOptions[0])
    const [orderOption, setOrderOption] = React.useState<{value:string, label:string} | null>({value:"1", label:"Ascending"})
    const [currentSearch, setSearch] = React.useState<string>("")
    const [unreadChecked, setUnreadChecked] = React.useState<boolean>(false)

    //right click menu
    const [anchorPosition, setAnchorPosition] = React.useState<{ top: number; left: number } | null>(null);

    const handleContextMenu = async (event:React.MouseEvent, mangaId:string) => {
        if (anchorPosition) {
            setAnchorPosition(null)
            return
        }

        event.preventDefault()
        console.log(mangaInfo)
        console.log(mangaId)
        let index = mangaInfo?.findIndex(manga => manga.mangaId === mangaId)
        console.log(index)

        if (index !== 0 && (!index || index === -1)) return

        SetModalIndex(index)
        setAnchorPosition({ top: event.clientY, left: event.clientX })
    }

    const handleContextClose = () => {
        setAnchorPosition(null)
    }

    async function getUserManga() {
        
        const response = await fetch(`${fetchPath}/api/data/pull/getUserManga`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }) as any

        if (!response.ok) {
            let errorData = await response.json()
            toast.error(errorData.message)
            return 
        }
        const results:{mangaDetails:mangaDetails[]} = await response.json()
        if (results.mangaDetails.length <= 0) toast.info("No Manga!")
        setMangaInfo(results.mangaDetails)

        // mangaInfo[modalIndex].urlBase
    }

    async function openMangaOverview(mangaId:string) {
        console.log('opening Series Modal!')
        if (!mangaInfo) return
        let mangaIndex = mangaInfo.findIndex(manga => manga.mangaId === mangaId)
        SetModalIndex(mangaIndex)
        handleOpen()
    }

    /**
     * Request to remove manga from current user
     * @param mangaId Id for manga
     * @returns 
     */
    async function removeManga(mangaId:string) {
        let notif = toast.loading("Removing Manga!")
        try {
        // console.log(selectedOption)
        if (!mangaId) {
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
            return
        }

            const reply = await fetch(`${fetchPath}/api/data/remove/deleteUserManga`, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                "mangaId": mangaId
                }),
            })

            if (reply.ok) {
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

                let newList:mangaDetails[] = [...mangaInfo||[]] as mangaDetails[]

                newList.splice(modalIndex, 1)
                newList.splice(modalIndex, 1)

                SetModalIndex(-1) // close modal
                close()

                setMangaInfo(newList)
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
        }
    }

    async function changeUserCat(mangaId:string) {
        let notif = toast.loading("Changing Category!")

        if (!newCat) return toast.update(notif, {
            render: "No Category Selected!", 
            type: "error", 
            isLoading: false,
            autoClose: 5000, 
            hideProgressBar: false, 
            closeOnClick: true, 
            draggable: true,
            progress: 0
          })

        const reply = await fetch(`${fetchPath}/api/data/update/changeMangaCat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "mangaId": mangaId,
                "newCat": newCat.value
            }),
        })

        if (reply.ok) {
            const tempInfo:mangaDetails[] = [...mangaInfo||[]] as mangaDetails[]
            tempInfo[modalIndex].userCat = newCat.value
            setMangaInfo(tempInfo)

            toast.update(notif, {
                render: "Category Successfully Changed!", 
                type: "success", 
                isLoading: false, 
                autoClose: 5000, 
                hideProgressBar: false, 
                closeOnClick: true, 
                draggable: true,
                progress: 0
            })

            return
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

    async function changeCurrChapter(mangaId:string) {
        let notif = toast.loading("Changing Chapter!")

        if (!newChapter) return toast.update(notif, {
            render: "No Chapter Selected!", 
            type: "error", 
            isLoading: false,
            autoClose: 5000, 
            hideProgressBar: false, 
            closeOnClick: true, 
            draggable: true,
            progress: 0
          })

        if (!mangaInfo) return
        const newIndex = mangaInfo[modalIndex].chapterTextList.indexOf(newChapter.label)
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

        const reply = await fetch(`${fetchPath}/api/data/update/updateCurrentIndex`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "mangaId": mangaId,
                "newIndex": newIndex
            }),
        })

        if (reply.ok) {
            const tempInfo:mangaDetails[] = [...mangaInfo] as mangaDetails[]
            tempInfo[modalIndex].currentIndex = newIndex
            setMangaInfo(tempInfo)

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

    function findCat(catVal:string):dropdownOption {
        return catOptions.find((cat) => cat.value === catVal)||{value:"unknown",label:"Unknown"}
    }

    function confirmRemovalDialog() {
        if (!mangaInfo) return
        return (
            <Dialog
                open={removeOpen}
                onClose={handleRemoveClose}
                aria-labelledby="remove-dialog-title"
                aria-describedby="remove-dialog-description"
            >
                <DialogTitle id="remove-dialog-title" sx={{bgcolor: "#1f1f1f", color: "#ffffff"}}>
                    Remove Manga?
                </DialogTitle>
                <DialogContent sx={{bgcolor: "#1f1f1f"}}>
                    <DialogContentText id="remove-dialog-description" sx={{color: "lightgrey"}}>
                        Are you sure you no longer want to track this manga? Your data related to this manga will be PERMANENTLY removed!
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{bgcolor: "#1f1f1f"}}>
                    <Button onClick={handleRemoveClose} autoFocus>Cancel</Button>
                    <Button onClick={(e) => {
                        removeManga(mangaInfo[modalIndex].mangaId)
                        handleRemoveClose()
                        handleClose()
                        }} sx={{color:"#ffffff"}} variant='contained' color="error">
                        Remove!
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

    function changeCatModal() {
        if (!mangaInfo) return
        return (
            <Modal
                open={catOpen}
                onClose={handleCatClose}
                aria-labelledby="cat-modal-title"
                aria-describedby="cat-modal-description"
            >
                <Box sx={{width: "80vw", height: "25vh", ...modalStyle}}>
                <h2 id="cat-modal-title">Choose a new Category</h2>
                <Select name="cat" 
                    id="cat" 
                    className="catSelect" 
                    value={newCat} 
                    onChange={setNewCat} 
                    options={catOptions} 
                    styles={customStyles} 
                />
                <Button
                    onClick={(e) => {
                        changeUserCat(mangaInfo[modalIndex].mangaId)
                        handleCatClose()
                    }}
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mb: 2 }}
                >
                Submit
                </Button>
                <SvgIcon onClick={handleCatClose} sx={{position: "absolute", top: 10, right: 10}}>
                    <CancelIcon sx={{color: "white"}}/>
                </SvgIcon>
                </Box>
            </Modal>
        )
    }

    const [selectedCat, setSelectedCat] = React.useState<dropdownOption | null>(catOptions[0])
    const [isLoading, setIsLoading] = React.useState(false)
    function addMangaModal() {
        if (!mangaInfo) return <div/>
        return (
            <Modal
                open={addOpen}
                onClose={handleAddClose}
                aria-labelledby="cat-modal-title"
                aria-describedby="cat-modal-description"
            >
                <Box sx={{width: "80vw", height: "28vh", ...modalStyle}}>
                {/* <h2 id="add-modal-title">Add New Manga:</h2> */}
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
                {/* <input/> */}
                <Button
                    onClick={(e) => {
                        submitManga()
                        handleAddClose()
                    }}
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mb: 2 }}
                >
                {isLoading? 'Loading...':'Add Manga!'}
                </Button>
                {/* <Button onClick={(e) => {
                    changeUserCat(mangaInfo[modalIndex].mangaId)
                    handleCatClose()
                }}>Submit</Button> */}
                <SvgIcon onClick={handleCatClose} sx={{position: "absolute", top: 10, right: 10}}>
                    <CancelIcon sx={{color: "white"}}/>
                </SvgIcon>
                </Box>
            </Modal>


            
        )

        async function submitManga() {
            if (isLoading) return toast.error('Already adding!')
            let notif = toast.loading("Adding Manga!", {closeOnClick: true, draggable: true,})
            try {
              setIsLoading(true)
            //   setShowError(false)
        
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
        
        
              urlBox!.value = ""
              if (errorLog.length == 0) {
                getUserManga()
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
                // setShowError(true)
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
    }

    
      
    function fuzzyMatch(pattern: string, str: string): number {
        pattern = pattern.toLowerCase();
        str = str.toLowerCase();
    
        let score = 0;
        let lastIndex = -1;
    
        for (let char of pattern) {
            const index = str.indexOf(char, lastIndex + 1);
            if (index === -1) return -1;  // No match found for letter return -1, possible subtract score instead of -1
    
            score += index - lastIndex; 
            lastIndex = index;
        }
    
        return score;
    }
    

    const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value)
    }

    function checkFilter(manga:mangaDetails) {
        if (unreadChecked) {
            if (manga.chapterTextList.length - 1 <= manga.currentIndex) return false
        }
        if (!filterOption || filterOption.value === "%" || manga.userCat === filterOption.value) {
            if (currentSearch) {
                return fuzzyMatch(currentSearch, manga.mangaName) > 0
            } else return true
        }

        return false
    }

    function changeChapterModal() {
        if (!mangaInfo) return
        if (modalIndex < 0 ) return <div/>
        return (
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
                    options={mangaInfo[modalIndex].chapterTextList.toReversed().map((text, i) => {
                        return {value: text, label: text}
                    })} 
                    styles={customStyles} 
                />
                <Button
                    onClick={(e) => {
                        changeCurrChapter(mangaInfo[modalIndex].mangaId)
                        handleChapterClose()
                    }}
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mb: 2 }}
                >
                Submit
                </Button>
                {/* <Button onClick={(e) => {
                    changeCurrChapter(mangaInfo[modalIndex].mangaId)
                    handleChapterClose()
                }}>Submit</Button> */}
                <SvgIcon onClick={handleChapterClose} sx={{position: "absolute", top: 10, right: 10}}>
                    <CancelIcon sx={{color: "white"}}/>
                </SvgIcon>
                </Box>
            </Modal>
        )
    }

    function checkIndexInRange(index:number, listLength:number) {
        if (index < 0) return 0
        if (index < listLength) return index
        return listLength-1
    }

    //modal control
    const [open, setOpen] = React.useState(false)
    const handleOpen = () => setOpen(true)
    const handleClose = async () => {
        if (!mangaInfo) return
        setOpen(false)

        await fetch(`${fetchPath}/api/data/update/updateInteractTime`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  "mangaId": mangaInfo[modalIndex].mangaId,
                  "interactionTime": Date.now()
            }),
        })
    }
    const [catOpen, setCatOpen] = React.useState(false)
    const handleCatOpen = () => setCatOpen(true)
    const handleCatClose = () => setCatOpen(false)

    const [addOpen, setAddOpen] = React.useState(false)
    const handleAddOpen = () => setAddOpen(true)
    const handleAddClose = () => setAddOpen(false)

    const [chapterOpen, setChapterOpen] = React.useState(false)
    const handleChapterOpen = () => {
        if (!mangaInfo || !mangaInfo[modalIndex]) return
        let optionList:dropdownOption[] = mangaInfo[modalIndex].chapterTextList.toReversed().map((text, i) => {
            return {value: text, label: text}
        })
        setChapterOpen(true)
        setChapter(optionList[0]||null)
    }
    const handleChapterClose = () => setChapterOpen(false)

    const [removeOpen, setRemoveOpen] = React.useState(false)
    const handleRemoveOpen = () => {setRemoveOpen(true); console.log(removeOpen)}
    const handleRemoveClose = () => setRemoveOpen(false)

    const handleAuxClick = (event: React.MouseEvent, mangaId: string) => {
        if (!mangaInfo) return
        if (event.button === 1) { 
        let manga = mangaInfo.find(manga => manga.mangaId === mangaId)
          event.preventDefault();
          let currentUrl = `${manga?.urlBase}${manga?.slugList[manga.currentIndex+1]||manga?.slugList.at(-1)}`
          window.open(currentUrl)
        }
      };  
      
    const handleContextChapter = () => {
        handleChapterOpen()
        handleContextClose()
    }

    const handleContextCategory = () => {
        handleCatOpen()
        handleContextClose()
    }

    const handleContextRemove = () => {
        handleRemoveOpen()
        handleContextClose()
    }

    const handleContextOpen = () => {
        if (!mangaInfo) return
        let currentUrl = `${mangaInfo[modalIndex]?.urlBase}${mangaInfo[modalIndex]?.slugList[mangaInfo[modalIndex].currentIndex+1]||mangaInfo[modalIndex]?.slugList.at(-1)}`
        window.open(currentUrl)
        handleContextClose()
    }

    const SkeletonCard = () => (
        <Card sx={{ width: 320, height: 350, backgroundColor: "black", color: "white" }}>
          <CardActionArea sx={{ height: "100%" }}>
            <Skeleton variant="rectangular" height={200} />
            <CardContent>
              <Skeleton variant="text" height={30} width="80%" />
              <Skeleton variant="text" height={20} width="60%" />
              <Skeleton variant="text" height={20} width="40%" />
            </CardContent>
          </CardActionArea>
        </Card>
      )

    useEffect(() => {
        getUserManga()
    }, [])

    if (!mangaInfo) return (
        <div className='cardContainer' style={{display:"flex", justifyContent:"center", justifyItems:"center"}}>
            {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)}
        </div>
    ) 
    
    return (
    <div className='viewTrackerContainer' style={{display:"flex", justifyContent:"center", flexDirection: "column"}}>
        <div className='mangaOverviewModal' id="overviewModal">
            <SeriesModal
                open={open}
                onClose={handleClose}
                title={modalIndex >= 0 ? mangaInfo[modalIndex].mangaName:'unknown'}
                imageUrl={(fetchPath==='/.proxy'? '/.proxy/image':import.meta.env.VITE_IMG_URL) +'/'+ (modalIndex >= 0 ? mangaInfo[modalIndex].mangaId: "mangaNotFoundImage")}
                chapters={modalIndex >= 0 ? mangaInfo[modalIndex].chapterTextList.toReversed().map((chapText, i) => ({'title': chapText, 'url': mangaInfo[modalIndex].urlBase+(mangaInfo[modalIndex].slugList.toReversed()[i]), 'key': i})):[]}
                currentChapterUrl={modalIndex >= 0 ? mangaInfo[modalIndex].urlBase+mangaInfo[modalIndex].slugList[mangaInfo[modalIndex].currentIndex]:''}
                onRemove={() => handleRemoveOpen()}
                onChangeCategory={() => handleCatOpen()}
                onChangeChap={() => handleChapterOpen()}
            />

            {changeCatModal()}
            {changeChapterModal()}
            {confirmRemovalDialog()}
            {addMangaModal()}

        </div>

        <div className="cardControls">
            <TextField 
                id="search" 
                label="Search" 
                value={currentSearch} 
                onChange={handleSearchChange}
                variant="outlined"
                size="small"
                // className="inputField"
                sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "#cccccc", // Default outline color
                      },
                      "&:hover fieldset": {
                        borderColor: "#b3b3b3", // Outline color when hovered
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#2684ff", // Outline color when focused
                      },
                    },
                  }}            
                InputProps={{
                    sx: { background: "inherit", borderColor: "#ccc"}
                }}
            />

            <Select
                value={filterOption}
                onChange={setFilterOption}
                options={catOptions}
                styles={customStyles}
                className="selectField"
            />

            <Select
                value={methodOption}
                onChange={setMethodOption}
                options={sortOptions}
                styles={customStyles}
                className="selectField"
            />

            <Select
                value={orderOption}
                onChange={setOrderOption}
                options={[
                    { value: "1", label: "Ascending" }, 
                    { value: "-1", label: "Descending" }
                ]}
                styles={customStyles}
                className="selectField"
            />

            <FormControlLabel
                control={
                    <Checkbox
                        checked={unreadChecked}
                        onChange={(e) => setUnreadChecked(e.target.checked)}
                        sx={{
                            color: "#ddd", // Default color
                            "&.Mui-checked": { color: "#22346e" }, // Checked color
                        }}
                    />
                }
                label="Unread"
                sx={{ color: "inherit" }} // Matches surrounding text color
            />
        </div>


        <div className='cardContainer' style={{display:"flex", justifyContent:"center", justifyItems:"center"}}>
            {mangaInfo.filter(manga => checkFilter(manga)).sort((a, b) => {
                let key:keyof mangaDetails | "search" = methodOption?.value as keyof mangaDetails | "search"
                let orderVal = parseInt(orderOption?orderOption.value:'0')

                if (!key || !orderVal) return 0

                if (methodOption?.value === 'search') {
                    if (currentSearch) {
                        const scoreA = fuzzyMatch(currentSearch, a.mangaName)
                        const scoreB = fuzzyMatch(currentSearch, b.mangaName)
            
                        if (scoreA > scoreB) return 1 * orderVal
                        if (scoreA < scoreB) return -1 * orderVal
                    } else {
                        if (a.mangaName > b.mangaName) return 1 * orderVal;
                        if (a.mangaName < b.mangaName) return -1 * orderVal;
                    }
                    return 0
                }
                key = key as keyof mangaDetails
                if (a[key ] > b[key]) return 1*orderVal
                if (a[key] < b[key]) return -1*orderVal
                return 0
            }).map((data, i) => 
                <Card sx={{ width: 320, height: 350, backgroundColor: "black", color: "white"}} onContextMenu={(e) => handleContextMenu(e, data.mangaId)}>
                <CardActionArea onClick={(e) => openMangaOverview(data.mangaId)} onAuxClick={(e) => handleAuxClick(e, data.mangaId)}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={`${fetchPath==='/.proxy'? '/.proxy/image':import.meta.env.VITE_IMG_URL}/${data.mangaId}`}
                    alt={`Cover for ${data.mangaName}`}
                    style={{objectPosition:"top"}}
                    loading='lazy'
                  />
                  <CardContent sx={{height:150}}>
                  <Tooltip title={data.mangaName} enterDelay={700}>
                    <Typography gutterBottom variant="h5" component="div" style={{"display": "-webkit-box",
                        "WebkitBoxOrient": "vertical",
                        "WebkitLineClamp": 2,
                        "overflow": "hidden",
                        "textOverflow": "ellipsis",
                        "maxHeight": "2.6em"}}>
                        {data.mangaName}
                      </Typography>
                    </Tooltip>
                    <Typography variant="body2" color="text.secondary" sx={{color: "lightgray", position: "absolute", bottom: 10}}> 
                      <table>
                        <tbody>
                            <tr> 
                            <td>Chapter:</td>
                            <td>{`${data.chapterTextList[checkIndexInRange(data.currentIndex, data.chapterTextList.length)].match(/[0-9.]+/g)?.join('.')}/${data.chapterTextList[data.chapterTextList.length-1].match(/[0-9.]+/g)?.join('.')}`}</td>
                            </tr>
                            <tr>
                                <td>Category: </td>
                                <td style={{color:findCat(data.userCat)?.color||'lightgray'}}>{findCat(data.userCat)?.label}</td>
                            </tr>
                        </tbody>
                      </table>
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>

              
            )}

            <Card sx={{ width: 320, height: 350, backgroundColor: "black", color: "white" }}>
                <CardActionArea onClick={(e) => handleAddOpen()} sx={{ height: "100%" }}>
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <AddCircleOutlinedIcon sx={{ width: 200, height: 200 }} />
                    </Box>
                </CardActionArea>
            </Card>

            <Menu
                open={anchorPosition !== null}
                onClose={handleContextClose}
                anchorReference="anchorPosition"
                anchorPosition={
                anchorPosition ? { top: anchorPosition.top, left: anchorPosition.left } : undefined
                }
            >
                <MenuItem onClick={handleContextOpen}>Open</MenuItem>
                <MenuItem onClick={handleContextChapter}>Change Chapter</MenuItem>
                <MenuItem onClick={handleContextCategory}>Change Category</MenuItem>
                <MenuItem onClick={handleContextRemove} sx={{ color: 'error.main' }}>Remove</MenuItem>
            </Menu>
        </div>
    </div>
    )
}