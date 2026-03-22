# Инструкция по запуску FastAPI сервера

## Требования

- Python 3.8 или выше
- MinIO сервер (опционально, для работы с бакетами)

## Шаг 1: Установка зависимостей

Установите все необходимые пакеты из файла `requirements_fastapi.txt`:

```bash
pip install -r requirements_fastapi.txt
```

Или вручную:

```bash
pip install fastapi>=0.104.0
pip install uvicorn[standard]>=0.24.0
pip install python-multipart>=0.0.6
pip install minio>=7.1.0
```

## Шаг 2: Настройка переменных окружения (опционально)

Для работы с MinIO настройте следующие переменные окружения:

```bash
# Linux/Mac
export MINIO_ENDPOINT='127.0.0.1:9000'
export MINIO_ACCESS_KEY='minioadmin'
export MINIO_SECRET_KEY='minioadmin'
export MINIO_BUCKET='test'
export MINIO_SECURE='false'

# Windows (PowerShell)
$env:MINIO_ENDPOINT='127.0.0.1:9000'
$env:MINIO_ACCESS_KEY='minioadmin'
$env:MINIO_SECRET_KEY='minioadmin'
$env:MINIO_BUCKET='test'
$env:MINIO_SECURE='false'
```

Если переменные не заданы, будут использованы значения по умолчанию.

## Шаг 3: Запуск сервера

Запустите сервер командой:

```bash
uvicorn app_fastapi:app --host 127.0.0.1 --port 15404 --reload
```

Параметры:
- `--host 127.0.0.1` — адрес прослушивания (localhost)
- `--port 15404` — порт сервера
- `--reload` — автоматическая перезагрузка при изменении кода (удобно для разработки)

### Альтернативный запуск (без reload):

```bash
python -m uvicorn app_fastapi:app --host 127.0.0.1 --port 15404
```

## Шаг 4: Проверка работы

Откройте браузер и перейдите по адресу:

- **Главная страница**: http://127.0.0.1:15404/
- **Документация API (Swagger UI)**: http://127.0.0.1:15404/docs
- **Альтернативная документация (ReDoc)**: http://127.0.0.1:15404/redoc

## Доступные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Главная страница (index.html) |
| GET | `/images` | Получить список всех изображений |
| GET | `/image/{filename}` | Получить изображение по имени |
| POST | `/upload` | Загрузить изображение на сервер |
| DELETE | `/delete/{filename}` | Удалить изображение |
| GET | `/list_minio` | Получить список объектов в бакете MinIO |
| POST | `/upload_minio` | Загрузить файл в MinIO |
| GET | `/download_minio/{object_name}` | Скачать файл из MinIO |
| POST | `/upload_test` | Тестовая загрузка файла с обработкой матрицы |

## Шаг 5: Остановка сервера

В терминале нажмите `Ctrl+C` для остановки сервера.

## Примечания

1. **Папка загрузок**: Файлы сохраняются в папку `uploads/`, которая создаётся автоматически в директории проекта.

2. **Логирование**: Логи сервера выводятся в консоль. Уровень логирования — INFO.

3. **Безопасность имён файлов**: Сервер использует `pathlib.Path().name` для защиты от path traversal атак.

4. **CORS**: Для подключения фронтенда с другого домена может потребоваться настройка CORS middleware.

## Пример запроса через curl

Загрузка изображения:

```bash
curl -X POST "http://127.0.0.1:15404/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/image.jpg"
```

Получение списка изображений:

```bash
curl "http://127.0.0.1:15404/images"
```

## Решение проблем

### Ошибка: `ModuleNotFoundError: No module named 'fastapi'`

Убедитесь, что зависимости установлены:

```bash
pip install -r requirements_fastapi.txt
```

### Ошибка: `Address already in use`

Порт 15404 уже занят. Используйте другой порт:

```bash
uvicorn app_fastapi:app --host 127.0.0.1 --port 8000
```

### Ошибка подключения к MinIO

Проверьте:
- Запущен ли MinIO сервер
- Правильность учётных данных в переменных окружения
- Существование бакета (создаётся автоматически при первом обращении)
