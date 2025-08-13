import { useQuery } from '@tanstack/react-query';
import { fetchPath } from '../../vars';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { StatCard } from '../../components/statcard';

type StatsResponse = {
  userStats: {
    readChapters: number;
    trackedChapters: number;
    chaptersUnread: number;
    unreadManga: number;
    readManga: number;
    readThisMonth: number;
    averagePerDay: number;
  };
  globalStats: {
    mangaCount: number;
    trackedChapters: number;
    newManga: number;
    newChapters: number;
    readThisMonth: number;
  };
};

async function fetchUserMangaStats(): Promise<StatsResponse> {
  const resp = await fetch(`${fetchPath}/api/data/pull/userStats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error('Unable to fetch User Stats!');
  }
  return resp.json();
}

export default function Stats() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['userManga', 'stats'],
    queryFn: fetchUserMangaStats,
    placeholderData: {
      userStats: {
        readChapters: -1,
        trackedChapters: -1,
        chaptersUnread: -1,
        unreadManga: -1,
        readManga: -1,
        readThisMonth: -1,
        averagePerDay: -1,
      },
      globalStats: {
        mangaCount: -1,
        trackedChapters: -1,
        newManga: -1,
        newChapters: -1,
        readThisMonth: -1,
      },
    },
    meta: {
      errorMessage: 'Failed to get Your Stats!',
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isError || !data) return <div className="statistics-container">Failed to load stats.</div>;

  const { userStats, globalStats } = data;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Your Statistics
      </Typography>
      <Grid container spacing={2} justifyContent="flex-start">
        <StatCard label="Chapters Read" value={userStats.readChapters} />
        <StatCard label="Chapters Unread" value={userStats.chaptersUnread} />
        <StatCard label="Tracked Manga" value={userStats.readManga} />
        <StatCard label="Unread Manga" value={userStats.unreadManga} />
        <StatCard label="Chapters Read (Month)" value={userStats.readThisMonth} />
        <StatCard label="Average Daily Chapters" value={userStats.averagePerDay} />
      </Grid>

      <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
        Global Statistics
      </Typography>
      <Grid container spacing={2} justifyContent="flex-start">
        <StatCard label="Tracked Manga" value={globalStats.mangaCount} />
        <StatCard label="Tracked Chapters" value={globalStats.trackedChapters} />
        <StatCard label="New Manga (Month)" value={globalStats.newManga} />
        <StatCard label="New Chapters (Month)" value={globalStats.newChapters} />
        <StatCard label="Chapters Read (Month)" value={globalStats.readThisMonth} />
      </Grid>
    </Box>
  );
}
