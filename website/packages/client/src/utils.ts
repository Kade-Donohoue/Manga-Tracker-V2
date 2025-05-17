import { toast } from "react-toastify";
import { dropdownOption } from "./types";
import { defaultCategoryOptions, fetchPath } from './vars'

export const fetchUserCategories = async (): Promise<dropdownOption[]> => {
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

  const catData: { message: string; cats: dropdownOption[] } = await response.json();

  const updatedCats = defaultCategoryOptions.map((defaultCat) => {
    const userCat = catData.cats.find((cat) => cat.value === defaultCat.value);
    return userCat ? userCat : defaultCat;
  });

  const customCats = catData.cats.filter(
    (cat) => !defaultCategoryOptions.some((defaultCat) => defaultCat.value === cat.value)
  );

  return [...updatedCats, ...customCats];
};  

export const getStoredValue = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const timeAgo = (oldDate:Date) => {
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

}