import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'

import { useAuthStore } from '../auth/auth-store'
import { CompassMark } from '../components/compass-mark'

export function HelpPage() {
  const token = useAuthStore((state) => state.token)
  return (
    <Stack sx={{ minHeight: '100dvh', bgcolor: 'background.default', alignItems: 'center' }}>
      <Stack sx={{ width: '100%', maxWidth: 480, bgcolor: 'background.paper', minHeight: '100dvh' }} spacing={2}>
        <Box sx={{ bgcolor: '#222C36', px: 3, py: 2 }}>
          <CompassMark height={44} />
        </Box>
        <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
        <Typography variant="h5">Bienvenido a Ready to Work</Typography>
        <Typography>
          Desde esta aplicación te registras como candidato. Te pediremos tus datos personales y los documentos necesarios para la contratación.
          Si tienes alguna dificultad, escribe a documentacion.bilbao@compass-group.es.
        </Typography>
        <Typography variant="h6">Registro</Typography>
        <Typography>Tu usuario es el DNI o NIE. La contraseña tiene al menos 8 caracteres, con mayúsculas, minúsculas y números. El email se pide dos veces porque es el canal de aviso.</Typography>
        <Typography>Tras registrarte, recibirás un código de 6 dígitos en tu email para confirmar la cuenta.</Typography>
        <Typography variant="h6">Uso</Typography>
        <Typography>1. Datos: rellena los campos obligatorios.</Typography>
        <Typography>2. Documentos: sube jpg, png o pdf. En el móvil puedes elegir un archivo o hacer una foto. Baja la resolución si la foto es muy grande.</Typography>
        <Typography>3. Datos 145: retención fiscal, descendientes y ascendientes.</Typography>
        <Typography>4. Legal: acepta privacidad, uso del email y veracidad de los datos.</Typography>
        <Typography>Cuando termines, el personal de Compass revisará la información. Si hay que corregir algo, te lo indicarán y podrás volver a entrar.</Typography>
        <Button component={RouterLink} to={token ? '/datos' : '/auth'} variant="contained">
          {token ? 'Volver a los datos' : 'Ir al acceso'}
        </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}
