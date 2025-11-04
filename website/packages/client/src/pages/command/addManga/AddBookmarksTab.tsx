import React, { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select, { StylesConfig } from 'react-select';
import { Box, Button, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { dropdownOption } from '../../../types';
import { customStyles } from '../../../styled/index';
import { useUserCategories } from '../../../hooks/useUserCategories';
import { fetchPath } from '../../../vars';

interface BookmarkNode {
  type: string;
  title?: string;
  name?: string;
  url?: string;
  uri?: string;
  children?: BookmarkNode[];
  version?: number;
}

interface dropdownOptionBookmark {
  value: BookmarkNode | string;
  label: string;
}

export default function AddBookmarksTab() {
  const queryClient = useQueryClient();
  const { data: catOptions } = useUserCategories();
  const [selectedCat, setSelectedCat] = useState<dropdownOption | null>(catOptions?.[0] || null);
  const [folders, setFolders] = useState<dropdownOptionBookmark[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<dropdownOptionBookmark | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [addedMangaCount, setAddedMangaCount] = useState<number>(0);

  async function submitBookmarkManga() {
    if (!selectedFolder || isLoading) return;
    if (typeof selectedFolder.value === 'string') return;

    const notif = toast.loading('Adding Manga!');
    setIsLoading(true);
    setShowError(false);
    setErrorList([]);

    const currentUrls: string[] = [];
    pullUrlsFromFolder(selectedFolder.value, currentUrls);
    if (currentUrls.length === 0) {
      toast.update(notif, {
        render: 'No Manga In Folder!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${fetchPath}/api/data/add/addManga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCat: selectedCat?.value, urls: currentUrls }),
      });

      if (!res.ok) throw new Error('Internal Server Error');
      const { results }: { results: { url: string; message: string; success: boolean }[] } =
        await res.json();

      let addedCount = 0;
      const errors: string[] = [];
      results.forEach((m) => (m.success ? addedCount++ : errors.push(`${m.url}: ${m.message}`)));

      setAddedMangaCount(addedCount);
      setErrorList(errors);
      setShowError(errors.length > 0);
      queryClient.invalidateQueries({ queryKey: ['userManga'] });

      toast.update(notif, {
        render:
          errors.length === 0 ? 'Manga Successfully Added!' : 'Unable to Add 1 or More Manga!',
        type: errors.length === 0 ? 'success' : 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } catch (err) {
      console.error(err);
      toast.update(notif, {
        render: 'An Unknown Error has Occurred',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function parseJson(file: any) {
    try {
      const loadedJson = await JSON.parse(await file.target.files[0].text());
      const folderNodes: dropdownOptionBookmark[] = [];
      await pullFolders(loadedJson, folderNodes);
      setFolders(folderNodes);
    } catch (err) {
      console.error(err);
    }
  }

  async function pullFolders(node: BookmarkNode, folders: dropdownOptionBookmark[], path = '') {
    if (!node.type) {
      for (const [key, value] of Object.entries(node)) {
        if (value instanceof Object) await pullFolders(value as BookmarkNode, folders, path);
      }
    } else if (
      (node.type === 'folder' || node.type === 'text/x-moz-place-container') &&
      node.children?.length
    ) {
      if (node.name || node.title) path += `/${node.name || node.title}`;
      if (checkForMangaUrl(node)) folders.push({ value: node, label: path });
    }
    if (node.children) {
      for (const child of node.children) await pullFolders(child, folders, path);
    }
  }

  function checkForMangaUrl(node: BookmarkNode) {
    return node.children?.some((child) => {
      const url = (child.url || child.uri || '').toLowerCase();
      return url.includes('manga') || url.includes('asura');
    });
  }

  function pullUrlsFromFolder(node: BookmarkNode, urls: string[]) {
    node.children?.forEach((child) => {
      const url = (child.url || child.uri || '').toLowerCase();
      if (url.includes('manga') || url.includes('asura')) urls.push(url);
    });
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" mb={1}>
        Import Bookmarks
      </Typography>
      <input type="file" onChange={parseJson} style={{ marginBottom: '16px' }} />
      {folders.length > 0 && (
        <>
          <Typography>Select a Folder:</Typography>
          <Select
            value={selectedFolder}
            onChange={setSelectedFolder}
            options={folders}
            styles={customStyles as StylesConfig<dropdownOptionBookmark, false>}
          />
          <Box sx={{ mt: 2 }}>
            <Typography>Choose a Category:</Typography>
            <Select
              value={selectedCat}
              onChange={(cat) => setSelectedCat(cat as dropdownOption)}
              options={catOptions}
              styles={customStyles}
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2, width: '100%' }}
            onClick={submitBookmarkManga}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Add Manga!'}
          </Button>
          {showError && errorList.length > 0 && (
            <Box sx={{ mt: 1, color: 'error.main' }}>
              {errorList.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </Box>
          )}
        </>
      )}
      <Typography variant="h6" mb={1} mt={5}>
        How To Import Bookmarks
      </Typography>
      <ul>
        <li>Click Choose File. </li>
        <li>
          Find your bookmarks json file. Windows Paths:
          <ul>
            <li>
              Chrome: <b>%localappdata%\Google\Chrome\User Data\Default\Bookmarks</b>
            </li>
            <li>Firefox: Backup Bookmarks in manager</li>
            <li>
              Opera GX: <b>%appdata%\Opera Software\Opera GX Stable\Bookmarks</b>
            </li>
          </ul>
        </li>
        <li>Select Folder you want imported.</li>
        <li>Select Category you want manga added to.</li>
        <li>Click Submit!</li>
      </ul>
    </Box>
  );
}
