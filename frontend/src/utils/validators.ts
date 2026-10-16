const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKET'

export function isValidNationalId(value: string): boolean {
  const nationalId = (value || '').trim().toUpperCase()
  if (!/^[XYZ]?\d{5,8}[A-Z]$/.test(nationalId)) {
    return false
  }
  const number = nationalId.slice(0, -1).replace('X', '0').replace('Y', '1').replace('Z', '2')
  return LETTERS[Number(number) % 23] === nationalId.slice(-1)
}

export function isDni(value: string): boolean {
  return /^\d{8}[A-Z]$/.test(value.trim().toUpperCase()) && isValidNationalId(value)
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)
}
