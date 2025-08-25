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
        <Box>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={0.5}
            sx={{ mb: 0.5 }}
          >
            {hasCompare && (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                lineHeight={1}
              >
                {isUp ? (
                  <>
                    <ArrowDropUpIcon color="success" />
                    <Typography variant="caption" color="success.main" sx={{ mt: -1.5 }}>
                      +{diff.toLocaleString()}
                    </Typography>
                  </>
                ) : isDown ? (
                  <>
                    <Typography variant="caption" color="error.main" sx={{ mb: -1.5 }}>
                      {diff.toLocaleString()}
                    </Typography>
                    <ArrowDropDownIcon color="error" />
                  </>
                ) : null}
              </Box>
            )}

            <Typography variant="h4" component="div" gutterBottom>
              {hasValue ? (
                value!.toLocaleString()
              ) : (
                <Skeleton variant="text" height="2.615rem" width="4rem" />
              )}
            </Typography>
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
