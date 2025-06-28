import { toast } from 'react-toastify';
import { categoryOption, dropdownOption, mangaDetails } from './types';
import { defaultCategoryOptions, fetchPath } from './vars';

/**
 * Fetches the user's category options from the server.
 * Sends a POST request to the `/api/data/pull/pullUserCategories` endpoint.
 *
 * If the request fails, displays a toast error and throws an exception.
 * After fetching, it ensures that all default categories exist in the result.
 * Missing defaults are appended to the category list with updated positions.
 *
 * @returns A sorted array of category options by their position.
 */
export const fetchUserCategories = async (): Promise<categoryOption[]> => {
  const response = await fetch(`${fetchPath}/api/data/pull/pullUserCategories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    toast.error('Unable to get User Cats');
    throw new Error('Failed to fetch user categories');
  }

  const catData: { message: string; cats: categoryOption[] } = await response.json();

  //Readds defaults if they dont get returned
  for (const defaultCat of defaultCategoryOptions) {
    const exists = catData.cats.some((cat) => cat.value === defaultCat.value);
    if (!exists) {
      catData.cats.push({ ...defaultCat, position: catData.cats.length });
    }
  }

  return catData.cats.sort((a, b) => a.position - b.position);
};

export const getStoredValue = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

/**
 * calculates how long ago a event happened and returns it in a human readable form
 * @param oldDate Time to calculate how long ago
 * @returns How long since date happened in '3 Days Ago' format
 */
export const timeAgo = (oldDate: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - oldDate.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `Just Now`;
};

/**
 * Creates and returns a debounced version of the provided function.
 * The debounced function delays invoking `func` until after `delay` milliseconds
 * have elapsed since the last time the debounced function was called.
 *
 * Useful for limiting the rate at which a function is executed, such as
 * handling user input events like resizing, typing, or scrolling.
 *
 * @param func - The function to debounce.
 * @param delay - The number of milliseconds to delay.
 * @returns A debounced version of the original function.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

export function checkFilter(
  manga: mangaDetails,
  filterOptions: dropdownOption[] | null,
  unreadChecked: boolean
): boolean {
  if (unreadChecked && manga.chapterTextList.length - 1 <= manga.currentIndex) {
    return false;
  }

  if (!filterOptions || filterOptions.length === 0) {
    return true;
  }

  return filterOptions.some((cat) => cat.value === manga.userCat);
}
