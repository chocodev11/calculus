import os
import unittest
from unittest.mock import patch

from app.config import LOCAL_DATABASE_PATH, Settings


class SettingsContractTests(unittest.TestCase):
    def test_local_database_path_is_repository_relative(self):
        settings = Settings(app_env="local", debug="true")

        self.assertTrue(settings.debug)
        self.assertEqual(settings.database_url, f"sqlite+aiosqlite:///{LOCAL_DATABASE_PATH.as_posix()}")

    def test_boolean_debug_values_are_supported(self):
        self.assertTrue(Settings(app_env="local", debug="true").debug)
        self.assertFalse(Settings(app_env="local", debug="false").debug)

    def test_legacy_release_uses_production_contract(self):
        with patch.dict(
            os.environ,
            {
                "DEBUG": "release",
                "DATABASE_URL": "postgresql://user:password@example.test/calculus",
            },
            clear=False,
        ):
            os.environ.pop("APP_ENV", None)
            settings = Settings()

        self.assertEqual(settings.app_env, "production")
        self.assertFalse(settings.debug)
        self.assertEqual(
            settings.database_url,
            "postgresql+asyncpg://user:password@example.test/calculus",
        )

    def test_production_requires_postgresql_and_debug_false(self):
        with self.assertRaises(ValueError):
            Settings(app_env="production", debug="true", database_url="postgresql://db")

        with self.assertRaises(ValueError):
            Settings(app_env="production", debug="false", database_url="sqlite:///calculus.db")


if __name__ == "__main__":
    unittest.main()
