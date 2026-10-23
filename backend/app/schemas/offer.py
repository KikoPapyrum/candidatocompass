"""Public offer and inscription bodies."""

from pydantic import BaseModel


class EnrollRequest(BaseModel):
    national_id: str
    first_name: str
    last_name: str
    second_last_name: str | None = None
    email: str
    phone: str
    captcha_id: str
    captcha_answer: str
