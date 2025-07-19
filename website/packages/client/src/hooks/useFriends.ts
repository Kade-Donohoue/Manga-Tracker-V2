import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchPath } from '../vars';
import { friend } from '../types';

export function useFriends() {
  return useQuery<{ message: string; data: friend[] }, Error>({
    queryKey: ['friends', 'accepted'],
    queryFn: async () => {
      const resp = await fetch(`${fetchPath}/api/friends/getFriends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) {
        toast.error('Unable To fetch friends!');
        throw new Error('Unable to fetch User Stats!');
      }
      return resp.json();
    },
    staleTime: 30 * 1000,
  });
}
