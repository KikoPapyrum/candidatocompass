import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'

import type { Option } from '../types/domain'

type OptionFieldProps<T extends FieldValues> = {
  name: Path<T>
  control: Control<T>
  label: string
  options: Option[]
  disabled?: boolean
  search?: boolean
}

const filterOptions = createFilterOptions<Option>({
  ignoreAccents: true,
  ignoreCase: true,
  matchFrom: 'any',
  stringify: (option) => option.label,
})

export function OptionField<T extends FieldValues>({ name, control, label, options, disabled, search = false }: OptionFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={options}
          disabled={disabled}
          autoHighlight
          openOnFocus={search}
          selectOnFocus={search}
          handleHomeEndKeys
          filterOptions={filterOptions}
          noOptionsText="Sin resultados"
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={options.find((option) => option.id === field.value) ?? null}
          onChange={(_, option) => field.onChange(option?.id ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={search ? 'Buscar' : undefined}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
      )}
    />
  )
}
