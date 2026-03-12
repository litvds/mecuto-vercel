ГОТОВЫЙ ПАТЧ ДЛЯ PDF

Заменить файлы:
- app/page.js
- app/api/build-tkp-pdf/route.js

Как работает:
- iPhone / iPad: открывает PDF в той же вкладке (без пустого popup)
- Android: открывает PDF в новой вкладке
- Компьютер: скачивает PDF

Важно:
- package.json уже должен содержать puppeteer-core и @sparticuz/chromium
- route поддерживает и form-data, и JSON
