import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'

import { Shake, StepFeedback, useNotedError, useScreenError } from '../components/motion'
import { OptionField } from '../components/option-field'
import { axiosInstance } from '../lib/axios'
import { useCandidateStore } from '../store/candidate-store'
import type { Candidate } from '../types/domain'
import { isDni } from '../utils/validators'

const schema = z.object({
  first_name: z.string().trim().min(1, 'Obligatorio'),
  last_name: z.string().trim().min(1, 'Obligatorio'),
  second_last_name: z.string().optional(),
  id_type: z.string().min(1, 'Obligatorio'),
  email: z.string().trim().email('Email no válido'),
  phone: z.string().regex(/^\d{9}$/, 'El móvil debe tener 9 dígitos'),
  birth_date: z.string().min(1, 'Obligatorio'),
  gender: z.string().min(1, 'Obligatorio'),
  nationality: z.string().min(1, 'Obligatorio'),
  civil_status: z.string().min(1, 'Obligatorio'),
  street_type: z.string().min(1, 'Obligatorio'),
  street: z.string().trim().min(1, 'Obligatorio').max(60, 'Máximo 60 caracteres'),
  street_number: z.string().optional(),
  floor: z.string().optional(),
  postal_code: z.string().trim().min(1, 'Obligatorio'),
  city: z.string().trim().min(1, 'Obligatorio').max(40, 'Máximo 40 caracteres'),
  province: z.string().min(1, 'Obligatorio'),
  country: z.string().min(1, 'Obligatorio'),
  social_security_number: z.string().min(12, '12 dígitos'),
  iban: z.string().min(24, '24 caracteres'),
  work_permit_end: z.string().optional(),
  unemployed: z.string().min(1, 'Obligatorio'),
  disability: z.string().min(1, 'Obligatorio'),
  disability_type: z.string().optional(),
  disability_percent: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      component="fieldset"
      sx={{
        m: 0,
        width: '100%',
        minInlineSize: 0,
        px: 2,
        pt: 1,
        pb: 2.25,
        border: '1px solid #e6e9ee',
        borderRadius: '12px',
        bgcolor: '#fff',
        boxShadow: '0 10px 28px rgba(28, 39, 49, 0.06)',
      }}
    >
      <Box component="legend" sx={{ px: 0.75, fontWeight: 700, fontSize: 15, color: '#222C36' }}>
        {label}
      </Box>
      <Stack spacing={2}>{children}</Stack>
    </Box>
  )
}

function text(value: string | null | undefined) {
  return value ?? ''
}

function defaults(candidate: Candidate): FormValues {
  return {
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    second_last_name: text(candidate.second_last_name),
    id_type: text(candidate.id_type),
    email: text(candidate.email),
    phone: text(candidate.phone),
    birth_date: text(candidate.birth_date),
    gender: text(candidate.gender),
    nationality: text(candidate.nationality),
    civil_status: text(candidate.civil_status),
    street_type: text(candidate.street_type),
    street: text(candidate.street),
    street_number: text(candidate.street_number),
    floor: text(candidate.floor),
    postal_code: text(candidate.postal_code),
    city: text(candidate.city),
    province: text(candidate.province),
    country: text(candidate.country),
    social_security_number: text(candidate.social_security_number),
    iban: text(candidate.iban),
    work_permit_end: text(candidate.work_permit_end),
    unemployed: text(candidate.unemployed),
    disability: text(candidate.disability),
    disability_type: text(candidate.disability_type),
    disability_percent: text(candidate.disability_percent),
  }
}

