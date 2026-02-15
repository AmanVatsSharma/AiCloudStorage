# FAQ

## 1) Where do I upload files?
Use `/files` and click **Upload** or drag-drop.

## 2) Are deleted files immediately removed?
No. Files are moved to `/trash` first and follow retention policy rules.

## 3) How do I restore deleted files?
Open `/trash` and click **Restore** for eligible files.

## 4) Why can’t I permanently delete from trash?
Your storage policy may disable permanent delete or retention window is still active.

## 5) How do I share files safely?
Use `/files` → **Share** and set:
- access level,
- expiration,
- download permissions.

## 6) Where can admins view audit history?
Use `/audit`.

## 7) Where can admins view compliance posture?
Use `/compliance`.

## 8) Is there a system health endpoint?
Yes, `GET /api/health`.

## 9) Is there a demo account?
Yes (temporary testing flow):
- email: `demo@gmail.com`
- password: `Password@123`

## 10) Why does deployment fail even if build passes locally?
Usually due missing production env variables (Supabase keys, service role key, OpenAI key).
See `docs/DEPLOYMENT.md`.
