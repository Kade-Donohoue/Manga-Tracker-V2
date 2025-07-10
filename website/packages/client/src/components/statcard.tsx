import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

export const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Grid item xs="auto" sm="auto" md="auto" lg="auto">
    <Card
      elevation={2}
      sx={{
        minHeight: 120,
        minWidth: 200,
        maxWidth: 240,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 2,
        py: 2,
        mx: 'auto',
      }}
    >
      <Box>
        <Typography
          variant="h4"
          component="div"
          gutterBottom
        >
          {value && value != -1 ? (
            value.toLocaleString()
          ) : (
            <Skeleton variant="text" height="2.615rem" />
          )}
        </Typography>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          noWrap
          sx={{
            maxWidth: 240,
            mx: 'auto',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Card>
  </Grid>
);
