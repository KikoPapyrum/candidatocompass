import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import TagOutlinedIcon from '@mui/icons-material/TagOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
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

type CaptchaChallenge = {
  captcha_id: string
  image: string
}

const NAVY = '#222C36'
const GOLD = '#d4bc7d'
const GOLD_INK = '#9a8450'
const PAGE = '#F1F5F9'

const LEGACY_POSTING = {
  title: 'Account executive (Bolsa)',
  location: 'Centro de ofertas Madrid',
  category: 'Ventas y negocio',
  legacyId: '519',
  sections: [
    {
      title: '¿Quiénes somos?',
      icon: 'company' as const,
      paragraphs: [
        'Compass Group España es la empresa de referencia en el sector de la restauración colectiva, con más de 50 años de historia. Tiene como propósito trabajar cada día para influir positivamente en la vida de los demás a través de la alimentación.',
        'Pertenece a la multinacional británica Compass Group, uno de los diez mayores empleadores privados del mundo, con un equipo formado por más de 600.000 personas en 44 países. En España ofrecemos cerca de 100 millones de comidas al año en los comedores de más de 1.600 clientes, con una plantilla de más de 12.000 personas.',
      ],
    },
    {
      title: 'Descripción del puesto',
      icon: 'role' as const,
      paragraphs: [
        'Desarrolla su actividad a través de diferentes marcas especializadas: Eurest, dedicada a la restauración a empresas e industria; Scolarest, que ofrece servicios gastronómicos en centros educativos; Medirest, alimentación hospitalaria y usuarios senior y social; Vitarest, que alimenta a domicilio a nuestros adultos mayores; Vilaplana, catering para eventos corporativos, deportivos y particulares; Seral, servicios de alimentación y Gow, córneres gastronómicos.',
        'Como Account executive tu misión será construir relaciones con nuevos clientes y generar oportunidades de venta. Buscamos una persona capaz de establecer relaciones sólidas con el cliente, identificar brechas y potenciar el crecimiento de la compañía.',
        'Garantizamos la igualdad de oportunidades y la equidad en la valoración de las candidaturas. Apostamos por la diversidad y la inclusión y nos adherimos a la Carta de la Diversidad.',
      ],
    },
    {
      title: 'Funciones principales',
      icon: 'tasks' as const,
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
      icon: 'requirements' as const,
      items: [
        'Experiencia mínima de 3 años en venta de servicios. Se valora especialmente el sector de la restauración.',
        'Formación universitaria.',
        'Buen manejo de herramientas ofimáticas.',
        'Habilidades comunicativas, alto sentido de la responsabilidad y ganas de mejorar.',
      ],
    },
    {
      title: 'Competencias',
      icon: 'skills' as const,
      chips: [
        { label: 'Atención al cliente', color: '#e11d48', Icon: SupportAgentOutlinedIcon },
        { label: 'Establecimiento de relaciones', color: '#2563eb', Icon: HandshakeOutlinedIcon },
        { label: 'Mejora continua', color: '#7c3aed', Icon: TrendingUpIcon },
        { label: 'Orientación a resultados', color: '#059669', Icon: EmojiEventsOutlinedIcon },
        { label: 'Resolución de conflictos', color: '#d97706', Icon: ForumOutlinedIcon },
      ],
    },
    {
      title: 'Se ofrece',
      icon: 'offer' as const,
      paragraphs: [
        'Si crees que puedes encajar en esta posición, solicita esta oferta.',
        'Estamos convencidos de que los equipos diversos son más innovadores, transformadores y consiguen mejores resultados. Promovemos la inclusión de todas las personas sin importar género, edad, orientación e identidad sexual, discapacidad o cualquier otra condición.',
      ],
    },
  ],
}

const SECTION_ICONS = {
  company: BusinessOutlinedIcon,
  role: WorkOutlineIcon,
  tasks: CheckCircleOutlineIcon,
  requirements: SchoolOutlinedIcon,
  skills: EmojiEventsOutlinedIcon,
  offer: VolunteerActivismOutlinedIcon,
}

