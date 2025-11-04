import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useUISetting } from '../../hooks/useUiSetting';

const SkeletonCard = () => {
  const [progressBarEnabled] = useUISetting('progressBarEnabled', true);
  const [compactCardsEnabled] = useUISetting('compactCardsEnabled', false);

  return (
    <Card
      elevation={3}
      sx={{
        width: 280,
        borderRadius: 2,
        overflow: 'visible',
        position: 'relative',
        bgcolor: 'background.paper',
      }}
    >
      <CardActionArea sx={{ display: 'block', textAlign: 'left' }}>
        {/* Image */}
        <Box
          sx={{
            width: '100%',
            height: compactCardsEnabled ? 150 : 0,
            paddingTop: compactCardsEnabled ? 0 : `${(720 / 480) * 100}%`,
            position: 'relative',
            overflow: 'hidden',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        >
          <Skeleton
            variant="rectangular"
            width={'100%'}
            height={compactCardsEnabled ? 350 : '100%'}
          />
          {/* Category Chip */}
          <Skeleton
            variant="rectangular"
            width={60}
            height={20}
            sx={{ position: 'absolute', top: 8, left: 8, borderRadius: 1 }}
          />
        </Box>

        <CardContent sx={{ pt: 1, pb: 2 }}>
          <Stack spacing={0.5}>
            {/* Title */}
            <Skeleton variant="text" height={24} width="80%" />

            {/* Chapter info + avatars */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Skeleton variant="text" height={18} width="40%" />
              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 16, height: 16 } }}>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} variant="circular" width={16} height={16} />
                ))}
              </AvatarGroup>
            </Box>

            {/* Progress bar */}
            {progressBarEnabled ? (
              <Box sx={{ width: '100%', mt: 1 }}>
                <Skeleton variant="rectangular" height={6} />
              </Box>
            ) : (
              <div />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default SkeletonCard;
