СТАБИЛЬНЫЙ PDF ПАТЧ БЕЗ CHROMIUM

Что заменить:
- package.json
- app/page.js
- app/api/build-tkp-pdf/route.js
- добавить lib/pdfLibBuilder.js

Что меняется:
- PDF теперь собирается через pdf-lib, без Puppeteer/Chromium
- исчезает ошибка с @sparticuz/chromium на Vercel
- iPhone/iPad открывает PDF в этой же вкладке
- Android открывает PDF в новой вкладке
- компьютер скачивает PDF

После замены:
npm install
npm run dev
