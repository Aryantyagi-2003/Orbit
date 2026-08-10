-- Case-insensitive uniqueness safeguard for User.email.
--
-- The existing `User_email_key` unique constraint is case-sensitive, so
-- "a@x.com" and "A@x.com" could previously coexist as two rows — which is
-- exactly what happened in dev testing (two rows for the same person,
-- differing only in email casing). Application code now normalizes email
-- to trim+lowercase at every write and lookup, but this index makes the
-- guarantee hold at the database level too, independent of app code.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower(email));
