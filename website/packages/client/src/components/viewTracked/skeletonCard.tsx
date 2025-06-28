import { Card, CardActionArea, CardContent, Skeleton } from '@mui/material';

const SkeletonCard = () => (
  <Card sx={{ width: 320, height: 350, backgroundColor: 'black', color: 'white' }}>
    <CardActionArea sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" height={30} width="80%" />
        <Skeleton variant="text" height={20} width="60%" />
        <Skeleton variant="text" height={20} width="40%" />
      </CardContent>
    </CardActionArea>
  </Card>
);

export default SkeletonCard;
