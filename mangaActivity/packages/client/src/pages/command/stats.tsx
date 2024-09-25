import {authStore} from '../../stores/authStore'
import { toast } from 'react-toastify'
import React, { useEffect } from "react"
import './stats.css'
import { fetchPath } from '../../vars';

export default function stats() {

  const auth = authStore.getState();
  // console.log(auth)
  if (!auth) {
    console.log("No Auth!")
    return <></>;
  }
  
  async function retrieveStats() {
    const resp = await fetch(`${fetchPath}/api/data/pull/userStats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "access_token": auth.access_token,
          "authId": null
        }),
      })
      if (!resp.ok) return toast.error('Unable to fetch User Stats!')
      const data:{userStats:{"chaptersRead":number, "chaptersUnread":number, "unreadManga": number, "readManga": number},"globalStats":{"trackedManga":number,"totalTrackedChapters":number,"newMangaCount":number,"newChapterCount":number}} = await resp.json()

    document.getElementById('userTrackedMangaCount')!.innerHTML = data.userStats.readManga?.toString()||"???"
    document.getElementById('userUnreadMangaCount')!.innerHTML = data.userStats.unreadManga?.toString()||"???"
    document.getElementById('userReadCount')!.innerHTML = data.userStats.chaptersRead?.toString()||"???"
    document.getElementById('userUnreadCount')!.innerHTML = data.userStats.chaptersUnread?.toString()||"???"

    document.getElementById('globalTrackedMangaCount')!.innerHTML = data.globalStats.trackedManga?.toString()||"???"
    document.getElementById('globalTrackChapters')!.innerHTML = data.globalStats.totalTrackedChapters?.toString()||"???"
    document.getElementById('globalNewMangaCount')!.innerHTML = data.globalStats.newMangaCount?.toString()||"???"
    document.getElementById('globalNewChapCount')!.innerHTML = data.globalStats.newChapterCount?.toString()||"???"
  }

  useEffect(() => {
    retrieveStats()
  }, [])

//   if (!mangaList) return <></>
  return (
    <div className="statistics-container">
      <div className="statistics-section">
        <h2>User Statistics</h2>
        <div className="statistics-box">
          <div className="statistics-item">
            <p>Tracked Manga</p>
            <h3 id="userTrackedMangaCount">???</h3>
          </div>
          <div className="statistics-item">
            <p>Unread Manga</p>
            <h3 id="userUnreadMangaCount">???</h3>
          </div>
          <div className="statistics-item">
            <p>Read Chapters</p>
            <h3 id="userReadCount">???</h3>
          </div>
          <div className="statistics-item">
            <p>Unread Chapters</p>
            <h3 id="userUnreadCount">???</h3>
          </div>
        </div>
      </div>
      <div className="statistics-section">
        <h2>Global Statistics</h2>
        <div className="statistics-box">
          <div className="statistics-item">
            <p>Tracked Manga</p>
            <h3 id="globalTrackedMangaCount">???</h3>
          </div>
          <div className="statistics-item">
            <p>Tracked Chapters</p>
            <h3 id="globalTrackChapters">???</h3>
          </div>
          <div className="statistics-item">
            <p>New Manga (30 Days)</p>
            <h3 id="globalNewMangaCount">???</h3>
          </div>
          <div className="statistics-item">
            <p>New Chapters (30 Days)</p>
            <h3 id="globalNewChapCount">???</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
