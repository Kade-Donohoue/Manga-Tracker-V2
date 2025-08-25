import { useQuery } from '@tanstack/react-query';
import { fetchPath } from '../../vars';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { StatCard } from '../../components/statcard';

type StatsResponse = {
  userStats: {
    readChapters: number | null;
    trackedChapters: number | null;
    chaptersUnread: number | null;
    unreadManga: number | null;
    readManga: number | null;
    readThisMonth: number | null;
    averagePerDay: number | null;
    priorAveragePerDay: number | null;
  };
  globalStats: {
    mangaCount: number | null;
    trackedChapters: number | null;
    newManga: number | null;
    newChapters: number | null;
    readThisMonth: number | null;
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
        readChapters: null,
        trackedChapters: null,
        chaptersUnread: null,
        unreadManga: null,
        readManga: null,
        readThisMonth: null,
        averagePerDay: null,
        priorAveragePerDay: null,
      },
      globalStats: {
        mangaCount: null,
        trackedChapters: null,
        newManga: null,
        newChapters: null,
        readThisMonth: null,
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
        <StatCard
          label="Average Daily Chapters"
          value={userStats.averagePerDay}
          compareValue={userStats.priorAveragePerDay}
        />
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
