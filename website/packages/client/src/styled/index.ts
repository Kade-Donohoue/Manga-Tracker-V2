import { createStitches } from '@stitches/react';
import { slate, slateDark, indigo, indigoDark } from '@radix-ui/colors';
import { StylesConfig } from 'react-select';
import { dropdownOption } from '../types';

export const { styled, css, globalCss, keyframes, getCssText, theme, createTheme, config } =
  createStitches({
    media: {
      small: '(max-width: 640px)',
      xsmall: '(max-width: 200px)',
    },
    theme: {
      colors: {
        ...slate,
        ...indigo,
      },
    },
  });

export const darkTheme = createTheme({
  colors: {
    ...slateDark,
    ...indigoDark,
  },
});

export const customStyles: StylesConfig<dropdownOption, boolean> = {
  control: (provided, state) => ({
    ...provided,
    width: '100%',
    backgroundColor: '#121212',
    margin: '8px 0',
  }),
  input: (provided) => ({
    ...provided,
    color: '#fff',
    margin: '0',
    padding: '2px',
    width: '100%',
  }),
  singleValue: (provided, state) => ({
    ...provided,
    color: state.data.color || '#fff',
    margin: '0',
  }),
  menuList: (provided) => ({
    ...provided,
    padding: '0',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#121212',
    borderRadius: '4px',
    marginTop: '0',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#6b6b6b' : '#121212',
    color: state.data.color || '#fff',
    '&:hover': {
      backgroundColor: '#6b6b6b',
    },
    padding: '12px 20px',
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    padding: '2px 6px',
    margin: '2px 4px',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#fff',
    fontSize: '0.9em',
    padding: '0 6px',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#ccc',
    ':hover': {
      backgroundColor: '#444',
      color: '#fff',
    },
  }),
};
