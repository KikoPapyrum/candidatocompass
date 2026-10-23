"""Short-lived image challenge for the public inscription form."""

import base64
import io
import secrets
import time
from random import Random

from PIL import Image, ImageDraw, ImageFont

from app.utils.exceptions import DomainError

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
TTL_SECONDS = 300
_challenges: dict[str, tuple[str, float]] = {}


class CaptchaService:
    """Issue a picture and accept each answer only once."""

    @staticmethod
    def issue() -> tuple[str, str]:
        now = time.time()
        expired = [key for key, (_, deadline) in _challenges.items() if deadline <= now]
        for key in expired:
            _challenges.pop(key, None)
        rng = Random()
        answer = "".join(rng.choice(ALPHABET) for _ in range(5))
        challenge_id = secrets.token_urlsafe(18)
        _challenges[challenge_id] = (answer, now + TTL_SECONDS)
        return challenge_id, _image(answer, rng)

    @staticmethod
    def verify(challenge_id: str, answer: str) -> None:
        stored = _challenges.pop((challenge_id or "").strip(), None)
        expected, deadline = stored if stored else ("", 0.0)
        given = "".join((answer or "").split()).upper()
        if not stored or deadline <= time.time() or given != expected:
            raise DomainError("El captcha no es correcto.")


def _image(answer: str, rng: Random) -> str:
    width, height = 220, 64
    image = Image.new("RGB", (width, height), "#f4f7fb")
    draw = ImageDraw.Draw(image)
    for _ in range(7):
        draw.line(
            (
                rng.randint(0, width),
                rng.randint(0, height),
                rng.randint(0, width),
                rng.randint(0, height),
            ),
            fill=rng.choice(("#d4bc7d", "#c5ced6", "#9aa6b2")),
            width=rng.randint(1, 2),
        )
    font = ImageFont.load_default(size=32)
    cursor = 16
    for character in answer:
        glyph = Image.new("RGBA", (40, 48), (0, 0, 0, 0))
        ImageDraw.Draw(glyph).text((4, 4), character, font=font, fill="#222C36")
        tilted = glyph.rotate(rng.randint(-18, 18), resample=Image.Resampling.BICUBIC, expand=True)
        image.paste(tilted, (cursor, rng.randint(6, 14)), tilted)
        cursor += 38
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"
