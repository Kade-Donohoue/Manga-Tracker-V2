import MoreVertIcon from '@mui/icons-material/MoreVert';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardHeader from '@mui/material/CardHeader';
import CardActions from '@mui/material/CardActions';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';

export default function FriendCardSkeleton() {
  return (
    <Card sx={{ width: 320, height: 150 }}>
      <CardActionArea disabled>
        <CardHeader
          avatar={
            <Skeleton variant="circular">
              <Avatar />
            </Skeleton>
          }
          action={
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          }
          title={<Skeleton variant="text" width="80%" height={24} />}
          subheader={<Skeleton variant="text" width="60%" height={20} />}
        />

        <CardActions sx={{ display: 'flex', justifyContent: 'center', mt: -1 }}>
          <Box sx={{ textAlign: 'center', px: 2 }}>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={40} height={20} />
          </Box>
          <Box sx={{ borderLeft: '1px solid #ccc', height: '60px', mx: 2 }} />
          <Box sx={{ textAlign: 'center', px: 2 }}>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={40} height={20} />
          </Box>
        </CardActions>
      </CardActionArea>
    </Card>
  );
}
