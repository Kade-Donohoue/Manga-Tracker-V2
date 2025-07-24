import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { defaultCategoryOptions, fetchPath } from '../vars';
import { categoryOption, dropdownOption } from '../types';

export function useUserCategories() {
  return useQuery<categoryOption[], Error>({
    queryKey: ['userCategories'],
    queryFn: async () => {
      const response = await fetch(`${fetchPath}/api/data/pull/pullUserCategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        toast.error('Unable to get User Categories');
        throw new Error('Failed to fetch user categories');
      }

      const catData: { message: string; cats: categoryOption[] } = await response.json();

      // Re-add defaults if missing
      for (const defaultCat of defaultCategoryOptions) {
        const exists = catData.cats.some((cat) => cat.value === defaultCat.value);
        if (!exists) {
          catData.cats.push({ ...defaultCat, position: catData.cats.length });
        }
      }

      return catData.cats.sort((a, b) => a.position - b.position);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    // cacheTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
