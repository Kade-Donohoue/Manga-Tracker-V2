import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

export const StatCard = ({
  label,
  value,
  compareValue,
}: {
  label: string;
  value: number | null;
  compareValue?: number | null;
}) => {
  const hasValue = typeof value === 'number';
  const hasCompare = typeof compareValue === 'number' && hasValue;

  const diff = hasCompare && compareValue !== null ? value! - compareValue! : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
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
        <Box textAlign="center" width="100%">
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{ position: 'relative', mb: 0.5 }}
          >
            <Typography variant="h4" component="div" gutterBottom>
              {hasValue ? (
                value!.toLocaleString()
              ) : (
                <Skeleton variant="text" height="2.615rem" width="4rem" />
              )}
            </Typography>

            {hasCompare && (
              <Box
                sx={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-75%)', // keeps number aligned to value center
                  textAlign: 'center',
                }}
              >
                {/* Number stays fixed at center */}
                <Typography variant="caption" color={isUp ? 'success.main' : 'error.main'}>
                  {isUp ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                </Typography>

                {/* Arrow floats separately */}
                {isUp && (
                  <ArrowDropUpIcon
                    color="success"
                    fontSize="small"
                    sx={{
                      position: 'absolute',
                      top: '-0.75rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
                {isDown && (
                  <ArrowDropDownIcon
                    color="error"
                    fontSize="small"
                    sx={{
                      position: 'absolute',
                      bottom: '-0.75rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
              </Box>
            )}
          </Box>

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
};
