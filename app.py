# app.py
from flask import Flask, request, jsonify, send_file, abort, send_from_directory
import os
import sys
from datetime import datetime
from werkzeug.utils import secure_filename
from minio import Minio
from minio.error import S3Error


import base64
import json
import io

import logging
from functools import wraps
from io import BytesIO
import time
from flask import jsonify, current_app



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
# ------------------- Декоратор для обработки ошибок MinIO -------------------
def handle_minio_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except S3Error as e:
            app.logger.error(f"MinIO error: {e}")
            return jsonify({'error': e.message}), e.code if e.code else 500
        except Exception as e:
            app.logger.error(f"Internal error: {e}")
            return jsonify({'error': 'Internal server error'}), 500
    return decorated_function

def get_minio_client():
    global minio_client
    if minio_client is None:
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE
        )
    return minio_client

def ensure_bucket(client, bucket_name):
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
    except S3Error as e:
        raise e

# Создаем Flask-приложение, указываем папку для статических файлов
app = Flask(__name__, static_folder='')


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

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

# Создаем папку для загрузок, если она не существует
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_image_info(filename):
    """Получаем информацию об изображении"""
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
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

@app.route('/')
def index():
    # Отдаём index.html из корня проекта
    if not os.path.exists('index.html'):
        abort(404)
    return send_from_directory('.', 'index.html')

@app.route('/images')
def list_images():
    """Получить список всех изображений"""
    try:
        images = []
        upload_folder = app.config['UPLOAD_FOLDER']
        
        # Проверяем существование папки
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder, exist_ok=True)
        
        # Получаем список файлов
        for filename in os.listdir(upload_folder):
            if allowed_file(filename):
                info = get_image_info(filename)
                if info:
                    images.append(info)
        
        # Сортируем по дате создания (новые сначала)
        images.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({
            'success': True,
            'images': images,
            'count': len(images)
        })
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

# curl  http://localhost:15404/list

@app.route('/list_minio')
@handle_minio_errors
def list_objects():
    """Получить список объектов в бакете с логированием"""
    logger = current_app.logger
    start_time = time.time()
    
    logger.info(f"Запрос списка объектов из бакета '{MINIO_BUCKET}'")
    
    # Проверка существования бакета
    try:
        bucket_exists = minio_client.bucket_exists(MINIO_BUCKET)
        logger.debug(f"Проверка бакета '{MINIO_BUCKET}': {'существует' if bucket_exists else 'не существует'}")
    except Exception as e:
        logger.error(f"Ошибка при проверке бакета '{MINIO_BUCKET}': {str(e)}")
        raise  # передаётся в handle_minio_errors

    if not bucket_exists:
        logger.warning(f"Бакет '{MINIO_BUCKET}' не найден")
        return jsonify({'error': f'Bucket "{MINIO_BUCKET}" does not exist'}), 404

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
        raise

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
    
    return jsonify(result)


