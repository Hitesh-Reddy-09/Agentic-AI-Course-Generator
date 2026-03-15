import uuid


def to_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError, AttributeError):
        # Deterministic fallback lets UI use stable, human-readable keys (e.g., lesson 1.1).
        return uuid.uuid5(uuid.NAMESPACE_URL, str(value))
