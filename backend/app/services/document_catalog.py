"""Document classes used when Kulteo creates items, same catalog as the simulator."""

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

_PATH = Path(__file__).resolve().parents[1] / "data" / "document_classes.yaml"
REQUEST_YES = "Sí"
REQUEST_NO = "No"
FORMULARIO_145_ID_FIELD = "FORMULARIO_145_ID"


@dataclass(frozen=True)
class DocumentClass:
    id: str
    label: str
    kulteo_flags: tuple[str, ...]
    compass_typology: str
    compass_flag: str
    from_template: bool


@lru_cache
def document_classes() -> tuple[DocumentClass, ...]:
    raw = yaml.safe_load(_PATH.read_text(encoding="utf-8"))
    return tuple(
        DocumentClass(
            id=item["id"],
            label=item["label"],
            kulteo_flags=tuple(item.get("kulteo_flags") or []),
            compass_typology=item.get("compass_typology") or item["label"],
            compass_flag=item.get("compass_flag") or (item.get("kulteo_flags") or [item["id"]])[0],
            from_template=bool(item.get("from_template")),
        )
        for item in raw["document_classes"]
    )


def class_for_flag(flag: str) -> DocumentClass | None:
    for item in document_classes():
        if flag == item.id or flag in item.kulteo_flags:
            return item
    return None


def flag_for_request(token: str) -> str | None:
    """Return the legacy document code stored on the candidate (`DNI_ANVERSO`)."""
    item = class_for_flag(token)
    if item is None or item.from_template:
        return None
    return item.kulteo_flags[0] if item.kulteo_flags else item.id