@app.route('/upload_minio', methods=['POST'])
@handle_minio_errors
def upload_minio():
    # Получаем параметры из формы
    filename = request.form.get('filename', 'UnnamedFile')
    autoscale = request.form.get('autoscale') == 'true'
    colormap = request.form.get('colormap', 'gray')
    width = int(request.form.get('width', 1))
    height = int(request.form.get('height', 1))
    min_value = float(request.form.get('minValue', 0))
    max_value = float(request.form.get('maxValue', 1))

    print(f"upload_minio called: filename='{filename}', "
                            f"autoscale={autoscale}, colormap='{colormap}', "
                            f"width={width}, height={height}, "
                            f"min_value={min_value}, max_value={max_value}")

    # Проверка параметров
    if width <= 0 or height <= 0:
        print(f"Invalid dimensions: width={width}, height={height}")
        return jsonify({"error": "Width and height must be positive numbers"}), 400

    matrix_file = request.files.get('matrix')
    if not matrix_file:
        print("Matrix file not found in request")
        return jsonify({"error": "Файл матрицы не найден"}), 400

    # Читаем содержимое файла
    try:
        file_content = matrix_file.read().decode('utf-8')
        print(f"Matrix file read successfully, size={len(file_content)} bytes")
    except UnicodeDecodeError as e:
        print(f"Failed to decode matrix file as UTF-8: {e}")
        return jsonify({"error": "Matrix file must be UTF-8 encoded text"}), 400

    # Кодируем в base64
    try:
        b64_content = base64.b64encode(file_content.encode('utf-8')).decode('utf-8')
        current_app.logger.debug(f"Base64 encoding completed, length={len(b64_content)}")
    except Exception as e:
        current_app.logger.error(f"Base64 encoding failed: {e}")
        return jsonify({"error": "Failed to encode matrix"}), 500

    try:
        # Формируем JSON-объект
        json_payload = {
            'filename': filename,
            'autoscale': autoscale,
            'colormap': colormap,
            'width': width,
            'height': height,
            'min_value': min_value,
            'max_value': max_value,
            'b64_content': b64_content
        }

        json_str = json.dumps(json_payload, indent=2)
        json_bytes = json_str.encode('utf-8')
        current_app.logger.debug(f"JSON payload prepared, size={len(json_bytes)} bytes")

        client = get_minio_client()
        ensure_bucket(client, MINIO_BUCKET)

        # Имя объекта в MinIO (меняем расширение на .json)
        object_name = f"{filename}.json"
        current_app.logger.info(f"Uploading to MinIO: bucket='{MINIO_BUCKET}', object='{object_name}'")

        data_stream = io.BytesIO(json_bytes)
        client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=data_stream,
            length=len(json_bytes),
            content_type='application/json'
        )

        current_app.logger.info(f"Successfully uploaded to MinIO: {object_name}")
        return jsonify({
            'success': True,
            'message': 'File uploaded, converted to base64 and saved as JSON',
            'bucket': MINIO_BUCKET,
            'object': object_name
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error during MinIO upload: {str(e)}", exc_info=True)
        # Повторно поднимаем исключение, чтобы декоратор обработал его и вернул ответ
        raise
    
@app.route('/download_minio/<object_name>', methods=['GET'])
@handle_minio_errors
def download_file_minio(object_name):
    """
    Скачивает файл из MinIO по имени JSON-объекта.
    """
    # Проверяем существование бакета и объекта
    if not minio_client.bucket_exists(MINIO_BUCKET):
        return jsonify({'error': f'Bucket "{MINIO_BUCKET}" does not exist'}), 404
    
    try:
        # Получаем объект как поток
        response = minio_client.get_object(MINIO_BUCKET, object_name)
    
        # 2. Декодируем и парсим JSON
        json_data = json.loads(response.read().decode('utf-8'))
        matrix = base64.b64decode(json_data['b64_content']).decode('utf-8')

        # Возвращаем имя файла в JSON (или другом формате)
        return jsonify({
            "status": "success",
            "filename": json_data['filename'],
            "autoscale": json_data['autoscale'],
            "colormap": json_data['colormap'],
            "width": json_data['width'],
            "height": json_data['height'],
            "min_value": json_data['min_value'],
            "max_value": json_data['max_value'],
            "matrix": matrix
        })
    except S3Error as e:
        if e.code == 'NoSuchKey':
            return jsonify({'error': f'Object "{object_name}" not found'}), 404
        raise
        
@app.route('/image/<filename>')
def get_image(filename):
    """Получить изображение"""
    try:
        # Защищаем от path traversal атак
        filename = secure_filename(filename)
        upload_folder = app.config['UPLOAD_FOLDER']
        filepath = os.path.join(upload_folder, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        return send_file(filepath)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def upload_image():
    """Загрузить изображение на сервер"""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file part'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No selected file'
            }), 400
        
        if file and allowed_file(file.filename):
            # Защищаем имя файла
            original_filename = secure_filename(file.filename)
            
            # Добавляем timestamp, чтобы избежать конфликтов имен
            name, ext = os.path.splitext(original_filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{name}_{timestamp}{ext}"
            
            # Сохраняем файл
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            
            return jsonify({
                'success': True,
                'filename': unique_filename,
                'original_filename': original_filename,
                'message': 'File uploaded successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/upload_test', methods=['POST'])
def upload_file_test():
    try:
       
        id = request.form.get('id')
        filename = request.form.get('filename', 'UnnamedFile')
        autoscale = request.form.get('autoscale') == 'true'
        colormap = request.form.get('colormap', 'gray')
        width = int(request.form.get('width', 1))
        height = int(request.form.get('height', 1))
        min_value = float(request.form.get('minValue', 0))
        max_value = float(request.form.get('maxValue', 1))

        # Проверка параметров
        if width <= 0 or height <= 0:
            return jsonify({"error": "Width and height must be positive numbers"}), 400
        if not allowed_file(filename):
            return jsonify({"error": "Недопустимое расширение файла"}), 400
        
        matrix_file = request.files.get('matrix')
        if not matrix_file:
            return jsonify({"error": "Файл матрицы не найден"}), 400

        original_filename = matrix_file.filename
        # matrix_filename = secure_filename(filename)
        matrix_filename = filename
        upload_folder = app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        matrix_path = os.path.join(upload_folder, matrix_filename)
        matrix_file.save(matrix_path)

        print(f"Получены данные:")
        print(f"ID: {id}")
        print(f"Файл: {filename}")
        print(f"Автоподстройка: {autoscale}")
        print(f"Колор-форма: {colormap}")
        print(f"Размер: [{width}, {height}]")
        print(f"Диапазон: [{min_value}, {max_value}]")
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
                
        return jsonify({
            'success': True,
            'filename': filename, 
            'original_filename': filename, 
            'message': 'File uploaded successfully'
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete/<filename>', methods=['DELETE'])
def delete_image(filename):
    """Удалить изображение"""
    try:
        filename = secure_filename(filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        os.remove(filepath)
        return jsonify({
            'success': True,
            'message': 'File deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/clear_all', methods=['DELETE'])
def clear_all_images():
    """Удалить все изображения"""
    try:
        count = 0
        upload_folder = app.config['UPLOAD_FOLDER']
        
        # Проверяем существование папки
        if not os.path.exists(upload_folder):
            return jsonify({
                'success': True,
                'message': 'No images to delete',
                'count': 0
            })
        
        for filename in os.listdir(upload_folder):
            if allowed_file(filename):
                filepath = os.path.join(upload_folder, filename)
                os.remove(filepath)
                count += 1
        
        return jsonify({
            'success': True,
            'message': f'Deleted {count} images',
            'count': count
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500






@app.route('/move', methods=['POST'])
@handle_minio_errors
def move_object():
    data = request.get_json()
    if not data or 'source' not in data or 'destination' not in data:
        return jsonify({'error': 'Missing source or destination'}), 400

    source = data['source']
    destination = data['destination']

    current_app.logger.info(f"Attempting to move {source} -> {destination}")

    # Проверка существования исходного объекта
    try:
        minio_client.stat_object(MINIO_BUCKET, source)
    except Exception as e:
        current_app.logger.error(f"Source object not found: {source} - {e}")
        return jsonify({'error': f'Source object not found: {str(e)}'}), 404

    # Копирование с использованием CopySource
    try:
        copy_source = {'Bucket': MINIO_BUCKET, 'Object': source}   # для версий ≤6.x
        minio_client.copy_object(MINIO_BUCKET, destination, copy_source)
        current_app.logger.info(f"Successfully copied {source} to {destination}")
    except Exception as e:
        current_app.logger.error(f"Copy failed: {source} -> {destination} - {e}")
        return jsonify({'error': f'Copy failed: {str(e)}'}), 500

    # Удаление исходного объекта
    try:
        minio_client.remove_object(MINIO_BUCKET, source)
        current_app.logger.info(f"Successfully removed original {source}")
    except Exception as e:
        current_app.logger.error(f"Failed to remove original {source} after copy: {e}")
        return jsonify({
            'error': f'Copy succeeded but failed to remove original: {str(e)}',
            'warning': 'Original file still exists, please check manually'
        }), 500

    return jsonify({'success': True, 'source': source, 'destination': destination})

@app.route('/mkdir_minio', methods=['POST'])
@handle_minio_errors
def mkdir_minio():
    """
    Создаёт пустой объект-маркер, имитирующий папку.
    Ожидает JSON: { "prefix": "newfolder/" }
    """
    data = request.get_json()
    if not data or 'prefix' not in data:
        return jsonify({'error': 'Missing prefix'}), 400

    prefix = data['prefix'].strip()
    # Убедимся, что префикс оканчивается на '/'
    if not prefix.endswith('/'):
        prefix += '/'

    # Проверка на допустимость (запрещаем '..')
    if '..' in prefix or prefix.startswith('/'):
        return jsonify({'error': 'Invalid folder name'}), 400

    try:
        # Создаём пустой объект
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=prefix,
            data=io.BytesIO(b''),
            length=0,
            content_type='application/x-directory'  # опционально
        )
        return jsonify({'success': True, 'prefix': prefix}), 201
    except S3Error as e:
        app.logger.error(f"Error creating folder {prefix}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/delete_minio', methods=['DELETE'])
@handle_minio_errors
def delete_minio():
    """
    Удаляет объект или все объекты с указанным префиксом.
    Параметры: ?path=some/path   (если оканчивается на '/', удаляется папка)
    """
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'Missing path parameter'}), 400

    # Базовая защита
    if '..' in path or path.startswith('/'):
        return jsonify({'error': 'Invalid path'}), 400

    try:
        if path.endswith('/'):
            # Удаление папки (все объекты с префиксом)
            objects_to_delete = list(minio_client.list_objects(
                MINIO_BUCKET, prefix=path, recursive=True
            ))
            if not objects_to_delete:
                return jsonify({'error': 'Folder not found or empty'}), 404

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
                app.logger.error(f"Errors while deleting folder {path}: {failed}")
                return jsonify({
                    'success': False,
                    'error': 'Some objects could not be deleted',
                    'details': failed
                }), 500

            return jsonify({
                'success': True,
                'deleted_count': len(delete_object_list),
                'message': f'Folder {path} deleted'
            })
        else:
            # Удаление одного файла
            minio_client.remove_object(MINIO_BUCKET, path)
            return jsonify({
                'success': True,
                'deleted_count': 1,
                'message': f'File {path} deleted'
            })
    except S3Error as e:
        app.logger.error(f"Error deleting {path}: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/workflow')
def panel():
    # Отдаём workflow.html из корня проекта
    if not os.path.exists('workflow.html'):
        abort(404)
    return send_from_directory('.', 'workflow.html')

@app.route('/viewIcons')
def viewIcons():
    # Отдаём incon из корня проекта
    if not os.path.exists('icons-preview.html'):
        abort(404)
    return send_from_directory('.', 'icons-preview.html')

@app.route('/new_int')
def viewNewInterface():
    # Отдаём новый интерфейс из корня проекта
    if not os.path.exists('new_interface.html'):
        abort(404)
    return send_from_directory('.', 'new_interface.html')


if __name__ == '__main__':
    # Запускаем сервер
    print(f"Server starting...")
    print(f"Script directory: {script_dir}")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Open http://127.0.0.1:15404 in your browser")
    app.run(debug=True, host='0.0.0.0', port=15404)
