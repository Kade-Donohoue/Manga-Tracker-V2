# Instructions
1. Enter both the old and new D1 database credentials.
2. Start the development server by running:
  ```
  pnpm run dev
  ```
3. Copy the local URL provided by Wrangler (typically http://localhost:8787).
4. Open http://localhost:8787/manga to migrate manga data.
Check wranglers console for any conflicts or errors.
5. Have each user create a new account in the system.
6. For each user, open:
  ```
  http://localhost:8787/user?newId={better-auth-id}&oldId={clerk-id}
  ```
  replacing the placeholders with the appropriate IDs.

## merge Data
```SQL
BEGIN TRANSACTION;

UPDATE userData
SET mangaId = 'NEW_ID'
WHERE mangaId = 'OLD_ID';

UPDATE userStats
SET mangaId = 'NEW_ID'
WHERE mangaId = 'OLD_ID';

COMMIT;
```