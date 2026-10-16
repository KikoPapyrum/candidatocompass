"""Domain errors returned as HTTP responses."""


class DomainError(Exception):
    """A business-rule failure with an HTTP status."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)
