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
    return userCat ? { ...defaultCat, color: userCat.color || defaultCat.color } : defaultCat;
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
