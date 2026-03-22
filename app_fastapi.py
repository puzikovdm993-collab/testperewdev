# app_fastapi.py
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
import sys
from datetime import datetime
from typing import Optional, List, Dict, Any
import base64
import json
import io
import logging
import time
from minio import Minio
from minio.error import S3Error

# ------------------- Конфигурация из переменных окружения -------------------
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', '127.0.0.1:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'test')
MINIO_SECURE = os.getenv('MINIO_SECURE', 'false').lower() == 'true'

# Инициализация клиента MinIO
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False,
)

# Создаем FastAPI приложение
app = FastAPI(title="FastAPI Server", version="1.0.0")

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Получаем путь к директории, где находится скрипт
if getattr(sys, 'frozen', False):
    # Если приложение упаковано в exe (PyInstaller)
    script_dir = os.path.dirname(sys.executable)
else:
    # Обычный режим выполнения
    script_dir = os.path.dirname(os.path.abspath(__file__))

# Конфигурация
UPLOAD_FOLDER = os.path.join(script_dir, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tpt'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename: str) -> bool:
    """Проверка допустимого расширения файла"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_image_info(filename: str) -> Optional[Dict[str, Any]]:
    """Получаем информацию об изображении"""
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return None
    
    stat = os.stat(filepath)
    created = datetime.fromtimestamp(stat.st_ctime).isoformat()
    modified = datetime.fromtimestamp(stat.st_mtime).strftime('%d.%m.%Y %H:%M')
    size = stat.st_size
    
    # Определяем тип файла
    file_type = 'unknown'
    if '.' in filename:
        file_type = filename.rsplit('.', 1)[1].lower()
    
    return {
        'filename': filename,
        'original_filename': filename,
        'created': created,
        'modified': modified,
        'size': size,
        'type': file_type
    }


def get_minio_client() -> Minio:
    global minio_client
    if minio_client is None:
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE
        )
    return minio_client


def ensure_bucket(client: Minio, bucket_name: str) -> None:
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
    except S3Error as e:
        raise e


# ------------------- Routes -------------------

@app.get('/')
async def index():
    """Отдаёт index.html из корня проекта"""
    if not os.path.exists('index.html'):
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse('index.html')


@app.get('/images')
async def list_images():
    """Получить список всех изображений"""
    try:
        images = []
        
        # Проверяем существование папки
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Получаем список файлов
        for filename in os.listdir(UPLOAD_FOLDER):
            if allowed_file(filename):
                info = get_image_info(filename)
                if info:
                    images.append(info)
        
        # Сортируем по дате создания (новые сначала)
        images.sort(key=lambda x: x['created'], reverse=True)
        
        return {
            'success': True,
            'images': images,
            'count': len(images)
        }
    except Exception as e:
        logger.error(f"Error listing images: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/list_minio')
async def list_objects():
    """Получить список объектов в бакете с логированием"""
    start_time = time.time()
    
    logger.info(f"Запрос списка объектов из бакета '{MINIO_BUCKET}'")
    
    # Проверка существования бакета
    try:
        bucket_exists = minio_client.bucket_exists(MINIO_BUCKET)
        logger.debug(f"Проверка бакета '{MINIO_BUCKET}': {'существует' if bucket_exists else 'не существует'}")
    except Exception as e:
        logger.error(f"Ошибка при проверке бакета '{MINIO_BUCKET}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"MinIO error: {str(e)}")

    if not bucket_exists:
        logger.warning(f"Бакет '{MINIO_BUCKET}' не найден")
        raise HTTPException(status_code=404, detail=f'Bucket "{MINIO_BUCKET}" does not exist')

    # Получение списка объектов
    try:
        objects = list(minio_client.list_objects(MINIO_BUCKET, recursive=True))
        object_count = len(objects)
        logger.info(f"Получено {object_count} объектов из бакета '{MINIO_BUCKET}'")
        
        # Логирование первых нескольких объектов для отладки (не более 5)
        if object_count > 0:
            sample = objects[:5]
            logger.debug(f"Примеры объектов: {[obj.object_name for obj in sample]}")
        
    except Exception as e:
        logger.error(f"Ошибка при получении списка объектов из бакета '{MINIO_BUCKET}': {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    # Формирование результата
    result = [
        {
            'name': obj.object_name,
            'size': obj.size,
            'last_modified': obj.last_modified.isoformat() if obj.last_modified else None,
            'etag': obj.etag
        }
        for obj in objects
    ]
    
    elapsed = time.time() - start_time
    logger.info(f"Запрос списка объектов завершён за {elapsed:.3f} сек, возвращено {len(result)} записей")
    
    return result


@app.post('/upload_minio')
async def upload_minio(
    filename: str = Form(default='UnnamedFile'),
    autoscale: str = Form(default='false'),
    colormap: str = Form(default='gray'),
    width: int = Form(default=1),
    height: int = Form(default=1),
    minValue: float = Form(default=0),
    maxValue: float = Form(default=1),
    matrix: UploadFile = File(...)
):
    """Загрузка файла в MinIO"""
    autoscale_bool = autoscale.lower() == 'true'
    
    print(f"upload_minio called: filename='{filename}', "
                          f"autoscale={autoscale_bool}, colormap='{colormap}', "
                          f"width={width}, height={height}, "
                          f"min_value={minValue}, max_value={maxValue}")

    # Проверка параметров
    if width <= 0 or height <= 0:
        print(f"Invalid dimensions: width={width}, height={height}")
        raise HTTPException(status_code=400, detail="Width and height must be positive numbers")

    # Читаем содержимое файла
    try:
        file_content = await matrix.read()
        file_content_str = file_content.decode('utf-8')
        print(f"Matrix file read successfully, size={len(file_content_str)} bytes")
    except UnicodeDecodeError as e:
        print(f"Failed to decode matrix file as UTF-8: {e}")
        raise HTTPException(status_code=400, detail="Matrix file must be UTF-8 encoded text")

    # Кодируем в base64
    try:
        b64_content = base64.b64encode(file_content_str.encode('utf-8')).decode('utf-8')
        logger.debug(f"Base64 encoding completed, length={len(b64_content)}")
    except Exception as e:
        logger.error(f"Base64 encoding failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to encode matrix")

    try:
        # Формируем JSON-объект
        json_payload = {
            'filename': filename,
            'autoscale': autoscale_bool,
            'colormap': colormap,
            'width': width,
            'height': height,
            'min_value': minValue,
            'max_value': maxValue,
            'b64_content': b64_content
        }

        json_str = json.dumps(json_payload, indent=2)
        json_bytes = json_str.encode('utf-8')
        logger.debug(f"JSON payload prepared, size={len(json_bytes)} bytes")

        client = get_minio_client()
        ensure_bucket(client, MINIO_BUCKET)

        # Имя объекта в MinIO (меняем расширение на .json)
        object_name = f"{filename}.json"
        logger.info(f"Uploading to MinIO: bucket='{MINIO_BUCKET}', object='{object_name}'")

        data_stream = io.BytesIO(json_bytes)
        client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=data_stream,
            length=len(json_bytes),
            content_type='application/json'
        )

        logger.info(f"Successfully uploaded to MinIO: {object_name}")
        return {
            'success': True,
            'message': 'File uploaded, converted to base64 and saved as JSON',
            'bucket': MINIO_BUCKET,
            'object': object_name
        }

    except Exception as e:
        logger.error(f"Error during MinIO upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/download_minio/{object_name}')
async def download_file_minio(object_name: str):
    """Скачивает файл из MinIO по имени JSON-объекта."""
    # Проверяем существование бакета и объекта
    if not minio_client.bucket_exists(MINIO_BUCKET):
        raise HTTPException(status_code=404, detail=f'Bucket "{MINIO_BUCKET}" does not exist')
    
    try:
        # Получаем объект как поток
        response = minio_client.get_object(MINIO_BUCKET, object_name)
    
        # Декодируем и парсим JSON
        json_data = json.loads(response.read().decode('utf-8'))
        matrix = base64.b64decode(json_data['b64_content']).decode('utf-8')

        # Возвращаем имя файла в JSON
        return {
            "status": "success",
            "filename": json_data['filename'],
            "autoscale": json_data['autoscale'],
            "colormap": json_data['colormap'],
            "width": json_data['width'],
            "height": json_data['height'],
            "min_value": json_data['min_value'],
            "max_value": json_data['max_value'],
            "matrix": matrix
        }
    except S3Error as e:
        if e.code == 'NoSuchKey':
            raise HTTPException(status_code=404, detail=f'Object "{object_name}" not found')
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/image/{filename}')
async def get_image(filename: str):
    """Получить изображение"""
    try:
        # Защищаем от path traversal атак
        from pathlib import Path
        safe_filename = Path(filename).name
        filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(filepath)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/upload')
async def upload_image(file: UploadFile = File(...)):
    """Загрузить изображение на сервер"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No selected file")
        
        if not allowed_file(file.filename):
            raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
        
        # Защищаем имя файла
        from pathlib import Path
        original_filename = Path(file.filename).name
        
        # Добавляем timestamp, чтобы избежать конфликтов имен
        name, ext = os.path.splitext(original_filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{name}_{timestamp}{ext}"
        
        # Сохраняем файл
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {
            'success': True,
            'filename': unique_filename,
            'original_filename': original_filename,
            'message': 'File uploaded successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/upload_test')
async def upload_file_test(
    id: Optional[str] = Form(default=None),
    filename: str = Form(default='UnnamedFile'),
    autoscale: str = Form(default='false'),
    colormap: str = Form(default='gray'),
    width: int = Form(default=1),
    height: int = Form(default=1),
    minValue: float = Form(default=0),
    maxValue: float = Form(default=1),
    matrix: UploadFile = File(...)
):
    """Тестовая загрузка файла с обработкой матрицы"""
    try:
        autoscale_bool = autoscale.lower() == 'true'
        
        # Проверка параметров
        if width <= 0 or height <= 0:
            raise HTTPException(status_code=400, detail="Width and height must be positive numbers")
        if not allowed_file(filename):
            raise HTTPException(status_code=400, detail="Недопустимое расширение файла")
        
        if not matrix.filename:
            raise HTTPException(status_code=400, detail="Файл матрицы не найден")

        matrix_filename = filename
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        matrix_path = os.path.join(UPLOAD_FOLDER, matrix_filename)
        
        # Сохраняем файл
        with open(matrix_path, "wb") as buffer:
            content = await matrix.read()
            buffer.write(content)

        print(f"Получены данные:")
        print(f"ID: {id}")
        print(f"Файл: {filename}")
        print(f"Автоподстройка: {autoscale_bool}")
        print(f"Колор-форма: {colormap}")
        print(f"Размер: [{width}, {height}]")
        print(f"Диапазон: [{minValue}, {maxValue}]")
        print(f"matrix_path+matrix_filename: [{matrix_path}]")
        
        with open(matrix_path, 'r', encoding='utf-8') as file:
            data = file.read().strip().split(',')
            numbers = [float(x.strip()) for x in data]

        lines = [numbers[i:i+int(width)] for i in range(0, len(numbers), int(width))]

        with open(matrix_path, 'w', encoding='utf-8') as out_file:
            out_file.write(f"{int(width)}\n")  
            out_file.write(f"{int(height)}\n") 
            
            for line in lines:
                formatted_line = ' '.join(format(num, '.5f') for num in line) 
                out_file.write(formatted_line + '\n')
                
        return {
            'success': True,
            'filename': filename, 
            'original_filename': filename, 
            'message': 'File uploaded successfully'
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_test: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/delete/{filename}')
async def delete_image(filename: str):
    """Удалить изображение"""
    try:
        from pathlib import Path
        safe_filename = Path(filename).name
        filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found")
        
        os.remove(filepath)
        return {
            'success': True,
            'message': 'File deleted successfully'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/clear_all')
async def clear_all_images():
    """Удалить все изображения"""
    try:
        count = 0
        
        # Проверяем существование папки
        if not os.path.exists(UPLOAD_FOLDER):
            return {
                'success': True,
                'message': 'No images to delete',
                'count': 0
            }
        
        for filename in os.listdir(UPLOAD_FOLDER):
            if allowed_file(filename):
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                os.remove(filepath)
                count += 1
        
        return {
            'success': True,
            'message': f'Deleted {count} images',
            'count': count
        }
    except Exception as e:
        logger.error(f"Error clearing all images: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/move')
async def move_object(request: Request):
    """Переместить объект в MinIO"""
    try:
        data = await request.json()
        if not data or 'source' not in data or 'destination' not in data:
            raise HTTPException(status_code=400, detail='Missing source or destination')

        source = data['source']
        destination = data['destination']

        logger.info(f"Attempting to move {source} -> {destination}")

        # Проверка существования исходного объекта
        try:
            minio_client.stat_object(MINIO_BUCKET, source)
        except Exception as e:
            logger.error(f"Source object not found: {source} - {e}")
            raise HTTPException(status_code=404, detail=f'Source object not found: {str(e)}')

        # Копирование с использованием CopySource
        try:
            copy_source = {'Bucket': MINIO_BUCKET, 'Object': source}
            minio_client.copy_object(MINIO_BUCKET, destination, copy_source)
            logger.info(f"Successfully copied {source} to {destination}")
        except Exception as e:
            logger.error(f"Copy failed: {source} -> {destination} - {e}")
            raise HTTPException(status_code=500, detail=f'Copy failed: {str(e)}')

        # Удаление исходного объекта
        try:
            minio_client.remove_object(MINIO_BUCKET, source)
            logger.info(f"Successfully removed original {source}")
        except Exception as e:
            logger.error(f"Failed to remove original {source} after copy: {e}")
            raise HTTPException(status_code=500, detail=f'Copy succeeded but failed to remove original: {str(e)}')

        return {'success': True, 'source': source, 'destination': destination}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in move_object: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/mkdir_minio')
async def mkdir_minio(request: Request):
    """
    Создаёт пустой объект-маркер, имитирующий папку.
    Ожидает JSON: { "prefix": "newfolder/" }
    """
    try:
        data = await request.json()
        if not data or 'prefix' not in data:
            raise HTTPException(status_code=400, detail='Missing prefix')

        prefix = data['prefix'].strip()
        # Убедимся, что префикс оканчивается на '/'
        if not prefix.endswith('/'):
            prefix += '/'

        # Проверка на допустимость (запрещаем '..')
        if '..' in prefix or prefix.startswith('/'):
            raise HTTPException(status_code=400, detail='Invalid folder name')

        try:
            # Создаём пустой объект
            minio_client.put_object(
                bucket_name=MINIO_BUCKET,
                object_name=prefix,
                data=io.BytesIO(b''),
                length=0,
                content_type='application/x-directory'
            )
            return {'success': True, 'prefix': prefix}
        except S3Error as e:
            logger.error(f"Error creating folder {prefix}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in mkdir_minio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/delete_minio')
async def delete_minio(path: str = Query(...)):
    """
    Удаляет объект или все объекты с указанным префиксом.
    Параметры: ?path=some/path   (если оканчивается на '/', удаляется папка)
    """
    try:
        # Базовая защита
        if '..' in path or path.startswith('/'):
            raise HTTPException(status_code=400, detail='Invalid path')

        try:
            if path.endswith('/'):
                # Удаление папки (все объекты с префиксом)
                objects_to_delete = list(minio_client.list_objects(
                    MINIO_BUCKET, prefix=path, recursive=True
                ))
                if not objects_to_delete:
                    raise HTTPException(status_code=404, detail='Folder not found or empty')

                # Формируем список имён для массового удаления
                delete_object_list = [obj.object_name for obj in objects_to_delete]
                errors = minio_client.remove_objects(
                    MINIO_BUCKET,
                    delete_object_list,
                    bypass_governance_mode=True
                )
                # Проверим, были ли ошибки
                failed = list(errors)
                if failed:
                    logger.error(f"Errors while deleting folder {path}: {failed}")
                    raise HTTPException(status_code=500, detail='Some objects could not be deleted')

                return {
                    'success': True,
                    'deleted_count': len(delete_object_list),
                    'message': f'Folder {path} deleted'
                }
            else:
                # Удаление одного файла
                minio_client.remove_object(MINIO_BUCKET, path)
                return {
                    'success': True,
                    'deleted_count': 1,
                    'message': f'File {path} deleted'
                }
        except S3Error as e:
            logger.error(f"Error deleting {path}: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_minio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/workflow')
async def panel():
    """Отдаёт workflow.html из корня проекта"""
    if not os.path.exists('workflow.html'):
        raise HTTPException(status_code=404, detail="workflow.html not found")
    return FileResponse('workflow.html')


@app.get('/viewIcons')
async def viewIcons():
    """Отдаёт icons-preview.html из корня проекта"""
    if not os.path.exists('icons-preview.html'):
        raise HTTPException(status_code=404, detail="icons-preview.html not found")
    return FileResponse('icons-preview.html')


@app.get('/new_int')
async def viewNewInterface():
    """Отдаёт test2_0.html из корня проекта"""
    if not os.path.exists('test2_0.html'):
        raise HTTPException(status_code=404, detail="test2_0.html not found")
    return FileResponse('test2_0.html')


if __name__ == '__main__':
    import uvicorn
    # Запускаем сервер
    print(f"Server starting...")
    print(f"Script directory: {script_dir}")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Open http://127.0.0.1:15404 in your browser")
    uvicorn.run(app, host='0.0.0.0', port=15404)
