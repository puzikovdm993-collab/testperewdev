# Модули JavaScript для Paint-приложения

Эта папка содержит модульные JS файлы, которые экспортируют переиспользуемые функции для основного приложения.

## Структура модулей

### 1. `math-utils.js` - Математические утилиты
Функции для математической обработки изображений:

**Полиномиальная аппроксимация:**
- `computePolynomialCoefficients()` - Вычисление коэффициентов полинома методом наименьших квадратов
- `calculatePolynomialTerms()` - Расчет количества членов полинома
- `getPolynomialTerms()` - Генерация списка членов полинома
- `calculatePolynomialTermsVector()` - Вычисление вектора A для точки (x, y)
- `buildSystemMatrix()` - Построение матрицы сумм и вектора b
- `solveGaussianElimination()` - Метод Гаусса для решения системы уравнений

**Медианный фильтр:**
- `medianFilter()` - Применяет медианный фильтр к матрице
- `createPaddedMatrix()` - Создает расширенную матрицу с нулевыми границами
- `extractWindow()` - Извлекает подматрицу (окрестность) вокруг точки
- `calculateMedian()` - Вычисляет медиану массива чисел

**Цветовые карты:**
- `getColormap()` - Получает цветовую карту по имени (hot, jet, gray, viridis)

**Вспомогательные:**
- `isPixelSelected()` - Проверка выделения пикселя
- `countSelectedPixels()` - Подсчет точек в выделенной области

---

### 2. `file-utils.js` - Утилиты для работы с файлами
Функции для сохранения и конвертации файлов:

- `saveToTptFile()` - Сохранение матрицы в TPT файл
- `convertToRGBA()` - Конвертация матрицы в RGBA формат
- `applyPolynomialCorrection()` - Применение полиномиальной коррекции к изображению

---

### 3. `canvas-utils.js` - Утилиты для работы с Canvas
Функции для отрисовки и работы с canvas:

**Рисование:**
- `bresenham()` - Рисование линии алгоритмом Брезенхема
- `clipLine()` - Отсечение линии по алгоритму Лианга-Барски
- `drawStar()` - Рисование звезды
- `drawLasso()` - Рисование лассо
- `drawLassoSelection()` - Рисование выделения лассо

**Работа с масками:**
- `rasterizeLasso()` - Растеризация полигона лассо в маску

**Работа с цветом:**
- `hexToRgb()` - Преобразование HEX цвета в RGB
- `colorsMatch()` - Проверка совпадения цветов
- `getPixelColor()` - Получение цвета пикселя из ImageData
- `setPixelColor()` - Установка цвета пикселя в ImageData

**Заливка:**
- `floodFill()` - Алгоритм заливки (Flood Fill)

---

### 4. `file-manager.js` - Управление файлами и историей
Функции для управления файлами и историей действий:

**Создание и управление файлами:**
- `makeId()` - Генерация уникального ID
- `createFileStructure()` - Создание структуры нового файла

**История действий:**
- `resetHistory()` - Сброс истории файла
- `captureState()` - Сохранение состояния в историю
- `restoreState()` - Восстановление состояния из истории
- `pushState()` - Добавление состояния в историю
- `undo()` - Отмена действия
- `redo()` - Повтор действия

**Recent files:**
- `saveRecentFiles()` - Сохранение последних открытых файлов в localStorage
- `loadRecentFiles()` - Загрузка последних открытых файлов из localStorage

**Утилиты:**
- `formatFileSize()` - Форматирование размера файла

---

### 5. `modules.js` - Главный экспорт
Файл для удобного импорта всех модулей сразу:

```javascript
import * as Utils from './modules/modules.js';

// Или выборочно:
import { medianFilter, getColormap } from './modules/math-utils.js';
import { floodFill, drawLasso } from './modules/canvas-utils.js';
```

## Использование в браузере

Для использования ES6 модулей в браузере, подключите скрипт с `type="module"`:

```html
<script type="module">
    import { 
        medianFilter, 
        getColormap,
        floodFill 
    } from './scripts/modules/modules.js';
    
    // Использование функций
    const result = await medianFilter(matrix, 3, ...);
</script>
```

## Преимущества модульной структуры

1. **Разделение ответственности** - каждый модуль отвечает за свою область
2. **Переиспользование** - функции можно использовать в разных частях приложения
3. **Тестируемость** - легче писать unit-тесты для отдельных функций
4. **Читаемость** - код проще понимать и поддерживать
5. **Древовидная структура** - явные зависимости между модулями

## Миграция с глобальных функций

Для миграции существующего кода:

**Было:**
```javascript
// В app.js
function _medianFilter(matrix, kernelSize) { ... }
```

**Стало:**
```javascript
// В modules/math-utils.js
export async function medianFilter(matrix, kernelSize, ...) { ... }

// В index.js или другом файле
import { medianFilter } from './modules/math-utils.js';
```
