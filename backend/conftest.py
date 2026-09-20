"""Offline defaults for unit tests; integration suites override these explicitly."""
import os

# Avoid parsing a production mongodb+srv URL while collecting pure unit tests.
os.environ["MONGO_URL"] = "mongodb://127.0.0.1:27017"
os.environ["DB_NAME"] = "nivara_test"
os.environ["JWT_SECRET"] = "test-only-secret"
