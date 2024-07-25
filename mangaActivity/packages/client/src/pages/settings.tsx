import React, { ChangeEvent, TextareaHTMLAttributes } from 'react';
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

export default function settings() {
  const [editRows, setEditRows] = React.useState<string[]>([])
  const [localCats, setLocalCats] = React.useState<dropdownOption[]>(catOptions)
  const auth = authStore.getState()

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
    catOptions.push({value: `user:${editRows[i]}`, label: editRows[i]})
    setLocalCats(catOptions)
    console.log(catOptions)

    removeRow(i)

    fetch('/api/data/update/updateUserCategories', {
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

  async function removeCategory(i:number) {
    let tempOptions = [...catOptions]
    tempOptions.splice(i, 1)
    setCatOptions(tempOptions)
    setLocalCats(tempOptions)

    // removeRow(i)

    fetch('/api/data/update/updateUserCategories', {
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

  return (
    <div style={{padding: 32}}>
      <div>
        <h1>Settings</h1>
        <table style={{border: 1, borderCollapse: "separate"}}>
            <tr>
                <th>Category Name</th>
                <th>Remove?</th>
            </tr>
            {localCats.map((category, i) => {
                return (
                <tr>
                    <th>{category.label}</th>
                    <th><IconButton disabled={!category.value.includes("user:")} sx={{"&.Mui-disabled": {color:"gray"}}} color="error" onClick={(e) => removeCategory(i)}><DeleteIcon/></IconButton></th>
                </tr>)
            })}
            {editRows.map((currentVal, i) => {
                return (
                    <tr>
                        <th><input type="text" value={currentVal as string} onChange={(e:ChangeEvent<HTMLInputElement>) => handleRowChange(e, i)}></input></th>
                        <th>
                            <IconButton color="primary" onClick={(e) => {saveCategory(i)}}><CheckCircleRoundedIcon/></IconButton>
                            <IconButton color="error" onClick={(e) => {removeRow(i)}}><DeleteIcon/></IconButton>
                        </th>
                </tr>
                )
            })}
            <tr style={{}}><Button startIcon={<AddCircleIcon/>} onClick={(e) => {setEditRows([...editRows, ""])}}>add Category</Button></tr>
        </table>
      </div>
    </div>
  );
}
