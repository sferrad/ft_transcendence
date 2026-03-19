import bcrypt


def _hash_password(password: str) -> str:
	password_bytes = password.encode("utf-8")
	hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
	return hashed.decode("utf-8")


def _verify_password(plain_password: str, hashed_password: str) -> bool:
	plain_pw_bytes = plain_password.encode("utf-8")
	hashed_pw_bytes = hashed_password.encode("utf-8")
	return bcrypt.checkpw(plain_pw_bytes, hashed_pw_bytes)
