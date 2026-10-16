"""Candidate payloads."""

from typing import Optional

from pydantic import BaseModel, Field

from app.models.candidate import Ascendant, Child


class PersonalDataUpdate(BaseModel):
    first_name: str
    last_name: str
    second_last_name: Optional[str] = None
    id_type: str
    email: str
    phone: str
    birth_date: str
    gender: str
    nationality: str
    civil_status: str
    street_type: str
    street: str
    street_number: Optional[str] = None
    floor: Optional[str] = None
    postal_code: str
    city: str
    province: str
    country: str
    social_security_number: str
    iban: str
    work_permit_end: Optional[str] = None
    unemployed: str
    disability: str
    disability_type: Optional[str] = None
    disability_percent: Optional[str] = None


class TaxDataUpdate(BaseModel):
    family_single_with_children: bool = False
    family_spouse_low_income: bool = False
    spouse_national_id: Optional[str] = None
    family_other: bool = False
    disability_recognized: bool = False
    own_disability_33: bool = False
    own_disability_65: bool = False
    own_disability_help: bool = False
    geographic_move_date: Optional[str] = None
    irregular_income: bool = False
    compensatory_pension: Optional[str] = None
    child_support: Optional[str] = None
    housing_deduction: bool = False
    children: list[Child] = Field(default_factory=list)
    ascendants: list[Ascendant] = Field(default_factory=list)


class LegalSubmit(BaseModel):
    privacy_accepted: bool
    email_accepted: bool
    truth_accepted: bool


class DocumentStatus(BaseModel):
    document_type: str
    label: str
    required: bool
    uploaded: bool
    original_filename: Optional[str] = None
