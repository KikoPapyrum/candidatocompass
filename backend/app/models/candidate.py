"""Candidate profile, tax data and the documents Compass asked for."""

from datetime import datetime
from typing import Optional

import pymongo
from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class Child(BaseModel):
    """One descendant row of form 145."""

    birth_date: Optional[str] = None
    adoption_date: Optional[str] = None
    disability_33: bool = False
    disability_65: bool = False
    needs_help: bool = False
    lives_only_with_you: bool = False


class Ascendant(BaseModel):
    """One ascendant row of form 145."""

    birth_date: Optional[str] = None
    disability_33: bool = False
    disability_65: bool = False
    needs_help: bool = False
    cohabitation_share: Optional[str] = None


class Candidate(Document):
    """Hiring file created by an external process, then completed by the candidate."""

    national_id: str
    object_id: str = ""
    source_fields: dict = Field(default_factory=dict)
    formulario_145_item_id: Optional[str] = None
    first_name: str = ""
    last_name: str = ""
    second_last_name: Optional[str] = None
    id_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    civil_status: Optional[str] = None
    street_type: Optional[str] = None
    street: Optional[str] = None
    street_number: Optional[str] = None
    floor: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    country: Optional[str] = None
    social_security_number: Optional[str] = None
    iban: Optional[str] = None
    work_permit_end: Optional[str] = None
    unemployed: Optional[str] = None
    disability: Optional[str] = None
    disability_type: Optional[str] = None
    disability_percent: Optional[str] = None
    step: Optional[str] = None
    rejection_reason: Optional[str] = None
    required_documents: list[str] = Field(default_factory=list)
    active_offer_code: Optional[str] = None
    personal_data_complete: bool = False
    documents_complete: bool = False
    tax_data_complete: bool = False
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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "candidates"
        indexes = [
            IndexModel([("national_id", pymongo.ASCENDING)], unique=True),
        ]
