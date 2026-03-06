//server.js
// ============ Функции для сохранения на сервер ============
function showSaveMethodModal() {
    if (!dom.saveMethodModal) return;
    dom.saveMethodModal.classList.add('active');
    loadServerImages();
}

function closeSaveMethodModal() {
    if (!dom.saveMethodModal) return;
    dom.saveMethodModal.classList.remove('active');
    hideServerMessage();
    hideProgress();
}

/**
 * Функция для отображения модального окна с предложением названия файла
 * при загрузке изображения (например, для сохранения чертежа в формате .png).
 * Автоматически подставляет имя текущего файла без расширения.
 */
function showFilenameModal() {
    // Получаем активный файл
    const file = getActiveFile();

    // Проверяем, что файл существует и модальное 
    // окно с ID 'filenameModal' доступно в DOM
    if (!file || !document.getElementById('filenameModal')) return;
    
    // Извлекаем базовое имя файла (без расширения), разбивая строку по точке:
    // - Например, для "drawing.vdxf" получим "drawing"
    // - Если имя файла без точки (например, "image"), используем его как есть
    // - Если имя отсутствует (file.filename == null), устанавливаем 'drawing' по умолчанию
    const defaultName = file.filename.split('.')[0] || 'drawing';

    // Устанавливаем значение в поле ввода модального окна:
    // - Добавляем расширение '.png' к базовому имени
    // - Например, если defaultName = 'drawing', то результат 'drawing.png'
    document.getElementById('serverFilename').value = `${defaultName}`;

    // Сбрасываем состояние модального окна (очистка полей, скрытие ошибок и т. д.)
    resetUploadModal();

    // Добавляем класс 'active' к модальному окну, чтобы сделать его видимым
    // (обычно стили 'active' управляют отображением через CSS)
    document.getElementById('filenameModal').classList.add('active');
}

function closeFilenameModal() {
    const modal = document.getElementById('filenameModal');
    if (modal) {
        modal.classList.remove('active');
    }
    resetUploadModal();
}

function saveToLocal() {

        // Где-то в коде, например, при запуске длительной операции:
showProgressModal('Загрузка на сервер', true);
setOnProgressCancel(() => {
    console.log('Операция отменена пользователем');
    abortController.abort(); // пример отмены через AbortController
    closeProgressModal();
});

// В процессе:
updateProgress(45, 'Отправка данных...');

// По завершении:
closeProgressModal();


    closeSaveMethodModal();

    showSaveModal();
}

function saveToServer1s() {
    closeSaveMethodModal();
    showFilenameModal();
}

