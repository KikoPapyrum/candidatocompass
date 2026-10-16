"""Lookup tables copied from the legacy candidate form."""

import json
from functools import lru_cache
from pathlib import Path

_CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "catalogs.json"


@lru_cache
def load_catalogs() -> dict:
    """Load nationality, country and province lists once."""
    with _CATALOG_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def option_ids(name: str) -> set[str]:
    """Return the allowed ids of a flat catalog."""
    return {item["id"] for item in load_catalogs()[name]}


def province_ids(country_id: str) -> set[str]:
    """Return province ids for a country, or an empty set when unknown."""
    rows = load_catalogs()["provincesByCountry"].get(country_id, [])
    return {item["id"] for item in rows}
