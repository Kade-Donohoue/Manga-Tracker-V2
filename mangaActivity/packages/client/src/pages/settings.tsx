import React, { ChangeEvent, HTMLAttributes } from 'react';
import discordSdk from '../discordSdk';
// import ReactJsonView from '../components/ReactJsonView';
import {useLocation} from 'react-router-dom';
import {EventPayloadData} from '@discord/embedded-app-sdk';
import {catOptions, setCatOptions} from '../vars'
import Button from '@mui/material/Button';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { authStore } from '../stores/authStore';
import { dropdownOption } from '../types';
import { toast } from 'react-toastify';

import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { DataGrid, GridActionsCellItem, GridFooterContainer, GridFooter, GridRowModes, GridEventListener, GridRowEditStopReasons, GridRowProps, GridRowModesModel, GridRowId, GridRowModel, GridRowsProp, GridSlots, renderEditInputCell, GridRenderEditCellParams, GridColDef } from '@mui/x-data-grid'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { modalStyle } from '../AppStyles';

interface dataGridRow {
  id:string,
  label:string,
  isNew?:boolean
}

interface EditFooterProps extends Partial<HTMLAttributes<HTMLDivElement>> {
  setRows: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void
  setRowModesModel: (newModel: (oldModel: GridRowModesModel) => GridRowModesModel) => void
}

