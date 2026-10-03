# Database lockdown: switching the server to a secret key

Right now every table is open. Anyone who finds the publishable key could read or change all the data, including user password hashes and sessions. The fix takes three steps. The order matters.

## 1. Get a secret key (you do this; never paste it into chat)

1. Open the Supabase dashboard for project `oevhlfgitajhzgqajzua`, then **Project Settings → API Keys**.
2. Under **Secret keys**, create one (for example, named `nictd-server`) and copy it. It starts with `sb_secret_`.

## 2. Give it to the server

Set it as an environment variable in the terminal that starts the server:

```powershell
$env:SUPABASE_SECRET_KEY = "sb_secret_...your key..."
node server.js
```

On a hosting provider, add `SUPABASE_SECRET_KEY` in its environment settings. The server stops printing `[supadb] Using the publishable key` once the secret key is picked up.

Don't put it in `supabase-config.json` unless you have to; the environment variable is safer. If you do, use a `"secretKey"` field. That file is already in `.gitignore`.

## 3. Apply the lockdown

Run `docs/sql/rls-lockdown.sql` in the Supabase SQL editor, or ask Claude to apply it. It:

- turns on Row Level Security for all 19 tables, with no public policies;
- makes the `indicator_catalog` view respect permissions;
- pins the functions' search path;
- stops the public roles from calling the database functions directly.

Then load the site and log in to check. If anything breaks, `docs/sql/rls-rollback.sql` reopens the database at once.

## 4. Clean up after the lockdown works

- In **Project Settings → API Keys**, disable the old publishable key. It was able to read everything.
- Run `delete from public.sessions;` in the SQL editor. Every session token was readable while the tables were open, so treat them as compromised. Everyone signs in again.

## Still to do before a public launch

- Delete `docs/USER-CREDENTIALS.md` once real passwords are handed out, and rotate the demo accounts.
- Add CSRF tokens, rate limiting on login, a password reset flow and an admin audit log (see `docs/ASSUMPTIONS.md`).
