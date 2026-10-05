-- Storage for files a hosted server cannot keep on disk (Vercel's disk is read-only).
-- On a development machine the server still writes to disk; on Vercel (supadb.js: REMOTE_FILES)
-- it uploads here with the secret key, which bypasses storage row level security. No storage
-- policies are created, so the anon/authenticated roles can neither list nor upload.
--
--   applications  private  CVs from the careers form, at cv/<random>.<pdf|doc|docx>
--   site-images   public   Image Library uploads, at <collection>/<key>-<time>.<ext>; their record
--                          is the settings row 'image_manifest' (see imagestore.js)
--
-- 4 MB per file, matching the server's limits (a Vercel function refuses bodies over 4.5 MB).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('applications', 'applications', false, 4194304,
   array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('site-images', 'site-images', true, 4194304,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- To undo (empty the buckets in the dashboard first):
--   delete from storage.buckets where id in ('applications', 'site-images');