function saveToServer() {
    closeSaveMethodModal();
    showServerCommander('save', (folderPath) => {
        // Заполняем поле пути в filenameModal
        document.getElementById('serverFolderPath').value = folderPath;
        // Вызываем существующую функцию показа окна с именем файла
        showFilenameModal();
    });
}
/**
 * Функция загрузки изображения на сервер
 * Выполняет валидацию, форматирование имени файла и отправку данных
 */
 function uploadToServer123() {

    // Получаем активный файл (предположительно, объект с canvas)
    const file = getActiveFile();

    // Проверяем наличие файла и его canvas-элемента
    if (!file || !file.canvas) {
        // Если нет - показываем ошибку и выходим
        showUploadError('Нет активного файла', 'Сначала создайте или откройте изображение');
        return;
    }

    // Получаем DOM-элементы для имени файла, формата и чекбокса с timestamp
    const filenameInput = document.getElementById('serverFilename');
    const formatSelect = document.getElementById('serverFormat');
    const addTimestamp = document.getElementById('addTimestamp');

    // Получаем и очищаем введённое имя файла от лишних пробелов
    let filename = filenameInput.value.trim();

    // Получаем выбранный формат файла
    const format = formatSelect.value;
    const fileType = formatSelect.getAttribute('data-mimetype') || format;

    // Проверяем, что имя файла было введено
    if (!filename) {
        showUploadError('Не указано имя файла', 'Введите имя файла для сохранения');
        return;
    }

    // Добавляем timestamp к имени файла, если чекбокс отмечен
    if (addTimestamp.checked) {
        // Формируем timestamp в формате YYYY-MM-DD_HH-mm-ss
        const timestamp = new Date()
        .toLocaleString('en-CA', { 
            timeZone: 'Asia/Yekaterinburg',  // таймзона
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
        .replace(/,/g, '')
        .replace(/\s/g, '_')
        .replace(/:/g, '-');
        filename = `${filename}_${timestamp}_${format}`;
    }
    else {
        filename = `${filename}_${format}`;
    }

    // Показываем индикатор загрузки перед началом процесса
    showUploadProgress();
    // Обновляем прогресс на 10% с сообщением
    updateUploadProgress(10, 'Подготовка изображения...');
    
    // Получаем кнопки загрузки и отмены (если они есть)
    const uploadButton = document.getElementById('uploadButton');
    const cancelButton = document.getElementById('cancelButton');

    // Отключаем кнопки, чтобы предотвратить повторную отправку
    if (uploadButton) uploadButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    
    // Имитация задержки для плавности интерфейса (500 мс)
    setTimeout(() => {

        // Обновляем прогресс на 30% с указанием формата
        updateUploadProgress(30, 'Конвертация в формат ' + format.toUpperCase() + '...');
    
        // Создаём объект FormData для отправки файла
        const formData = new FormData();
        const width = file.matrix.length;
        const height = file.matrix[0].length;

        // Добавляем поля
        formData.append('filename', filename);
        formData.append('autoscale', file.autoscale);
        formData.append('colormap', file.colormap);
        formData.append('width', width);
        formData.append('height', height);
        formData.append('minValue', file.minValue);
        formData.append('maxValue', file.maxValue);

        // Если matrix — это TypedArray (например, Uint8Array), конвертируем в Blob
        const matrixBlob = new Blob([file.matrix], { type: 'application/octet-stream' });
        formData.append('matrix', matrixBlob, 'matrix.tpt'); // 'matrix.tpt' — имя файла для серверной обработки
        
        updateUploadProgress(50, 'Отправка на сервер...');

        // Отправка
        fetch('/upload_minio', {
            method: 'POST',
            body: formData // Не указываем headers, браузер сам добавит 'Content-Type: multipart/form-data'
        })
        .then(response => {
            updateUploadProgress(75, 'Обработка на сервере...');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateUploadProgress(100, '✅ Загрузка завершена!');     
                // Автоматическое закрытие через 3 сек (как и раньше)
                setTimeout(() => {
                    closeFilenameModal();
                    resetUploadModal();
                }, 3000);
            } else {
                throw new Error(data.error || 'Сервер не принял файл');
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки:', error);
            showUploadError('Ошибка загрузки', error.message);
            resetUploadButtons();
        });
    }, 500); // Задержка перед началом конвертации для плавности
}

function uploadToServer() {
    const file = getActiveFile();
    if (!file || !file.canvas) {
        showUploadError('Нет активного файла', 'Сначала создайте или откройте изображение');
        return;
    }

    const filenameInput = document.getElementById('serverFilename');
    const folderInput = document.getElementById('serverFolderPath');
    const formatSelect = document.getElementById('serverFormat');
    const addTimestamp = document.getElementById('addTimestamp');

    let filename = filenameInput.value.trim();
    let folder = folderInput.value.trim();

    // Нормализуем путь: убираем лишние слеши
    if (folder) {
        // Убираем начальный слеш, если есть
        if (folder.startsWith('/')) folder = folder.substring(1);
        // Добавляем завершающий слеш, если его нет
        if (!folder.endsWith('/')) folder += '/';
    }

    const format = formatSelect.value;

    if (!filename) {
        showUploadError('Не указано имя файла', 'Введите имя файла для сохранения');
        return;
    }

    // Добавляем timestamp
    if (addTimestamp.checked) {
        const timestamp = new Date()
            .toLocaleString('en-CA', {
                timeZone: 'Asia/Yekaterinburg',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
            .replace(/,/g, '')
            .replace(/\s/g, '_')
            .replace(/:/g, '-');
        filename = `${filename}_${timestamp}_${format}`;
    } else {
        filename = `${filename}_${format}`;
    }

    // Полный путь на сервере
    const fullPath = folder + filename;

    showUploadProgress();
    updateUploadProgress(10, 'Подготовка изображения...');

    const uploadButton = document.getElementById('uploadButton');
    const cancelButton = document.getElementById('cancelButton');
    if (uploadButton) uploadButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;

    setTimeout(() => {
        updateUploadProgress(30, 'Конвертация в формат ' + format.toUpperCase() + '...');

        const formData = new FormData();
        // Здесь предполагается, что file.matrix существует, но в текущей реализации canvas, возможно, нужно другое.
        // Адаптируйте под вашу структуру.
        // Если у вас есть file.matrix, используйте его, иначе можно конвертировать canvas в нужный формат.
        // Для примера, если нужно сохранить canvas как PNG/TPT, нужно добавить соответствующую логику.
        // Вместо этого я покажу упрощённый вариант:
        const canvas = file.canvas;
        canvas.toBlob(blob => {
            formData.append('file', blob, fullPath); // полный путь как имя файла
            formData.append('filename', fullPath);
            formData.append('format', format);

            updateUploadProgress(50, 'Отправка на сервер...');

            fetch('/upload_minio', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                updateUploadProgress(75, 'Обработка на сервере...');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    updateUploadProgress(100, '✅ Загрузка завершена!');
                    setTimeout(() => {
                        closeFilenameModal();
                        resetUploadModal();
                        if (typeof loadServerFileList === 'function') loadServerFileList(); // обновить список
                    }, 3000);
                } else {
                    throw new Error(data.error || 'Сервер не принял файл');
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки:', error);
                showUploadError('Ошибка загрузки', error.message);
                resetUploadButtons();
            });
        }, 'image/png'); // или другой MIME-тип
    }, 500);
}

/**
 * Вспомогательная функция для отправки файла на сервер
 * @param {FormData} formData - данные для отправки
 * @param {string} format - расширение файла
 * @param {string} filename - имя файла
 */
 function processUpload(formData, format, filename) {
    updateUploadProgress(50, 'Отправка на сервер...');

    // Отправляем файл
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        updateUploadProgress(75, 'Обработка на сервере...');
        return response.json();
    })
    .then(data => {
        if (data.success) {
            updateUploadProgress(100, '✅ Загрузка завершена!');
            
            setTimeout(() => {
                showUploadSuccess({
                    ...data,
                    filename: filename,
                    format: format,
                    size: formData.get('file').size
                });
                
                // Автоматическое закрытие через 3 сек (как и раньше)
                setTimeout(() => {
                    closeFilenameModal();
                    resetUploadModal();
                }, 3000);
            }, 500);
        } else {
            throw new Error(data.error || 'Сервер не принял файл');
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки:', error);
        showUploadError('Ошибка загрузки', error.message);
        resetUploadButtons();
    });
}

// Новые функции для управления индикатором загрузки
function showUploadProgress() {
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadResult = document.getElementById('uploadResult');
    const uploadError = document.getElementById('uploadError');
    
    if (uploadStatus) uploadStatus.style.display = 'block';
    if (uploadResult) uploadResult.style.display = 'none';
    if (uploadError) uploadError.style.display = 'none';
}

function hideUploadProgress() {
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) uploadStatus.style.display = 'none';
}

function updateUploadProgress(percent, message) {
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');
    const progressMessage = document.getElementById('uploadMessage');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = percent + '%';
    if (progressMessage) progressMessage.textContent = message;
}

function showUploadSuccess(data) {
    hideUploadProgress();
    const uploadResult = document.getElementById('uploadResult');
    const resultMessage = document.getElementById('resultMessage');
    const resultDetails = document.getElementById('resultDetails');
    
    if (uploadResult) uploadResult.style.display = 'block';
    if (resultMessage) resultMessage.textContent = 'Изображение успешно сохранено!';
    if (resultDetails) {
        resultDetails.innerHTML = `
            Файл: <strong>${data.original_filename}</strong><br>
            На сервере: <strong>${data.filename}</strong><br>
            <button onclick="closeFilenameModal(); loadServerFileList();" 
                    style="margin-top:5px; padding:3px 8px; font-size:10px; background:#4CAF50; color:white; border:none; border-radius:3px; cursor:pointer;">
                <i class="fas fa-sync-alt"></i> Обновить список
            </button>
        `;
    }
}

function showUploadError(title, details) {
    hideUploadProgress();
    const uploadError = document.getElementById('uploadError');
    const errorMessage = document.getElementById('errorMessage');
    const errorDetails = document.getElementById('errorDetails');
    
    if (uploadError) uploadError.style.display = 'block';
    if (errorMessage) errorMessage.textContent = title;
    if (errorDetails) errorDetails.textContent = details;
    resetUploadButtons();
}

function resetUploadButtons() {
    const uploadButton = document.getElementById('uploadButton');
    const cancelButton = document.getElementById('cancelButton');
    
    if (uploadButton) uploadButton.disabled = false;
    if (cancelButton) cancelButton.disabled = false;
}

function resetUploadModal() {
    hideUploadProgress();
    const uploadResult = document.getElementById('uploadResult');
    const uploadError = document.getElementById('uploadError');
    
    if (uploadResult) uploadResult.style.display = 'none';
    if (uploadError) uploadError.style.display = 'none';
    resetUploadButtons();
}

async function loadServerImages() {
    try {
        const response = await fetch('/images');
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('imagesList');
            const listContainer = document.getElementById('serverImagesList');
            
            if (!data.images || data.images.length === 0) {
                if (container) {
                    container.innerHTML = '<p style="color:#666; font-style:italic;">Нет сохраненных изображений</p>';
                }
                if (listContainer) {
                    listContainer.style.display = 'block';
                }
                return;
            }
            
            if (container) container.innerHTML = '';
            data.images.sort((a, b) => new Date(b.created) - new Date(a.created));
            
            data.images.forEach(img => {
                const item = document.createElement('div');
                item.className = 'server-image-item';
                item.style.cssText = 'padding:6px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;';
                
                const info = document.createElement('div');
                info.style.cssText = 'display:flex; flex-direction:column;';
                
                const name = document.createElement('span');
                name.textContent = img.filename;
                name.style.cssText = 'font-weight:bold; font-size:12px;';
                
                const details = document.createElement('span');
                details.textContent = `${formatFileSize(img.size)} • ${img.modified}`;
                details.style.cssText = 'color:#666; font-size:11px;';
                
                info.appendChild(name);
                info.appendChild(details);
                
                const actions = document.createElement('div');
                actions.style.cssText = 'display:flex; gap:4px;width: 45px';
                
                const downloadBtn = document.createElement('button');
                downloadBtn.innerHTML = '<img src="icons/free-icon-download.png">';
                downloadBtn.title = 'Скачать';
                downloadBtn.style.cssText = 'font-size:11px; cursor:pointer; border:1px solid #ccc; background:#f5f5f5;';
                downloadBtn.onclick = () => downloadFromServer(img.filename);
                    
                const viewBtn = document.createElement('button');
                viewBtn.innerHTML = '<img src="icons/free-icon-eye.png">';
       
                viewBtn.title = 'Просмотреть';
                viewBtn.style.cssText = 'font-size:11px; cursor:pointer; border:1px solid #ccc; background:#f5f5f5;';
                viewBtn.onclick = () => viewOnServer(img.filename);
                    
                actions.appendChild(viewBtn);
                actions.appendChild(downloadBtn);
                    
                item.appendChild(info);
                item.appendChild(actions);
                    
                if (container) container.appendChild(item);
            });
            
            if (listContainer) listContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Ошибка загрузки списка:', error);
        const listContainer = document.getElementById('serverImagesList');
        if (listContainer) listContainer.style.display = 'none';
    }
}

function formatFileSize(bytes) {
    bytes = Number(bytes) || 0;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function downloadFromServer(filename) {
    const url = `/image/${filename}`;
    window.open(url, '_blank');
}

async function viewOnServer(filename) {

    // Формируем URL для запроса к серверу
    const url = `/image/${filename}`;

    // Показываем модальное окно с canvas (добавляем класс 'active' для отображения)
    document.getElementById('canvasPreviewModal').classList.add('active');

    // Запрашиваем данные файла с сервера
    const response = await fetch(url);

    // Читаем содержимое файла как текст (предполагается, что это .tpt-файл с матрицей данных)
    const data1 = await response.text();
  
    // Обрабатываем текст файла:
    // 1. Разбиваем по строкам (используя \n как разделитель)
    // 2. Удаляем пробелы в начале и конце каждой строки (trim())
    // 3. Фильтруем пустые строки (оставляем только непустые)
    const lines = data1.split('\n')                     // Разбиваем текст по строкам
                        .map(line => line.trim())       // Удаляем лишние пробелы в начале/конце
                        .filter(line => line !== '');   // Оставляем только непустые строки

    // Проверяем, что в файле минимум 3 строки (ширина, высота, матрица)
    if (lines.length < 3) {
        reject('Файл .tpt должен содержать минимум 3 строки: width, height, matrix');
        return;
    }

    // Парсим ширину и высоту матрицы (первые две строки файла):
    const width = parseInt(lines[0], 10);   // Первая строка — ширина
    const height = parseInt(lines[1], 10);  // Вторая строка — высота

    // Проверяем, что width и height — корректные числа (не NaN)
    if (isNaN(width) || isNaN(height)) {
        reject('Ширина и высота должны быть числами');// Ошибка
        return;
    }

    // Парсим матрицу данных (остальные строки, начиная с 3-й):
    // 1. Берём все строки, кроме первых двух (lines.slice(2))
    // 2. Разбиваем каждую строку на числа по пробелам (split(/\s+/))
    // 3. Преобразуем все элементы в числа (map(Number))
    const matrix = lines.slice(2).map(line => line.split(/\s+/).map(Number));

    // Проверяем соответствие количества строк матрицы заявленному height:
    if (matrix.length !== height) {
        reject(`Ожидалось ${height} строк матрицы, найдено ${matrix.length}`);
        return;
    }

    // Проверяем, что все строки матрицы имеют одинаковую ширину (width):
    if (matrix.some(row => row.length !== width)) {
        reject(`Все строки матрицы должны содержать ${width} чисел`);
        return;
    }

    // Находим минимальное и максимальное значения в матрице:
    let minVal = Infinity, maxVal = -Infinity;  // Инициализация
    for (let y = 0; y < height; y++) {          // Проходим по строкам
        for (let x = 0; x < width; x++) {       // Проходим по столбцам
            const val = matrix[y][x];           // Текущее значение
            if (val < minVal) minVal = val;     // Обновляем минимум
            if (val > maxVal) maxVal = val;     // Обновляем максимум
        }
    }


    const autoscale = true;
    const colormap = 'gray';
    const colorMap = getColormap(colormap);
    const data = new Uint8ClampedArray(width * height * 4);
    let dataIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            const normalizedValue = autoscale 
                ? (matrix[y][x] - minVal) / (maxVal - minVal + 1e-9) 
                : (matrix[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }

    // Создаём объект ImageData из массива data (ширина, высота — из файла)
    const imageData = new ImageData(data, width, height);

    // Получаем canvas и его контекст:
    const canvas = document.getElementById('previewCanvas');
    // 2D-контекст для рисования
    const ctx1 = canvas.getContext('2d');

    // Создаём временный canvas для работы с ImageData (чтобы избежать проблем с масштабированием)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0); // Рисуем исходные данные
    
    // Желаемый размер холста (берём размеры целевого canvas):
    const targetWidth = canvas.width;
    const targetHeight = canvas.height;
    
    // Сохраняем пропорции изображения:
    // Масштаб — это минимум из соотношений ширины и высоты (чтобы полностью поместилось)
    const scale = Math.min(targetWidth / tempCanvas.width, targetHeight / tempCanvas.height);
    
    // Вычисляем новый размер и смещение для центрирования:
    const scaledWidth = tempCanvas.width * scale;
    const scaledHeight = tempCanvas.height * scale;
    const offsetX = (targetWidth - scaledWidth) / 2;
    const offsetY = (targetHeight - scaledHeight) / 2;
    
    // Очищаем canvas перед отрисовкой
    ctx1.clearRect(0, 0, targetWidth, targetHeight);

    // Очищаем canvas перед отрисовкой (если нужно)
    ctx1.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight);

    // Настройки ползунка масштаба:
    const scaleSlider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    // Сбрасываем ползунок и текстовое поле масштаба в начальное значение (1.0 = 100%)
    scaleSlider.value = 1.0;
    scaleValue.textContent = '100%';
    // Вызываем функцию обновления масштаба
    updateCanvasScale();
}


// Закрытие модального окна
function closeCanvasPreview() {
    document.getElementById("canvasPreviewModal").classList.remove('active');
}

// Обновление масштаба canvas
function updateCanvasScale() {
    const scale = parseFloat(document.getElementById('scaleSlider').value);
    const scaleValue = document.getElementById('scaleValue');
    scaleValue.textContent = (scale * 100).toFixed(0) + '%';
    
    const previewCanvas = document.getElementById('previewCanvas');
    previewCanvas.style.transform = `scale(${scale})`;
    previewCanvas.style.transformOrigin = '0 0'; // Масштабирование из левого верхнего угла
}

// Сохранение canvas как PNG
function saveCanvasAsPng() {
    const previewCanvas = document.getElementById('previewCanvas');
    const link = document.createElement('a');
    link.download = 'preview.png';
    link.href = previewCanvas.toDataURL('image/png');
    link.click();
    closeCanvasPreview();
}

// Закрытие по клику вне окна (опционально)
window.onclick = function(event) {
    const modal = document.getElementById('canvasPreviewModal');
    if (event.target === modal) {
        closeCanvasPreview();
    }
}

function showServerMessage(text, type = 'info') {
    const messageDiv = document.getElementById('serverMessage');
    const messageText = document.getElementById('serverMessageText');
    
    if (!messageDiv || !messageText) return;
    
    messageText.textContent = text;
    messageDiv.style.display = 'block';
    messageDiv.style.backgroundColor = type === 'error' ? '#ffebee' : '#e8f5e8';
    messageDiv.style.borderColor = type === 'error' ? '#f44336' : '#4CAF50';
}

function hideServerMessage() {
    const messageDiv = document.getElementById('serverMessage');
    if (messageDiv) messageDiv.style.display = 'none';
}

function showProgress() {
    const progressDiv = document.getElementById('serverProgress');
    if (progressDiv) progressDiv.style.display = 'block';
}

function hideProgress() {
    const progressDiv = document.getElementById('serverProgress');
    if (progressDiv) progressDiv.style.display = 'none';
    updateProgress(0, '');
}

function updateProgress(percent, text) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = text;
}

// ============ Функции для загрузки с сервера (с поддержкой каталогов) ============

let currentServerPath = '/';          // текущий путь
let allServerFiles = [];              // кэш всех файлов (получаем один раз)

function showLoadFromServerModal() {
    const modal = document.getElementById('loadFromServerModal');
    if (modal) {
        modal.classList.add('active');
        loadServerFileList();          // загружаем список при открытии
    }
}

function closeLoadFromServerModal() {
    const modal = document.getElementById('loadFromServerModal');
    if (modal) modal.classList.remove('active');
    // сбрасываем путь при закрытии (по желанию)
    // currentServerPath = '/';
}

// Загрузка списка файлов с сервера (кэшируем один раз, затем фильтруем)
async function loadServerFileList() {
    const container = document.getElementById('serverFilesList');
    if (!container) return;

    // Показываем загрузку
    container.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;">Загрузка списка файлов...</td></tr>`;

    try {
        const response = await fetch('/list_minio');
        const data = await response.json();

        // Предполагаем, что data – массив объектов с полями name, size, lastModified (или created)
        if (!Array.isArray(data)) {
            throw new Error('Некорректный ответ сервера');
        }

        allServerFiles = data.map(item => ({
            name: item.name || '',
            size: item.size || 0,
            modified: item.lastModified || item.created || null,
            // Если сервер не даёт тип, определяем по наличию слеша в имени: 
            // но для простоты будем считать, что папка – это если есть другие файлы с таким префиксом.
        }));

        // Переходим в корень
        currentServerPath = '/';
        renderCurrentFolder();
    } catch (error) {
        console.error('Ошибка загрузки списка:', error);
        container.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;color:#c62828;">Ошибка загрузки: ${error.message}</td></tr>`;
    }
}

// Отображение содержимого текущей папки (currentServerPath)
// Отображение содержимого текущей папки (currentServerPath)
function renderCurrentFolder() {
    const tbody = document.getElementById('serverFilesList');
    const pathSpan = document.getElementById('currentServerPath');
    const backBtn = document.getElementById('serverNavBack');
    if (!tbody) return;

    // Обновляем путь и состояние кнопки "Назад"
    if (pathSpan) pathSpan.textContent = currentServerPath;
    if (backBtn) backBtn.disabled = (currentServerPath === '/');

    // Получаем все файлы
    let items = [...allServerFiles];

    // Фильтруем по текущему пути
    // Путь храним с ведущим и завершающим слешем, кроме корня.
    let prefix = currentServerPath === '/' ? '' : currentServerPath;
    if (prefix && !prefix.endsWith('/')) prefix += '/';

    // Оставляем только те файлы, чьё имя начинается с prefix
    items = items.filter(item => item.name.startsWith(prefix));

    // Теперь нужно выделить папки (уникальные префиксы следующего уровня) и файлы.
    const folders = new Set();
    const files = [];

    items.forEach(item => {
        const relative = item.name.slice(prefix.length); // часть после текущего пути
        if (!relative) return; // сам путь? игнорируем

        const parts = relative.split('/');
        if (parts.length > 1) {
            // Это файл внутри подпапки – добавляем подпапку как элемент
            folders.add(parts[0] + '/');
        } else {
            // Непосредственно файл в текущей папке
            files.push(item);
        }
    });

    // Преобразуем Set в массив и сортируем
    let folderList = Array.from(folders).sort((a, b) => a.localeCompare(b));

    // Применяем поиск (фильтрацию по имени)
    const searchInput = document.getElementById('imageSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    if (searchTerm) {
        folderList = folderList.filter(f => f.toLowerCase().includes(searchTerm));
        files = files.filter(f => f.name.toLowerCase().includes(searchTerm));
    }

    // Сортировка
    const sortSelect = document.getElementById('sortImages');
    const sortBy = sortSelect ? sortSelect.value : 'name';
    sortItems(folderList, files, sortBy);

    // Формируем HTML
    let html = '';

    // Папки
    folderList.forEach(folder => {
        const folderName = folder.slice(0, -1); // убираем завершающий слеш для отображения
        html += `
            <tr class="folder-row" onclick="navigateToFolder('${prefix + folder}')">
                <td>${folderName}</td>
                <td class="file-size">—</td>
                <td class="file-date">—</td>
                <td style="text-align:center;"></td>
            </tr>
        `;
    });

    // Файлы
    files.forEach(file => {
        const fileName = file.name.slice(prefix.length); // отображаем только имя файла
        const fileSize = formatFileSize(file.size);
        const fileDate = file.modified ? new Date(file.modified).toLocaleString() : '—';
        html += `
            <tr class="file-row" ondblclick="loadImageFromServer('${file.name}')">
                <td>${fileName}</td>
                <td class="file-size">${fileSize}</td>
                <td class="file-date">${fileDate}</td>
                <td style="text-align:center;">
                    <button class="load-btn" onclick="event.stopPropagation(); loadImageFromServer('${file.name}')">Загрузить</button>
                    <button class="move-btn" onclick="event.stopPropagation(); showMoveDialog('${file.name}')">Переместить</button>
                </td>
            </tr>
        `;
    });

    if (folderList.length === 0 && files.length === 0) {
        html = `<tr><td colspan="4" style="padding:20px;text-align:center;">Папка пуста</td></tr>`;
    }

    tbody.innerHTML = html;
    updateImagesCount(files.length, folderList.length);
}

// Вспомогательная функция сортировки
function sortItems(folders, files, sortBy) {
    const sortFunctions = {
        name: (a, b) => a.localeCompare(b),
        size_asc: (a, b) => (a.size || 0) - (b.size || 0),
        size_desc: (a, b) => (b.size || 0) - (a.size || 0),
    };

    if (sortBy === 'name') {
        folders.sort(sortFunctions.name);
        files.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        // Для сортировки по размеру папки остаются сверху (не сортируем)
        files.sort(sortFunctions[sortBy] || sortFunctions.name);
    }
}

// Сортировка папок и файлов
function sortItems(folders, files, sortBy) {
    const sortFunctions = {
        name: (a, b) => a.localeCompare(b),
        size_asc: (a, b) => (a.size || 0) - (b.size || 0),
        size_desc: (a, b) => (b.size || 0) - (a.size || 0),
    };

    if (sortBy === 'name') {
        folders.sort(sortFunctions.name);
        files.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        // Для сортировки по размеру папки остаются сверху (не сортируем)
        files.sort(sortFunctions[sortBy] || sortFunctions.name);
    }
}

// Переход в подпапку
function navigateToFolder(folderPath) {
    currentServerPath = folderPath;
    renderCurrentFolder();
}

// Переход на уровень вверх
function navigateBack() {
    if (currentServerPath === '/') return;
    const parts = currentServerPath.split('/').filter(p => p);
    parts.pop(); // убираем последний сегмент
    currentServerPath = parts.length ? '/' + parts.join('/') + '/' : '/';
    renderCurrentFolder();
}

// Обновление списка (перезагрузка с сервера)
function refreshServerImages() {
    loadServerFileList();
}

// Функция загрузки файла с сервера (используем полный путь)
function loadImageFromServer(filePath) {
    showLoadMessage(`Загрузка изображения...`, 'info');

    fetch(`/download_minio/${encodeURIComponent(filePath)}`)
        .then(response => {
            if (!response.ok) throw new Error('Ошибка загрузки');
            return response.json();
        })
        .then(data => {
            // Здесь data – вероятно, объект с matrix, width, height, min_value, max_value
            const numbers = data.matrix.split(',').map(num => parseFloat(num.trim()));
            const rows = data.width;
            const cols = data.height;
            const matrix = [];
            for (let i = 0; i < rows; i++) {
                matrix.push(numbers.slice(i * cols, (i + 1) * cols));
            }

            createFileFromImageData(data.filename || filePath.split('/').pop(),
                matrix,
                data.width,
                data.height,
                data.min_value,
                data.max_value
            );
            closeLoadFromServerModal();
            showLoadMessage(`Изображение загружено`, 'success');
            setTimeout(hideLoadMessage, 2000);
        })
        .catch(error => {
            console.error('Ошибка загрузки:', error);
            showLoadMessage(`Ошибка: ${error.message}`, 'error');
        });
}

// Вспомогательная функция для обновления счётчика (адаптирована под файлы/папки)
function updateImagesCount(filesCount, foldersCount) {
    const countElement = document.getElementById('imagesCount');
    if (countElement) {
        countElement.textContent = `${filesCount} файлов, ${foldersCount} папок`;
    }
}

// Функции для сообщений и удаления (остаются без изменений)
function showLoadMessage(text, type = 'info') {
    const messageDiv = document.getElementById('loadServerMessage');
    const messageText = document.getElementById('loadServerMessageText');
    
    if (!messageDiv || !messageText) return;
    
    messageText.textContent = text;
    messageDiv.style.display = 'block';
    messageDiv.style.padding = '8px';
    messageDiv.style.borderRadius = '3px';
    
    switch(type) {
        case 'success':
            messageDiv.style.backgroundColor = '#e8f5e8';
            messageDiv.style.border = '1px solid #4CAF50';
            messageDiv.style.color = '#2e7d32';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#ffebee';
            messageDiv.style.border = '1px solid #f44336';
            messageDiv.style.color = '#c62828';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#fff3e0';
            messageDiv.style.border = '1px solid #ff9800';
            messageDiv.style.color = '#ef6c00';
            break;
        default:
            messageDiv.style.backgroundColor = '#e3f2fd';
            messageDiv.style.border = '1px solid #2196f3';
            messageDiv.style.color = '#1565c0';
    }
}

function hideLoadMessage() {
    const messageDiv = document.getElementById('loadServerMessage');
    if (messageDiv) messageDiv.style.display = 'none';
}

function downloadServerImage(filename) {
    const url = `image/${filename}`;
    window.open(url, '_blank');
}

async function deleteServerImage(filename, button) {
    if (!confirm(`Удалить изображение "${filename}"?`)) {
        return;
    }
    
    const thumbnail = button.closest('.image-thumbnail');
    thumbnail.style.opacity = '0.5';
    thumbnail.style.pointerEvents = 'none';
    
    try {
        const response = await fetch(`/image/${filename}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            thumbnail.style.transition = 'all 0.3s';
            thumbnail.style.height = '0';
            thumbnail.style.margin = '0';
            thumbnail.style.padding = '0';
            thumbnail.style.overflow = 'hidden';
            
            setTimeout(() => {
                thumbnail.remove();
                // Пересчитываем количество изображений
                const container = document.getElementById('serverImagesGrid');
                const remaining = container.querySelectorAll('.image-thumbnail').length;
                if (remaining === 0) {
                    showEmptyState();
                } else {
                    updateImagesCount(remaining);
                }
            }, 300);
            
            showNotification('Изображение удалено', 'success');
        } else {
            thumbnail.style.opacity = '1';
            thumbnail.style.pointerEvents = 'auto';
            showLoadMessage(`Ошибка: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        thumbnail.style.opacity = '1';
        thumbnail.style.pointerEvents = 'auto';
        showLoadMessage(`Ошибка: ${error.message}`, 'error');
    }
}

function confirmClearAllImages() {
    if (!confirm('ВНИМАНИЕ! Вы уверены, что хотите удалить ВСЕ изображения с сервера?\n\nЭто действие нельзя отменить.')) {
        return;
    }
    
    showLoadMessage('Удаление всех изображений...', 'warning');
    
    fetch('/clear_all', {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showEmptyState();
            showLoadMessage('Все изображения удалены', 'success');
            setTimeout(hideLoadMessage, 3000);
        } else {
            showLoadMessage(`Ошибка: ${data.error}`, 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка очистки:', error);
        showLoadMessage(`Ошибка: ${error.message}`, 'error');
    });
}

// Функция showEmptyState может остаться, но она не используется в новом интерфейсе.
// Можно оставить для совместимости.
function showEmptyState() {
    const container = document.getElementById('serverImagesGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="far fa-folder-open"></i>
            <h3>Нет сохраненных изображений</h3>
            <p>Сохраните изображения на сервер, чтобы они появились здесь</p>
            <button onclick="closeLoadFromServerModal(); showSaveMethodModal();" 
                    class="modal-btn" style="margin-top: 16px;">
                <i class="fas fa-cloud-upload-alt"></i> Сохранить на сервер
            </button>
        </div>
    `;
    updateImagesCount(0);
}


/**
 * Отправляет запрос на перемещение файла на сервере
 * @param {string} source - исходный путь к файлу
 * @param {string} destination - целевой путь
 */
async function moveServerFile(source, destination) {
    showLoadMessage('Перемещение файла...', 'info');
    try {
        const response = await fetch('/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, destination })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showLoadMessage('✅ Файл перемещён', 'success');
            loadServerFileList(); // обновляем список
        } else {
            throw new Error(data.error || 'Ошибка перемещения');
        }
    } catch (error) {
        console.error('Ошибка перемещения:', error);
        showLoadMessage(`❌ Ошибка: ${error.message}`, 'error');
    }
}


let currentMoveSource = null;

/**
 * Открывает диалог перемещения для указанного файла
 * @param {string} sourcePath - полный путь к файлу на сервере
 */
function showMoveDialog(sourcePath) {
    currentMoveSource = sourcePath;
    document.getElementById('moveSourceFile').textContent = sourcePath;

    // Заполняем выпадающий список существующих папок
    const select = document.getElementById('moveDestinationFolder');
    select.innerHTML = '<option value="/">/ (корень)</option>';

    // Собираем все уникальные пути (префиксы) из allServerFiles
    const folders = new Set();
    allServerFiles.forEach(item => {
        const parts = item.name.split('/');
        if (parts.length > 1) {
            let path = '';
            for (let i = 0; i < parts.length - 1; i++) {
                path += (path ? '/' : '') + parts[i];
                folders.add(path + '/');
            }
        }
    });

    Array.from(folders).sort().forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        select.appendChild(option);
    });

    document.getElementById('moveFileModal').classList.add('active');
}

function closeMoveModal() {
    document.getElementById('moveFileModal').classList.remove('active');
    document.getElementById('moveCustomPath').value = '';
    document.getElementById('moveMessage').style.display = 'none';
    currentMoveSource = null;
}

function executeMove() {
    if (!currentMoveSource) return;

    const select = document.getElementById('moveDestinationFolder');
    const customPath = document.getElementById('moveCustomPath').value.trim();

    let destinationFolder;
    if (customPath) {
        destinationFolder = customPath.endsWith('/') ? customPath : customPath + '/';
    } else {
        destinationFolder = select.value;
        if (destinationFolder === '/') destinationFolder = '';
    }

    const fileName = currentMoveSource.split('/').pop();
    const destinationPath = destinationFolder ? destinationFolder + fileName : fileName;

    // Вызываем перемещение
    moveServerFile(currentMoveSource, destinationPath);
    closeMoveModal();
}


// Загрузить список существующих папок для выпадающего списка
async function loadServerFolders() {
    const select = document.getElementById('serverFolderSelect');
    if (!select) return;

    // Очищаем и добавляем заглушку
    select.innerHTML = '<option value="">-- Загрузка папок... --</option>';

    try {
        const response = await fetch('/list_minio');
        const data = await response.json();

        if (!Array.isArray(data)) throw new Error('Некорректный ответ');

        const folders = new Set();
        data.forEach(item => {
            const parts = item.name.split('/');
            if (parts.length > 1) {
                let path = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    path += (path ? '/' : '') + parts[i];
                    folders.add(path + '/');
                }
            }
        });

        // Сортируем и заполняем select
        select.innerHTML = '<option value="">-- Выберите существующую папку --</option>';
        Array.from(folders).sort().forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Ошибка загрузки папок:', error);
        select.innerHTML = '<option value="">-- Ошибка загрузки --</option>';
    }
}

// Открыть проводник для выбора папки (используем модальное окно загрузки)
function openFolderBrowser() {
    // Сохраняем текущее состояние
    const currentPath = document.getElementById('serverFolderPath').value;

    // Показываем модальное окно загрузки с сервера в режиме выбора папки
    // Для этого добавим временный флаг
    window._folderSelectionCallback = (selectedPath) => {
        document.getElementById('serverFolderPath').value = selectedPath;
        closeLoadFromServerModal();
        delete window._folderSelectionCallback;
    };

    // Открываем окно загрузки
    showLoadFromServerModal();

    // Немного модифицируем поведение: при клике на папку она выбирается, а не открывается
    // Это можно сделать, заменив временно функцию navigateToFolder
    const originalNavigate = window.navigateToFolder;
    window.navigateToFolder = (folderPath) => {
        if (window._folderSelectionCallback) {
            window._folderSelectionCallback(folderPath);
        } else {
            originalNavigate(folderPath);
        }
    };

    // При закрытии окна восстанавливаем исходную функцию
    const originalClose = closeLoadFromServerModal;
    window.closeLoadFromServerModal = () => {
        if (window._folderSelectionCallback) {
            delete window._folderSelectionCallback;
            window.navigateToFolder = originalNavigate;
            window.closeLoadFromServerModal = originalClose;
        }
        originalClose();
    };
}

// Модифицируем showFilenameModal для загрузки папок
const originalShowFilenameModal = showFilenameModal;
showFilenameModal = function() {
    originalShowFilenameModal(); // заполняет имя файла и т.д.
    loadServerFolders(); // загружаем список папок
    // Сбрасываем поле пути
    document.getElementById('serverFolderPath').value = '';
};



// ============ Универсальное окно обзора сервера ============

let browserMode = 'open'; // 'open' или 'save'
let browserCurrentPath = '/';
let browserAllFiles = [];
let browserCallback = null; // функция, вызываемая при выборе

// Открыть обзор в режиме открытия файла
function openServerBrowserForOpen(callback) {
    browserMode = 'open';
    browserCallback = callback;
    document.getElementById('serverBrowserTitle').textContent = 'Открыть с сервера';
    document.getElementById('browserSavePanel').style.display = 'none';
    document.getElementById('browserActionBtn').textContent = 'Открыть';
    document.getElementById('browserActionBtn').style.display = 'inline-block';
    showServerBrowser();
}

// Открыть обзор в режиме сохранения (выбор папки)
function openServerBrowserForSave(callback) {
    browserMode = 'save';
    browserCallback = callback;
    document.getElementById('serverBrowserTitle').textContent = 'Сохранить на сервер - выберите папку';
    document.getElementById('browserSavePanel').style.display = 'block';
    document.getElementById('browserSaveFilename').value = '';
    document.getElementById('browserActionBtn').style.display = 'none'; // кнопка "Выбрать" не нужна, используем "Сохранить сюда"
    showServerBrowser();
}

function showServerBrowser() {
    const modal = document.getElementById('serverBrowserModal');
    modal.classList.add('active');
    browserCurrentPath = '/';
    loadServerBrowserList();
}

function closeServerBrowser() {
    const modal = document.getElementById('serverBrowserModal');
    modal.classList.remove('active');
    browserCallback = null;
}

async function loadServerBrowserList() {
    const tbody = document.getElementById('browserFilesList');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;">Загрузка списка файлов...</td></tr>`;

    try {
        // Используем тот же эндпоинт, что и для загрузки списка
        const response = await fetch('/list_minio');
        const data = await response.json();

        if (!Array.isArray(data)) throw new Error('Некорректный ответ сервера');

        browserAllFiles = data.map(item => ({
            name: item.name || '',
            size: item.size || 0,
            modified: item.last_modified || item.created || null,
        }));

        renderBrowserFolder();
    } catch (error) {
        console.error('Ошибка загрузки списка:', error);
        tbody.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;color:#c62828;">Ошибка загрузки: ${error.message}</td></tr>`;
    }
}

function renderBrowserFolder() {
    const tbody = document.getElementById('browserFilesList');
    const pathSpan = document.getElementById('browserCurrentPath');
    const backBtn = document.getElementById('browserNavBack');
    if (!tbody) return;

    pathSpan.textContent = browserCurrentPath;
    backBtn.disabled = (browserCurrentPath === '/');

    let prefix = browserCurrentPath === '/' ? '' : browserCurrentPath;
    if (prefix && !prefix.endsWith('/')) prefix += '/';

    const items = browserAllFiles.filter(item => item.name.startsWith(prefix));

    const folders = new Set();
    const files = [];

    items.forEach(item => {
        const relative = item.name.slice(prefix.length);
        if (!relative) return;
        const parts = relative.split('/');
        if (parts.length > 1) {
            folders.add(parts[0] + '/');
        } else {
            files.push(item);
        }
    });

    let folderList = Array.from(folders).sort((a, b) => a.localeCompare(b));

    // Поиск
    const searchInput = document.getElementById('browserSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        folderList = folderList.filter(f => f.toLowerCase().includes(searchTerm));
        files = files.filter(f => f.name.toLowerCase().includes(searchTerm));
    }

    // Сортировка
    const sortSelect = document.getElementById('browserSort');
    const sortBy = sortSelect ? sortSelect.value : 'name';
    sortBrowserItems(folderList, files, sortBy);

    let html = '';

    // Папки
    folderList.forEach(folder => {
        const folderName = folder.slice(0, -1);
        html += `
            <tr class="folder-row" onclick="browserNavigateToFolder('${prefix + folder}')">
                <td>${folderName}</td>
                <td class="file-size">—</td>
                <td class="file-date">—</td>
                <td style="text-align:center;"></td>
            </tr>
        `;
    });

    // Файлы
    files.forEach(file => {
        const fileName = file.name.slice(prefix.length);
        const fileSize = formatFileSize(file.size);
        const fileDate = file.modified ? new Date(file.modified).toLocaleString() : '—';
        html += `
            <tr class="file-row" ondblclick="browserSelectFile('${file.name}')">
                <td>${fileName}</td>
                <td class="file-size">${fileSize}</td>
                <td class="file-date">${fileDate}</td>
                <td style="text-align:center;">
                    ${browserMode === 'open' 
                        ? `<button class="load-btn" onclick="event.stopPropagation(); browserSelectFile('${file.name}')">Выбрать</button>` 
                        : ''}
                </td>
            </tr>
        `;
    });

    if (folderList.length === 0 && files.length === 0) {
        html = `<tr><td colspan="4" style="padding:20px;text-align:center;">Папка пуста</td></tr>`;
    }

    tbody.innerHTML = html;
    document.getElementById('browserStats').textContent = `папок: ${folderList.length}, файлов: ${files.length}`;
}

function sortBrowserItems(folders, files, sortBy) {
    const sortFunctions = {
        name: (a, b) => a.localeCompare(b),
        size_asc: (a, b) => (a.size || 0) - (b.size || 0),
        size_desc: (a, b) => (b.size || 0) - (a.size || 0),
    };

    if (sortBy === 'name') {
        folders.sort(sortFunctions.name);
        files.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        files.sort(sortFunctions[sortBy] || sortFunctions.name);
    }
}

function browserNavigateToFolder(folderPath) {
    browserCurrentPath = folderPath;
    renderBrowserFolder();
}

function browserNavigateBack() {
    if (browserCurrentPath === '/') return;
    const parts = browserCurrentPath.split('/').filter(p => p);
    parts.pop();
    browserCurrentPath = parts.length ? '/' + parts.join('/') + '/' : '/';
    renderBrowserFolder();
}

function refreshBrowser() {
    loadServerBrowserList();
}

// Выбор файла в режиме открытия
function browserSelectFile(filePath) {
    if (browserMode === 'open' && browserCallback) {
        browserCallback(filePath);
        closeServerBrowser();
    }
}

// Сохранение в текущую папку (режим сохранения)
function browserSaveHere() {
    if (browserMode !== 'save' || !browserCallback) return;

    const filename = document.getElementById('browserSaveFilename').value.trim();
    if (!filename) {
        alert('Введите имя файла');
        return;
    }

    let folder = browserCurrentPath === '/' ? '' : browserCurrentPath;
    if (folder && !folder.endsWith('/')) folder += '/';
    const fullPath = folder + filename;

    browserCallback(fullPath); // передаём полный путь для сохранения
    closeServerBrowser();
}

// Интеграция с существующими функциями
function showLoadFromServerModal() {
    // Заменяем вызов модального окна на новое
    openServerBrowserForOpen((filePath) => {
        // Здесь код загрузки файла по filePath
        loadImageFromServer(filePath);
    });
}

function showFilenameModal() {
    // Оригинальная функция уже есть, мы её модифицируем:
    // открываем обзор для выбора папки, а потом заполняем поле пути
    openServerBrowserForSave((fullPath) => {
        // fullPath содержит папку + имя файла (имя мы вводили в окне)
        // Но нам нужно разделить папку и имя
        const lastSlash = fullPath.lastIndexOf('/');
        if (lastSlash !== -1) {
            const folder = fullPath.substring(0, lastSlash + 1);
            const filename = fullPath.substring(lastSlash + 1);
            document.getElementById('serverFolderPath').value = folder;
            document.getElementById('serverFilename').value = filename;
        } else {
            document.getElementById('serverFolderPath').value = '';
            document.getElementById('serverFilename').value = fullPath;
        }
        // Затем показываем модальное окно сохранения (filenameModal)
        document.getElementById('filenameModal').classList.add('active');
    });
}

// Также можно добавить кнопку "Обзор" рядом с полем пути в filenameModal,
// которая будет вызывать openServerBrowserForSave с callback установки пути.
// Но это уже сделано выше через кнопку с папкой.

// Переопределяем openFolderBrowser для использования нового окна
function openFolderBrowser() {
    openServerBrowserForSave((fullPath) => {
        const lastSlash = fullPath.lastIndexOf('/');
        const folder = lastSlash !== -1 ? fullPath.substring(0, lastSlash + 1) : '';
        document.getElementById('serverFolderPath').value = folder;
    });
}

// server.js

/**
 * Создаёт новую папку на сервере
 * @param {string} folderName - имя новой папки (без завершающего слеша)
 */
async function createServerFolder(folderName) {
    if (!folderName) {
        alert('Введите имя папки');
        return;
    }
    // Очищаем имя от недопустимых символов (можно оставить только буквы, цифры, подчёркивание, дефис)
const safeName = folderName.replace(/[\/\\:*?"<>|]/g, '_');
if (safeName !== folderName) {
    if (!confirm(`Имя содержит недопустимые символы (\\ / : * ? " < > |). Будет использовано "${safeName}". Продолжить?`)) {
        return;
    }
}
    const folderPath = browserCurrentPath === '/'
        ? safeName + '/'
        : browserCurrentPath + safeName + '/';

    try {
        const response = await fetch('/mkdir_minio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix: folderPath })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            // Обновляем список
            await loadServerBrowserList();
        } else {
            alert('Ошибка создания папки: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка создания папки:', error);
        alert('Ошибка соединения с сервером');
    }
}

/**
 * Удаляет файл или папку (все объекты с префиксом)
 * @param {string} path - полный путь к объекту (если оканчивается на '/', то папка)
 */
async function deleteServerItem(path) {
    const isFolder = path.endsWith('/');
    const confirmMsg = isFolder
        ? `Удалить папку "${path}" и всё её содержимое?`
        : `Удалить файл "${path}"?`;

    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch(`/delete_minio?path=${encodeURIComponent(path)}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (response.ok && data.success) {
            // Обновляем список
            await loadServerBrowserList();
        } else {
            alert('Ошибка удаления: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка соединения с сервером');
    }
}

function renderBrowserFolder() {
    const tbody = document.getElementById('browserFilesList');
    const pathSpan = document.getElementById('browserCurrentPath');
    const backBtn = document.getElementById('browserNavBack');
    if (!tbody) return;

    pathSpan.textContent = browserCurrentPath;
    backBtn.disabled = (browserCurrentPath === '/');

    let prefix = browserCurrentPath === '/' ? '' : browserCurrentPath;
    if (prefix && !prefix.endsWith('/')) prefix += '/';

    const items = browserAllFiles.filter(item => item.name.startsWith(prefix));

    const folders = new Set();
    const files = [];

    items.forEach(item => {
        const relative = item.name.slice(prefix.length);
        if (!relative) return;
        const parts = relative.split('/');
        if (parts.length > 1) {
            folders.add(parts[0] + '/');
        } else {
            files.push(item);
        }
    });

    let folderList = Array.from(folders).sort((a, b) => a.localeCompare(b));

    // Поиск
    const searchInput = document.getElementById('browserSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchTerm) {
        folderList = folderList.filter(f => f.toLowerCase().includes(searchTerm));
        files = files.filter(f => f.name.toLowerCase().includes(searchTerm));
    }

    // Сортировка
    const sortSelect = document.getElementById('browserSort');
    const sortBy = sortSelect ? sortSelect.value : 'name';
    sortBrowserItems(folderList, files, sortBy);

    let html = '';

    // Папки
    folderList.forEach(folder => {
        const folderName = folder.slice(0, -1);
        const fullFolderPath = prefix + folder;
        html += `
            <tr class="folder-row">
                <td onclick="browserNavigateToFolder('${fullFolderPath}')" style="cursor:pointer;">📁 ${folderName}</td>
                <td class="file-size">—</td>
                <td class="file-date">—</td>
                <td style="text-align:center;">
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteServerItem('${fullFolderPath}')" title="Удалить папку">🗑</button>
                </td>
            </tr>
        `;
    });

    // Файлы
    files.forEach(file => {
        const fileName = file.name.slice(prefix.length);
        const fileSize = formatFileSize(file.size);
        const fileDate = file.modified ? new Date(file.modified).toLocaleString() : '—';
        html += `
            <tr class="file-row">
                <td ondblclick="browserSelectFile('${file.name}')" style="cursor:pointer;">📄 ${fileName}</td>
                <td class="file-size">${fileSize}</td>
                <td class="file-date">${fileDate}</td>
                <td style="text-align:center;">
                    ${browserMode === 'open' 
                        ? `<button class="load-btn" onclick="event.stopPropagation(); browserSelectFile('${file.name}')">📂 Открыть</button>` 
                        : ''}
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteServerItem('${file.name}')" title="Удалить файл">🗑</button>
                </td>
            </tr>
        `;
    });

    if (folderList.length === 0 && files.length === 0) {
        html = `<tr><td colspan="4" style="padding:20px;text-align:center;">Папка пуста</td></tr>`;
    }

    tbody.innerHTML = html;
    document.getElementById('browserStats').textContent = `папок: ${folderList.length}, файлов: ${files.length}`;
}

function promptNewFolder() {
    const folderName = prompt('Введите имя новой папки:');
    if (folderName) {
        createServerFolder(folderName);
    }
}

// ============ Двухпанельный менеджер сервера (Total Commander style) ============

let leftPanelPath = '/';
let rightPanelPath = '/';
let activePanel = 'left';
let selectedLeftItem = null;      // { fullPath, isFolder, displayName }
let selectedRightItem = null;

// Открыть менеджер (можно вызвать из меню "Файл")
function showServerCommander() {
    const modal = document.getElementById('serverCommanderModal');
    if (!modal) return;
    modal.classList.add('active');
    // Загружаем обе панели
    loadPanelList('left');
    loadPanelList('right');
}

function closeServerCommander() {
    const modal = document.getElementById('serverCommanderModal');
    if (modal) modal.classList.remove('active');
    selectedLeftItem = null;
    selectedRightItem = null;
}

// Загрузить список файлов для указанной панели
async function loadPanelList(panel) {
    const tbody = document.getElementById(panel + 'PanelList');
    if (!tbody) return;

    const path = panel === 'left' ? leftPanelPath : rightPanelPath;
    const pathInput = document.getElementById(panel + 'Path');
    if (pathInput) pathInput.value = path;

    tbody.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;">Загрузка...</td></tr>`;

    try {
        const response = await fetch('/list_minio');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Некорректный ответ сервера');

        const allFiles = data.map(item => ({
            name: item.name || '',
            size: item.size || 0,
            modified: item.last_modified || item.created || null,
        }));

        renderPanelList(panel, allFiles, path);
        updateActivePanelHighlight(); // <-- добавить здесь
    } catch (error) {
        console.error('Ошибка загрузки списка:', error);
        tbody.innerHTML = `<tr><td colspan="4" style="padding:20px;text-align:center;color:#c62828;">Ошибка загрузки: ${error.message}</td></tr>`;
    }
}

// Отрисовка содержимого панели
function renderPanelList(panel, allFiles, currentPath) {
    const tbody = document.getElementById(panel + 'PanelList');
    if (!tbody) return;

    let prefix = currentPath === '/' ? '' : currentPath;
    if (prefix && !prefix.endsWith('/')) prefix += '/';

    const items = allFiles.filter(item => item.name.startsWith(prefix));

    const folders = new Set();
    const files = [];

    items.forEach(item => {
        const relative = item.name.slice(prefix.length);
        if (!relative) return;
        const parts = relative.split('/');
        if (parts.length > 1) {
            folders.add(parts[0] + '/');
        } else {
            files.push(item);
        }
    });

    let folderList = Array.from(folders).sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.name.localeCompare(b.name));

    let html = '';

    // Папки
    folderList.forEach(folder => {
        const folderName = folder.slice(0, -1);
        const fullFolderPath = prefix + folder;
        const isSelected = (panel === 'left' && selectedLeftItem && selectedLeftItem.fullPath === fullFolderPath && selectedLeftItem.isFolder) ||
                           (panel === 'right' && selectedRightItem && selectedRightItem.fullPath === fullFolderPath && selectedRightItem.isFolder);
        const selectedClass = isSelected ? 'selected-row' : '';
        html += `
            <tr class="folder-row ${selectedClass}" 
                onclick="selectItem('${panel}', '${fullFolderPath}', true, '${folderName}')" 
                ondblclick="navigatePanel('${panel}', '${fullFolderPath}')">
                <td>📁 ${folderName}</td>
                <td class="file-size">—</td>
                <td class="file-date">—</td>
                <td style="text-align:center;"></td>
            </tr>
        `;
    });

    // Файлы
    files.forEach(file => {
        const fileName = file.name.slice(prefix.length);
        const fileSize = formatFileSize(file.size);
        const fileDate = file.modified ? new Date(file.modified).toLocaleString() : '—';
        const isSelected = (panel === 'left' && selectedLeftItem && selectedLeftItem.fullPath === file.name && !selectedLeftItem.isFolder) ||
                           (panel === 'right' && selectedRightItem && selectedRightItem.fullPath === file.name && !selectedRightItem.isFolder);
        const selectedClass = isSelected ? 'selected-row' : '';
        html += `
            <tr class="file-row ${selectedClass}" 
                onclick="selectItem('${panel}', '${file.name}', false, '${fileName}')" 
                ondblclick="downloadFile('${file.name}')">
                <td>📄 ${fileName}</td>
                <td class="file-size">${fileSize}</td>
                <td class="file-date">${fileDate}</td>
                <td style="text-align:center;"></td>
            </tr>
        `;
    });

    if (folderList.length === 0 && files.length === 0) {
        html = `<tr><td colspan="4" style="padding:20px;text-align:center;">Папка пуста</td></tr>`;
    }

    tbody.innerHTML = html;
}

// Выделить элемент в панели (клик)
function selectItem(panel, fullPath, isFolder, displayName) {
    // Снимаем выделение в другой панели и устанавливаем в текущей
    if (panel === 'left') {
        if (selectedLeftItem && selectedLeftItem.fullPath === fullPath) {
            // Если кликнули на уже выделенный – можно снять выделение (опционально)
            selectedLeftItem = null;
        } else {
            selectedLeftItem = { fullPath, isFolder, displayName };
        }
        selectedRightItem = null;
        activePanel = 'left';
    } else {
        if (selectedRightItem && selectedRightItem.fullPath === fullPath) {
            selectedRightItem = null;
        } else {
            selectedRightItem = { fullPath, isFolder, displayName };
        }
        selectedLeftItem = null;
        activePanel = 'right';
    }
    // Перерисовываем обе панели для обновления класса selected-row
    refreshBothPanels();
    updateActivePanelHighlight(); // <-- добавить здесь
}

// Перейти в папку (двойной клик)
function navigatePanel(panel, folderPath) {
    if (panel === 'left') {
        leftPanelPath = folderPath;
        loadPanelList('left');
        updateActivePanelHighlight(); // <-- добавить здесь
    } else {
        rightPanelPath = folderPath;
        loadPanelList('right');
        updateActivePanelHighlight(); // <-- добавить здесь
    }
    // Сбрасываем выделение в этой панели
    if (panel === 'left') selectedLeftItem = null;
    else selectedRightItem = null;
}

// Скачать файл по прямому пути (двойной клик)
function downloadFile(fullPath) {
    const url = `/download_minio/${encodeURIComponent(fullPath)}`;
    window.open(url, '_blank');
}

// --- Действия с выделенным элементом (кнопки снизу) ---

function createFolderInActivePanel() {
    const folderName = prompt('Введите имя новой папки:');
    if (!folderName) return;
    const currentPath = activePanel === 'left' ? leftPanelPath : rightPanelPath;
const safeName = folderName.replace(/[\/\\:*?"<>|]/g, '_');
if (safeName !== folderName) {
    if (!confirm(`Имя содержит недопустимые символы (\\ / : * ? " < > |). Будет использовано "${safeName}". Продолжить?`)) {
        return;
    }
}
    const folderPath = currentPath === '/' ? safeName + '/' : currentPath + safeName + '/';
    fetch('/mkdir_minio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: folderPath })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            refreshBothPanels();
        } else {
            alert('Ошибка создания папки: ' + (data.error || 'Неизвестная ошибка'));
        }
    })
    .catch(error => {
        console.error('Ошибка создания папки:', error);
        alert('Ошибка соединения с сервером');
    });
}

function deleteSelectedInActivePanel() {
    const selected = activePanel === 'left' ? selectedLeftItem : selectedRightItem;
    if (!selected) {
        alert('Не выбран файл или папка для удаления');
        return;
    }
    const type = selected.isFolder ? 'папку' : 'файл';
    if (!confirm(`Удалить ${type} "${selected.displayName}"?`)) return;

    fetch(`/delete_minio?path=${encodeURIComponent(selected.fullPath)}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            refreshBothPanels();
        } else {
            alert('Ошибка удаления: ' + (data.error || 'Неизвестная ошибка'));
        }
    })
    .catch(error => {
        console.error('Ошибка удаления:', error);
        alert('Ошибка соединения с сервером');
    });
}

function downloadSelectedInActivePanel() {
    const selected = activePanel === 'left' ? selectedLeftItem : selectedRightItem;
    if (!selected) {
        alert('Не выбран файл для скачивания');
        return;
    }
    if (selected.isFolder) {
        alert('Папку нельзя скачать одним файлом');
        return;
    }
    downloadFile(selected.fullPath);
}

function moveSelectedToOtherPanel() {
    const sourcePanel = activePanel;
    const targetPanel = sourcePanel === 'left' ? 'right' : 'left';

    const selected = sourcePanel === 'left' ? selectedLeftItem : selectedRightItem;
    if (!selected) {
        alert('Не выбран файл или папка для перемещения');
        return;
    }
    if (selected.isFolder) {
        alert('Перемещение папок пока не поддерживается (можно перемещать только файлы)');
        return;
    }

    const targetPath = targetPanel === 'left' ? leftPanelPath : rightPanelPath;
    let destination;
    if (targetPath === '/') {
        destination = selected.displayName;
    } else {
        destination = targetPath + (targetPath.endsWith('/') ? '' : '/') + selected.displayName;
    }

    if (!confirm(`Переместить "${selected.displayName}" в папку "${targetPath}"?`)) return;

    fetch('/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: selected.fullPath, destination })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            refreshBothPanels();
        } else {
            alert('Ошибка перемещения: ' + (data.error || 'Неизвестная ошибка'));
        }
    })
    .catch(error => {
        console.error('Ошибка перемещения:', error);
        alert('Ошибка соединения с сервером');
    });
}

function refreshBothPanels() {
    loadPanelList('left');
    loadPanelList('right');
}
let commanderMode = 'open';        // 'open' или 'save'
let commanderCallback = null;      // функция, вызываемая при выборе


function showServerCommander(mode = 'open', callback = null) {
    commanderMode = mode;
    commanderCallback = callback;

    const modal = document.getElementById('serverCommanderModal');
    if (!modal) return;
    modal.classList.add('active');

    // Устанавливаем заголовок
    const titleSpan = modal.querySelector('.modal-title span');
    if (titleSpan) {
        titleSpan.textContent = mode === 'open' ? 'Выберите файл с сервера' : 'Выберите папку для сохранения';
    }

    // Настраиваем кнопку "Выбрать"
    const selectBtn = document.getElementById('commanderSelectBtn');
    if (selectBtn) {
        selectBtn.textContent = mode === 'open' ? 'Выбрать файл' : 'Сохранить сюда';
        selectBtn.style.display = 'inline-block';
    }

    // Сбрасываем выделение и пути (при желании можно сохранять последние пути)
    selectedLeftItem = null;
    selectedRightItem = null;
    activePanel = 'left'; // левая панель активна по умолчанию

    // Загружаем обе панели
    loadPanelList('left');
    loadPanelList('right');
        updateActivePanelHighlight(); // <-- добавить здесь
}

function commanderSelect() {
    if (!commanderCallback) {
        closeServerCommander();
        return;
    }

    if (commanderMode === 'open') {
        // Выбор файла
        const selected = activePanel === 'left' ? selectedLeftItem : selectedRightItem;
        if (!selected || selected.isFolder) {
            alert('Выберите файл');
            return;
        }
        commanderCallback(selected.fullPath);
        closeServerCommander();
    } else { // режим save
        // Используем текущий путь активной панели как папку для сохранения
        const folderPath = activePanel === 'left' ? leftPanelPath : rightPanelPath;
        commanderCallback(folderPath);
        closeServerCommander();
    }
}

function onItemDblClick(fullPath, isFolder) {
    if (commanderMode === 'open' && !isFolder) {
        // В режиме открытия двойной клик по файлу = выбор
        if (commanderCallback) commanderCallback(fullPath);
        closeServerCommander();
    } else if (isFolder) {
        // Папка всегда открывается
        navigatePanel(activePanel, fullPath);
    }
    // В режиме сохранения двойной клик по файлу игнорируется (ничего не делаем)
}

function updateActivePanelHighlight() {
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');
    const leftHeader = leftPanel?.querySelector('.panel-header');
    const rightHeader = rightPanel?.querySelector('.panel-header');

    // Сначала снимаем выделение со всех
    [leftPanel, rightPanel].forEach(p => p?.classList.remove('active-panel'));
    [leftHeader, rightHeader].forEach(h => h?.classList.remove('active-header'));

    // Добавляем классы активной панели
    if (activePanel === 'left') {
        leftPanel?.classList.add('active-panel');
        leftHeader?.classList.add('active-header');
    } else {
        rightPanel?.classList.add('active-panel');
        rightHeader?.classList.add('active-header');
    }
}
function makePanelClickable(panelId) {
    const panel = document.getElementById(panelId);
    panel?.addEventListener('click', (e) => {
        // Не перехватываем клики по кнопкам внутри панели (если они появятся)
        if (e.target.closest('button')) return;
        activePanel = panelId === 'leftPanel' ? 'left' : 'right';
        updateActivePanelHighlight();
    });
}

// Вызвать после создания панелей (например, в showServerCommander)
makePanelClickable('leftPanel');
makePanelClickable('rightPanel');



function renderPanelList(panel, allFiles, currentPath) {
    const tbody = document.getElementById(panel + 'PanelList');
    if (!tbody) return;

    let prefix = currentPath === '/' ? '' : currentPath;
    if (prefix && !prefix.endsWith('/')) prefix += '/';

    const items = allFiles.filter(item => item.name.startsWith(prefix));

    const folders = new Set();
    const files = [];

    items.forEach(item => {
        const relative = item.name.slice(prefix.length);
        if (!relative) return;
        const parts = relative.split('/');
        if (parts.length > 1) {
            folders.add(parts[0] + '/');
        } else {
            files.push(item);
        }
    });

    let folderList = Array.from(folders).sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.name.localeCompare(b.name));

    let html = '';

    // ===== Строка ".." для перехода вверх =====
    if (currentPath !== '/') {
        html += `
            <tr class="folder-row" ondblclick="navigateUp('${panel}')">
                <td>↑ ..</td>
                <td class="file-size">—</td>
                <td class="file-date">—</td>
                <td style="text-align:center;"></td>
            </tr>
        `;
    }

    // Папки
    folderList.forEach(folder => {
        const folderName = folder.slice(0, -1);
        const fullFolderPath = prefix + folder;
        const isSelected = (panel === 'left' && selectedLeftItem && selectedLeftItem.fullPath === fullFolderPath && selectedLeftItem.isFolder) ||
                           (panel === 'right' && selectedRightItem && selectedRightItem.fullPath === fullFolderPath && selectedRightItem.isFolder);
        const selectedClass = isSelected ? 'selected-row' : '';
        html += `
            <tr class="folder-row ${selectedClass}" 
                onclick="selectItem('${panel}', '${fullFolderPath}', true, '${folderName}')" 
                ondblclick="navigatePanel('${panel}', '${fullFolderPath}')">
                <td>📁 ${folderName}</td>
                <td class="file-size">—</td>
                <td class="file-date">—</td>
                <td style="text-align:center;"></td>
            </tr>
        `;
    });

    // Файлы
    files.forEach(file => {
        const fileName = file.name.slice(prefix.length);
        const fileSize = formatFileSize(file.size);
        const fileDate = file.modified ? new Date(file.modified).toLocaleString() : '—';
        const isSelected = (panel === 'left' && selectedLeftItem && selectedLeftItem.fullPath === file.name && !selectedLeftItem.isFolder) ||
                           (panel === 'right' && selectedRightItem && selectedRightItem.fullPath === file.name && !selectedRightItem.isFolder);
        const selectedClass = isSelected ? 'selected-row' : '';
        html += `
            <tr class="file-row ${selectedClass}" 
                onclick="selectItem('${panel}', '${file.name}', false, '${fileName}')" 
                ondblclick="onItemDblClick('${file.name}', false)">
                <td>📄 ${fileName}</td>
                <td class="file-size">${fileSize}</td>
                <td class="file-date">${fileDate}</td>
                <td style="text-align:center;"></td>
            </tr>
        `;
    });

    if (folderList.length === 0 && files.length === 0 && currentPath === '/') {
        html = `<tr><td colspan="4" style="padding:20px;text-align:center;">Папка пуста</td></tr>`;
    }

    tbody.innerHTML = html;
}
// Переход на уровень выше в указанной панели
function navigateUp(panel) {
    let currentPath = panel === 'left' ? leftPanelPath : rightPanelPath;
    if (currentPath === '/') return;

    // Убираем завершающий слеш и находим родительский путь
    let cleanPath = currentPath.endsWith('/') ? currentPath.slice(0, -1) : currentPath;
    const lastSlash = cleanPath.lastIndexOf('/');
    let parentPath;
    if (lastSlash === -1) {
        parentPath = '/';
    } else {
        parentPath = cleanPath.substring(0, lastSlash + 1); // сохраняем слеш в конце
    }

    // Обновляем путь панели и перезагружаем список
    if (panel === 'left') {
        leftPanelPath = parentPath;
        loadPanelList('left');
        selectedLeftItem = null; // сбрасываем выделение
    } else {
        rightPanelPath = parentPath;
        loadPanelList('right');
        selectedRightItem = null;
    }
}
console.log('✅ Wtis server.js загружен');