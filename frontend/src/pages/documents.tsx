import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { axiosInstance } from '../lib/axios'
import { useCandidateStore } from '../store/candidate-store'
import type { Candidate } from '../types/domain'

export function DocumentsPage() {
  const navigate = useNavigate()
  const candidate = useCandidateStore((state) => state.candidate)!
  const documents = useCandidateStore((state) => state.documents)
  const loadDocuments = useCandidateStore((state) => state.loadDocuments)
  const setCandidate = useCandidateStore((state) => state.setCandidate)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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
      navigate('/fiscal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faltan documentos.')
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{candidate.first_name}, sube la documentación</Typography>
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
          variant="outlined"
          sx={{ borderColor: document.uploaded ? 'success.main' : 'divider', borderWidth: document.uploaded ? 2 : 1 }}
        >
          <CardContent>
            <Typography variant="h6">{document.label}</Typography>
            <Typography color={document.uploaded ? 'success.main' : 'text.secondary'} sx={{ mb: 1 }}>
              {document.uploaded ? `Archivo de esta casilla: ${document.original_filename}` : 'Esta casilla está vacía'}
            </Typography>
            <Button variant="outlined" component="label">
              {document.uploaded ? 'Sustituir archivo' : 'Adjuntar en esta casilla'}
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
      <Button variant="text" onClick={() => navigate('/datos')}>Volver a datos</Button>
      <Button variant="contained" size="large" onClick={continueToTax}>Continuar al formulario 145</Button>
    </Stack>
  )
}
