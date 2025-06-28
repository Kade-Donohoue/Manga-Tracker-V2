import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { mangaDetails } from '../types';
import { fetchPath } from '../vars';

export function useUserManga() {
  return useQuery({
    queryKey: ['userManga', 'viewTracked'],
    queryFn: async (): Promise<Map<string, mangaDetails>> => {
      const response = await fetch(`${fetchPath}/api/data/pull/getUserManga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData: { message?: string } = await response.json();
        throw new Error(errorData.message || 'Failed to fetch manga');
      }

      const results = (await response.json()) as { mangaDetails: mangaDetails[] };

      if (results.mangaDetails.length <= 0) {
        toast.info('No Manga!');
      }

      return new Map(results.mangaDetails.map((m) => [m.mangaId, m]));
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
