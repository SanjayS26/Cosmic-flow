CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT users_email_normalized CHECK (
    email = lower(email)
    AND length(btrim(email)) > 0
  ),
  CONSTRAINT users_password_hash_not_blank CHECK (
    length(btrim(password_hash)) > 0
  )
);