export default function settings() {
  const [editRows, setEditRows] = React.useState<string[]>([])
  const [localCats, setLocalCats] = React.useState<dropdownOption[]>(catOptions)
  const [rows, setRows] = React.useState<GridRowsProp>(convertToDataGrid(catOptions))
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>({})
  const auth = authStore.getState()

  const [openDeleteUserModal, setOpenDeleteUserModal] = React.useState(false);
  const handleOpenDeleteModal = () => setOpenDeleteUserModal(true);
  const handleCloseDeleteModal = () => setOpenDeleteUserModal(false);



  function convertToDataGrid(dropdownOptions:dropdownOption[]):GridRowsProp {
    let newData:dataGridRow[] = []
    for (const cat of dropdownOptions) {
      newData.push({id:cat.value, label:cat.label, isNew: false})
    }
    return newData as GridRowsProp
  }

  const handleRowChange = (event:ChangeEvent<HTMLInputElement>, i:number) => {
    let tempEditRows = [...editRows]
    tempEditRows[i] = event.target.value
    setEditRows(tempEditRows)
  }

  async function removeRow(i:number) {
    let tempEditRows = [...editRows]
    tempEditRows.splice(i, 1)
    setEditRows(tempEditRows)
  }

  async function saveCategory(i:number) {
    let newCat = editRows[i].trim().replace('/‎|​/g', '') //prevent spaces at beg/end and prevent 0 space ascii char
    if (newCat==='') return toast.error("Enter a name!")
    if (catOptions.find(cat => cat.label === newCat)) return toast.error("This Category already exists!")

    catOptions.push({value: `user:${newCat}`, label: newCat})
    setLocalCats(catOptions)
    setRows(convertToDataGrid(catOptions))
    console.log(catOptions)

    removeRow(i)

    postCats(catOptions)
  }

  async function postCats( newCats:dropdownOption[] ) {
    setCatOptions(newCats)
    console.log(newCats)
    let resp = await fetch('/.proxy/api/data/update/updateUserCategories', {
      method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              "access_token": auth.access_token,
              "authId": null,
              "newCatList": JSON.stringify(newCats)
          }),
    })

    if (!resp.ok) toast.error('Unable to save Categories! Check network connection or contact an admin!')

  }

  async function deleteUserData() {
    const resp = await fetch(`/api/data/remove/forgetUser`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({
          "access_token": auth.access_token,
          "authId": null,
      })
    })

    handleCloseDeleteModal()
    if (!resp.ok) return toast.error('Unable to remove user Data Please Contact an Admin!')
    toast.success('All User Data Removed!')
  }

  async function removeCategory(i:number) {
    let tempOptions = [...catOptions]
    tempOptions.splice(i, 1)
    setCatOptions(tempOptions)
    setLocalCats(tempOptions)
    setRows(convertToDataGrid(tempOptions))

    // removeRow(i)

    fetch('/.proxy/api/data/update/updateUserCategories', {
        method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "access_token": auth.access_token,
                "authId": null,
                "newCatList": JSON.stringify(catOptions)
            }),
    })
  }


  //dataGridFeatures
  const customFooter = (props: EditFooterProps) => {
    const handleClick = () => {
      props.setRows((oldRows) => [...oldRows, { id: `user:${(oldRows.length + 1).toString()}`, label: '', isNew: true }])
      props.setRowModesModel((oldModel) => ({ ...oldModel, [`user:${(rows.length + 1).toString()}`]: { mode: GridRowModes.Edit, fieldToFocus: 'label' } }))
    }
  
    return (
      <GridFooterContainer>
        <IconButton color='primary' sx={{ borderRadius: 0, fontSize: '10' }} onClick={handleClick}>
          <AddCircleIcon /> Add Category
        </IconButton>
        <GridFooter sx={{ border: 'none' }} />
      </GridFooterContainer>
    )
  }

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({...rowModesModel, [id]: {mode: GridRowModes.Edit}})
  }

  //add check to prevent dupes or bad chars
  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({...rowModesModel, [id]: {mode: GridRowModes.View}})
  }

  const handleDeleteClick = (id: GridRowId) => async () => {
    setRows(rows.filter((row:any) => row.id !== id))
    let newCatOptions = localCats.filter((cat) => cat.value !== id)
    setLocalCats(newCatOptions)

    postCats(newCatOptions)
  }

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({...rowModesModel, [id]: { mode: GridRowModes.View, ignoreModifications: true }})

    const editedRow = rows.find((row:any) => row.id === id)
    if (editedRow!.isNew) {
      setRows(rows.filter((row:any) => row.id !== id))
    }
  }

  const processRowUpdate = (newRow: GridRowModel) => {

    //remove spaces at beg and end and remove some bad chars
  newRow.label.trim().replace('/‎|​/g', '')    

  if (newRow.label === '') {
    toast.error('Please Enter a Category Name!');
    throw new Error('Invalid Category Name');
  }

  for (const row of rows) {
    if (row.id !== newRow.id && row.label === newRow.label) {
      toast.error('Category Already Exists with this name!');
      throw new Error('Duplicate Category Name');
    }
  }

  const updatedRow = { ...newRow, isNew: false } as GridRowModel

    setRows(rows.map((row:any) => (row.id === newRow.id ? updatedRow : row)))

    //sync with Categories V1
    let newRowsV1:dropdownOption[] = []
    for (const row of rows) {
      newRowsV1.push(row.id === newRow.id ?{value: newRow.id, label: newRow.label}:{value: row.id, label: row.label})
    }
    console.log(newRowsV1)
    setLocalCats(newRowsV1)

    postCats(newRowsV1)

    return updatedRow
  }

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel)
  }

  const handleRowEditStop:GridEventListener<'rowEditStop'> =  (params:any, event:any) =>{
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true
    }
  }

  const columns:GridColDef[] = [
    { field: 'label', headerName: 'Category Title', width: 600, editable: true},
    { field: 'actions', headerName: 'Actions', type:'actions', width: 100, getActions: ({ id }:{id:GridRowId}) => {
      const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit 
  
      if (!(id as string).includes('user:')) return []

      if (isInEditMode) {
        return [
          <GridActionsCellItem
            icon={<SaveIcon/>}
            label="Save"
            sx={{color: 'primary.main'}}
            onClick={handleSaveClick(id)}
          />,
          <GridActionsCellItem
            icon={<CancelIcon/>}
            label="Cancel"
            sx={{}}
            onClick={handleCancelClick(id)}
            color="inherit"
          />
        ]
      }
      return [
        <GridActionsCellItem
          icon={<EditIcon/>}
          label="Edit"
          sx={{}}
          onClick={handleEditClick(id)}
          color="inherit"
        />,
        <GridActionsCellItem
          icon={<DeleteIcon sx={{color:'red'}}/>}
          label="Delete"
          sx={{}}
          onClick={handleDeleteClick(id)}
          color="inherit"
        />
      ]
      }
    }
  ]

  return (
    <div style={{padding: 32, width:'100%'}}>
      <div>
        <h1>Settings</h1> <br/>

        <Accordion sx={{backgroundColor:'#1e1e1e', color:'#ffffff', width:"80%"}}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{color:'#ffffff'}}/>} id='panel-category-header'>Categories V1</AccordionSummary>
          <AccordionDetails sx={{overflowX:'auto'}}>
            <table style={{border: 1, borderCollapse: "separate", width:"100%", tableLayout: "fixed" }}>
              <tr>
                  <th style={{width: '50%', overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  textAlign: 'left', wordWrap:'break-word', fontWeight:'bold'}}>Category Name</th>
                  <th style={{textAlign:'left', fontWeight:'bold'}}>Remove?</th>
              </tr>
              <br/>
              {localCats.map((category, i) => {
                  return (
                  <tr>
                      <td ><div style={{overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  textAlign: 'left', wordWrap:'break-word'}}>{category.label}</div></td>
                      <td><IconButton disabled={!category.value.includes("user:")} sx={{"&.Mui-disabled": {color:"gray"}}} color="error" onClick={(e) => removeCategory(i)}><DeleteIcon/></IconButton></td>
                  </tr>)
              })}
              {editRows.map((currentVal, i) => {
                  return (
                      <tr>
                          <td><input style={{width:"80%"}} type="text" value={currentVal as string} onChange={(e:ChangeEvent<HTMLInputElement>) => handleRowChange(e, i)}></input></td>
                          <td>
                              <IconButton color="primary" onClick={(e) => {saveCategory(i)}}><CheckCircleRoundedIcon/></IconButton>
                              <IconButton color="error" onClick={(e) => {removeRow(i)}}><DeleteIcon/></IconButton>
                          </td>
                    </tr>
                  )
              })}
              <Button startIcon={<AddCircleIcon/>} onClick={(e) => {setEditRows([...editRows, ""])}}>add Category</Button>
            </table>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{backgroundColor:'#1e1e1e', color:'#ffffff', width:"80%"}}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{color:'#ffffff'}}/>} id='panel-category-header'>Categories V2</AccordionSummary>
          <AccordionDetails sx={{width:"100%"}}>
            <Box sx={{width:'100%', maxWidth: '100%'}}>
              <DataGrid 
                sx={{width:'100%', boxShadow: 2, '& .MuiDataGrid-cell:hover': {color: 'primary.main'}}} 
                disableColumnFilter={true} 
                disableColumnSorting={true} 
                disableColumnMenu={true} 
                disableColumnResize={true} 
                hideFooterSelectedRowCount={true}  
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
                slots={{
                  footer: customFooter as (props: any) => JSX.Element
                }}
                slotProps={{
                  footer: { setRows, setRowModesModel } as EditFooterProps
                }}
                rows={rows} 
                columns={columns} 
                isCellEditable={(params:any) => params.row.id.includes('user:')}/>

            </Box>
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{backgroundColor:'#1e1e1e', color:'#ffffff', width:"80%"}}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{color:'#ffffff'}}/>} id='panel-category-header'>User Data</AccordionSummary>
          <AccordionDetails>
            <Box>
              <Button startIcon={<DeleteIcon/>} onClick={handleOpenDeleteModal}>Remove User Data</Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Modal
          open={openDeleteUserModal}
          onClose={handleCloseDeleteModal}
        >
          <Box sx={{width: "80vw", height: "25vh", ...modalStyle}}>
            <h1>Are you Sure?</h1>
            <div style={{position: "absolute", bottom: 10, right: 10}}>
              <Button onClick={(e) => {handleCloseDeleteModal()}}>Cancel</Button>
              <Button variant="outlined" color="error" onClick={() => deleteUserData()}>Delete My Data!</Button>
            </div>
          </Box>
        </Modal>
      </div>
    </div>
  );
}
