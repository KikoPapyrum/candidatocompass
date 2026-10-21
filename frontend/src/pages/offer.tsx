import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'

import { CompassMark } from '../components/compass-mark'
import { Shake, useNotedError } from '../components/motion'
import { axiosInstance } from '../lib/axios'
import { isValidNationalId } from '../utils/validators'

type EnrollResult = {
  status: 'register' | 'login'
  detail: string
}

const LEGACY_POSTING = {
  title: 'Account executive (Bolsa)',
  location: 'CENTRO DE OFERTAS MADRID',
  legacyId: '519',
  sections: [
    {
      title: 'Quiénes somos',
      paragraphs: [
        'Compass Group España es la empresa de referencia en el sector de la restauración colectiva, con más de 50 años de historia. Tiene como propósito trabajar cada día para influir positivamente en la vida de los demás a través de la alimentación.',
      ],
    },
    {
      title: 'Descripción',
      paragraphs: [
        'Desarrolla su actividad a través de diferentes marcas especializadas: Eurest, dedicada a la restauración a empresas e industria; Scolarest, que ofrece servicios gastronómicos en centros educativos; Medirest, alimentación hospitalaria y usuarios senior y social; Vitarest, que alimenta a domicilio a nuestros adultos mayores; Vilaplana, catering para eventos corporativos, deportivos y particulares; Seral, servicios de alimentación y Gow, córneres gastronómicos.',
        'Pertenece a la multinacional británica Compass Group, uno de los diez mayores empleadores privados del mundo, con un equipo formado por más de 600.000 personas en 44 países. En España ofrecemos cerca de 100 millones de comidas al año en los comedores de más de 1.600 clientes, con una plantilla de más de 12.000 personas.',
        'Garantizamos la igualdad de oportunidades y la equidad en la valoración de las candidaturas. Apostamos por la diversidad y la inclusión y nos adherimos a la Carta de la Diversidad.',
      ],
    },
    {
      title: 'Funciones',
      paragraphs: [
        'Como Account executive tu misión será construir relaciones con nuevos clientes y generar oportunidades de venta. Buscamos una persona capaz de establecer relaciones sólidas con el cliente, identificar brechas y potenciar el crecimiento de la compañía.',
      ],
      items: [
        'Realizar búsqueda y prospección de mercado para detectar clientes potenciales.',
        'Realizar visitas de prospección y apertura de nuevas cuentas.',
        'Diseñar, presentar, negociar y cerrar las diferentes ofertas presentadas al cliente.',
        'Colaborar con todos los departamentos necesarios para optimizar el cierre de la venta.',
        'Mantener un contacto regular con los clientes asignados y colaborar en el análisis de sus necesidades.',
      ],
    },
    {
      title: 'Requisitos',
      items: [
        'Experiencia mínima de 3 años en venta de servicios. Se valora especialmente el sector de la restauración.',
        'Formación universitaria.',
        'Buen manejo de herramientas ofimáticas.',
        'Habilidades comunicativas, alto sentido de la responsabilidad y ganas de mejorar.',
      ],
    },
    {
      title: 'Competencias',
      items: [
        'Atención al cliente.',
        'Establecimiento de relaciones y comunicación.',
        'Lograr mejoras continuas.',
        'Orientación a resultados.',
        'Resolución de conflictos.',
      ],
    },
    {
      title: 'Se ofrece',
      paragraphs: [
        'Si crees que puedes encajar en esta posición, inscríbete en esta oferta.',
        'Estamos convencidos de que los equipos diversos son más innovadores, transformadores y consiguen mejores resultados. Promovemos la inclusión de todas las personas sin importar género, edad, orientación e identidad sexual, discapacidad o cualquier otra condición.',
      ],
    },
  ],
}

function PostingCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: '12px', boxShadow: '0 10px 28px rgba(28, 39, 49, 0.08)', p: 2.25 }}>
      {title && <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#1c2731', mb: 1.25 }}>{title}</Typography>}
      {children}
    </Box>
  )
}

