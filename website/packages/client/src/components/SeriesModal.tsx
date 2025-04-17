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

interface Chapter {
  title: string
  url: string
  key: number
}

interface SeriesModalProps {
  open: boolean
  onClose: () => void
  title: string
  imageUrl: string
  chapters: Chapter[]
  currentChapterUrl: string
  onRemove: () => void
  onChangeCategory: () => void
  onChangeChap: () => void
}

const SeriesModal: React.FC<SeriesModalProps> = ({
  open,
  onClose,
  title,
  imageUrl,
  chapters,
  currentChapterUrl,
  onRemove,
  onChangeCategory,
  onChangeChap
}) => {
  const [selectedChapterUrl, setSelectedChapterUrl] = useState(currentChapterUrl)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const listRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        console.log(currentChapterUrl)
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
  }, [currentChapterUrl, open])

  // Handle list item click to open chapter URL
  const handleChapterClick = (url: string) => {
    window.open(url, '_blank')
    setSelectedChapterUrl(url)
  }

  const handleJumpToLatestChapter = () => {
    const latestChapter = chapters[0]
    const targetElement = listRef.current?.querySelector(`[data-url="${latestChapter.url}"]`)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Check if the chapter is before the current one
  const isChapterRead = (chapterUrl: string) => {
    const currentIndex = chapters.findIndex((chapter) => chapter.url === currentChapterUrl)
    console.log(chapters[currentIndex])
    const chapterIndex = chapters.findIndex((chapter) => chapter.url === chapterUrl)
    return chapterIndex >= currentIndex
  }

  const handleTooltipOpen = () => setTooltipOpen(true)
  const handleTooltipClose = () => setTooltipOpen(false)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Tooltip title={title} enterDelay={500} leaveDelay={200} open={tooltipOpen} onClose={handleTooltipClose} onOpen={handleTooltipOpen}>
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: '1.2rem', sm: '1.5rem' }, // Adjust title font size for mobile
              fontWeight: 'bold',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              WebkitLineClamp: 2, // Limiting title to 2 lines
              textOverflow: 'ellipsis', // Ellipsis after 2 lines
              textAlign: 'center', // Center title on mobile
              overflowWrap: 'break-word', // Ensure the title wraps on smaller screens
            }}
            onClick={handleTooltipOpen}
          >
            {title}
          </Typography>
        </Tooltip>

      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3}>
          {/* Image Container */}
          <Box
            sx={{
            //   width: '100%',
            //   maxWidth: '240px',
            //   height: 'auto',
            //   borderRadius: 16,
            //   boxShadow: '0 6px 14px rgba(0, 0, 0, 0.1)',
            //   objectFit: 'cover',
              mb: { xs: 3, sm: 0 }, // Margin bottom on mobile
            }}
          >
            <img
              src={imageUrl}
              alt={title}
              style={{
                width: '100%',
                maxWidth: '360px',
                height: 'auto',
                borderRadius: 16,
                objectFit: 'cover',
              }}
            />
          </Box>

          {/* Chapters and Controls */}
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
                    opacity: isChapterRead(chapter.url) ? 0.6 : 1, // Dimming read chapters
                    textDecoration: isChapterRead(chapter.url) ? 'line-through' : 'none', // Strikethrough for read chapters
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.08)', // Change on hover
                    },
                  }}
                >
                  <ListItemText
                    primary={'Chapter ' + chapter.title}
                    primaryTypographyProps={{
                      style: {
                        fontWeight: chapter.url === currentChapterUrl ? 'bold' : 'normal',
                        color: chapter.url === currentChapterUrl ? '#1976d2' : 'inherit',
                        fontSize: '14px', // Smaller text for mobile
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
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SeriesModal
