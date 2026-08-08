from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_patients_columns(engine: Engine) -> None:
    """
    Backwards-compatible startup fix when an existing DB was created from an older model.
    We add missing nullable columns that the current `Patient` ORM model expects.
    """

    inspector = inspect(engine)
    if "patients" not in inspector.get_table_names():
        # `Base.metadata.create_all(...)` will create the table.
        return

    existing_cols = {col["name"] for col in inspector.get_columns("patients")}

    additions: dict[str, str] = {
        "gender": "VARCHAR(50)",
        "dob": "VARCHAR(50)",
        "condition": "VARCHAR(256)",
    }

    missing = [col for col in additions.keys() if col not in existing_cols]
    if not missing:
        return

    with engine.begin() as conn:
        for col in missing:
            col_type = additions[col]
            # Hardcoded/whitelisted names to avoid SQL injection risk.
            conn.execute(text(f'ALTER TABLE "patients" ADD COLUMN "{col}" {col_type}'))


def ensure_schema_compat(engine: Engine) -> None:
    ensure_patients_columns(engine)

