# WTIS (Web-based Technical Image System)

**WTIS** — это веб-приложение для обработки, анализа и визуализации научных и технических изображений. Приложение предоставляет широкий спектр инструментов для работы с матричными данными, включая полиномиальную аппроксимацию, фильтрацию, цветовое картирование и работу с выделенными областями.

## 📋 Содержание

- [Обзор проекта](#обзор-проекта)
- [Архитектура](#архитектура)
- [Технологический стек](#технологический-стек)
- [Структура проекта](#структура-проекта)
- [Установка и запуск](#установка-и-запуск)
- [Конфигурация](#конфигурация)
- [API Reference](#api-reference)
- [Основные функции](#основные-функции)
- [Модули JavaScript](#модули-javascript)
- [Работа с MinIO](#работа-с-minio)
- [История изменений](#история-изменений)

---

## 🎯 Обзор проекта

WTIS представляет собой полнофункциональное приложение для:

- **Загрузки и отображения** изображений в различных форматах (PNG, JPG, JPEG, TPT)
- **Редактирования изображений** с использованием классических инструментов (кисть, ластик, фигуры, текст)
- **Научной обработки данных** - работа с матрицами числовых значений
- **Полиномиальной аппроксимации** поверхностей методом наименьших квадратов
- **Применения фильтров**: медианный, Собеля, пороговый, логарифмический
- **Цветового картирования** с использованием различных колормап (hot, jet, gray, viridis)
- **Выделения областей** с помощью прямоугольника или инструмента "Лассо"
- **Сохранения результатов** в локальное хранилище или на сервер

### Ключевые возможности

1. **Многооконный интерфейс** - одновременная работа с несколькими файлами
2. **История действий** - отмена/повтор до 50 последних операций
3. **Интеграция с MinIO** - облачное хранение обработанных данных
4. **Адаптивный UI** - ленточный интерфейс в стиле современных графических редакторов
5. **Масштабирование** - зумирование изображений для детальной работы

---

## 🏗️ Архитектура

Приложение построено по модульной архитектуре с разделением ответственности:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│  index.html          - Основная разметка и SVG иконки       │
│  styles/             - CSS стили (index.css, modals.css)    │
│  scripts/            - JavaScript логика                    │
│    ├── index.js      - Инициализация, управление файлами    │
│    ├── app.js        - Обработка изображений, фильтры       │
│    ├── tools.js      - Инструменты рисования                │
│    ├── server.js     - Взаимодействие с сервером            │
│    ├── modals.js     - Модальные окна                       │
│    └── modules/      - Переиспользуемые ES6 модули          │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Flask + Python)                    │
├─────────────────────────────────────────────────────────────┤
│  app.py              - Flask сервер, API endpoints          │
│  uploads/            - Локальное хранилище файлов           │
│  MinIO Client        - S3-совместимое объектное хранилище   │
└─────────────────────────────────────────────────────────────┘
```

### Паттерны проектирования

- **Observer Pattern** - централизованное управление состоянием через Store
- **Single Source of Truth** - состояние приложения хранится в одном месте
- **Immutability** - неизменяемость данных при обновлениях
- **Separation of Concerns** - разделение логики по модулям
- **Unidirectional Data Flow** - однонаправленный поток данных

---

## 🛠️ Технологический стек

### Frontend
| Технология | Назначение |
|------------|------------|
| **HTML5** | Семантическая разметка, Canvas API |
| **CSS3** | Стилизация, Flexbox/Grid layout |
| **JavaScript (ES6+)** | Бизнес-логика, DOM манипуляции |
| **Plotly.js** | Визуализация графиков и 3D поверхностей |
| **Font Awesome** | Векторные иконки |

### Backend
| Технология | Назначение |
|------------|------------|
| **Python 3.x** | Язык программирования |
| **Flask** | Веб-фреймворк |
| **MinIO SDK** | Клиент для S3-хранилища |
| **Werkzeug** | Утилиты для безопасной работы с файлами |

### Хранение данных
| Система | Назначение |
|---------|------------|
| **LocalStorage** | История недавних файлов, настройки UI |
| **Файловая система** | Локальное хранение загруженных изображений |
| **MinIO** | Объектное хранилище для матричных данных |

---

## 📁 Структура проекта

```
/workspace/
├── index.html                 # Главная страница приложения
├── app.py                     # Flask сервер (backend)
├── README.md                  # Базовая документация
│
├── styles/                    # CSS стили
│   ├── index.css              # Основные стили интерфейса
│   └── modals.css             # Стили модальных окон
│
├── scripts/                   # JavaScript файлы
│   ├── index.js               # Инициализация, управление файлами (~2865 строк)
│   ├── app.js                 # Обработка изображений, фильтры (~1559 строк)
│   ├── tools.js               # Инструменты рисования (~858 строк)
│   ├── server.js              # Работа с сервером, загрузка/выгрузка (~2250 строк)
│   ├── modals.js              # Логика модальных окон (~603 строки)
│   └── modules/               # ES6 модули
│       ├── README.md          # Документация модулей
│       ├── modules.js         # Экспорт всех модулей
│       ├── math-utils.js      # Математические функции
│       ├── canvas-utils.js    # Утилиты для Canvas
│       ├── file-utils.js      # Работа с файлами
│       ├── file-manager.js    # Управление файлами и историей
│       ├── ARCHITECTURE.md    # Архитектурные принципы
│       ├── MODULES_GUIDE.md   # Руководство по модулям
│       └── PRINCIPLES.md      # Принципы разработки
│
├── static/                    # Статические ресурсы
│   ├── css/                   # Сторонние CSS библиотеки
│   ├── js/                    # Сторонние JS библиотеки (Plotly)
│   └── *.woff2, *.ttf         # Шрифты Font Awesome
│
├── changes/                   # Изменения: блокировка кнопок
│   ├── README.md              # Описание изменений
│   ├── styles-changes.css     # CSS для disabled кнопок
│   └── scripts-changes.js     # JS функция updateButtonsState()
│
├── changes_m2/                # Альтернативная реализация блокировки
│   ├── README-M2.md           # Инструкция по интеграции
│   ├── styles-changes-m2.css  # CSS стили
│   └── scripts-changes-m2.js  # JavaScript код
│
├── demo_progress.html         # Демонстрация прогресс-бара
├── new_interface.html         # Новая версия интерфейса
├── appdb.html                 # Страница работы с базой данных
│
└── uploads/                   # Папка для загруженных файлов (создается автоматически)
```

---

## ⚙️ Установка и запуск

### Требования

- **Python 3.8+**
- **Node.js** (опционально, для сборки ассетов)
- **MinIO сервер** (опционально, для облачного хранения)

### Шаг 1: Установка зависимостей

```bash
pip install flask minio werkzeug
```

### Шаг 2: Настройка MinIO (опционально)

Если требуется работа с облачным хранилищем:

1. Установите MinIO сервер (https://min.io/download)
2. Запустите сервер:
   ```bash
   minio server /data
   ```
3. Создайте бакет через веб-интерфейс или CLI

### Шаг 3: Запуск приложения

```bash
# Установите переменные окружения (опционально)
export MINIO_ENDPOINT='127.0.0.1:9000'
export MINIO_ACCESS_KEY='minioadmin'
export MINIO_SECRET_KEY='minioadmin'
export MINIO_BUCKET='test'
export MINIO_SECURE='false'

# Запустите Flask сервер
python app.py
```

По умолчанию сервер запускается на `http://localhost:15404`

### Шаг 4: Открытие в браузере

Перейдите по адресу: **http://localhost:15404**

---

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `MINIO_ENDPOINT` | Адрес MinIO сервера | `127.0.0.1:9000` |
| `MINIO_ACCESS_KEY` | Ключ доступа | `minioadmin` |
| `MINIO_SECRET_KEY` | Секретный ключ | `minioadmin` |
| `MINIO_BUCKET` | Имя бакета | `test` |
| `MINIO_SECURE` | Использовать HTTPS | `false` |

### Конфигурация Flask

В `app.py` настроены следующие параметры:

```python
app.config['UPLOAD_FOLDER'] = './uploads'  # Папка для загрузок
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Макс. размер файла: 16MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tpt'}  # Разрешенные расширения
```

---

## 📡 API Reference

### Endpoints бэкенда

#### Работа с изображениями

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/` | Главная страница приложения |
| `GET` | `/images` | Получить список локальных изображений |
| `GET` | `/image/<filename>` | Получить изображение по имени |
| `POST` | `/upload` | Загрузить изображение на сервер |
| `DELETE` | `/delete/<filename>` | Удалить изображение |
| `DELETE` | `/clear_all` | Очистить все изображения |

#### Работа с MinIO

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/list_minio` | Получить список объектов в бакете |
| `POST` | `/upload_minio` | Загрузить матрицу в MinIO (JSON + base64) |
| `GET` | `/download_minio/<object_name>` | Скачать файл из MinIO |
| `POST` | `/mkdir_minio` | Создать папку в бакете |
| `DELETE` | `/delete_minio` | Удалить объект из MinIO |
| `POST` | `/move` | Переместить объект |

#### Другие endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `GET` | `/workflow` | Страница workflow панели |
| `GET` | `/viewIcons` | Просмотр иконок |
| `GET` | `/new_int` | Новый интерфейс |
| `POST` | `/upload_test` | Тестовая загрузка файла |

### Примеры запросов

#### Загрузка изображения

```bash
curl -X POST http://localhost:15404/upload \
  -F "file=@/path/to/image.png"
```

#### Получение списка изображений

```bash
curl http://localhost:15404/images
```

Ответ:
```json
{
  "success": true,
  "images": [
    {
      "filename": "image_20240101_120000.png",
      "original_filename": "image.png",
      "created": "2024-01-01T12:00:00",
      "modified": "01.01.2024 12:00",
      "size": 1024000,
      "type": "png"
    }
  ],
  "count": 1
}
```

#### Загрузка матрицы в MinIO

```bash
curl -X POST http://localhost:15404/upload_minio \
  -F "filename=data" \
  -F "autoscale=true" \
  -F "colormap=jet" \
  -F "width=100" \
  -F "height=100" \
  -F "minValue=0" \
  -F "maxValue=1" \
  -F "matrix=@matrix.txt"
```

---

## 🎨 Основные функции

### 1. Инструменты рисования

Расположены в левой панели инструментов:

| Инструмент | Горячая клавиша | Описание |
|------------|----------------|----------|
| **Кисть** | `B` | Свободное рисование основным цветом |
| **Ластик** | `E` | Стирание пикселей |
| **Пипетка** | `I` | Выбор цвета из изображения |
| **Заливка** | `G` | Заливка области цветом (Flood Fill) |
| **Текст** | `T` | Добавление текста |
| **Лассо** | `L` | Выделение произвольной области |
| **Прямоугольник** | `R` | Выделение прямоугольной области |
| **Фигуры** | - | Рисование линий, кругов, звезд |

### 2. Фильтры обработки изображений

Доступны через меню **"Фильтры"**:

#### Предварительная обработка
- **Аппроксимация поверхностью** - Полиномиальная коррекция искажений
- **Логарифмический фильтр** - Преобразование динамического диапазона
- **Медианный фильтр** - Устранение импульсных шумов
- **Удаление полос сканера** - Коррекция артефактов сканирования

#### Выделение контуров
- **Фильтр Собеля** - Детектирование границ
- **Определение границ** - Алгоритмы edge detection
- **Рельеф** - Emboss эффект

#### Специализированные фильтры
- **СРТИ** - Фильтры для систем регистрации тепловых изображений
- **Фотохронометрия** - Обработка временных рядов изображений
- **Эмуляция искажения** - Моделирование оптических искажений

### 3. Математическая обработка

#### Полиномиальная аппроксимация

Метод наименьших квадратов для аппроксимации поверхности полиномом:

```javascript
// Вычисление коэффициентов полинома заданной степени
_computePolynomialCoefficients(matrix, width, height, order, allArea)
```

Поддерживаемые степени полинома: 1 (плоскость), 2 (параболоид), 3+ (сложные поверхности)

#### Цветовые карты (Colormaps)

Доступные колормэпы для визуализации матриц:

| Название | Описание |
|----------|----------|
| `gray` | Оттенки серого |
| `hot` | Черно-красно-желто-белая |
| `jet` | Сине-красная радужная |
| `viridis` | Перцепционно однородная |
| `plasma` | Фиолетово-желтая |
| `coolwarm` | Холодный-теплый |

### 4. Работа с выделением

#### Прямоугольное выделение
- Выделение области для копирования/вставки
- Обрезка изображения по выделению
- Применение фильтров только к выделенной области

#### Лассо
- Свободное выделение произвольной формы
- Растеризация в маску для точной обработки
- Заливка выделенной области
- Удаление содержимого выделения

### 5. История действий

- До **50 последних действий** сохраняются в истории
- **Ctrl+Z** - отменить последнее действие
- **Ctrl+Y** - повторить отмененное действие
- **Ctrl+H** - открыть панель истории с превью
- Возможность возврата к любому состоянию из истории

### 6. Управление файлами

#### Открытие файлов
- Загрузка с локального диска
- Открытие из серверного хранилища
- Список последних открытых файлов (до 20)

#### Сохранение файлов
- **Локально** - скачивание на устройство
- **На сервер** - сохранение в папку uploads
- **В MinIO** - конвертация в JSON + base64

#### Форматы файлов
- **PNG** - растровое изображение с прозрачностью
- **JPG/JPEG** - сжатое изображение
- **TPT** - текстовый формат матриц (ширина, высота, данные)

---

## 📦 Модули JavaScript

### Структура модулей

#### 1. `math-utils.js` - Математические утилиты

**Основные функции:**

```javascript
// Полиномиальная аппроксимация
computePolynomialCoefficients(matrix, width, height, order, allArea)
calculatePolynomialTerms(order)
getPolynomialTerms(order)
buildSystemMatrix(matrix, width, height, order, allArea)
solveGaussianElimination(sums, b)

// Медианный фильтр
medianFilter(matrix, kernelSize, width, height, selectedArea, minValue, maxValue)
createPaddedMatrix(matrix, padSize)
extractWindow(matrix, x, y, size)
calculateMedian(arr)

// Цветовые карты
getColormap(name) // hot, jet, gray, viridis, plasma, coolwarm

// Утилиты
isPixelSelected(x, y, selection)
countSelectedPixels(matrix, width, height)
```

#### 2. `canvas-utils.js` - Утилиты для Canvas

**Рисование:**
```javascript
bresenham(x0, y0, x1, y1)  // Линия алгоритмом Брезенхема
clipLine(x0, y0, x1, y1, minX, minY, maxX, maxY)  // Отсечение Лианга-Барски
drawStar(ctx, x, y, outerRadius, innerRadius, color)
drawLasso(ctx, points, currentX, currentY)
drawLassoSelection(ctx, points)
```

**Работа с масками:**
```javascript
rasterizeLasso(points, width, height)  // Преобразование полигона в маску
```

**Работа с цветом:**
```javascript
hexToRgb(hex)  // HEX → RGB
colorsMatch(c1, c2, tolerance)  // Сравнение цветов
getPixelColor(data, width, x, y)  // Получить цвет пикселя
setPixelColor(data, width, x, y, color)  // Установить цвет пикселя
```

**Заливка:**
```javascript
floodFill(x, y, fillColor, ctx, imageData)  // Алгоритм заливки
```

#### 3. `file-utils.js` - Утилиты для файлов

```javascript
saveToTptFile(file, filename)  // Сохранение в TPT формат
convertToRGBA(grayData, width, height)  // Конвертация в RGBA
applyPolynomialCorrection(matrix, width, height, coefficients, allArea)
```

#### 4. `file-manager.js` - Управление файлами и историей

**Создание файлов:**
```javascript
makeId()  // Генерация уникального ID
createFileStructure(filename, matrix, width, height, ...)
```

**История:**
```javascript
resetHistory(file)  // Сброс истории
captureState(file)  // Сохранение текущего состояния
restoreState(file, state)  // Восстановление состояния
undo(file)  // Отмена действия
redo(file)  // Повтор действия
```

**Recent files:**
```javascript
saveRecentFiles(files)  // Сохранение в localStorage
loadRecentFiles()  // Загрузка из localStorage
```

#### 5. `modules.js` - Главный экспорт

```javascript
export * from './math-utils.js';
export * from './canvas-utils.js';
export * from './file-utils.js';
export * from './file-manager.js';
```

### Использование модулей

```html
<script type="module">
    import { 
        medianFilter, 
        getColormap,
        floodFill,
        undo 
    } from './scripts/modules/modules.js';
    
    const filtered = await medianFilter(matrix, 3, ...);
</script>
```

---

## ☁️ Работа с MinIO

### Что такое MinIO?

**MinIO** - высокопроизводительное объектное хранилище, совместимое с Amazon S3 API. Используется для хранения больших объемов неструктурированных данных.

### Настройка подключения

В `app.py` клиент MinIO инициализируется следующим образом:

```python
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False,
)
```

### Формат хранения данных

Матрицы сохраняются в MinIO в виде JSON документов:

```json
{
  "filename": "data",
  "autoscale": true,
  "colormap": "jet",
  "width": 100,
  "height": 100,
  "min_value": 0.0,
  "max_value": 1.0,
  "b64_content": "base64_encoded_matrix_data"
}
```

### API методы для работы с MinIO

#### Загрузка файла

```javascript
async function uploadToServer() {
    const formData = new FormData();
    formData.append('filename', filename);
    formData.append('autoscale', autoscale);
    formData.append('colormap', colormap);
    formData.append('width', width);
    formData.append('height', height);
    formData.append('minValue', minValue);
    formData.append('maxValue', maxValue);
    formData.append('matrix', matrixBlob);
    
    const response = await fetch('/upload_minio', {
        method: 'POST',
        body: formData
    });
}
```

#### Скачивание файла

```javascript
async function downloadFromMinio(objectName) {
    const response = await fetch(`/download_minio/${objectName}`);
    const data = await response.json();
    
    // Декодирование base64 матрицы
    const matrix = data.matrix;
}
```

#### Список объектов

```javascript
async function listMinioObjects() {
    const response = await fetch('/list_minio');
    const objects = await response.json();
    // [{name, size, last_modified, etag}, ...]
}
```

---

## 📝 История изменений

### Версия 1.0 (текущая)

#### Основные изменения

1. **Блокировка кнопок при отсутствии файлов**
   - Файлы: `changes/README.md`, `changes_m2/README-M2.md`
   - Функция `updateButtonsState()` проверяет наличие открытых файлов
   - Кнопки редактирования становятся неактивными (disabled)
   - Визуальное отображение: полупрозрачность, серый фон

2. **Модульная архитектура**
   - Выделение переиспользуемых функций в ES6 модули
   - Документы: `scripts/modules/ARCHITECTURE.md`, `MODULES_GUIDE.md`
   - Принципы: неизменяемость, разделение ответственности, Observer pattern

3. **Интеграция с MinIO**
   - Полная поддержка загрузки/выгрузки из объектного хранилища
   - Конвертация матриц в JSON + base64
   - Древовидная структура папок в бакете

4. **Улучшенный UI**
   - Ленточный интерфейс с вкладками
   - Модальные окна с настройками фильтров
   - Прогресс-бары для длительных операций
   - Панель истории с превью состояний

---

## 🔍 Поиск и устранение неисправностей

### Частые проблемы

#### 1. Ошибка подключения к MinIO
**Симптом:** `MinIO error: Connection refused`

**Решение:**
- Проверьте, запущен ли сервер MinIO
- Убедитесь, что `MINIO_ENDPOINT` указан верно
- Проверьте учетные данные (access_key, secret_key)

#### 2. Файлы не загружаются
**Симптом:** Ошибка 413 Payload Too Large

**Решение:**
- Увеличьте `MAX_CONTENT_LENGTH` в `app.py`
- Проверьте размер файла (максимум 16MB по умолчанию)

#### 3. Модули не импортируются
**Симптом:** `Cannot use import statement outside a module`

**Решение:**
- Добавьте `type="module"` в тег script:
  ```html
  <script type="module" src="scripts/index.js"></script>
  ```
- Используйте локальный сервер (не открывайте файл напрямую)

#### 4. Canvas не отображается
**Симптом:** Пустой холст после загрузки изображения

**Решение:**
- Проверьте консоль браузера на ошибки JavaScript
- Убедитесь, что изображение загружено корректно
- Проверьте размеры canvas (должны соответствовать изображению)

---

## 📚 Дополнительные ресурсы

### Документация
- [Flask Documentation](https://flask.palletsprojects.com/)
- [MinIO Python SDK](https://docs.min.io/docs/python-client-quickstart-guide.html)
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

### Внутренняя документация
- `scripts/modules/README.md` - Руководство по модулям
- `scripts/modules/ARCHITECTURE.md` - Архитектурные принципы
- `changes/README.md` - Описание последних изменений

---

## 👥 Авторы и контакты

Проект разработан для обработки научных и технических изображений.

Для вопросов и предложений обращайтесь к документации проекта или изучайте исходный код.

---

## 📄 Лицензия

Информация о лицензии отсутствует. Пожалуйста, обратитесь к владельцу проекта для уточнения условий использования.
