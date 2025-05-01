import React, { useRef, useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

import { mangaDetails } from '../types' // Update path if needed

interface SeriesModalProps {
  open: boolean
  manga: mangaDetails | null
  onUnsetManga: () => void
  onRemove: () => void
  onChangeCategory: () => void
  onChangeChap: () => void
}

const SeriesModal: React.FC<SeriesModalProps> = ({
  open,
  manga,
  onUnsetManga,
  onRemove,
  onChangeCategory,
  onChangeChap
}) => {
  const listRef = useRef<HTMLUListElement | null>(null)
  const [tooltipOpen, setTooltipOpen] = useState(false)

  const currentChapterUrl = manga ? manga.urlBase + manga.slugList[manga.currentIndex] : ''

  useEffect(() => {
    if (open && manga) {
      const timer = setTimeout(() => {
        if (listRef.current) {
          const currentChapterElement = listRef.current.querySelector(
            `[data-url="${currentChapterUrl}"]`
          )
          if (currentChapterElement) {
            currentChapterElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentChapterUrl, open, manga])

  if (!manga) return null

  const chapters = manga.slugList.map((slug, index) => ({
    title: manga.chapterTextList[index],
    url: manga.urlBase + slug,
    key: index
  }))

  const handleChapterClick = (url: string) => {
    window.open(url, '_blank')
  }

  const handleJumpToLatestChapter = () => {
    const latestChapter = chapters[0]
    const targetElement = listRef.current?.querySelector(`[data-url="${latestChapter.url}"]`)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const isChapterRead = (chapterUrl: string) => {
    const currentIndex = chapters.findIndex((chapter) => chapter.url === currentChapterUrl)
    const chapterIndex = chapters.findIndex((chapter) => chapter.url === chapterUrl)
    return chapterIndex >= currentIndex
  }

  return (
    <Dialog open={open} onClose={onUnsetManga} maxWidth="md" fullWidth>
      <DialogTitle>
        <Tooltip
          title={manga.mangaName}
          enterDelay={500}
          leaveDelay={200}
          open={tooltipOpen}
          onClose={() => setTooltipOpen(false)}
          onOpen={() => setTooltipOpen(true)}
        >
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: '1.2rem', sm: '1.5rem' },
              fontWeight: 'bold',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              WebkitLineClamp: 2,
              textOverflow: 'ellipsis',
              textAlign: 'center',
              overflowWrap: 'break-word',
            }}
            onClick={() => setTooltipOpen(true)}
          >
            {manga.mangaName}
          </Typography>
        </Tooltip>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3}>
          <Box>
            <img
              src={`${import.meta.env.VITE_IMG_URL}/${manga.mangaId || 'mangaNotFoundImage'}`}
              alt={manga.mangaName}
              style={{
                width: '100%',
                maxWidth: '360px',
                height: 'auto',
                borderRadius: 16,
                objectFit: 'cover',
              }}
            />
          </Box>

          <Box flex={1} sx={{ overflowY: 'auto', maxHeight: '60vh' }}>
            <Typography variant="body1" gutterBottom>
              Click on a chapter or jump to the current/latest chapter:
            </Typography>

            <Button
              onClick={handleJumpToLatestChapter}
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mb: 2 }}
            >
              Jump to Latest Chapter
            </Button>

            <List ref={listRef} sx={{ maxHeight: 400, overflowY: 'auto', mt: 3 }}>
              {chapters.map((chapter) => (
                <ListItem
                  key={chapter.key}
                  onClick={() => handleChapterClick(chapter.url)}
                  data-url={chapter.url}
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'transparent',
                    opacity: isChapterRead(chapter.url) ? 0.6 : 1,
                    textDecoration: isChapterRead(chapter.url) ? 'line-through' : 'none',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.08)',
                    },
                  }}
                >
                  <ListItemText
                    primary={`Chapter ${chapter.title}`}
                    primaryTypographyProps={{
                      style: {
                        fontWeight: chapter.url === currentChapterUrl ? 'bold' : 'normal',
                        color: chapter.url === currentChapterUrl ? '#1976d2' : 'inherit',
                        fontSize: '14px',
                      },
                    }}
                  />
                  {isChapterRead(chapter.url) && (
                    <IconButton edge="end" aria-label="read" disabled>
                      <CheckCircleIcon style={{ color: '#4caf50' }} />
                    </IconButton>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onRemove} color="error" variant="contained">
          Remove
        </Button>
        <Button onClick={onChangeChap} color="primary" variant="contained">
          Change Chapter
        </Button>
        <Button onClick={onChangeCategory} color="primary" variant="contained">
          Change Category
        </Button>
        <Button onClick={onUnsetManga} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SeriesModal
