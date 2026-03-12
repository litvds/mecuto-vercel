ПАТЧ ДЛЯ PDF НА МОБИЛЬНЫХ

Что заменить:
1. package.json
2. app/page.js
3. добавить app/api/build-tkp-pdf/route.js

Что делает:
- генерирует НАСТОЯЩИЙ PDF на сервере
- на телефоне открывает PDF в новой вкладке
- на компьютере скачивает PDF автоматически

После замены:
npm install
npm run dev
