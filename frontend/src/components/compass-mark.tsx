import Box from '@mui/material/Box'

export function CompassMark({ height = 40, blend = false }: { height?: number; blend?: boolean }) {
  return (
    <Box
      component="img"
      src="/compass-group-es.png"
      alt="Compass Group España"
      sx={{
        height,
        width: 'auto',
        display: 'block',
        mixBlendMode: blend ? 'screen' : 'normal',
      }}
    />
  )
}
