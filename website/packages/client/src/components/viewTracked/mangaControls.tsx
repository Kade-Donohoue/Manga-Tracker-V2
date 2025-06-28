// src/components/MangaControls.tsx
import React, { ChangeEvent } from 'react';
import { TextField, Box, FormControlLabel, Checkbox } from '@mui/material';
import Select from 'react-select';
import { dropdownOption } from '../../types';
import { customStyles } from '../../styled';

interface MangaControlsProps {
  currentSearch: string;
  setSearch: (val: string) => void;
  filterOptions: dropdownOption[];
  setFilterOptions: (opts: dropdownOption[]) => void;
  sortSelection: dropdownOption | null;
  setSortSelection: (opt: dropdownOption) => void;
  unreadChecked: boolean;
  setUnreadChecked: (val: boolean) => void;
  catOptions: dropdownOption[] | undefined;
}

const MangaControls: React.FC<MangaControlsProps> = ({
  currentSearch,
  setSearch,
  filterOptions,
  setFilterOptions,
  sortSelection,
  setSortSelection,
  unreadChecked,
  setUnreadChecked,
  catOptions,
}) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  return (
    <div
      className="cardControls"
      style={{
        width: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextField
        id="search"
        label="Search"
        value={currentSearch}
        onChange={handleSearchChange}
        variant="outlined"
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#cccccc',
            },
            '&:hover fieldset': {
              borderColor: '#b3b3b3',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2684ff',
            },
          },
        }}
        InputProps={{ sx: { background: 'inherit', borderColor: '#ccc' } }}
      />

      <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '15%' }}>
        <Select<dropdownOption, true>
          placeholder={'Add Filters'}
          isMulti={true}
          value={filterOptions}
          onChange={(options) => setFilterOptions(options as dropdownOption[])}
          options={catOptions}
          closeMenuOnSelect={false}
          styles={customStyles}
          className="selectField"
          isSearchable={false}
        />
      </Box>

      <Box sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '15%' }}>
        <Select
          value={sortSelection}
          onChange={(selection) => setSortSelection(selection as dropdownOption)}
          options={[
            { value: 'mangaName_asc', label: 'Alphabetical (A → Z)' },
            { value: 'mangaName_desc', label: 'Alphabetical (Z → A)' },
            { value: 'interactTime_desc', label: 'Last Interacted (Newest)' },
            { value: 'interactTime_asc', label: 'Last Interacted (Oldest)' },
            { value: 'currentChap_desc', label: 'Chapters Read (Most)' },
            { value: 'currentChap_asc', label: 'Chapters Read (Least)' },
            { value: 'updateTime_desc', label: 'Last Updated (Recent)' },
            { value: 'updateTime_asc', label: 'Last Updated (Oldest)' },
            { value: 'search', label: 'Title Search' },
          ]}
          styles={customStyles}
          className="selectField"
          isSearchable={false}
        />
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={unreadChecked}
            onChange={(e) => setUnreadChecked(e.target.checked)}
            sx={{
              color: '#ddd',
              '&.Mui-checked': { color: '#22346e' },
            }}
          />
        }
        label="Unread"
        sx={{ color: 'inherit' }}
      />
    </div>
  );
};

export default MangaControls;
