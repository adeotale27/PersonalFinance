import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import api_admin


class FakePlatformSettings:
    def __init__(self):
        self.document = None

    async def find_one(self, query):
        return self.document

    async def update_one(self, query, update, upsert=False):
        self.document = {"_id": query["_id"], **update["$set"]}


def test_sitewalkthrough_status_defaults_to_enabled(monkeypatch):
    settings = FakePlatformSettings()
    monkeypatch.setattr(api_admin, "raw_db", SimpleNamespace(platform_settings=settings))

    assert asyncio.run(api_admin.get_sitewalkthrough_status()) == {"enabled": True}


def test_only_platform_admin_can_change_sitewalkthrough(monkeypatch):
    settings = FakePlatformSettings()
    monkeypatch.setattr(api_admin, "raw_db", SimpleNamespace(platform_settings=settings))

    with pytest.raises(HTTPException) as error:
        asyncio.run(api_admin.update_sitewalkthrough_status({"enabled": False}, {"_id": "owner"}))

    assert error.value.status_code == 403
    assert settings.document is None


def test_platform_admin_can_disable_sitewalkthrough(monkeypatch):
    settings = FakePlatformSettings()
    monkeypatch.setattr(api_admin, "raw_db", SimpleNamespace(platform_settings=settings))

    async def skip_audit(*args, **kwargs):
        return None

    monkeypatch.setattr(api_admin, "log_audit", skip_audit)
    user = {"_id": "platform-admin", "is_platform_admin": True}

    result = asyncio.run(api_admin.update_sitewalkthrough_status({"enabled": False}, user))

    assert result == {"enabled": False}
    assert asyncio.run(api_admin.get_sitewalkthrough_status()) == {"enabled": False}


def test_sitewalkthrough_rejects_non_boolean_value(monkeypatch):
    settings = FakePlatformSettings()
    monkeypatch.setattr(api_admin, "raw_db", SimpleNamespace(platform_settings=settings))
    user = {"_id": "platform-admin", "is_platform_admin": True}

    with pytest.raises(HTTPException) as error:
        asyncio.run(api_admin.update_sitewalkthrough_status({"enabled": "false"}, user))

    assert error.value.status_code == 400
    assert settings.document is None
