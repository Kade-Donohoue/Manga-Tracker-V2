import discordSdk from '../../discordSdk'
import {authStore} from '../../stores/authStore'
import {dropdownOption, mangaDetails, } from '../../types'
import {customStyles} from '../../styled/index'
import {LoadingScreen} from '../../components/LoadingScreen'
import React, { useEffect } from "react"
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
import { CardActionArea } from '@mui/material'
import { catOptions, fetchPath } from '../../vars'

import './viewTracker.css'
import {modalStyle} from '../../AppStyles'

const sortOptions:{label:string,value:keyof mangaDetails}[] = [
    {label: "Title", value: "mangaName"},
    {label: "Updated", value: "updateTime"},
    {label: "Interacted", value: "interactTime"},
    {label: "Read Chapters", value: "currentIndex"}
]

export default function tracked() {
    const [mangaInfo, setMangaInfo] = React.useState<mangaDetails[]>([]);
    const [modalIndex, SetModalIndex] = React.useState<number>(-1)
    const [newCat, setNewCat] = React.useState<dropdownOption | null>(catOptions[0])
    const [newChapter, setChapter] = React.useState<dropdownOption | null>(null)

    const [filterOption, setFilterOption] = React.useState<dropdownOption | null>(catOptions[7])
    const [methodOption, setMethodOption] = React.useState<{label:string,value:string} | null>(sortOptions[2])
    const [orderOption, setOrderOption] = React.useState<{value:string, label:string} | null>({value:"1", label:"Ascending"})

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
        console.log('opening')
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
            render: "No Category Selected!", 
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
                <Button onClick={(e) => {
                    changeUserCat(mangaInfo[modalIndex].mangaId)
                    handleCatClose()
                }}>Submit</Button>
                <SvgIcon onClick={handleCatClose} sx={{position: "absolute", top: 10, right: 10}}>
                    <CancelIcon sx={{color: "white"}}/>
                </SvgIcon>
                </Box>
            </Modal>
        )
    }

    function checkFilter(manga:mangaDetails) {

        if (!filterOption || filterOption.value === "%") return true

        if (manga.userCat === filterOption.value) return true

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
                <Button onClick={(e) => {
                    changeCurrChapter(mangaInfo[modalIndex].mangaId)
                    handleChapterClose()
                }}>Submit</Button>
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
    const handleClose = () => setOpen(false)

    const [catOpen, setCatOpen] = React.useState(false)
    const handleCatOpen = () => setCatOpen(true)
    const handleCatClose = () => setCatOpen(false)

    const [chapterOpen, setChapterOpen] = React.useState(false)
    const handleChapterOpen = () => setChapterOpen(true)
    const handleChapterClose = () => setChapterOpen(false)

    const [removeOpen, setRemoveOpen] = React.useState(false)
    const handleRemoveOpen = () => setRemoveOpen(true)
    const handleRemoveClose = () => setRemoveOpen(false)


    useEffect(() => {
        getUserManga()
        console.log(fetchPath==='/.proxy'? '/.proxy/image':'https://img.dev.manga.kdonohoue.com')
    }, [])

    if (!mangaInfo) return LoadingScreen()
    return (
    <div className='viewTrackerContainer' style={{display:"flex", justifyContent:"center", flexDirection: "column"}}>
        <div className='mangaOverviewModal' id="overviewModal">
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-title"
                aria-describedby="modal-description"
            >
                <Box sx={{width: "80vw", height: "65vh", ...modalStyle}}>
                    <div style={{display: 'flex', flexDirection: 'row'}}>
                        <img className="modalImage" src={`${fetchPath==='/.proxy'? '/.proxy/image':'https://img.dev.manga.kdonohoue.com'}/${modalIndex >= 0 ? mangaInfo[modalIndex].mangaId: "mangaNotFoundImage"}`}></img>
                        <div style={{paddingLeft: "20px"}}>
                            

                            <Tooltip title={<h1>{modalIndex >= 0 ? mangaInfo[modalIndex].mangaName:"Unknown"}</h1>} enterDelay={700}>
                                <Typography gutterBottom variant="h3" component="h3" style={{"display": "-webkit-box",
                                    "WebkitBoxOrient": "vertical",
                                    "WebkitLineClamp": 1,
                                    "overflow": "hidden",
                                    "textOverflow": "ellipsis",}}
                                >
                                    {modalIndex >= 0 ? mangaInfo[modalIndex].mangaName:"Unknown"}
                                </Typography>
                                </Tooltip>
                            <Typography id="modal-chapter-list" sx={{overflowY: "scroll", height: 256, color:"blue", textDecoration:'underline'}}>
                                <ul>
                                {modalIndex >= 0 ? mangaInfo[modalIndex].chapterTextList.toReversed().map((chapText, i) => <li><a onClick={(e) => {if (fetchPath === '/.proxy') {discordSdk.commands.openExternalLink({url:mangaInfo[modalIndex].urlList.toReversed()[i]})} else {window.open(mangaInfo[modalIndex].urlList.toReversed()[i])}}}>{chapText}</a></li>):<div/>}
                                </ul>
                            </Typography>
                        </div>
                    </div>
                    
                    <Typography id="modal-description" sx={{ mt: 2, }}>
                        <ButtonGroup variant='contained' sx={{position: "absolute", bottom:10, alignItems:"center", width: "95%"}}>
                            <Button sx={{width:"33%"}} onClick={handleRemoveOpen}>Remove</Button>
                            <Button sx={{width:"34%"}} onClick={handleCatOpen}>Change Category</Button>
                            <Button sx={{width:"33%"}} onClick={handleChapterOpen}>Change Current Chapter</Button>
                        </ButtonGroup>
                    </Typography>
                    <SvgIcon onClick={handleClose} sx={{position: "absolute", top: 10, right: 10}}>
                        <CancelIcon sx={{color: "white"}}/>
                    </SvgIcon>

                    {changeCatModal()}
                    {changeChapterModal()}
                    {confirmRemovalDialog()}
                </Box>
            </Modal>
        </div>



        <div className='cardControls' style={{display:"flex", justifyContent:"center", justifyItems:"center"}}>
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
                let key:keyof mangaDetails = methodOption?.value as keyof mangaDetails
                let orderVal = parseInt(orderOption?orderOption.value:'0')

                if (!key || !orderVal) return 0

                if (a[key] > b[key]) return 1*orderVal
                if (a[key] < b[key]) return -1*orderVal
                return 0
            }).map((data, i) => 
                <Card sx={{ width: 320, height: 350, backgroundColor: "black", color: "white"}}>
                <CardActionArea onClick={(e) => openMangaOverview(data.mangaId)}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={`${fetchPath==='/.proxy'? '/.proxy/image':'https://img.dev.manga.kdonohoue.com'}/${data.mangaId}`}
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
                        <tr> 
                          <td>Chapter:</td>
                          <td>{`${data.chapterTextList[checkIndexInRange(data.currentIndex, data.chapterTextList.length)].match(/[0-9.]+/g)}/${data.chapterTextList[data.chapterTextList.length-1].match(/[0-9.]+/g)}`}</td>
                        </tr>
                        <tr>
                          <td>Category: </td>
                          <td>{findCatLabel(data.userCat)}</td>
                        </tr>
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