export function PersonalDataPage() {
  const navigate = useNavigate()
  const candidate = useCandidateStore((state) => state.candidate)!
  const catalogs = useCandidateStore((state) => state.catalogs)!
  const setCandidate = useCandidateStore((state) => state.setCandidate)
  const { error, setError, tick } = useNotedError()
  useScreenError(error)
  const [saved, setSaved] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(candidate),
  })
  const country = form.watch('country')
  const disability = form.watch('disability')
  const provinces = catalogs.provincesByCountry[country] ?? []
  const showPermit = !isDni(candidate.national_id)

  useEffect(() => {
    const current = form.getValues('province')
    if (current && !provinces.some((option) => option.id === current)) {
      form.setValue('province', '')
    }
  }, [country, form, provinces])

  async function onSubmit(values: FormValues) {
    setError('')
    try {
      const response = await axiosInstance.patch<Candidate>('/candidates/me/personal', {
        ...values,
        phone: values.phone.replace(/\s/g, ''),
        iban: values.iban.replace(/\s/g, ''),
        social_security_number: values.social_security_number.replace(/\s/g, ''),
        second_last_name: values.second_last_name || null,
        street_number: values.street_number || null,
        floor: values.floor || null,
        work_permit_end: showPermit ? values.work_permit_end || null : null,
        disability_type: values.disability === 'SI' ? values.disability_type : null,
        disability_percent: values.disability === 'SI' ? values.disability_percent : null,
      })
      setCandidate(response.data)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se han podido guardar los datos.')
    }
  }

  return (
    <Shake tick={tick}>
    <Stack component="form" spacing={2} onSubmit={form.handleSubmit(onSubmit, () => setError('Revisa los campos obligatorios.'))}>
      {candidate.rejection_reason && (candidate.step_warnings ?? []).length > 0 && <Alert severity="warning">{candidate.rejection_reason}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <FieldGroup label="Datos personales">
      <TextField label="DNI/NIE" value={candidate.national_id} disabled />
      <TextField label="Nombre *" {...form.register('first_name')} error={Boolean(form.formState.errors.first_name)} helperText={form.formState.errors.first_name?.message} />
      <TextField label="Primer apellido *" {...form.register('last_name')} error={Boolean(form.formState.errors.last_name)} helperText={form.formState.errors.last_name?.message} />
      <TextField label="Segundo apellido" {...form.register('second_last_name')} />
      <OptionField name="id_type" control={form.control} label="Tipo de documento *" options={catalogs.idTypes} />
      <TextField label="Fecha de nacimiento *" type="date" InputLabelProps={{ shrink: true }} {...form.register('birth_date')} error={Boolean(form.formState.errors.birth_date)} helperText={form.formState.errors.birth_date?.message} />
      <OptionField name="gender" control={form.control} label="Sexo *" options={catalogs.genders} />
      <OptionField name="nationality" control={form.control} label="Nacionalidad *" options={catalogs.nationalities} />
      <TextField label="Teléfono móvil *" {...form.register('phone')} error={Boolean(form.formState.errors.phone)} helperText={form.formState.errors.phone?.message ?? '9 dígitos'} />
      <TextField label="Email *" {...form.register('email')} error={Boolean(form.formState.errors.email)} helperText={form.formState.errors.email?.message} />
      <OptionField name="civil_status" control={form.control} label="Estado civil *" options={catalogs.civilStatuses} />
      <TextField label="IBAN *" {...form.register('iban')} error={Boolean(form.formState.errors.iban)} helperText={form.formState.errors.iban?.message ?? '24 caracteres, sin espacios'} />
      <TextField label="Nº afiliación Seguridad Social *" {...form.register('social_security_number')} error={Boolean(form.formState.errors.social_security_number)} helperText="12 dígitos" />
      {showPermit && (
        <TextField label="Fecha fin permiso de trabajo UE" type="date" InputLabelProps={{ shrink: true }} {...form.register('work_permit_end')} />
      )}
      <OptionField name="unemployed" control={form.control} label="Desempleado *" options={catalogs.yesNo} />
      </FieldGroup>
      <FieldGroup label="Dirección">
      <OptionField name="street_type" control={form.control} label="Tipo de vía *" options={catalogs.streetTypes} />
      <TextField label="Dirección *" {...form.register('street')} error={Boolean(form.formState.errors.street)} helperText={form.formState.errors.street?.message} />
      <TextField label="Nº / bloque" {...form.register('street_number')} />
      <TextField label="Piso" {...form.register('floor')} />
      <TextField label="Código postal *" {...form.register('postal_code')} error={Boolean(form.formState.errors.postal_code)} helperText={form.formState.errors.postal_code?.message} />
      <TextField label="Población *" {...form.register('city')} error={Boolean(form.formState.errors.city)} helperText={form.formState.errors.city?.message} />
      <OptionField
        name="country"
        control={form.control}
        label="País *"
        options={catalogs.countries}
        search
      />
      <OptionField name="province" control={form.control} label="Provincia *" options={provinces} search disabled={provinces.length === 0} />
      </FieldGroup>
      <FieldGroup label="Minusvalía">
      <OptionField name="disability" control={form.control} label="Minusvalía *" options={catalogs.yesNo} />
      {disability === 'SI' && (
        <>
          <OptionField name="disability_type" control={form.control} label="Tipo de minusvalía *" options={catalogs.disabilityTypes} />
          <TextField label="Porcentaje *" {...form.register('disability_percent')} helperText="De 0 a 100" />
        </>
      )}
      </FieldGroup>
      <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting || saved}>
        Continuar a documentos
      </Button>
    </Stack>
    {saved && <StepFeedback title="Datos guardados" onDone={() => navigate('/documentos')} />}
    </Shake>
  )
}
