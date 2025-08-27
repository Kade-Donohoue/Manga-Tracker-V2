import { createTheme, ThemeProvider } from '@mui/material/styles';
import { indigo, grey } from '@mui/material/colors';
import { StylesConfig } from 'react-select';
import { dropdownOption } from '../types';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: indigo,
    background: {
      default: grey[50],
      paper: grey[100],
    },
    text: {
      primary: grey[900],
      secondary: grey[700],
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: indigo,
    background: {
      default: '#202425ff',
      paper: '#202425ff',
    },
    text: {
      primary: grey[50],
      secondary: grey[200],
    },
  },
});

export const customStyles: StylesConfig<dropdownOption, boolean> = {
  control: (provided) => ({
    ...provided,
    backgroundColor: darkTheme.palette.background.default,
    width: '100%',
    margin: '8px 0',
  }),
  input: (provided) => ({
    ...provided,
    color: darkTheme.palette.text.primary,
    margin: 0,
    padding: '2px',
    width: '100%',
  }),
  singleValue: (provided, state) => ({
    ...provided,
    color: state.data.color || darkTheme.palette.text.primary,
    margin: 0,
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: darkTheme.palette.background.paper,
    borderRadius: '4px',
    marginTop: 0,
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? darkTheme.palette.primary.main
      : darkTheme.palette.background.paper,
    color: state.data.color || darkTheme.palette.text.primary,
    '&:hover': {
      backgroundColor: darkTheme.palette.action.hover,
    },
    padding: '12px 20px',
  }),
  multiValue: (provided, state) => {
    const bgColor = state.data.color || darkTheme.palette.background.paper;
    return {
      ...provided,
      backgroundColor: bgColor,
      borderRadius: '12px',
      padding: '2px 6px',
      margin: '2px 4px',
    };
  },
  multiValueLabel: (provided, state) => {
    const bgColor = state.data.color || darkTheme.palette.background.paper;
    return {
      ...provided,
      color: getReadableTextColor(bgColor, darkTheme.palette.text.primary),
      fontSize: '0.9em',
      padding: '0 6px',
    };
  },
  multiValueRemove: (provided, state) => {
    const bgColor = state.data.color || darkTheme.palette.background.paper;
    return {
      ...provided,
      color: getReadableTextColor(bgColor, darkTheme.palette.text.secondary),
      ':hover': {
        backgroundColor: darkTheme.palette.action.hover,
        color: darkTheme.palette.text.primary,
      },
    };
  },
};

function getReadableTextColor(bgColor: string, fallback: string) {
  // crude luminance check
  const c = bgColor.substring(1); // strip #
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000' : '#fff'; // black on light, white on dark
}
