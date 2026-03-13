Исправление ошибки:
WinAnsi cannot encode ...

Что заменить:
1. package.json
2. lib/pdfLibBuilder.js

Что ещё нужно сделать:
Положите в проект в папку public/fonts файлы:

public/fonts/Arial.ttf
public/fonts/Arial-Bold.ttf

Важно:
Я не могу прислать сами файлы шрифтов.
Нужен любой TTF с поддержкой кириллицы.
Можно использовать Arial, DejaVu Sans, Inter Cyrillic, Noto Sans.

Если используете другие названия файлов:
переименуйте их в
Arial.ttf
Arial-Bold.ttf
или поправьте пути в lib/pdfLibBuilder.js
