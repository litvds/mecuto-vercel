# V5 — роли, авторизация, журнал ТКП, PDF/DOCX

## Что добавлено
- вход по логину и паролю
- хранение пароля через bcrypt-хэш
- роли:
  - `manager` — только PDF
  - `sales_director` — PDF и PDF+DOCX
  - `ceo` — PDF, PDF+DOCX и журнал ТКП
- журнал генераций в Google Sheets (`tkp_log`)
- отдельная страница `/admin` для генерального директора
- исправление скачивания на Android:
  - PDF и DOCX для мобильных идут через `download=1`
  - `PDF + DOCX` для мобильных отдаётся ZIP

## Какие листы нужны в Google Sheets

### Лист `users`
Строка 1:
login | password_hash | role | full_name | is_active

Примеры ролей:
- manager
- sales_director
- ceo

### Лист `tkp_log`
Строка 1:
created_at | login | full_name | role | customer | inn | model | source | total | files | tkp_number

## Как задать пароль, если хранится только хэш
1. Придумайте пароль
2. Выполните:
```bash
node tools/make_password_hash.mjs "MyStrongPassword123"
```
3. Возьмите строку хэша и вставьте в `users.password_hash`
4. Сам пароль сообщите сотруднику отдельно один раз

## Какие ENV нужны
```env
AUTH_SECRET=your_long_random_secret
GOOGLE_SHEETS_SPREADSHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Что заменить / добавить
- package.json
- app/page.js
- app/admin/page.js
- app/api/auth/login/route.js
- app/api/auth/logout/route.js
- app/api/auth/me/route.js
- app/api/build-tkp-pdf/route.js
- app/api/build-tkp-docx/route.js
- app/api/build-tkp-bundle/route.js
- app/api/tkp-log/route.js
- lib/auth.js
- lib/rolesSheets.js
- lib/docxBuilder.js
- tools/make_password_hash.mjs

## После замены
```bash
npm install
npm run build
```
