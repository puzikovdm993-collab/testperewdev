# Руководство по JavaScript модулям для новичков

## 📚 Оглавление

1. [Что такое модули и зачем они нужны?](#что-такое-модули-и-зачем-они-нужны)
2. [Проблемы монолитного кода](#проблемы-монолитного-кода)
3. [Как работают модули в JavaScript](#как-работают-модули-в-javascript)
4. [Синтаксис export и import](#синтаксис-export-и-import)
5. [Структура наших модулей](#структура-наших-модулей)
6. [Практические примеры использования](#практические-примеры-использования)
7. [Лучшие практики](#лучшие-практики)
8. [Частые ошибки](#частые-ошибки)

---

## Что такое модули и зачем они нужны?

**Модуль** — это отдельный файл с JavaScript-кодом, который экспортирует (отдаёт наружу) определённые функции, переменные или классы для использования в других файлах.

### Аналогия из реальной жизни

Представьте большую библиотеку:
- ❌ **Без модулей**: все книги свалены в одну огромную кучу. Чтобы найти нужную, придётся перебирать всё подряд.
- ✅ **С модулями**: книги разложены по полкам с подписями: "Математика", "Физика", "История". Вы сразу идёте к нужной полке.

### Зачем использовать модули?

| Преимущество | Описание |
|-------------|----------|
| **Организация** | Код разбит на логические части по назначению |
| **Переиспользование** | Одну функцию можно импортировать в разные файлы |
| **Читаемость** | Легче понять, что делает каждый файл |
| **Тестирование** | Проще тестировать отдельные функции |
| **Командная работа** | Разные разработчики могут работать над разными модулями |
| **Изоляция** | Переменные внутри модуля не засоряют глобальную область видимости |

---

## Проблемы монолитного кода

Раньше весь код часто писали в одном файле `script.js`:

```javascript
// ❌ ПЛОХО: всё в одном файле (5000+ строк)

// Глобальные переменные (могут конфликтовать!)
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var data = [];
var history = [];

// Функция для рисования линий
function drawLine(x1, y1, x2, y2) { ... }

// Функция для сохранения файла
function saveFile(filename) { ... }

// Функция для математических расчётов
function calculatePolynomial(...) { ... }

// И ещё 200 функций...
```

**Проблемы такого подхода:**
1. Трудно найти нужную функцию
2. Случайное изменение переменной в одном месте ломает всё
3. Невозможно переиспользовать код в другом проекте
4. Долгая загрузка (браузер читает весь файл целиком)
5. Сложно работать в команде

---

## Как работают модули в JavaScript

### Базовый принцип

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  math-utils.js  │──────│   modules.js     │──────│  main.js (HTML) │
│  (экспорт)      │      │   (агрегатор)    │      │  (импорт)       │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

### Типы модульных систем

| Система | Где используется | Синтаксис |
|---------|-----------------|-----------|
| **ES Modules** | Современные браузеры, Node.js 14+ | `export` / `import` |
| CommonJS | Старый Node.js | `module.exports` / `require()` |
| AMD | Очень старый код | `define()` / `require()` |

**Мы используем ES Modules** — это современный стандарт.

---

## Синтаксис export и import

### 1. Именованный экспорт (Named Export)

**Экспорт нескольких функций:**

```javascript
// math-utils.js

export function add(a, b) {
    return a + b;
}

export function multiply(a, b) {
    return a * b;
}

export const PI = 3.14159;
```

**Импорт конкретных функций:**

```javascript
// main.js
import { add, multiply } from './modules/math-utils.js';

console.log(add(2, 3));        // 5
console.log(multiply(4, 5));   // 20
```

**Импорт всего модуля как объект:**

```javascript
import * as MathUtils from './modules/math-utils.js';

console.log(MathUtils.add(2, 3));      // 5
console.log(MathUtils.PI);             // 3.14159
```

### 2. Экспорт по умолчанию (Default Export)

**Один главный экспорт из файла:**

```javascript
// file-manager.js

class FileManager {
    constructor() {
        this.history = [];
    }
    
    save(data) { ... }
    load(filename) { ... }
}

export default FileManager;  // ← без имени!
```

**Импорт без фигурных скобок:**

```javascript
// main.js
import FileManager from './modules/file-manager.js';  // ← имя любое!

const manager = new FileManager();
```

> ⚠️ **Важно:** Default export может быть только один в файле!

### 3. Комбинированный экспорт

```javascript
// canvas-utils.js

export function drawLine(...) { ... }
export function drawCircle(...) { ... }

class CanvasManager {
    constructor(canvas) { ... }
}

export default CanvasManager;  // главный класс
```

```javascript
// Импорт
import CanvasManager, { drawLine, drawCircle } from './modules/canvas-utils.js';
```

---

## Структура наших модулей

### 📁 Дерево файлов

```
scripts/
├── modules/
│   ├── math-utils.js      # Математические функции
│   ├── file-utils.js      # Работа с файлами
│   ├── canvas-utils.js    # Отрисовка на canvas
│   ├── file-manager.js    # Управление историей (undo/redo)
│   ├── modules.js         # Главный агрегатор (экспорт всего)
│   └── MODULES_GUIDE.md   # Это руководство
└── main.js                # Точка входа приложения
```

### 📄 Описание каждого модуля

#### 1. `math-utils.js` — Математические утилиты

**Что внутри:**
- `evaluatePolynomial(coeffs, x)` — вычисление полинома
- `medianFilter(data, radius)` — медианный фильтр для сглаживания
- `generateColorMap(length, colormap)` — генерация цветовых карт
- Вспомогательные функции для интерполяции

**Когда использовать:**
```javascript
import { evaluatePolynomial, medianFilter } from './modules/math-utils.js';

// Сгладить данные перед отрисовкой
const smoothed = medianFilter(rawData, 3);
```

#### 2. `file-utils.js` — Работа с файлами

**Что внутри:**
- `saveAsTPT(data, filename)` — сохранение в формате TPT
- `rgbaToGrayscale(data)` — конвертация RGBA → оттенки серого
- Функции парсинга и форматирования данных

**Когда использовать:**
```javascript
import { saveAsTPT, rgbaToGrayscale } from './modules/file-utils.js';

// Сохранить результат
saveAsTPT(processedData, 'result.tpt');
```

#### 3. `canvas-utils.js` — Отрисовка

**Что внутри:**
- `drawLine(ctx, x1, y1, x2, y2)` — рисование линий
- `drawRectangle(ctx, x, y, w, h)` — рисование прямоугольников
- `floodFill(ctx, startX, startY, fillColor)` — заливка области
- `drawLasso(ctx, points)` — рисование лассо
- Класс `CanvasRenderer` для управления холстом

**Когда использовать:**
```javascript
import { drawLine, floodFill, CanvasRenderer } from './modules/canvas-utils.js';

const renderer = new CanvasRenderer(canvas);
renderer.drawLine(0, 0, 100, 100);
```

#### 4. `file-manager.js` — Управление файлами и историей

**Что внутри:**
- Класс `FileManager` с методами:
  - `saveState()` — сохранить текущее состояние
  - `undo()` — отменить последнее действие
  - `redo()` — вернуть отменённое
  - `loadFile(file)` — загрузить файл
  - `clearHistory()` — очистить историю

**Когда использовать:**
```javascript
import FileManager from './modules/file-manager.js';

const manager = new FileManager();
manager.saveState();  // перед изменением
// ... делаем изменения ...
manager.undo();       // отменить
```

#### 5. `modules.js` — Агрегатор (баррель-файл)

**Что внутри:**
Переэкспорт всех модулей в одном месте для удобного импорта.

```javascript
// modules.js
export * from './math-utils.js';
export * from './file-utils.js';
export * from './canvas-utils.js';
export { default as FileManager } from './file-manager.js';
```

**Преимущество:** один импорт вместо пяти

```javascript
// Вместо этого:
import { func1 } from './modules/math-utils.js';
import { func2 } from './modules/file-utils.js';
import { func3 } from './modules/canvas-utils.js';

// Можно так:
import { func1, func2, func3, FileManager } from './modules/modules.js';
```

---

## Практические примеры использования

### Пример 1: Подключение в HTML

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Моё приложение</title>
</head>
<body>
    <canvas id="canvas" width="800" height="600"></canvas>
    
    <!-- Обратите внимание: type="module" -->
    <script type="module" src="main.js"></script>
</body>
</html>
```

> ⚠️ **Важно:** Без `type="module"` браузер не поймёт `import`/`export`!

### Пример 2: Точка входа (main.js)

```javascript
// main.js

// Импорт конкретных функций
import { evaluatePolynomial, medianFilter } from './modules/math-utils.js';
import { saveAsTPT } from './modules/file-utils.js';
import CanvasRenderer from './modules/canvas-utils.js';
import FileManager from './modules/file-manager.js';

// Или импорт всего из агрегатора
// import { evaluatePolynomial, saveAsTPT, CanvasRenderer, FileManager } from './modules/modules.js';

// Инициализация
const canvas = document.getElementById('canvas');
const renderer = new CanvasRenderer(canvas);
const fileManager = new FileManager();

// Обработка данных
function processData(rawData) {
    const smoothed = medianFilter(rawData, 3);
    const result = evaluatePolynomial([1, 2, 3], smoothed);
    
    renderer.drawData(result);
    fileManager.saveState();
    
    return result;
}

// Сохранение результата
function onSaveClick() {
    const data = renderer.getData();
    saveAsTPT(data, 'output.tpt');
}

document.getElementById('saveBtn').addEventListener('click', onSaveClick);
```

### Пример 3: Создание собственного модуля

Допустим, нужно добавить модуль для работы с цветами:

**Шаг 1:** Создаём файл `color-utils.js`

```javascript
// modules/color-utils.js

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function interpolateColor(color1, color2, factor) {
    const result = {
        r: Math.round(color1.r + (color2.r - color1.r) * factor),
        g: Math.round(color1.g + (color2.g - color1.g) * factor),
        b: Math.round(color1.b + (color2.b - color1.b) * factor)
    };
    return result;
}

export default { hexToRgb, rgbToHex, interpolateColor };
```

**Шаг 2:** Используем в основном коде

```javascript
// main.js
import { hexToRgb, interpolateColor } from './modules/color-utils.js';

const color1 = hexToRgb('#FF0000');  // красный
const color2 = hexToRgb('#0000FF');  // синий

const middleColor = interpolateColor(color1, color2, 0.5);  // фиолетовый
console.log(rgbToHex(middleColor.r, middleColor.g, middleColor.b));
```

**Шаг 3 (опционально):** Добавляем в агрегатор

```javascript
// modules/modules.js
export * from './color-utils.js';  // добавить эту строку
```

---

## Лучшие практики

### ✅ Делайте так:

1. **Один модуль = одна ответственность**
   ```javascript
   // ✅ Хорошо: math-utils.js только для математики
   export function calculate(...) { ... }
   
   // ❌ Плохо: смешивать математику и отрисовку
   export function calculate(...) { ... }
   export function draw(...) { ... }  // ← в другой файл!
   ```

2. **Именуйте файлы понятно**
   ```
   ✅ math-utils.js
   ✅ file-manager.js
   ❌ utils.js (слишком общее)
   ❌ stuff.js (бессмысленно)
   ```

3. **Используйте именованные экспорты для большинства случаев**
   ```javascript
   // ✅ Лучше: видно, что импортируем
   export function formatDate(date) { ... }
   export function parseDate(str) { ... }
   
   // ❌ Хуже: default скрывает имена
   export default { formatDate, parseDate };
   ```

4. **Группируйте импорты**
   ```javascript
   // ✅ Читаемо
   import { func1, func2 } from './module-a.js';
   import { func3, func4 } from './module-b.js';
   
   // ❌ Беспорядок
   import { func1 } from './module-a.js';
   import { func3 } from './module-b.js';
   import { func2 } from './module-a.js';
   ```

5. **Документируйте публичный API**
   ```javascript
   /**
    * Вычисляет значение полинома в точке x
    * @param {number[]} coeffs - коэффициенты полинома [a0, a1, a2, ...]
    * @param {number} x - точка вычисления
    * @returns {number} результат вычисления
    */
   export function evaluatePolynomial(coeffs, x) {
       // ...
   }
   ```

### ❌ Избегайте этого:

1. **Циклические зависимости**
   ```javascript
   // module-a.js
   import { funcB } from './module-b.js';
   export function funcA() { funcB(); }
   
   // module-b.js
   import { funcA } from './module-a.js';  // ❌ Круг!
   export function funcB() { funcA(); }
   ```

2. **Экспорт внутренних вспомогательных функций**
   ```javascript
   // ❌ Не нужно экспортировать всё подряд
   export function _helperInternalFunction() { ... }
   export function __tempDebug() { ... }
   
   // ✅ Экспортируйте только публичный API
   function _helperInternalFunction() { ... }  // без export
   export function publicAPI() { 
       return _helperInternalFunction(); 
   }
   ```

3. **Изменение глобальных переменных в модулях**
   ```javascript
   // ❌ Плохо
   export function badFunction() {
       window.globalVar = 42;  // побочный эффект!
   }
   
   // ✅ Хорошо
   export function goodFunction(value) {
       return value * 2;  // чистая функция
   }
   ```

---

## Частые ошибки

### Ошибка 1: Забыли `type="module"`

```html
<!-- ❌ Не работает -->
<script src="main.js"></script>

<!-- ✅ Работает -->
<script type="module" src="main.js"></script>
```

**Симптом:** Ошибка `"Cannot use import statement outside a module"`

### Ошибка 2: Неправильный путь импорта

```javascript
// ❌ Забыли расширение .js
import { func } from './modules/math-utils';

// ✅ Нужно указывать расширение
import { func } from './modules/math-utils.js';
```

**Симптом:** Ошибка `"Failed to resolve module specifier"`

### Ошибка 3: Путаница между default и named exports

```javascript
// math-utils.js
export function func1() { ... }
export function func2() { ... }

// ❌ Ошибка: пытаемся импортировать default там, где его нет
import MathUtils from './modules/math-utils.js';

// ✅ Правильно: используем фигурные скобки для named exports
import { func1, func2 } from './modules/math-utils.js';
```

### Ошибка 4: Импорт до загрузки DOM

```javascript
// ❌ Может не сработать, если скрипт в head
import { init } from './modules/init.js';
init();  // document.getElementById вернёт null

// ✅ Решение 1: скрипт в конце body
// ✅ Решение 2: ждать DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    init();
});
```

### Ошибка 5: CORS при локальной разработке

При открытии HTML-файла напрямую (`file://`) модули не работают из-за политики CORS.

**Решения:**
1. Использовать локальный сервер:
   ```bash
   npx serve .
   # или
   python -m http.server 8000
   ```
2. Открыть через `http://localhost:8000`, а не `file:///...`

---

## 🎯 Контрольные вопросы

Проверьте себя:

1. **В чём разница между `export` и `export default`?**
   <details>
   <summary>Ответ</summary>
   <code>export</code> позволяет экспортировать несколько именованных элементов из файла. 
   <code>export default</code> экспортирует один элемент по умолчанию (без имени).
   </details>

2. **Как импортировать всё из модуля одним объектом?**
   <details>
   <summary>Ответ</summary>
   <code>import * as ModuleName from './module.js';</code>
   </details>

3. **Зачем нужен атрибут `type="module"` в `<script>`?**
   <details>
   <summary>Ответ</summary>
   Он говорит браузеру, что скрипт использует ES6 модули (import/export), 
   а не обычный скрипт.
   </details>

4. **Можно ли иметь несколько `export default` в одном файле?**
   <details>
   <summary>Ответ</summary>
   Нет, только один default export разрешён в каждом файле.
   </details>

---

## 📚 Дополнительные ресурсы

- [MDN: JavaScript Modules](https://developer.mozilla.org/ru/docs/Web/JavaScript/Guide/Modules)
- [Exploring JS: Modules](https://exploringjs.com/es6-modules/)
- [JavaScript.info: Модули](https://learn.javascript.ru/modules)

---

## Заключение

Модули — это фундаментальный инструмент современной JavaScript-разработки. Они помогают:

- ✅ Держать код организованным
- ✅ Избегать конфликтов имён
- ✅ Переиспользовать код между проектами
- ✅ Работать в команде эффективно

Начните с малого: выделите одну функцию в отдельный модуль, затем другую. Постепенно ваш код станет чище и понятнее!

**Удачи в изучении модулей! 🚀**
