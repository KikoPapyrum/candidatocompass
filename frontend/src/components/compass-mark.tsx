import Box from '@mui/material/Box'

export function CompassMark({ height = 40, blend = false, ink = false }: { height?: number; blend?: boolean; ink?: boolean }) {
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
        filter: ink ? 'brightness(0)' : undefined,
      }}
    />
  )
}
