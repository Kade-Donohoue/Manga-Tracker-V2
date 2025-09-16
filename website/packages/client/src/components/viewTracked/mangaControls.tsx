import React, { useState, ChangeEvent, useRef } from 'react';
import Select from 'react-select';
import { dropdownOption } from '../../types';
import { customStyles } from '../../styled';

import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Popover from '@mui/material/Popover';
import FilterListIcon from '@mui/icons-material/FilterList';
import Badge from '@mui/material/Badge';
import { useUISetting } from '../../hooks/useUiSetting';

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
  const [inlineFiltersEnabled] = useUISetting('inlineFiltersEnabled', false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  const [open, setOpen] = useState<boolean>(false);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        mt: 1,
      }}
    >
      {/* Search box */}
      <TextField
        id="search"
        label="Search"
        value={currentSearch}
        onChange={handleSearchChange}
        variant="outlined"
        size="small"
        sx={{
          width: inlineFiltersEnabled ? '50vw' : '75vw',
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#ccc' },
            '&:hover fieldset': { borderColor: '#b3b3b3' },
            '&.Mui-focused fieldset': { borderColor: '#2684ff' },
          },
          background: 'inherit',
        }}
      />

      {inlineFiltersEnabled ? (
        <Select<dropdownOption, true>
          placeholder="Add Filters"
          isMulti
          value={filterOptions}
          onChange={(options) => setFilterOptions(options as dropdownOption[])}
          options={catOptions}
          closeMenuOnSelect={false}
          styles={{
            ...customStyles,
            control: (provided, state) => ({
              ...customStyles.control?.(provided, state),
              width: '25vw', // ✅ set width here
            }),
            menu: (provided, state) => ({
              ...customStyles.menu?.(provided, state),
              width: '25vw', // ✅ makes dropdown match
            }),
          }}
          className="selectField"
          isSearchable={false}
        />
      ) : (
        <div />
      )}

      {/* Filter icon */}
      <IconButton onClick={handleClick} size="small">
        <Badge
          color="primary"
          variant="dot"
          invisible={filterOptions.length === 0 && !unreadChecked} // hide badge when no filters
        >
          <FilterListIcon />
        </Badge>
      </IconButton>

      {/* Popover */}
      <Popover
        open={open}
        anchorEl={containerRef.current}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              minWidth: { xs: '90vw', sm: '60vw' }, // responsive width
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Filters On Popover*/}
          {inlineFiltersEnabled ? (
            <div />
          ) : (
            <Select<dropdownOption, true>
              placeholder="Add Filters"
              isMulti
              value={filterOptions}
              onChange={(options) => setFilterOptions(options as dropdownOption[])}
              options={catOptions}
              closeMenuOnSelect={false}
              styles={{
                ...customStyles,
                container: (base) => ({ ...base, width: '100%' }), // fill the popover width
                menuPortal: (base) => ({ ...base, zIndex: 1300 }), // appear above popover
              }}
              menuPortalTarget={document.body}
              className="selectField"
              isSearchable={false}
            />
          )}

          {/* Sort On Popover*/}
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
            styles={{
              ...customStyles,
              container: (base) => ({ ...base, width: '100%' }), // fill the popover width
              menuPortal: (base) => ({ ...base, zIndex: 1300 }), // appear above popover
            }}
            menuPortalTarget={document.body}
            className="selectField"
            isSearchable={false}
          />

          {/* Unread */}
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
          />
        </Box>
      </Popover>
    </Box>
  );
};

export default MangaControls;
