import { categoryOption, dropdownOption } from './types';

export let defaultCategoryOptions: categoryOption[] = [
  { value: 'reading', label: 'Reading', color: '#FFFFFF', public: false, stats: true, position: 0 },
  {
    value: 'notreading',
    label: 'Not Reading',
    color: '#FFFFFF',
    public: false,
    stats: true,
    position: 1,
  },
  {
    value: 'dropped',
    label: 'Dropped',
    color: '#FFFFFF',
    public: false,
    stats: true,
    position: 2,
  },
  {
    value: 'hold',
    label: 'Hold',
    color: '#FFFFFF',
    public: false,
    stats: true,
    position: 3,
  },
  {
    value: 'finished',
    label: 'Finished',
    color: '#FFFFFF',
    public: false,
    stats: true,
    position: 4,
  },
  {
    value: 'inqueue',
    label: 'In Queue',
    color: '#FFFFFF',
    public: false,
    stats: true,
    position: 5,
  },
  {
    value: 'other',
    label: 'Other',
    color: '#FFFFFF',
    public: false,
    stats: true,
    position: 6,
  },
  {
    value: 'unsorted',
    label: 'Uncategorized',
    color: '#FFFFFF',
    public: false,
    stats: true,
    position: 7,
  },
  // {
  //   value: '%',
  //   label: 'add filters',
  //   color: '#FFFFFF',
  //   public: false,
  //   stats: true,
  //   position: 8,
  // },
];

export const ordOptions: dropdownOption[] = [
  { value: 'ASC', label: 'Ascending' },
  { value: 'DESC', label: 'Descending' },
];

export const methodOptions: dropdownOption[] = [
  { value: 'interactTime', label: 'Time' },
  { value: 'mangaName', label: 'Alphabetical' },
  { value: 'currentIndex', label: 'Chapters Read' },
  { value: 'userCat', label: 'Category' },
];

export let fetchPath: string = '';

export function setFetchPath(path: string) {
  // console.log(`Changing Path To: ${path}`)
  fetchPath = path;
  // console.log(path)
}
