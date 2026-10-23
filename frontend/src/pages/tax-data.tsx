import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'

import { Shake, StepFeedback, useNotedError, useScreenError } from '../components/motion'
import { axiosInstance } from '../lib/axios'
import { useCandidateStore } from '../store/candidate-store'
import type { Ascendant, Candidate, Child } from '../types/domain'

type FamilySituation = '' | 'single' | 'spouse' | 'other'
type DisabilityDegree = '' | 'recognized' | 'from33' | 'from65'

type TaxForm = {
  family_situation: FamilySituation
  spouse_national_id: string
  disability_degree: DisabilityDegree
  own_disability_help: boolean
  geographic_move_date: string
  irregular_income: boolean
  compensatory_pension: string
  child_support: string
  housing_deduction: boolean
  children: Child[]
  ascendants: Ascendant[]
}

const emptyChild = (): Child => ({
  birth_date: '',
  adoption_date: '',
  disability_33: false,
  disability_65: false,
  needs_help: false,
  lives_only_with_you: false,
})

function familySituation(candidate: Candidate): FamilySituation {
  if (candidate.family_single_with_children) {
    return 'single'
  }
  if (candidate.family_spouse_low_income) {
    return 'spouse'
  }
  if (candidate.family_other) {
    return 'other'
  }
  return ''
}

function disabilityDegree(candidate: Candidate): DisabilityDegree {
  if (candidate.disability_recognized) {
    return 'recognized'
  }
  if (candidate.own_disability_33) {
    return 'from33'
  }
  if (candidate.own_disability_65) {
    return 'from65'
  }
  return ''
}

const emptyAscendant = (): Ascendant => ({
  birth_date: '',
  disability_33: false,
  disability_65: false,
  needs_help: false,
  cohabitation_share: '',
})

