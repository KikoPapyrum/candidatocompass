export type Option = { id: string; label: string }

export type Catalogs = {
  nationalities: Option[]
  streetTypes: Option[]
  countries: Option[]
  disabilityTypes: Option[]
  genders: Option[]
  civilStatuses: Option[]
  yesNo: Option[]
  idTypes: Option[]
  ascendantShares: Option[]
  provincesByCountry: Record<string, Option[]>
}

export type Child = {
  birth_date: string | null
  adoption_date: string | null
  disability_33: boolean
  disability_65: boolean
  needs_help: boolean
  lives_only_with_you: boolean
}

export type Ascendant = {
  birth_date: string | null
  disability_33: boolean
  disability_65: boolean
  needs_help: boolean
  cohabitation_share: string | null
}

export type Candidate = {
  id: string
  national_id: string
  first_name: string
  last_name: string
  second_last_name: string | null
  id_type: string | null
  email: string | null
  phone: string | null
  birth_date: string | null
  gender: string | null
  nationality: string | null
  civil_status: string | null
  street_type: string | null
  street: string | null
  street_number: string | null
  floor: string | null
  postal_code: string | null
  city: string | null
  province: string | null
  country: string | null
  social_security_number: string | null
  iban: string | null
  work_permit_end: string | null
  unemployed: string | null
  disability: string | null
  disability_type: string | null
  disability_percent: string | null
  step: string | null
  rejection_reason: string | null
  required_documents: string[]
  personal_data_complete: boolean
  documents_complete: boolean
  tax_data_complete: boolean
  family_single_with_children: boolean
  family_spouse_low_income: boolean
  spouse_national_id: string | null
  family_other: boolean
  disability_recognized: boolean
  own_disability_33: boolean
  own_disability_65: boolean
  own_disability_help: boolean
  geographic_move_date: string | null
  irregular_income: boolean
  compensatory_pension: string | null
  child_support: string | null
  housing_deduction: boolean
  children: Child[]
  ascendants: Ascendant[]
  editable: boolean
}

export type Account = {
  national_id: string
  email: string
  email_verified: boolean
}

export type DocumentStatus = {
  document_type: string
  label: string
  required: boolean
  uploaded: boolean
  original_filename: string | null
  uploaded_at: string | null
}