export function OfferPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { error, setError, tick } = useNotedError()
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [nationalId, setNationalId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [secondLastName, setSecondLastName] = useState('')
  const [email, setEmail] = useState('')
  const [emailRepeat, setEmailRepeat] = useState('')
  const [phone, setPhone] = useState('')
  const inscriptionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!formOpen) {
      return
    }
    inscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    inscriptionRef.current?.focus({ preventScroll: true })
  }, [formOpen])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidNationalId(nationalId)) {
      setError('El DNI/NIE no es correcto.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Indica nombre y apellidos.')
      return
    }
    if (email.trim().toLowerCase() !== emailRepeat.trim().toLowerCase()) {
      setError('Los emails no son idénticos.')
      return
    }
    if (!/^\d{9}$/.test(phone.replace(/\s+/g, ''))) {
      setError('El móvil debe tener 9 dígitos.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await axiosInstance.post<EnrollResult>(`/offers/${encodeURIComponent(code)}/enroll`, {
        national_id: nationalId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        second_last_name: secondLastName.trim() || null,
        email,
        phone,
      })
      const national = encodeURIComponent(nationalId.toUpperCase())
      const mail = encodeURIComponent(email.trim())
      if (response.data.status === 'login') {
        navigate(`/auth?national_id=${national}`)
        return
      }
      navigate(`/auth/registro?national_id=${national}&email=${mail}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido completar la inscripción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Box sx={{ width: '100%', maxWidth: 480, height: '100dvh', bgcolor: '#f3f5f8', display: 'flex', flexDirection: 'column', boxShadow: { sm: 8 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3, pb: 1 }}>
          <CompassMark height={52} ink />
        </Box>
        <Box component="main" sx={{ flex: 1, overflow: 'auto', px: 2, py: 2 }}>
          <Stack spacing={1.5}>
            <PostingCard>
              <Typography sx={{ color: '#8b93a0', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
                OFERTA {code} · REF. {LEGACY_POSTING.legacyId}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75 }}>{LEGACY_POSTING.title}</Typography>
              <Typography sx={{ color: '#5c6570', mt: 0.75 }}>{LEGACY_POSTING.location}</Typography>
            </PostingCard>
            {LEGACY_POSTING.sections.map((section) => (
              <PostingCard key={section.title} title={section.title}>
                <Stack spacing={1.25}>
                  {section.paragraphs?.map((paragraph) => (
                    <Typography key={paragraph} sx={{ color: '#1c2731', lineHeight: 1.45 }}>{paragraph}</Typography>
                  ))}
                  {section.items && (
                    <Stack component="ul" spacing={0.75} sx={{ m: 0, pl: 2.25 }}>
                      {section.items.map((item) => (
                        <Typography key={item} component="li" sx={{ color: '#1c2731', lineHeight: 1.45 }}>{item}</Typography>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </PostingCard>
            ))}
            <PostingCard title="Inscripción">
              <Box ref={inscriptionRef} tabIndex={-1} sx={{ outline: 'none' }}>
              {!formOpen && (
                <Button variant="contained" size="large" fullWidth onClick={() => setFormOpen(true)}>Solicitar</Button>
              )}
              {formOpen && (
                <Shake tick={tick}>
                  <Stack component="form" spacing={2} onSubmit={onSubmit}>
                    <Typography sx={{ textAlign: 'center', color: '#5c6570', fontSize: 14.5 }}>
                      ¿Ya es un usuario registrado?{' '}
                      <Box component={RouterLink} to="/auth" sx={{ color: '#9a8450', fontWeight: 700, textDecoration: 'none' }}>
                        Inicie la sesión
                      </Box>
                    </Typography>
                    <Typography sx={{ color: '#5c6570' }}>
                      Indica tus datos básicos. La contraseña la elegirás al registrarte en la aplicación.
                    </Typography>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="NIF/NIE *" value={nationalId} onChange={(event) => setNationalId(event.target.value.toUpperCase())} autoComplete="username" />
                    <TextField label="Nombre *" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                    <TextField label="Primer apellido *" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                    <TextField label="Segundo apellido" value={secondLastName} onChange={(event) => setSecondLastName(event.target.value)} />
                    <TextField label="Email *" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                    <TextField label="Repite el email *" type="email" value={emailRepeat} onChange={(event) => setEmailRepeat(event.target.value)} autoComplete="email" />
                    <TextField label="Móvil *" value={phone} onChange={(event) => setPhone(event.target.value)} helperText="9 dígitos" />
                    <Button type="submit" variant="contained" size="large" disabled={busy}>Enviar solicitud</Button>
                  </Stack>
                </Shake>
              )}
              </Box>
            </PostingCard>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
