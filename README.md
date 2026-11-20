# Крипты Санкр-Тор (web prototype scaffold)

Стартовый каркас веб-прототипа нарративной JRPG и психологического инструмента (PSS-10) для разработки в OpenCode.

## Ключевая логика PSS
- Сюжет E1–E10 содержательно связан с пунктами PSS-10 по меткам `pss_item` (1–10); выборы логируются с метками `D/C/G` (скрыто от игрока).
- **Стандартизированный опросник PSS-10 предъявляется только после завершения игры (дополнительно)** в классической форме вне сюжета.
- Результаты показываются только по явному запросу игрока; без диагностических выводов.
- В десктопной (.exe, Electron — позже) версии данные PSS/логов сохраняются локально на ПК разработчика.

Подробная спецификация: `CRYPTS_SANCR_TOR_WEB_PROJECT.md`.

## Требования
- Node.js LTS, npm
- Git
- OpenCode (для агентной разработки), см. `opencode.json` и `AGENTS.md`

## Установка и запуск
```bash
npm install
npm run dev
```

## Проверки
```bash
npm test
npm run build
npm run sprites:check
```

## Графика
- Рантайм-ассеты: `public/assets/` (см. `public/assets/README.md`).
- Уже интегрированы 32×32 idle-спрайты (8 направлений): `celestina`, `tan`, `hirdmen-shieldwall`.
- Проверка в игре: титул → «Проверка спрайтов» или `http://localhost:5173/?scene=SpritePreviewScene`.
- Импорт нового пака: `npm run sprites:import -- --zip "<path>.zip" --id zereks --name "Зерекс"`.
- Очередь генерации и промпты: `design/source/GRAPHICS-TASKS.md`.

## Структура
- `public/data/pss10.json` — опросник PSS-10 и схема подсчёта
- `src/data/characters.json` — манифест спрайтов (импортируется в код, чтобы загрузка была детерминированной)
- `src/systems/pssScoring.ts` — подсчёт баллов/субшкал
- `tests/pssScoring.test.ts` — тесты подсчёта
- `src/scenes/` — сцены Phaser (каркас)
- `public/assets/`, `public/data/events/` — ассеты и данные событий (заполняются по ходу разработки)
- `electron/` — оболочка для локального сохранения данных разработчика (этап 6)

## Публикация (GitHub Pages)
Сайт собирается и публикуется автоматически при каждом `git push` в `main`
(workflow: `.github/workflows/deploy.yml`).

Один раз после создания репозитория:
**GitHub → Settings → Pages → Build and deployment → Source: GitHub Actions.**

Адрес: `https://<username>.github.io/sancr-tor/`

- `base: './'` в `vite.config.ts` — относительные пути, поэтому одна и та же сборка работает и локально, и на Pages-подпути.
- Workflow сначала запускает `npm test`, потом `npm run build`; упавший тест останавливает деплой.
- Браузерная версия — статический сайт: PSS-результаты и логи никуда не отправляются.

## Отладочные параметры URL
- `?scene=SpritePreviewScene` — сразу открыть проверку спрайтов.
- `?scene=PostGamePSSScene` — каркас пост-игрового опросника.
- `?debug=1` — открыть доступ к `window.__game` (Phaser) в консоли.

## Примечания
- Формулировки пунктов в `public/data/pss10.json` следует сверить с первоисточником (Золотарёва А.А., 2023, русская версия PSS-10) перед исследовательским использованием.
- Не коммитить секреты API; ключ провайдера задаётся через переменную окружения (см. `opencode.json`).
