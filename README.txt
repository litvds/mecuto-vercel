Исправление ошибки:
Cannot convert argument to a ByteString ...

Причина:
в HTTP заголовок Content-Disposition попадало кириллическое имя файла.

Что заменить:
app/api/build-tkp-pdf/route.js

Что исправлено:
- имя PDF в заголовке теперь ASCII-безопасное
- кириллица в имени файла больше не ломает ответ сервера
