import getpass
import json
import os
from pathlib import Path

from auth import hash_password

current_dir = Path(__file__).parent
credentials_path = Path(
    os.environ.get("TEACHER_CREDENTIALS_FILE", current_dir / "teachers.json")
)

username = input("Teacher username: ").strip()
if not username:
    raise SystemExit("Username cannot be empty.")

password = getpass.getpass("Teacher password (at least 12 characters): ")
confirmation = getpass.getpass("Confirm password: ")
if len(password) < 12:
    raise SystemExit("Password must be at least 12 characters.")
if password != confirmation:
    raise SystemExit("Passwords do not match.")

if credentials_path.exists():
    try:
        teachers = json.loads(credentials_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise SystemExit(f"Could not read {credentials_path}: {error}") from error
    if not isinstance(teachers, list) or any(
        not isinstance(teacher, dict)
        or not isinstance(teacher.get("username"), str)
        or not isinstance(teacher.get("password_hash"), str)
        for teacher in teachers
    ):
        raise SystemExit(f"{credentials_path} must contain valid teacher entries.")
else:
    teachers = []

if any(teacher.get("username") == username for teacher in teachers):
    raise SystemExit("That username already exists.")

teachers.append({"username": username, "password_hash": hash_password(password)})
credentials_path.parent.mkdir(parents=True, exist_ok=True)
temporary_path = credentials_path.with_suffix(credentials_path.suffix + ".tmp")
temporary_path.write_text(json.dumps(teachers, indent=2) + "\n", encoding="utf-8")
temporary_path.chmod(0o600)
temporary_path.replace(credentials_path)
credentials_path.chmod(0o600)
print(f"Teacher account added to {credentials_path}.")
