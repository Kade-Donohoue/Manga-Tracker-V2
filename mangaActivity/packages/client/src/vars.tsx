import { dropdownOption } from "./types"
import { useState } from "react"

export let catOptions = [
    {value: "reading", label: "Reading"},
    {value: "notreading", label: "Not Reading"},
    {value: "hold", label: "Hold"},
    {value: "finished", label: "Finished"},
    {value: "inqueue", label: "In Queue"},
    {value: "other", label: "Other"},
    {value: "unsorted", label: "Uncategorized"},
    {value: "%", label: "Any"}
]

export function setCatOptions(newOptions:dropdownOption[]) {
    catOptions = newOptions
}
  
export const ordOptions:dropdownOption[] = [
    {value: "ASC", label: "Ascending"},
    {value: "DESC", label: "Descending"}
]
  
export const methodOptions:dropdownOption[] = [
    {value: "interactTime", label: "Time"},
    {value: "mangaName", label: "Alphabetical"},
    {value: "currentIndex", label: "Chapters Read"}, 
    {value: "userCat", label: "Category"}
]

export let fetchPath:string = "/.proxy"

export function setFetchPath(path:string){
    // console.log(`Changing Path To: ${path}`)
    fetchPath = path
    // console.log(path)
}