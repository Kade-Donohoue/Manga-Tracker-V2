import discordSdk from '../../discordSdk'
import {authStore} from '../../stores/authStore'
import {dropdownOption, mangaDetails, } from '../../types'
import {customStyles} from '../../styled/index'
import {LoadingScreen} from '../../components/LoadingScreen'
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
import ButtonGroup from '@mui/material/ButtonGroup'
import CancelIcon from '@mui/icons-material/Cancel'
import SvgIcon from '@mui/material/SvgIcon'
import Select from 'react-select'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { CardActionArea, TextField } from '@mui/material'
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
    const [mangaInfo, setMangaInfo] = React.useState<mangaDetails[]>([]);
    const [modalIndex, SetModalIndex] = React.useState<number>(-1)
    const [newCat, setNewCat] = React.useState<dropdownOption | null>(catOptions[0])
    const [newChapter, setChapter] = React.useState<dropdownOption | null>(null)

    const [filterOption, setFilterOption] = React.useState<dropdownOption | null>(catOptions[7])
    const [methodOption, setMethodOption] = React.useState<{label:string,value:string} | null>(sortOptions[0])
    const [orderOption, setOrderOption] = React.useState<{value:string, label:string} | null>({value:"1", label:"Ascending"})
    const [currentSearh, setSearch] = React.useState<string>("")

    const auth = authStore.getState();
    // console.log(auth)
    if (!auth) {
        console.log("No Auth!")
        return <></>
    }

    async function getUserManga() {
        
        const response = await fetch(`${fetchPath}/api/data/pull/getUserManga`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "access_token": auth.access_token,
                "authId": null
            }),
        }) as any

        if (!response.ok) {
            let errorData = await response.json()
            toast.error(errorData.message)
            return 
        }
        const results:{mangaDetails:mangaDetails[]} = await response.json()
        if (results.mangaDetails.length <= 0) toast.info("No Manga!")
        setMangaInfo(results.mangaDetails)
    }

    async function openMangaOverview(mangaId:string) {
        console.log('opening Series Modal!')
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
                "access_token": auth.access_token,
                "authId": null,
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

                let newList:mangaDetails[] = [...mangaInfo] as mangaDetails[]

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
                "access_token": auth.access_token,
                "authId": null,
                "mangaId": mangaId,
                "newCat": newCat.value
            }),
        })

        if (reply.ok) {
            const tempInfo:mangaDetails[] = [...mangaInfo] as mangaDetails[]
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
                "access_token": auth.access_token,
                "authId": null,
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

    function findCatLabel(catVal:string) {
        for (const cat of catOptions) {
            if (catVal == cat.value) return cat.label
        }
        return "Category Removed"
    }

    function confirmRemovalDialog() {

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
        if (!filterOption || filterOption.value === "%" || manga.userCat === filterOption.value) {
            if (currentSearh) {
                return fuzzyMatch(currentSearh, manga.mangaName) > 0
            } else return true
        }

        return false
    }

    function changeChapterModal() {
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
        setOpen(false)

        await fetch(`${fetchPath}/api/data/update/updateInteractTime`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  "access_token": auth.access_token,
                  "authId": null,
                  "mangaId": mangaInfo[modalIndex].mangaId,
                  "interactionTime": Date.now()
            }),
        })
    }
    const [catOpen, setCatOpen] = React.useState(false)
    const handleCatOpen = () => setCatOpen(true)
    const handleCatClose = () => setCatOpen(false)

    const [chapterOpen, setChapterOpen] = React.useState(false)
    const handleChapterOpen = () => setChapterOpen(true)
    const handleChapterClose = () => setChapterOpen(false)

    const [removeOpen, setRemoveOpen] = React.useState(false)
    const handleRemoveOpen = () => {setRemoveOpen(true); console.log(removeOpen)}
    const handleRemoveClose = () => setRemoveOpen(false)


    useEffect(() => {
        getUserManga()
        // console.log(fetchPath==='/.proxy'? '/.proxy/image':import.meta.env.VITE_IMG_URL)
    }, [])

    if (!mangaInfo) return LoadingScreen()
    return (
    <div className='viewTrackerContainer' style={{display:"flex", justifyContent:"center", flexDirection: "column"}}>
        <div className='mangaOverviewModal' id="overviewModal">
            <SeriesModal
                open={open}
                onClose={handleClose}
                title={modalIndex >= 0 ? mangaInfo[modalIndex].mangaName:'unknown'}
                imageUrl={(fetchPath==='/.proxy'? '/.proxy/image':import.meta.env.VITE_IMG_URL) +'/'+ (modalIndex >= 0 ? mangaInfo[modalIndex].mangaId: "mangaNotFoundImage")}
                chapters={modalIndex >= 0 ? mangaInfo[modalIndex].chapterTextList.toReversed().map((chapText, i) => ({'title': chapText, 'url': mangaInfo[modalIndex].urlList.toReversed()[i], 'key': i})):[]}
                currentChapterUrl={modalIndex >= 0 ? mangaInfo[modalIndex].urlList[mangaInfo[modalIndex].currentIndex]:''}
                onRemove={() => handleRemoveOpen()}
                onChangeCategory={() => handleCatOpen()}
                onChangeChap={() => handleChapterOpen()}
            />

            {changeCatModal()}
            {changeChapterModal()}
            {confirmRemovalDialog()}

        </div>

        <div className='cardControls' style={{display:"flex", justifyContent:"center", justifyItems:"center", marginTop: "10px"}}>
            <TextField 
                id='search' 
                label="Search" 
                value={currentSearh} 
                onChange={handleSearchChange}
                variant="outlined"
                size="small"
                InputProps={{
                    style: {
                        border: 'none',
                    },
                }}
            />

            <Select
                value={filterOption}
                onChange={setFilterOption}
                options={catOptions}
                styles={customStyles}
            />
            <Select
                value={methodOption}
                onChange={setMethodOption}
                options={sortOptions}
                styles={customStyles}
            />
            <Select
                value={orderOption}
                onChange={setOrderOption}
                options={[{value:"1", label:"Ascending"}, {value:"-1", label:"Descending"}]}
                styles={customStyles}
            />
        </div>
        <div className='cardContainer' style={{display:"flex", justifyContent:"center", justifyItems:"center"}}>
            {mangaInfo.filter(manga => checkFilter(manga)).sort((a, b) => {
                let key:keyof mangaDetails | "search" = methodOption?.value as keyof mangaDetails | "search"
                let orderVal = parseInt(orderOption?orderOption.value:'0')

                if (!key || !orderVal) return 0

                if (methodOption?.value === 'search') {
                    if (currentSearh) {
                        const scoreA = fuzzyMatch(currentSearh, a.mangaName)
                        const scoreB = fuzzyMatch(currentSearh, b.mangaName)
            
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
                <Card sx={{ width: 320, height: 350, backgroundColor: "black", color: "white"}}>
                <CardActionArea onClick={(e) => openMangaOverview(data.mangaId)}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={`${fetchPath==='/.proxy'? '/.proxy/image':import.meta.env.VITE_IMG_URL}/${data.mangaId}`}
                    alt={`Cover for ${data.mangaName}`}
                    style={{objectPosition:"top"}}
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
                            <td>{`${data.chapterTextList[checkIndexInRange(data.currentIndex, data.chapterTextList.length)].match(/[0-9.]+/g)}/${data.chapterTextList[data.chapterTextList.length-1].match(/[0-9.]+/g)}`}</td>
                            </tr>
                            <tr>
                            <td>Category: </td>
                            <td>{findCatLabel(data.userCat)}</td>
                            </tr>
                        </tbody>
                      </table>
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            )}
        </div>
    </div>
    )
}