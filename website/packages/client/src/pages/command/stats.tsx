import React from "react"
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import './stats.css'
import { fetchPath } from '../../vars'

type StatsResponse = {
  userStats: {
    chaptersRead: number
    chaptersUnread: number
    unreadManga: number
    readManga: number
  },
  globalStats: {
    trackedManga: number
    totalTrackedChapters: number
    newMangaCount: number
    newChapterCount: number
  }
}

async function fetchUserMangaStats(): Promise<StatsResponse> {
  const resp = await fetch(`${fetchPath}/api/data/pull/userStats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!resp.ok) {
    toast.error('Unable to fetch User Stats!')
    throw new Error('Unable to fetch User Stats!')
  }
  return resp.json()
}

export default function Stats() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['userManga', 'stats'],
    queryFn: fetchUserMangaStats,
    staleTime: 5*60*1000
  })

  if (isLoading) return <div className="statistics-container">Loading stats...</div>
  if (isError || !data) return <div className="statistics-container">Failed to load stats.</div>

  const { userStats, globalStats } = data

  return (
    <div className="statistics-container">
      <div className="statistics-section">
        <h2>User Statistics</h2>
        <div className="statistics-box">
          <div className="statistics-item">
            <p>Tracked Manga</p>
            <h3>{userStats.readManga ?? '???'}</h3>
          </div>
          <div className="statistics-item">
            <p>Unread Manga</p>
            <h3>{userStats.unreadManga ?? '???'}</h3>
          </div>
          <div className="statistics-item">
            <p>Read Chapters</p>
            <h3>{userStats.chaptersRead ?? '???'}</h3>
          </div>
          <div className="statistics-item">
            <p>Unread Chapters</p>
            <h3>{userStats.chaptersUnread ?? '???'}</h3>
          </div>
        </div>
      </div>
      <div className="statistics-section">
        <h2>Global Statistics</h2>
        <div className="statistics-box">
          <div className="statistics-item">
            <p>Tracked Manga</p>
            <h3>{globalStats.trackedManga ?? '???'}</h3>
          </div>
          <div className="statistics-item">
            <p>Tracked Chapters</p>
            <h3>{globalStats.totalTrackedChapters ?? '???'}</h3>
          </div>
          <div className="statistics-item">
            <p>New Manga (30 Days)</p>
            <h3>{globalStats.newMangaCount ?? '???'}</h3>
          </div>
          <div className="statistics-item">
            <p>New Chapters (30 Days)</p>
            <h3>{globalStats.newChapterCount ?? '???'}</h3>
          </div>
        </div>
      </div>
    </div>
  )
}