export function TaxPage() {
  const navigate = useNavigate()
  const candidate = useCandidateStore((state) => state.candidate)!
  const catalogs = useCandidateStore((state) => state.catalogs)!
  const setCandidate = useCandidateStore((state) => state.setCandidate)
  const { error, setError, tick } = useNotedError()
  useScreenError(error)
  const [saved, setSaved] = useState(false)
  const form = useForm<TaxForm>({
    defaultValues: {
      family_situation: familySituation(candidate),
      spouse_national_id: candidate.spouse_national_id ?? '',
      disability_degree: disabilityDegree(candidate),
      own_disability_help: candidate.own_disability_help,
      geographic_move_date: candidate.geographic_move_date ?? '',
      irregular_income: candidate.irregular_income,
      compensatory_pension: candidate.compensatory_pension ?? '',
      child_support: candidate.child_support ?? '',
      housing_deduction: candidate.housing_deduction,
      children: candidate.children.length ? candidate.children : [emptyChild()],
      ascendants: candidate.ascendants.length ? candidate.ascendants : [emptyAscendant()],
    },
  })
  const children = useFieldArray({ control: form.control, name: 'children' })
  const ascendants = useFieldArray({ control: form.control, name: 'ascendants' })

  async function onSubmit(values: TaxForm) {
    setError('')
    if (!values.family_situation) {
      setError('Selecciona una situación familiar.')
      return
    }
    try {
      const response = await axiosInstance.patch<Candidate>('/candidates/me/tax', {
        family_single_with_children: values.family_situation === 'single',
        family_spouse_low_income: values.family_situation === 'spouse',
        family_other: values.family_situation === 'other',
        disability_recognized: values.disability_degree === 'recognized',
        own_disability_33: values.disability_degree === 'from33',
        own_disability_65: values.disability_degree === 'from65',
        own_disability_help: values.own_disability_help,
        irregular_income: values.irregular_income,
        housing_deduction: values.housing_deduction,
        spouse_national_id: values.spouse_national_id || null,
        geographic_move_date: values.geographic_move_date || null,
        compensatory_pension: values.compensatory_pension || null,
        child_support: values.child_support || null,
        children: values.children.map((child) => ({
          ...child,
          birth_date: child.birth_date || null,
          adoption_date: child.adoption_date || null,
        })),
        ascendants: values.ascendants.map((person) => ({
          ...person,
          birth_date: person.birth_date || null,
          cohabitation_share: person.cohabitation_share || null,
        })),
      })
      setCandidate(response.data)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se han podido guardar los datos fiscales.')
    }
  }

  return (
    <Shake tick={tick}>
    <Stack component="form" spacing={2} onSubmit={form.handleSubmit(onSubmit, () => setError('Revisa los campos obligatorios.'))}>
      <Alert severity="info">
        Incluir datos falsos o incompletos en esta comunicación puede ser una infracción tributaria.
      </Alert>
      {!candidate.documents_complete && (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => navigate('/documentos')}>Ir a documentos</Button>}>
          El formulario 145 se guarda cuando todas las casillas de documentos tienen archivo y pulsas continuar.
        </Alert>
      )}
      {candidate.rejection_reason && (candidate.step_warnings ?? []).length > 0 && <Alert severity="warning">{candidate.rejection_reason}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Typography variant="h6">Situación familiar</Typography>
      <RadioGroup
        value={form.watch('family_situation')}
        onChange={(event) => form.setValue('family_situation', event.target.value as FamilySituation)}
      >
        <FormControlLabel value="single" control={<Radio />} label="1. Soltero/a, viudo/a, divorciado/a o separado/a legalmente con hijos que conviven exclusivamente contigo." />
        <FormControlLabel value="spouse" control={<Radio />} label="2. Casado/a cuyo cónyuge no obtiene rentas superiores a 1.500 euros anuales." />
        <FormControlLabel value="other" control={<Radio />} label="3. Situación familiar distinta de las dos anteriores, o no deseo manifestarla." />
      </RadioGroup>
      <TextField label="DNI/NIE del cónyuge" {...form.register('spouse_national_id')} />

      <Typography variant="h6">Discapacidad</Typography>
      <RadioGroup
        value={form.watch('disability_degree')}
        onChange={(event) => form.setValue('disability_degree', event.target.value as DisabilityDegree)}
      >
        <FormControlLabel value="" control={<Radio />} label="Sin grado reconocido" />
        <FormControlLabel value="recognized" control={<Radio />} label="Grado de minusvalía reconocido" />
        <FormControlLabel value="from33" control={<Radio />} label="Igual o superior al 33% e inferior al 65%" />
        <FormControlLabel value="from65" control={<Radio />} label="Igual o superior al 65%" />
      </RadioGroup>
      <FormControlLabel control={<Checkbox {...form.register('own_disability_help')} defaultChecked={candidate.own_disability_help} />} label="Necesidad de ayuda de terceras personas o movilidad reducida" />

      <Typography variant="h6">Movilidad geográfica</Typography>
      <TextField label="Fecha de traslado" type="date" InputLabelProps={{ shrink: true }} {...form.register('geographic_move_date')} />
      <FormControlLabel control={<Checkbox {...form.register('irregular_income')} defaultChecked={candidate.irregular_income} />} label="He percibido rendimientos con período de generación superior a 2 años en los 5 períodos anteriores." />

      <Typography variant="h6">Hijos y otros descendientes</Typography>
      <Typography variant="body2">Menores de 25 años, o mayores si son discapacitados, que conviven contigo y no superan 8.000 euros de rentas.</Typography>
      {children.fields.map((field, index) => (
        <Stack key={field.id} spacing={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <TextField label="Fecha de nacimiento" type="date" InputLabelProps={{ shrink: true }} {...form.register(`children.${index}.birth_date`)} />
          <TextField label="Fecha de adopción" type="date" InputLabelProps={{ shrink: true }} {...form.register(`children.${index}.adoption_date`)} />
          <RadioGroup
            value={form.watch(`children.${index}.disability_65`) ? '65' : form.watch(`children.${index}.disability_33`) ? '33' : ''}
            onChange={(event) => {
              form.setValue(`children.${index}.disability_33`, event.target.value === '33')
              form.setValue(`children.${index}.disability_65`, event.target.value === '65')
            }}
          >
            <FormControlLabel value="" control={<Radio />} label="Sin grado de minusvalía" />
            <FormControlLabel value="33" control={<Radio />} label="Del 33% al 65%" />
            <FormControlLabel value="65" control={<Radio />} label="65% o más" />
          </RadioGroup>
          <FormControlLabel control={<Checkbox {...form.register(`children.${index}.needs_help`)} />} label="Ayuda de terceras personas o movilidad reducida" />
          <FormControlLabel control={<Checkbox {...form.register(`children.${index}.lives_only_with_you`)} />} label="Cómputo por entero: convive exclusivamente contigo" />
          <Button color="error" onClick={() => children.remove(index)} disabled={children.fields.length === 1}>Quitar descendiente</Button>
        </Stack>
      ))}
      <Button onClick={() => children.append(emptyChild())} disabled={children.fields.length >= 9}>Añadir descendiente</Button>

      <Typography variant="h6">Ascendientes</Typography>
      <Typography variant="body2">Mayores de 65 años, o menores si son discapacitados, que conviven contigo al menos la mitad del año.</Typography>
      {ascendants.fields.map((field, index) => (
        <Stack key={field.id} spacing={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <TextField label="Fecha de nacimiento" type="date" InputLabelProps={{ shrink: true }} {...form.register(`ascendants.${index}.birth_date`)} />
          <RadioGroup
            value={form.watch(`ascendants.${index}.disability_65`) ? '65' : form.watch(`ascendants.${index}.disability_33`) ? '33' : ''}
            onChange={(event) => {
              form.setValue(`ascendants.${index}.disability_33`, event.target.value === '33')
              form.setValue(`ascendants.${index}.disability_65`, event.target.value === '65')
            }}
          >
            <FormControlLabel value="" control={<Radio />} label="Sin grado de minusvalía" />
            <FormControlLabel value="33" control={<Radio />} label="Del 33% al 65%" />
            <FormControlLabel value="65" control={<Radio />} label="65% o más" />
          </RadioGroup>
          <FormControlLabel control={<Checkbox {...form.register(`ascendants.${index}.needs_help`)} />} label="Ayuda de terceras personas o movilidad reducida" />
          <TextField select label="Convive con otros descendientes" defaultValue="" {...form.register(`ascendants.${index}.cohabitation_share`)}>
            <MenuItem value="">No aplica</MenuItem>
            {catalogs.ascendantShares.map((option) => (
              <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
            ))}
          </TextField>
          <Button color="error" onClick={() => ascendants.remove(index)} disabled={ascendants.fields.length === 1}>Quitar ascendiente</Button>
        </Stack>
      ))}
      <Button onClick={() => ascendants.append(emptyAscendant())} disabled={ascendants.fields.length >= 7}>Añadir ascendiente</Button>

      <Typography variant="h6">Pensiones y vivienda</Typography>
      <TextField label="Pensión compensatoria anual" {...form.register('compensatory_pension')} />
      <TextField label="Anualidades por alimentos" {...form.register('child_support')} />
      <FormControlLabel control={<Checkbox {...form.register('housing_deduction')} defaultChecked={candidate.housing_deduction} />} label="Pagos por adquisición o rehabilitación de vivienda habitual anteriores a 2013, con retribuciones inferiores a 33.007,20 euros." />
      <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting || saved}>Continuar a legal</Button>
    </Stack>
    {saved && <StepFeedback title="Datos fiscales guardados" onDone={() => navigate('/legal')} />}
    </Shake>
  )
}
