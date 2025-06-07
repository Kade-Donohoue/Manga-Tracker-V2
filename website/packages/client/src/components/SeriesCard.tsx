// SeriesCard.tsx
import React from 'react';
import { Card, CardActionArea, CardContent, CardMedia, Tooltip, Typography } from '@mui/material';
import { dropdownOption, mangaDetails } from '../types';
import { fetchPath } from '../vars';
import { useQuery } from '@tanstack/react-query';
import { fetchUserCategories } from '../utils';

interface Props {
  data: mangaDetails;
  handleContextMenu: (e: React.MouseEvent, mangaId: string) => void;
  openMangaOverview: (mangaId: string) => void;
}

export default function SeriesCard({ data, handleContextMenu, openMangaOverview }: Props) {
  const { data: catOptions, isError } = useQuery<dropdownOption[], Error>({
    queryKey: ['userCategories'],
    queryFn: () => fetchUserCategories(),
    staleTime: 1000 * 60 * 60,
    gcTime: Infinity,
  });

  const findCat = (catVal: string): dropdownOption => {
    return (
      catOptions?.find((cat) => cat.value === catVal) || {
        value: 'unknown',
        label: 'Unknown',
      }
    );
  };

  const checkIndexInRange = (index: number, listLength: number) => {
    if (index < 0) return 0;
    if (index < listLength) return index;
    return listLength - 1;
  };

  const handleAuxClick = (event: React.MouseEvent, mangaId: string) => {
    if (!data) return;
    if (event.button === 1) {
      event.preventDefault();
      let currentUrl = `${data?.urlBase}${
        data?.slugList[data.currentIndex + 1] || data?.slugList.at(-1)
      }`;
      window.open(currentUrl);
    }
  };

  return (
    <Card
      sx={{
        width: 320,
        height: 350,
        backgroundColor: 'black',
        color: 'white',
      }}
      onContextMenu={(e) => handleContextMenu(e, data.mangaId)}
    >
      <CardActionArea
        onClick={() => openMangaOverview(data.mangaId)}
        onAuxClick={(e) => handleAuxClick(e, data.mangaId)}
      >
        <CardMedia
          component="img"
          height="200"
          image={`${
            fetchPath === '/.proxy' ? '/.proxy/image' : import.meta.env.VITE_IMG_URL
          }/${data.mangaId}/${data.imageIndexes?.at(-1) || 0}`}
          alt={`Cover for ${data.mangaName}`}
          style={{ objectPosition: 'top' }}
          loading="lazy"
        />
        <CardContent sx={{ height: 150 }}>
          <Tooltip title={data.mangaName} enterDelay={700}>
            <Typography
              gutterBottom
              variant="h5"
              component="div"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: '2.6em',
              }}
            >
              {data.mangaName}
            </Typography>
          </Tooltip>
          <Typography
            variant="body2"
            component="div"
            color="text.secondary"
            sx={{
              color: 'lightgray',
              position: 'absolute',
              bottom: 10,
            }}
            onContextMenu={(e) => handleContextMenu(e, data.mangaId)}
          >
            <table>
              <tbody>
                <tr>
                  <td>Chapter:</td>
                  <td>{`${data.chapterTextList[
                    checkIndexInRange(data.currentIndex, data.chapterTextList.length)
                  ]
                    .match(/[0-9.]+/g)
                    ?.join('.')}/${data.chapterTextList[data.chapterTextList.length - 1]
                    .match(/[0-9.]+/g)
                    ?.join('.')}`}</td>
                </tr>
                <tr>
                  <td>Category: </td>
                  <td
                    style={{
                      color: findCat(data.userCat)?.color || 'lightgray',
                    }}
                  >
                    {findCat(data.userCat)?.label}
                  </td>
                </tr>
              </tbody>
            </table>
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
