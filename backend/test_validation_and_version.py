import pytest
from fastapi import HTTPException

from core import validate_financial_payload
from api_version import release_history


def test_financial_fields_accept_numbers_and_preserve_text():
    payload = validate_financial_payload({"amount": "1250.50", "ownership_percent": 50, "notes": "  Family loan  "})
    assert payload["amount"] == 1250.5
    assert payload["ownership_percent"] == 50.0
    assert payload["notes"] == "Family loan"


@pytest.mark.parametrize("payload", [{"amount": "twelve"}, {"amount": -1}, {"interest_rate": 101}, {"amount": float("inf")}])
def test_financial_fields_reject_invalid_numbers(payload):
    with pytest.raises(HTTPException) as error:
        validate_financial_payload(payload)
    assert error.value.status_code == 422


def test_release_history_has_current_version_and_releases():
    history = release_history()
    assert history["current"] == history["releases"][0]["version"]
    assert history["releases"][0]["changes"]
