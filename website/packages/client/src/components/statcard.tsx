import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/GridLegacy';
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
  const hasCompare = typeof compareValue === 'number' && hasValue && compareValue != value;

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
            justifyContent="center"
            alignItems="center"
            sx={{ position: 'relative', mb: 0.5 }}
          >
            <Box display="inline-block" position="relative">
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
                    top: '35%',
                    left: '100%',
                    transform: 'translateY(-50%)',
                    ml: 1,
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    color={isUp ? 'success.main' : 'error.main'}
                    sx={{ lineHeight: 1 }}
                  >
                    {isUp ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                  </Typography>

                  {isUp && (
                    <ArrowDropUpIcon
                      color="success"
                      fontSize="small"
                      sx={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        mb: -1.5,
                      }}
                    />
                  )}
                  {isDown && (
                    <ArrowDropDownIcon
                      color="error"
                      fontSize="small"
                      sx={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        mt: -1.5,
                      }}
                    />
                  )}
                </Box>
              )}
            </Box>
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
