import discordSdk from '../../discordSdk';
import {authStore} from '../../stores/authStore';
import ReactJsonView from '../../components/ReactJsonView';
import React, { useEffect } from "react"
import './stats.css'

export default function stats() {

  const auth = authStore.getState();
  console.log(auth)
  if (!auth) {
    console.log("No Auth!!!!!!!!!!!!!!!!")
    return <></>;
  }
  
  async function retrieveStats() {
    const resp = await fetch('/api/data/pull/userStats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "access_token": auth.access_token,
          "authId": null
        }),
      })
      if (resp.status!=200) return
      const data:{userStats:{"chaptersRead":number, "chaptersUnread":number, "unreadManga": number, "readManga": number},"globalStats":{"trackedManga":number}} = await resp.json()
    
    // emptySelector(selector)

    document.getElementById('userTrackedMangaCount')!.innerHTML = data.userStats.readManga.toString()
    document.getElementById('userUnreadMangaCount')!.innerHTML = data.userStats.unreadManga.toString()
    document.getElementById('userReadCount')!.innerHTML = data.userStats.chaptersRead.toString()
    document.getElementById('userUnreadCount')!.innerHTML = data.userStats.chaptersUnread.toString()

    document.getElementById('globalTrackedMangaCount')!.innerHTML = data.globalStats.trackedManga.toString()
    
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
            <p>Unread Manga</p>
            <h3 id="globalUnreadMangaCount">???</h3>
          </div>
          <div className="statistics-item">
            <p>Read Chapters</p>
            <h3 id="globalReadCount">???</h3>
          </div>
          <div className="statistics-item">
            <p>Unread Chapters</p>
            <h3 id="globalUnreadCount">???</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