function PostingCard({ icon, title, children }: { icon?: keyof typeof SECTION_ICONS; title?: string; children: ReactNode }) {
  const Icon = icon ? SECTION_ICONS[icon] : null
  return (
    <Box sx={{ bgcolor: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)', p: { xs: 2, md: 3 } }}>
      {title && (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}>
          {Icon && (
            <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: GOLD, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon sx={{ fontSize: 18 }} />
            </Box>
          )}
          <Typography sx={{ fontWeight: 800, fontSize: { xs: 13, md: 16 }, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>{title}</Typography>
        </Stack>
      )}
      {children}
    </Box>
  )
}

function MetaChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.6, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.08)', color: '#e8edf2', fontSize: 13, fontWeight: 600 }}>
      {icon}
      {label}
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
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const inscriptionRef = useRef<HTMLDivElement>(null)

  async function loadCaptcha() {
    try {
      const response = await axiosInstance.get<CaptchaChallenge>('/offers/captcha')
      setCaptcha(response.data)
      setCaptchaAnswer('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido cargar el captcha.')
    }
  }

  function focusInscription() {
    inscriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    inscriptionRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!formOpen) {
      return
    }
    const frame = requestAnimationFrame(() => focusInscription())
    void loadCaptcha()
    return () => cancelAnimationFrame(frame)
  }, [formOpen])

  function openInscription() {
    if (formOpen) {
      focusInscription()
      return
    }
    setFormOpen(true)
  }

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
    if (!captcha || !captchaAnswer.trim()) {
      setError('Escribe el código del captcha.')
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
        captcha_id: captcha.captcha_id,
        captcha_answer: captchaAnswer,
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
      void loadCaptcha()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: PAGE, pb: { xs: formOpen ? 4 : 12, md: 6 } }}>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          bgcolor: '#fff',
          borderBottom: '1px solid #e8edf2',
          boxShadow: `0 2px 0 ${GOLD}`,
        }}
      >
        <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2, md: 4 }, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <CompassMark height={44} ink />
          <Typography sx={{ display: { xs: 'none', sm: 'block' }, color: '#64748b', fontSize: 13, fontWeight: 600 }}>
            Portal de empleo
          </Typography>
        </Box>
      </Box>

      <Box component="section" sx={{ bgcolor: NAVY, color: '#fff' }}>
        <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3.5, md: 5 } }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.4, mb: 1.5, borderRadius: 999, bgcolor: GOLD, color: NAVY, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {LEGACY_POSTING.category}
          </Box>
          <Typography component="h1" sx={{ fontSize: { xs: 28, md: 40 }, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, maxWidth: 720 }}>
            {LEGACY_POSTING.title}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 2.5 }}>
            <MetaChip icon={<PlaceOutlinedIcon sx={{ fontSize: 16, color: GOLD }} />} label={LEGACY_POSTING.location} />
            <MetaChip icon={<TagOutlinedIcon sx={{ fontSize: 16, color: GOLD }} />} label={`Oferta ${code || '—'}`} />
            <MetaChip icon={<TagOutlinedIcon sx={{ fontSize: 16, color: GOLD }} />} label={`Ref. ${LEGACY_POSTING.legacyId}`} />
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 4 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>
        <Stack spacing={2}>
          {LEGACY_POSTING.sections.map((section) => (
            <PostingCard key={section.title} icon={section.icon} title={section.title}>
              <Stack spacing={1.25}>
                {'paragraphs' in section && section.paragraphs?.map((paragraph) => (
                  <Typography key={paragraph} sx={{ color: '#334155', fontSize: { xs: 14, md: 15 }, lineHeight: 1.6 }}>{paragraph}</Typography>
                ))}
                {'items' in section && section.items && (
                  <Stack component="ul" spacing={1.25} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    {section.items.map((item) => (
                      <Box key={item} component="li" sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#059669', mt: '2px', flexShrink: 0 }} />
                        <Typography sx={{ color: '#334155', fontSize: { xs: 14, md: 15 }, lineHeight: 1.55 }}>{item}</Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
                {'chips' in section && section.chips && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {section.chips.map((chip) => {
                      const SkillIcon = chip.Icon
                      return (
                        <Box key={chip.label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.7, borderRadius: '10px', bgcolor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600 }}>
                          <SkillIcon sx={{ fontSize: 16, color: chip.color }} />
                          {chip.label}
                        </Box>
                      )
                    })}
                  </Box>
                )}
              </Stack>
            </PostingCard>
          ))}

          {formOpen && (
            <PostingCard>
              <Shake tick={tick}>
                <Stack component="form" spacing={2} onSubmit={onSubmit}>
                  <Box ref={inscriptionRef} tabIndex={-1} sx={{ outline: 'none', scrollMarginTop: '88px' }}>
                    <Typography sx={{ textAlign: 'center', color: '#5c6570', fontSize: 14.5 }}>
                      ¿Ya es un usuario registrado?{' '}
                      <Box component={RouterLink} to="/auth" sx={{ color: GOLD_INK, fontWeight: 700, textDecoration: 'none' }}>
                        Inicie la sesión
                      </Box>
                    </Typography>
                    <Typography sx={{ color: '#5c6570', mt: 2 }}>
                      Indica tus datos básicos. La contraseña la elegirás al registrarte en la aplicación.
                    </Typography>
                  </Box>
                  {error && <Alert severity="error">{error}</Alert>}
                  <TextField label="NIF/NIE *" value={nationalId} onChange={(event) => setNationalId(event.target.value.toUpperCase())} autoComplete="username" />
                  <TextField label="Nombre *" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  <TextField label="Primer apellido *" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  <TextField label="Segundo apellido" value={secondLastName} onChange={(event) => setSecondLastName(event.target.value)} />
                  <TextField label="Email *" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                  <TextField label="Repite el email *" type="email" value={emailRepeat} onChange={(event) => setEmailRepeat(event.target.value)} autoComplete="email" />
                  <TextField label="Móvil *" value={phone} onChange={(event) => setPhone(event.target.value)} helperText="9 dígitos" />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      <Box
                        component="img"
                        alt="Captcha"
                        src={captcha?.image ?? undefined}
                        sx={{ width: 220, height: 64, borderRadius: '10px', border: '1px solid #e2e8f0', bgcolor: '#fff' }}
                      />
                      <IconButton aria-label="Otro captcha" onClick={() => void loadCaptcha()} disabled={busy} sx={{ color: NAVY }}>
                        <RefreshOutlinedIcon />
                      </IconButton>
                    </Box>
                    <TextField
                      label="Captcha *"
                      value={captchaAnswer}
                      onChange={(event) => setCaptchaAnswer(event.target.value.toUpperCase())}
                      autoComplete="off"
                      fullWidth
                    />
                  </Stack>
                  <Button type="submit" variant="contained" size="large" disabled={busy}>Enviar solicitud</Button>
                </Stack>
              </Shake>
            </PostingCard>
          )}
        </Stack>

        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 92 }}>
          <Box sx={{ bgcolor: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', borderTop: `3px solid ${GOLD}`, boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)', p: 3 }}>
            <Typography sx={{ color: GOLD_INK, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Resumen</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: NAVY, mt: 0.75, lineHeight: 1.25 }}>{LEGACY_POSTING.title}</Typography>
            <Typography sx={{ color: '#64748b', mt: 0.75 }}>{LEGACY_POSTING.location}</Typography>
            <Stack spacing={1} sx={{ mt: 2.5, mb: 2.5 }}>
              <Typography sx={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 14 }}>
                <span>Oferta</span>
                <Box component="span" sx={{ color: NAVY, fontWeight: 700 }}>{code || '—'}</Box>
              </Typography>
              <Typography sx={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 14 }}>
                <span>Referencia</span>
                <Box component="span" sx={{ color: NAVY, fontWeight: 700 }}>{LEGACY_POSTING.legacyId}</Box>
              </Typography>
            </Stack>
            <Button variant="contained" size="large" fullWidth onClick={openInscription}>Solicitar</Button>
            <Typography sx={{ textAlign: 'center', color: '#64748b', fontSize: 13.5, mt: 2 }}>
              ¿Ya tienes cuenta?{' '}
              <Box component={RouterLink} to="/auth" sx={{ color: GOLD_INK, fontWeight: 700, textDecoration: 'none' }}>
                Inicia la sesión
              </Box>
            </Typography>
          </Box>
        </Box>
      </Box>

      {!formOpen && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            px: 2,
            pt: 1.5,
            pb: 'calc(12px + env(safe-area-inset-bottom))',
            bgcolor: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(12px)',
            borderTop: `2px solid ${GOLD}`,
          }}
        >
          <Button variant="contained" size="large" fullWidth onClick={openInscription}>Solicitar</Button>
        </Box>
      )}
    </Box>
  )
}
