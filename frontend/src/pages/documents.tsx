import CloseIcon from '@mui/icons-material/Close'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { Shake, StepFeedback, useNotedError, useScreenError } from '../components/motion'
import { axiosInstance } from '../lib/axios'
import { useCandidateStore } from '../store/candidate-store'
import type { Candidate } from '../types/domain'

function DocumentViewer({ documentType, label, filename, onClose }: { documentType: string; label: string; filename: string; onClose: () => void }) {
  const [src, setSrc] = useState('')
  const [kind, setKind] = useState<'image' | 'pdf' | ''>('')
  const [failed, setFailed] = useState(false)
  const pdf = filename.toLowerCase().endsWith('.pdf')

  useEffect(() => {
    let active = true
    let url = ''
    const path = pdf ? `/candidates/me/documents/${documentType}/preview` : `/candidates/me/documents/${documentType}`
    axiosInstance
      .get(path, { responseType: 'blob' })
      .then((response) => {
        url = URL.createObjectURL(response.data)
        if (!active) {
          URL.revokeObjectURL(url)
          return
        }
        setKind(pdf ? 'pdf' : 'image')
        setSrc(url)
      })
      .catch(() => {
        if (active) {
          setFailed(true)
        }
      })
    return () => {
      active = false
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [documentType, pdf])

  return (
    <Dialog open fullScreen onClose={onClose} slotProps={{ paper: { sx: { display: 'flex', flexDirection: 'column', height: '100%' } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, bgcolor: '#222C36', color: '#fff' }}>
        <IconButton aria-label="Cerrar" onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
        <Typography noWrap sx={{ fontWeight: 700 }}>{label}</Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: kind === 'pdf' ? '#525659' : '#f3f5f8', display: src && kind === 'pdf' ? 'block' : 'grid', placeItems: 'center' }}>
        {!src && !failed && <CircularProgress />}
        {failed && <Alert severity="error">No se ha podido abrir el documento.</Alert>}
        {src && kind === 'image' && (
          <Box component="img" src={src} alt={label} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
        {src && kind === 'pdf' && (
          <Box component="img" src={src} alt={label} sx={{ width: '100%', height: 'auto', display: 'block' }} />
        )}
      </Box>
    </Dialog>
  )
}

function DocumentThumb({ documentType, uploadedAt, onOpen }: { documentType: string; uploadedAt: string | null; onOpen: () => void }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let url = ''
    axiosInstance
      .get(`/candidates/me/documents/${documentType}/thumbnail`, { responseType: 'blob' })
      .then((response) => {
        url = URL.createObjectURL(response.data)
        if (!active) {
          URL.revokeObjectURL(url)
          return
        }
        setSrc(url)
      })
      .catch(() => {
        if (active) {
          setSrc(null)
        }
      })
    return () => {
      active = false
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [documentType, uploadedAt])

  if (!src) {
    return null
  }
  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label="Ver el documento enviado"
      sx={{ p: 0, border: 0, bgcolor: 'transparent', cursor: 'pointer', lineHeight: 0 }}
    >
      <Box
        component="img"
        src={src}
        alt=""
        sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '8px', flexShrink: 0, bgcolor: '#f3f5f8' }}
      />
    </Box>
  )
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const documents = useCandidateStore((state) => state.documents)
  const loadDocuments = useCandidateStore((state) => state.loadDocuments)
  const setCandidate = useCandidateStore((state) => state.setCandidate)
  const { error, setError, tick } = useNotedError()
  useScreenError(error)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<{ documentType: string; label: string; filename: string } | null>(null)

  useEffect(() => {
    loadDocuments().catch((err: Error) => setError(err.message))
  }, [loadDocuments])

  async function upload(documentType: string, label: string, file: File | undefined) {
    if (!file) {
      return
    }
    setError('')
    setMessage('')
    const body = new FormData()
    body.append('document_type', documentType)
    body.append('file', file)
    try {
      await axiosInstance.post('/candidates/me/documents', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessage(`${label}: ${file.name}`)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido subir el documento.')
    }
  }

  async function continueToTax() {
    setError('')
    try {
      const response = await axiosInstance.post<Candidate>('/candidates/me/documents/complete')
      setCandidate(response.data)
      setReady(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faltan documentos.')
    }
  }

  return (
    <Shake tick={tick}>
    <Stack spacing={1.5}>
        <Alert severity="info">Formatos jpg, png o pdf. Si haces una foto, baja la resolución: el máximo es 20 MB.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {documents.length === 0 && <Alert severity="warning">No hay documentos solicitados.</Alert>}
        {documents.length > 0 && documents.every((document) => document.uploaded) && (
          <Alert severity="success">Cada casilla tiene su archivo. Ya puedes abrir el formulario 145.</Alert>
        )}
        {documents.map((document) => (
          <Card
            key={document.document_type}
            elevation={0}
            sx={{
              borderRadius: '12px',
              bgcolor: '#fff',
              boxShadow: '0 10px 28px rgba(28, 39, 49, 0.08)',
            }}
          >
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                {document.uploaded && (
                  <DocumentThumb
                    documentType={document.document_type}
                    uploadedAt={document.uploaded_at}
                    onOpen={() => setPreview({ documentType: document.document_type, label: document.label, filename: document.original_filename || '' })}
                  />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3, color: '#1c2731' }}>
                    {document.label}
                  </Typography>
                  <Typography sx={{ color: document.uploaded ? '#8b93a0' : '#ed6c02', fontSize: 14, mt: 0.5, mb: 1.5 }}>
                    {document.uploaded ? document.original_filename : 'Sin archivo'}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                component="label"
                sx={{
                  borderRadius: 10,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#5c6570',
                  borderColor: '#e4e7ec',
                  px: 1.75,
                  py: 0.35,
                  minHeight: 0,
                  '&:hover': { borderColor: '#cfd5dd', bgcolor: '#f7f8fa' },
                }}
              >
                {document.uploaded ? 'Sustituir' : 'Adjuntar'}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    upload(document.document_type, document.label, file)
                  }}
                />
              </Button>
            </CardContent>
          </Card>
        ))}
        <Button variant="contained" size="large" onClick={continueToTax} disabled={ready}>Continuar al formulario 145</Button>
        {preview && (
          <DocumentViewer
            documentType={preview.documentType}
            label={preview.label}
            filename={preview.filename}
            onClose={() => setPreview(null)}
          />
        )}
      </Stack>
      {ready && <StepFeedback title="Documentos listos" onDone={() => navigate('/fiscal')} />}
    </Shake>
  )
}
