from api_finance import normalize_flush_selection


def test_normalize_flush_selection_handles_income_expense_and_all():
    assert normalize_flush_selection(["income", "expenses", "loans"]) == [
        "transactions:INCOME",
        "transactions:EXPENSE",
        "loans",
    ]
    assert normalize_flush_selection(["all"]) == ["all"]


def test_normalize_flush_selection_handles_private_and_rental_streams():
    assert normalize_flush_selection(["losses", "rental_properties", "rent_payments"]) == [
        "losses",
        "rental_properties",
        "rent_payments",
    ]
