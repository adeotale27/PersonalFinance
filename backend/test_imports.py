from api_imports import classify_row, detect_provider, parse_rows


def test_classifies_holding_without_inventing_pnl():
    row = classify_row({"Symbol": "TATAMOTORS", "ISIN": "INE155A01022", "Quantity": 120, "Market Value": "12500"})
    assert row["kind"] == "HOLDING"
    assert row["name"] == "TATAMOTORS"
    assert row["quantity"] == 120


def test_classifies_pnl_as_historical_not_current_holding():
    row = classify_row({"Symbol": "TATAMOTORS", "Realized P&L": "-1250"})
    assert row["kind"] == "HISTORICAL_PNL"
    assert row["amount"] == -1250


def test_detects_zerodha_from_financial_headers():
    assert detect_provider("statement.csv", ["tradingsymbol", "isin"])[0] == "ZERODHA"


def test_parses_csv_rows():
    rows = parse_rows("holdings.csv", b"Symbol,Quantity\nTATAMOTORS,120\n")
    assert rows == [{"Symbol": "TATAMOTORS", "Quantity": "120"}]
