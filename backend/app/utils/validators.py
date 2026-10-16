"""Identity, bank and date checks used by the candidate flow."""

import re
from datetime import date

DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKET"
EMAIL_PATTERN = re.compile(
    r"^(?=[a-zA-Z0-9@._%+\-]{6,254}$)"
    r"[a-zA-Z0-9._%+\-]{1,64}"
    r"@(?:[a-zA-Z0-9\-]{1,63}\.){1,8}[a-zA-Z]{2,63}$"
)


def normalize_national_id(value: str) -> str:
    """Uppercase a DNI or NIE and drop surrounding spaces."""
    return (value or "").strip().upper()


def is_valid_national_id(value: str) -> bool:
    """Validate a Spanish DNI or NIE check letter."""
    national_id = normalize_national_id(value)
    if not re.fullmatch(r"[XYZ]?\d{5,8}[A-Z]", national_id):
        return False
    number = national_id[:-1].replace("X", "0").replace("Y", "1").replace("Z", "2")
    return DNI_LETTERS[int(number) % 23] == national_id[-1]


def is_dni(value: str) -> bool:
    """Return whether the identifier is a DNI rather than a NIE."""
    national_id = normalize_national_id(value)
    return bool(re.fullmatch(r"\d{8}[A-Z]", national_id)) and is_valid_national_id(national_id)


def is_valid_email(value: str) -> bool:
    """Return whether the address matches the format used by the legacy app."""
    return bool(EMAIL_PATTERN.fullmatch((value or "").strip()))


def is_valid_password(value: str) -> bool:
    """Require 8 characters with upper, lower and a digit."""
    if value is None or len(value) < 8:
        return False
    return (
        any(character.isupper() for character in value)
        and any(character.islower() for character in value)
        and any(character.isdigit() for character in value)
    )


def is_valid_iban(value: str) -> bool:
    """Validate a 24-character IBAN with the mod-97 check."""
    iban = re.sub(r"\s+", "", (value or "")).upper()
    if len(iban) != 24 or not iban[:2].isalpha() or not iban[2:].isdigit():
        return False
    rearranged = iban[4:] + iban[:4]
    digits = []
    for character in rearranged:
        if character.isdigit():
            digits.append(character)
        elif character.isalpha():
            digits.append(str(ord(character) - 55))
        else:
            return False
    return int("".join(digits)) % 97 == 1


def is_valid_nass(value: str) -> bool:
    """Validate a Spanish social security affiliation number."""
    number = re.sub(r"\s+", "", (value or ""))
    if not re.fullmatch(r"\d{12}", number):
        return False
    province = int(number[0:2])
    affiliation = int(number[2:10])
    control = int(number[10:12])
    if province == 0:
        return False
    base = affiliation + province * 10_000_000 if affiliation < 10_000_000 else int(number[0:10])
    return base % 97 == control


def is_valid_mobile(value: str) -> bool:
    """A Spanish mobile number is nine digits."""
    return bool(re.fullmatch(r"\d{9}", re.sub(r"\s+", "", value or "")))


def parse_iso_date(value: str | None) -> date | None:
    """Parse `YYYY-MM-DD`, or return None when the value is empty."""
    if value is None or str(value).strip() == "":
        return None
    try:
        return date.fromisoformat(str(value).strip())
    except ValueError:
        return None


def is_amount(value: str | None) -> bool:
    """Allow an empty amount or a number with an optional decimal comma."""
    if value is None or str(value).strip() == "":
        return True
    return bool(re.fullmatch(r"\d+([,.]\d{1,2})?", str(value).strip()))
