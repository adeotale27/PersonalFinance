from api_exports import build_workbook


def test_build_workbook_creates_excel_file():
    rows = [
        {"name": "Loan A", "amount": 12000, "tags": ["home", "2026"]},
        {"name": "Loan B", "amount": 5000},
    ]

    bio = build_workbook(rows)

    assert bio is not None
    assert bio.getvalue().startswith(b"PK")
