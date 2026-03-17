// ============ Глобальные переменные ============
let currentTool = 'text';
let brushSize = 3;
let primaryColor = '#000000';
let secondaryColor = '#ffffff';
let isDrawing = false;
let startX = 0, startY = 0;
let lastX = 0, lastY = 0;
let zoom = 1;


const maxHistory = 50;

// Переменные для работы с выделением
let selection = null;
let selectionData = null;

// Переменные для инструмента "Лассо"
let lassoPoints = [];
let isLassoClosed = false;

// Массив открытых файлов
let openFiles = [];
let activeFileId = null;

// Ссылки на активный canvas и контекст
let canvas = null;
let ctx = null;

// ============ DOM элементы ============
let dom = {};

const RECENT_FILES_KEY = 'paint_recent_files';
const MAX_RECENT_FILES = 20;

// ============ Загрузка приложения после готовности DOM ============
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем DOM элементы после загрузки страницы
    initDomElements();
    
    // Добавляем обработчик для input file с id="run"
    const runInput = document.getElementById('run');
    if (runInput) {
        let isWaitingForFileSelection = false;
        
        // Отслеживаем клик по input - устанавливаем флаг ожидания выбора файла
        runInput.addEventListener('click', function(event) {
            isWaitingForFileSelection = true;
        });
        
        runInput.addEventListener('change', function(event) {
            if (event.target.files && event.target.files.length > 0) {
                loadImage(event);
            }
            // Сбрасываем значение после обработки, чтобы можно было выбрать тот же файл снова
            runInput.value = '';
            isWaitingForFileSelection = false;
        });
        
        // Обработчик cancel через dialog close (для современных браузеров)
        runInput.addEventListener('cancel', function(event) {
            isWaitingForFileSelection = false;
        });
        
        // Обработчик blur для обнаружения отмены
        runInput.addEventListener('blur', function(event) {
            // Если input потерял фокус и мы ожидали выбор файла, значит пользователь нажал "Отмена"
            if (isWaitingForFileSelection) {
                // Небольшая задержка чтобы дать шанс сработать change событию
                setTimeout(() => {
                    if (runInput.value === '') {
                        isWaitingForFileSelection = false;
                        // Возвращаем фокус на активный canvas
                        const file = getActiveFile();
                        if (file && file.canvas) {
                            file.canvas.focus();
                        }
                    }
                }, 10);
            }
        });
    }
    
    // // Инициализация приложения
    // initPalette();
    // setPrimaryColor(primaryColor);
    // setSecondaryColor(secondaryColor);
    
    // Создаем начальный файл
    //createBlankFile('Безымянный');
    
    updateToolInfo();
    initRecentFiles();
    
    // Инициализация цветовой панели (Color Bar)
    initColorBar();
    
    // Инициализируем состояние кнопок при загрузке (когда файлов еще нет)
    updateButtonsState();
    
    // Инициализируем обработчик colorPicker после загрузки DOM
    if (dom.colorPicker) {
        dom.colorPicker.addEventListener('input', (e) => {
            if (currentColorTarget === 'primary') setPrimaryColor(e.target.value);
            else setSecondaryColor(e.target.value);
        });
    }
    
    // Обработчик клика вне выпадающего списка
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('openFilesDropdown');
        const button = document.getElementById('openFilesDropdownBtn');
        
        if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
            closeOpenFilesDropdown();
        }
        
        // Закрытие панели фигур при клике вне её
        if (dom.shapesPanel && !event.target.closest('#shapesBtn') && !event.target.closest('#shapesPanel')) {
            dom.shapesPanel.classList.remove('active');
        }
        
        // Если клик не по input file и не по элементу который его вызывает - сбрасываем флаг ожидания
        const runInput = document.getElementById('run');
        if (runInput && !runInput.contains(event.target)) {
            // Флаг будет сброшен в blur обработчике если файл не выбран
        }
    });
});

// Инициализация DOM элементов
function initDomElements() {
    dom = {
        windowTitle: document.getElementById('windowTitle'),
        canvasHost: document.getElementById('canvasHost'),
        canvasWrapper: document.getElementById('canvasWrapper'),
        cursorPos: document.getElementById('cursorPos'),
        canvasSize: document.getElementById('canvasSize'),
        zoomLevel: document.getElementById('zoomLevel'),
        shapesPanel: document.getElementById('shapesPanel'),
        shapesBtn: document.getElementById('shapesBtn'),
        resizeModal: document.getElementById('resizeModal'),
        newWidth: document.getElementById('newWidth'),
        newHeight: document.getElementById('newHeight'),
        textInputOverlay: document.getElementById('textInputOverlay'),
        textInput: document.getElementById('textInput'),
        colorPicker: document.getElementById('colorPicker'),
        saveMethodModal: document.getElementById('saveMethodModal'),
        filenameModal: document.getElementById('filenameModal'),
        loadFromServerModal: document.getElementById('loadFromServerModal'),
        recentFilesModal: document.getElementById('recentFilesModal'),
        recentFilesContainer: document.getElementById('recentFilesContainer'),
        recentFilesCount: document.getElementById('recentFilesCount')
    };
}

// ============ Система управления файлами через выпадающий список ============

// Функция для обновления заголовка окна
function updateWindowTitle() {
    const file = getActiveFile();
    if (file && dom.windowTitle) {
        dom.windowTitle.textContent = `${file.filename} - Paint`;
    }
}

// Функция для обновления метки текущего файла в Ribbon
function updateCurrentFileLabel() {
    const file = getActiveFile();
    const label = document.getElementById('currentFileLabel');
    if (file && label) {
        label.textContent = file.filename || 'Безымянный';
    }
}

// Генерация уникального ID
function makeId() {
    try {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
}

// Создание нового пустого файла
function createBlankFile(filename) {
    const id = makeId();
    const file = {
        id: id,
        filename: filename || 'Безымянный',
        canvas: null,
        ctx: null,
        history: [],
        historyIndex: -1
    };
    
    // Создаем canvas элемент
    const cnv = document.createElement('canvas');
    cnv.className = 'paint-canvas';
    cnv.id = `canvas-${id}`;
    cnv.width = 800;
    cnv.height = 600;
    
    // Скрываем все canvas кроме активного
    if (openFiles.length > 0) {
        cnv.style.display = 'none';
    }
    
    attachCanvasEvents(cnv);
    dom.canvasHost.appendChild(cnv);
    
    file.canvas = cnv;
    file.ctx = cnv.getContext('2d', { willReadFrequently: true });
    
    // Заливка белым фоном
    file.ctx.fillStyle = '#ffffff';
    file.ctx.fillRect(0, 0, file.canvas.width, file.canvas.height);
    
    resetHistory(file);
    pushState(file);
    
    openFiles.push(file);
    
    // Если это первый файл, делаем его активным
    if (openFiles.length === 1) {
        switchToFile(id);
    }
    
    updateOpenFilesList();
    return file;
}

// Создание файла из загруженного изображения
function createFileFromImage(filename, img) {
    const id = makeId();
    const file = {
        id: id,
        filename: filename || 'Изображение',
        canvas: null,
        ctx: null,
        history: [],
        historyIndex: -1
    };
    
    // Создаем canvas элемент
    const cnv = document.createElement('canvas');
    cnv.className = 'paint-canvas';
    cnv.id = `canvas-${id}`;
    cnv.width = img.width;
    cnv.height = img.height;
    cnv.style.display = 'none';
    
    attachCanvasEvents(cnv);
    dom.canvasHost.appendChild(cnv);
    
    file.canvas = cnv;
    file.ctx = cnv.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(img, 0, 0);
    
    resetHistory(file);
    pushState(file);
    
    openFiles.push(file);
    switchToFile(id);
    
    // Автоматически подгоняем изображение под размер экрана
    fitImageToScreen();
    
    updateOpenFilesList();
    return file;
}

// Получение файла по ID
function getFile(fileId) {
    return openFiles.find(f => f.id === fileId) || null;
}

// Получение активного файла
function getActiveFile() {
    return getFile(activeFileId);
}

// Переключение на файл
function switchToFile(fileId) {
    const file = getFile(fileId);
    if (!file) return;
    
    // Скрываем все canvas
    openFiles.forEach(f => {
        if (f.canvas) {
            f.canvas.style.display = 'none';
        }
    });
    
    // Показываем активный canvas
    if (file.canvas) {
        file.canvas.style.display = 'block';
    }
    
    // Устанавливаем активный файл
    activeFileId = fileId;
    canvas = file.canvas;
    ctx = file.ctx;
    
    // Обновляем интерфейс
    updateWindowTitle();        // Функция для обновления заголовка окна
    updateCurrentFileLabel();   // Функция для обновления метки текущего файла в Ribbon
    updateCanvasSize();         // Управление холстом
    applyZoom();                // Применение зума (без параметров для сброса позиции)
    setCanvasCursor();
    
    // Обновляем список открытых файлов
    updateOpenFilesList();              // Обновление списка открытых файлов в выпадающем списке
    updateActiveFilePreview(fileId);
    
    // Фокусируемся на canvas чтобы клавиши работали сразу
    if (file.canvas) {
        setTimeout(() => {
            file.canvas.focus();
        }, 10);
    }
}

// Закрытие файла
function closeFile(fileId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (openFiles.length <= 1) {
        alert('Нельзя закрыть единственный файл!');
        return;
    }
    
    const file = getFile(fileId);
    if (!file) return;
    
    const fileIndex = openFiles.findIndex(f => f.id === fileId);
    
    // Удаление DOM элементов
    if (file.canvas) {
        file.canvas.remove();
    }
    
    openFiles.splice(fileIndex, 1);
    
    // Переключение на соседний файл
    if (activeFileId === fileId) {
        const nextFile = openFiles[Math.max(0, fileIndex - 1)] || openFiles[0];
        if (nextFile) {
            switchToFile(nextFile.id);
        }
    }
    
    updateOpenFilesList();
}

// Обновление списка открытых файлов в выпадающем списке
function updateOpenFilesList() {
    const filesList = document.getElementById('openFilesList');
    if (!filesList) return;
    
    if (openFiles.length === 0) {
        filesList.innerHTML = `
            <div class="no-files-message">
                <i class="fas fa-image"></i>
                <div>Нет открытых файлов</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    openFiles.forEach(file => {
        const isActive = file.id === activeFileId;
        const filename = file.filename || 'Безымянный';
        const dimensions = file.canvas ? `${file.canvas.width} × ${file.canvas.height}` : '—';
        
        html += `
            <div class="open-file-item ${isActive ? 'active' : ''}" 
                 onclick="switchToFile('${file.id}'); closeOpenFilesDropdown();">
                <div class="file-preview">
                    <canvas id="thumb-canvas-${file.id}" width="40" height="40" 
                            style="display: none;"></canvas>
                    <img id="thumb-img-${file.id}" class="file-thumbnail" 
                         alt="${filename}" width="40" height="40">
                </div>
                <div class="file-info">
                    <div class="file-name" title="${filename}">${filename}</div>
                    <div class="file-details">${dimensions}</div>
                </div>
                <button class="file-close-btn" onclick="closeFile('${file.id}', event)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    filesList.innerHTML = html;
    document.getElementById("currentFileLabel").style.display = "none";
    document.getElementById("fileCountBadge").textContent = openFiles.length;
    //document.getElementById("fileCountBadge").innerHTML = 2;
    // Обновляем превью для каждого файла
    updateFileThumbnails();
    
    // Обновляем состояние кнопок (активные/неактивные)
    updateButtonsState();
}

// Конфигурация: список селекторов кнопок, которые нужно блокировать при отсутствии файлов
// Редактируйте этот массив, чтобы добавлять или удалять кнопки из списка блокируемых
const EDITING_BUTTONS_SELECTORS = [
    '.tab-action-btn:not([onclick*="showLoadMethodModal"]):not([onclick*="showSaveMethodModal"])',
    '.ribbon-btn:not(#openFilesDropdownBtn)'
    // Добавьте сюда другие селекторы при необходимости, например:
    // '#btn-crop',
    // '#btn-rotate-left',
    // '.my-custom-button-class'
];

// Обновление состояния кнопок (делает их неактивными если нет загруженных файлов)
function updateButtonsState() {
    const hasFiles = openFiles.length > 0;
    
    // Проходим по каждому селектору из конфигурируемого списка
    EDITING_BUTTONS_SELECTORS.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(btn => {
            btn.disabled = !hasFiles;
        });
    });
}



// Обновление превью файлов
function updateFileThumbnails() {
    openFiles.forEach(file => {
        updateFileThumbnail(file.id);
        //updateActiveFilePreview(file.id);
    });
}

// Создание превью для файла
function updateFileThumbnail(fileId) {
    const file = getFile(fileId);
    if (!file || !file.canvas) return;
    
    const thumbCanvas = document.getElementById(`thumb-canvas-${fileId}`);
    const thumbImg = document.getElementById(`thumb-img-${fileId}`);
    
    if (!thumbCanvas || !thumbImg) return;
    
    try {
        const ctx = thumbCanvas.getContext('2d');
        
        // Очищаем превью
        ctx.clearRect(0, 0, 40, 40);
        
        // Рисуем белый фон
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 40, 40);
        
        // Масштабируем и рисуем изображение
        const scale = Math.min(40 / file.canvas.width, 40 / file.canvas.height);
        const x = (40 - file.canvas.width * scale) / 2;
        const y = (40 - file.canvas.height * scale) / 2;
        
        ctx.drawImage(file.canvas, x, y, file.canvas.width * scale, file.canvas.height * scale);
        
        // Конвертируем в data URL для img
        thumbImg.src = thumbCanvas.toDataURL();
    } catch (e) {
        console.error('Ошибка создания превью:', e);
    }
}

function updateActiveFilePreview(fileId) {
    const file = getFile(fileId);
    const canvas = document.getElementById('activeFileThumbCanvas');
    const img = document.getElementById('activeFileThumbImg');
    const label = document.getElementById('currentFileLabel');

    // Очищаем предыдущие превью
    canvas.style.display = 'none';
    img.style.display = 'none';
    label.textContent = file?.filename || 'Безымянный';

    // Если файл имеет холст (например, изображение), генерируем миниатюру
    if (file?.canvas) {
        // canvas.style.display = 'inline-block'; // Показываем canvas
        // const ctx = canvas.getContext('2d');
        
        // // Масштабируем изображение до 32x32 (сохраняя пропорции)
        // const scale = Math.min(32 / currentFile.canvas.width, 32 / currentFile.canvas.height);
        // const width = currentFile.canvas.width * scale;
        // const height = currentFile.canvas.height * scale;
        // ctx.drawImage(currentFile.canvas, 0, 0, width, height);
        canvas.style.display = 'inline-block'; // Показываем canvas
        const ctx = canvas.getContext('2d');
        
        // Очищаем превью
        ctx.clearRect(0, 0, 32, 32);
        
        // Рисуем белый фон
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 32, 32);
        
        // Масштабируем и рисуем изображение
        const scale = Math.min(32 / file.canvas.width, 32 / file.canvas.height);
        const x = (32 - file.canvas.width * scale) / 2;
        const y = (32 - file.canvas.height * scale) / 2;
        
        ctx.drawImage(file.canvas, x, y, file.canvas.width * scale, file.canvas.height * scale);
        
        // Конвертируем в data URL для img
        img.src = canvas.toDataURL();

    } 
    // Если есть готовое превью (например, URL)
    else if (file?.thumbnailUrl) {
        img.src = currentFile.thumbnailUrl;
        img.alt = currentFile.filename || 'Превью';
        img.style.display = 'inline-block'; // Показываем img
    }
    // Если нет превью — показываем текст
    else {
        label.textContent = file?.filename || 'Безымянный';
    }

}

// ============ Управление выпадающим списком ============

// Переключение выпадающего списка открытых файлов
function toggleOpenFilesDropdown() {
    const dropdown = document.getElementById('openFilesDropdown');
    if (!dropdown) return;
    
    const isShowing = dropdown.classList.contains('show');
    
    // Закрываем другие выпадающие списки
    closeAllDropdowns();
    
    if (isShowing) {
        closeOpenFilesDropdown();
    } else {
        openOpenFilesDropdown();
    }
}

// Открытие выпадающего списка
function openOpenFilesDropdown() {
    const dropdown = document.getElementById('openFilesDropdown');
    if (!dropdown) return;
    
    dropdown.classList.add('show');
    
    // Обновляем список файлов при открытии
    updateOpenFilesList();
}

// Закрытие выпадающего списка
function closeOpenFilesDropdown() {
    const dropdown = document.getElementById('openFilesDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Закрытие всех выпадающих списков
function closeAllDropdowns() {
    closeOpenFilesDropdown();
    if (dom.shapesPanel) {
        dom.shapesPanel.classList.remove('active');
    }
}

// ============ Обработка горячих клавиш ============
document.addEventListener('keydown', (e) => {
    // Если диалог выбора файла открыт, игнорируем все клавиши кроме Escape
    const runInput = document.getElementById('run');
    if (runInput && document.activeElement === runInput) {
        if (e.key === 'Escape') {
            runInput.blur();
        }
        return;
    }
    
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'z': e.preventDefault(); undo(); break; // Ctrl+Z - отменить
            case 'y': e.preventDefault(); redo(); break; // Ctrl+Y - повторить
            case 's': e.preventDefault(); showSaveMethodModal(); break; // Ctrl+S - сохранить
            case 'o': e.preventDefault(); document.getElementById('run').click(); break; // Ctrl+O - открыть
            case 'l': e.preventDefault(); showLoadFromServerModal(); break; // Ctrl+L - загрузить с сервера
            case 'n': e.preventDefault(); newImage(); break; // Ctrl+N - новый файл
            case 'tab': e.preventDefault(); cycleThroughFiles(); break; // Ctrl+Tab для переключения файлов
        }
    }
    if (e.altKey) {
        switch (e.key.toLowerCase()) {
            case 'r': e.preventDefault(); rotateCanvas(90); break; // ALT+R - поворот
        }
    }

    // Ctrl+Shift+R для открытия списка недавних файлов
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        showRecentFilesModal();
    }
});
// Добавляем обработчик колесика мыши
document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault(); // Отключаем стандартное масштабирование браузера
        
        // Проверяем направление прокрутки
        const deltaY = e.deltaY; // >0 - вниз, <0 - вверх
        if (deltaY > 0) {
            zoomOut(e.clientX, e.clientY); // Прокрутка вниз → масштабировать "на себя" (уменьшение)
        } else {
            zoomIn(e.clientX, e.clientY);  // Прокрутка вверх → масштабировать "от себя" (увеличение)
        }


        // Возвращаем true, чтобы предотвратить стандартное поведение
        return true;
    }
}, { passive: false }); // passive: false позволяет вызвать e.preventDefault()

// Функция для переключения файлов по Ctrl+Tab
function cycleThroughFiles() {
    if (openFiles.length <= 1) return;
    
    const currentIndex = openFiles.findIndex(f => f.id === activeFileId);
    const nextIndex = (currentIndex + 1) % openFiles.length;
    switchToFile(openFiles[nextIndex].id);
}

// ============ События canvas ============
// Привязка обработчиков событий к canvas
function attachCanvasEvents(cnv) {
    // Добавляем tabindex чтобы canvas мог получать фокус
    cnv.setAttribute('tabindex', '0');
    cnv.style.outline = 'none'; // Убираем обводку при фокусе
    
    cnv.addEventListener('mousedown', handleMouseDown);
    cnv.addEventListener('mousemove', handleMouseMove);
    cnv.addEventListener('mouseup', handleMouseUp);
    cnv.addEventListener('mouseleave', handleMouseUp);
    cnv.addEventListener('dblclick', handleDoubleClick);
    cnv.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Обработчик фокуса - визуально показываем что canvas активен
    cnv.addEventListener('focus', () => {
        cnv.style.boxShadow = '0 0 0 2px rgba(66, 133, 244, 0.5)';
    });
    
    // Обработчик потери фокуса
    cnv.addEventListener('blur', () => {
        cnv.style.boxShadow = 'none';
    });
}

// Обработка двойного клика (для завершения лассо)
function handleDoubleClick(e) {
    if (currentTool === 'lasso' && lassoPoints.length > 2) {
        isDrawing = false;
        // Симуляция события mouseup для завершения рисования
        const event = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        e.currentTarget.dispatchEvent(event);
    }
}

// Получение координат на canvas с учетом масштаба
function getCanvasCoords(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return { x: 0, y: 0 };

    const rect = file.canvas.getBoundingClientRect();
    return {
        x: Math.floor((e.clientX - rect.left) / zoom),
        y: Math.floor((e.clientY - rect.top) / zoom)
    };
}

// Обработка нажатия кнопки мыши
function handleMouseDown(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    // Проверка активного canvas
    if (e.currentTarget !== file.canvas) return;

    ctx = file.ctx;
    canvas = file.canvas;

    const coords = getCanvasCoords(e);
    startX = coords.x;
    startY = coords.y;
    lastX = coords.x;
    lastY = coords.y;
    isDrawing = true;

    // Определение цвета в зависимости от кнопки мыши
    const color = e.button === 2 ? secondaryColor : primaryColor;

    // Обработка различных инструментов
    switch (currentTool) {
        case 'pencil':
        case 'brush':
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.strokeStyle = color;
            ctx.lineWidth = currentTool === 'brush' ? brushSize * 2 : brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            break;

        case 'eraser':
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = brushSize * 3;
            ctx.lineCap = 'round';
            break;

        case 'fill':
            floodFill(startX, startY, color);
            saveState();
            isDrawing = false;
            break;

        case 'picker': {
            // Получение цвета пикселя под курсором
            const pixel = ctx.getImageData(startX, startY, 1, 1).data;
            const pickedColor = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
            if (e.button === 2) setSecondaryColor(pickedColor);
            else setPrimaryColor(pickedColor);
            isDrawing = false;
            break;
        }

        case 'text':
            showTextInput(e.clientX, e.clientY, startX, startY, color);
            isDrawing = false;
            break;
            
        case 'lasso':
            // Начало создания контура лассо
            lassoPoints = [{x: startX, y: startY}];
            isLassoClosed = false;
            isDrawing = true;
            break;
case 'profile': {
    const file = getActiveFile();
    if (!file) break;

    const coords = getCanvasCoords(e);
    const threshold = Math.max(10 / zoom, 5); // порог захвата

    // Проверяем, есть ли уже профиль и не перетаскиваем ли мы его
    if (currentProfile) {
        const distStart = Math.hypot(coords.x - currentProfile.x1, coords.y - currentProfile.y1);
        const distEnd = Math.hypot(coords.x - currentProfile.x2, coords.y - currentProfile.y2);
        const distLine = distanceToSegment(coords.x, coords.y, currentProfile.x1, currentProfile.y1, currentProfile.x2, currentProfile.y2);

        if (distStart < threshold) {
            // Начинаем перетаскивать начало
            dragMode = 'start';
            isDrawing = true;
            break;
        } else if (distEnd < threshold) {
            // Перетаскиваем конец
            dragMode = 'end';
            isDrawing = true;
            break;
        } else if (distLine < threshold) {
            // Перемещаем весь профиль
            dragMode = 'whole';
            dragOffsetX = coords.x - currentProfile.x1;
            dragOffsetY = coords.y - currentProfile.y1;
            originalProfile = { ...currentProfile };
            isDrawing = true;
            break;
        }
    }

    // Если не попали в существующий профиль, начинаем новый
    startX = coords.x;
    startY = coords.y;
    lassoPoints = [{x: startX, y: startY}];
    isLassoClosed = false;
    isDrawing = true;
    break;
}
    }
}

// Обработка движения мыши
function handleMouseMove(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    if (e.currentTarget !== file.canvas) return;

    ctx = file.ctx;
    canvas = file.canvas;

    const coords = getCanvasCoords(e);
    if (dom.cursorPos) {
        dom.cursorPos.textContent = `X: ${coords.x}, Y: ${coords.y}`;
    }

    if (!isDrawing) return;

    const color = (e.buttons & 2) ? secondaryColor : primaryColor;

    // Обработка рисования для различных инструментов
    switch (currentTool) {
        case 'pencil':
        case 'brush':
        case 'eraser':
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            break;

        case 'line':
case 'profile': {
    const file = getActiveFile();
    if (!file) break;
    ctx = file.ctx;
    canvas = file.canvas;

    const coords = getCanvasCoords(e);

    if (!isDrawing) break;

    if (dragMode !== 'none') {
        // Режим перетаскивания существующего профиля
        redrawFromHistory(); // восстанавливаем основное изображение

        if (dragMode === 'start') {
            currentProfile.x1 = coords.x;
            currentProfile.y1 = coords.y;
        } else if (dragMode === 'end') {
            currentProfile.x2 = coords.x;
            currentProfile.y2 = coords.y;
        } else if (dragMode === 'whole') {
            const dx = coords.x - dragOffsetX - originalProfile.x1;
            const dy = coords.y - dragOffsetY - originalProfile.y1;
            currentProfile.x1 = originalProfile.x1 + dx;
            currentProfile.y1 = originalProfile.y1 + dy;
            currentProfile.x2 = originalProfile.x2 + dx;
            currentProfile.y2 = originalProfile.y2 + dy;
        }
        drawProfile(currentProfile);      // рисуем перемещаемый профиль
        updateGraph(currentProfile.x1, currentProfile.y1, currentProfile.x2, currentProfile.y2);
    } else {
        // Рисование нового профиля
        redrawFromHistory();
        drawProfileInProgress(startX, startY, coords.x, coords.y);
        updateGraph(startX, startY, coords.x, coords.y); // сразу обновляем график
    }
    break;
}
        case 'rect':
        case 'ellipse':
        case 'triangle':
        case 'star':
        case 'arrow':
        case 'heart':
        case 'diamond':
            redrawFromHistory();
            drawShape(currentTool, startX, startY, coords.x, coords.y, color);
            break;

        case 'select':
        case 'crop':
            redrawFromHistory();
            ctx.strokeStyle = '#0078d7';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, coords.x - startX, coords.y - startY);
            ctx.setLineDash([]);
            break;
            
        case 'lasso':
            redrawFromHistory();
            // Добавление точек в контур лассо
            if (lassoPoints.length === 0) {
                lassoPoints.push({x: coords.x, y: coords.y});
            } else {
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                const dist = Math.sqrt((coords.x - lastPoint.x) ** 2 + (coords.y - lastPoint.y) ** 2);
                if (dist > 5) {
                    lassoPoints.push({x: coords.x, y: coords.y});
                }
            }
            drawLasso(lassoPoints, coords.x, coords.y);
            break;
    }

    lastX = coords.x;
    lastY = coords.y;
}

// Обработка отпускания кнопки мыши
function handleMouseUp(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    if (e.currentTarget !== file.canvas) return;

    if (!isDrawing) return;

    ctx = file.ctx;
    canvas = file.canvas;

    const coords = getCanvasCoords(e);
    const color = e.button === 2 ? secondaryColor : primaryColor;

    // Завершение рисования для различных инструментов
    switch (currentTool) {
        case 'pencil':
        case 'brush':
        case 'eraser':
            ctx.closePath();
            saveState();
            break;

        case 'line':
        case 'rect':
        case 'ellipse':
        case 'triangle':
        case 'star':
        case 'arrow':
        case 'heart':
        case 'diamond':
            redrawFromHistory();
            drawShape(currentTool, startX, startY, coords.x, coords.y, color);
            saveState();
            break;

        case 'select': {
            // Создание прямоугольного выделения
            selection = {
                x: Math.min(startX, coords.x),
                y: Math.min(startY, coords.y),
                w: Math.abs(coords.x - startX),
                h: Math.abs(coords.y - startY)
            };
            if (selection.w > 0 && selection.h > 0) {
                selectionData = ctx.getImageData(selection.x, selection.y, selection.w, selection.h);
            }
            break;
        }

        case 'crop': {
            // Обрезка холста
            const cropX = Math.min(startX, coords.x);
            const cropY = Math.min(startY, coords.y);
            const cropW = Math.abs(coords.x - startX);
            const cropH = Math.abs(coords.y - startY);

            if (cropW > 0 && cropH > 0) {
                const cropData = ctx.getImageData(cropX, cropY, cropW, cropH);
                // Изменение размера canvas
                file.canvas.width = cropW;
                file.canvas.height = cropH;
                file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
                file.ctx.putImageData(cropData, 0, 0);
                if (file.id === activeFileId) {
                    canvas = file.canvas;
                    ctx = file.ctx;
                }
                updateCanvasSize();
                applyZoom();  // Без параметров для сброса позиции
                saveState();
            }
            break;
        }
case 'profile': {
    const file = getActiveFile();
    if (!file) break;

    if (!isDrawing) break;

    if (dragMode !== 'none') {
        // Завершаем перетаскивание – ничего не сохраняем, просто выходим
        dragMode = 'none';
        originalProfile = null;
    } else {
        // Завершаем создание нового профиля
        if (lassoPoints.length > 0) {
            // Сохраняем координаты
            currentProfile = {
                x1: startX,
                y1: startY,
                x2: lastX,
                y2: lastY
            };
            // Перерисовываем финальную версию
            redrawFromHistory();
            drawProfile(currentProfile);
        }
    }
    isDrawing = false;
    break;
}
        case 'lasso': {
            // Завершение создания лассо
            if (lassoPoints.length < 2) {
                lassoPoints = [];
                isLassoClosed = false;
                break;
            }
            
            isLassoClosed = true;
            lassoPoints.push({x: lassoPoints[0].x, y: lassoPoints[0].y});
            
            // Вычисление bounding box полигона
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of lassoPoints) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            
            const width = Math.ceil(maxX - minX);
            const height = Math.ceil(maxY - minY);
            
            if (width > 0 && height > 0) {
                // Создание временного canvas для выделения
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = width;
                tempCanvas.height = height;
                
                // Создание маски полигона
                tempCtx.beginPath();
                tempCtx.moveTo(lassoPoints[0].x - minX, lassoPoints[0].y - minY);
                for (let i = 1; i < lassoPoints.length; i++) {
                    tempCtx.lineTo(lassoPoints[i].x - minX, lassoPoints[i].y - minY);
                }
                tempCtx.closePath();
                tempCtx.clip();
                
                // Копирование изображения в выделенную область
                tempCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
                
                // Получение ImageData выделенной области
                selectionData = tempCtx.getImageData(0, 0, width, height);
                
                // Сохранение информации о выделении
                selection = {
                    x: minX,
                    y: minY,
                    w: width,
                    h: height,
                    points: lassoPoints.slice()
                };
                
                // Отрисовка выделения на основном canvas
                redrawFromHistory();
                drawLassoSelection(lassoPoints);
            }
            
            saveState();
            break;
        }
    }

    isDrawing = false;
}

// // // // // // // // // // ============ Управление инструментами ============
// // // // // // // // // // Обновление информации об инструменте в статус-баре
// // // // // // // // // function updateToolInfo() {
// // // // // // // // //     const toolNames = {
// // // // // // // // //         pencil: 'Карандаш', 
// // // // // // // // //         brush: 'Кисть',
// // // // // // // // //         eraser: 'Ластик', 
// // // // // // // // //         fill: 'Заливка',
// // // // // // // // //         text: 'Текст', 
// // // // // // // // //         picker: 'Пипетка',
// // // // // // // // //         line: 'Линия', 
// // // // // // // // //         rect: 'Прямоугольник',
// // // // // // // // //         ellipse: 'Эллипс', 
// // // // // // // // //         triangle: 'Треугольник', 
// // // // // // // // //         star: 'Звезда', 
// // // // // // // // //         arrow: 'Стрелка',
// // // // // // // // //         heart: 'Сердце', 
// // // // // // // // //         diamond: 'Ромб',
// // // // // // // // //         select: 'Выделение', 
// // // // // // // // //         lasso: 'Лассо', 
// // // // // // // // //         crop: 'Обрезка'
// // // // // // // // //     };
// // // // // // // // //     const toolInfoElement = document.getElementById('toolInfo');
// // // // // // // // //     if (toolInfoElement) {
// // // // // // // // //         toolInfoElement.textContent = `Инструмент: ${toolNames[currentTool] || currentTool}`;
// // // // // // // // //     }
// // // // // // // // // }

// // // // // // // // // // Установка курсора для canvas в зависимости от инструмента
// // // // // // // // // function setCanvasCursor() {
// // // // // // // // //     const file = getActiveFile();
// // // // // // // // //     if (!file || !file.canvas) return;
// // // // // // // // //     const cursor = currentTool === 'picker' ? 'crosshair'
// // // // // // // // //         : currentTool === 'text' ? 'text'
// // // // // // // // //         : currentTool === 'fill' ? 'cell'
// // // // // // // // //         : 'crosshair';
// // // // // // // // //     file.canvas.style.cursor = cursor;
// // // // // // // // // }

// // // // // // // // // // Установка активного инструмента
// // // // // // // // // function setTool(tool) {
// // // // // // // // //     currentTool = tool;
// // // // // // // // //     // Обновление UI кнопок инструментов
// // // // // // // // //     document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
// // // // // // // // //     document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
// // // // // // // // //     updateToolInfo();
// // // // // // // // //     setCanvasCursor();
    
// // // // // // // // //     // Сброс лассо при смене инструмента
// // // // // // // // //     if (tool !== 'lasso') {
// // // // // // // // //         lassoPoints = [];
// // // // // // // // //         isLassoClosed = false;
// // // // // // // // //     }
    
// // // // // // // // //     // Подсказка для инструмента лассо
// // // // // // // // //     if (tool === 'lasso') {
// // // // // // // // //         const toolInfoElement = document.getElementById('toolInfo');
// // // // // // // // //         if (toolInfoElement) {
// // // // // // // // //             toolInfoElement.textContent = 'Инструмент: Лассо (Клик для начала, двойной клик для завершения выделения)';
// // // // // // // // //         }
// // // // // // // // //     }
// // // // // // // // // }

// // // // // // // // // // Установка инструмента фигуры
// // // // // // // // // function setShape(shape) {
// // // // // // // // //     setTool(shape);
// // // // // // // // //     if (dom.shapesPanel) {
// // // // // // // // //         dom.shapesPanel.classList.remove('active');
// // // // // // // // //     }
// // // // // // // // // }

// // // // // // // // // // Переключение панели фигур
// // // // // // // // // function toggleShapesPanel() {
// // // // // // // // //     if (dom.shapesPanel) {
// // // // // // // // //         dom.shapesPanel.classList.toggle('active');
// // // // // // // // //     }
// // // // // // // // // }

// // // // // // // // // // Установка размера кисти
// // // // // // // // // function setBrushSize(size, ev) {
// // // // // // // // //     brushSize = size;
// // // // // // // // //     document.querySelectorAll('.brush-size-btn').forEach(btn => btn.classList.remove('active'));
// // // // // // // // //     if (ev && ev.target) ev.target.classList.add('active');
// // // // // // // // // }

// // // // // // // // // // ============ Управление цветами ============
// // // // // // // // // // Установка основного цвета
// // // // // // // // // function setPrimaryColor(color) {
// // // // // // // // //     primaryColor = color;
// // // // // // // // //     const primaryColorElement = document.getElementById('primaryColor');
// // // // // // // // //     if (primaryColorElement) {
// // // // // // // // //         primaryColorElement.style.backgroundColor = color;
// // // // // // // // //     }
// // // // // // // // // }

// // // // // // // // // // Установка вторичного цвета
// // // // // // // // // function setSecondaryColor(color) {
// // // // // // // // //     secondaryColor = color;
// // // // // // // // //     const secondaryColorElement = document.getElementById('secondaryColor');
// // // // // // // // //     if (secondaryColorElement) {
// // // // // // // // //         secondaryColorElement.style.backgroundColor = color;
// // // // // // // // //     }
// // // // // // // // // }

// // // // // // // // // let currentColorTarget = 'primary';
// // // // // // // // // // Открытие палитры выбора цвета
// // // // // // // // // function openColorPicker(target) {
// // // // // // // // //     currentColorTarget = target;
// // // // // // // // //     if (dom.colorPicker) {
// // // // // // // // //         dom.colorPicker.value = target === 'primary' ? primaryColor : secondaryColor;
// // // // // // // // //         dom.colorPicker.click();
// // // // // // // // //     }
// // // // // // // // // }

// // // // // // // // // // Инициализация предустановленной палитры цветов
// // // // // // // // // function initPalette() {
// // // // // // // // //     const colors = [
// // // // // // // // //         '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8',
// // // // // // // // //         '#3f48cc', '#a349a4', '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0',
// // // // // // // // //         '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7', '#f0e68c', '#dda0dd', '#98fb98', '#afeeee'
// // // // // // // // //     ];

// // // // // // // // //     const paletteContainer = document.getElementById('paletteColors');
// // // // // // // // //     if (!paletteContainer) return;
    
// // // // // // // // //     paletteContainer.innerHTML = '';

// // // // // // // // //     colors.forEach(color => {
// // // // // // // // //         const colorDiv = document.createElement('div');
// // // // // // // // //         colorDiv.className = 'palette-color';
// // // // // // // // //         colorDiv.style.backgroundColor = color;
// // // // // // // // //         colorDiv.addEventListener('click', () => setPrimaryColor(color));
// // // // // // // // //         colorDiv.addEventListener('contextmenu', (e) => {
// // // // // // // // //             e.preventDefault();
// // // // // // // // //             setSecondaryColor(color);
// // // // // // // // //         });
// // // // // // // // //         paletteContainer.appendChild(colorDiv);
// // // // // // // // //     });
// // // // // // // // // }

// // // // // // // // // // ============ Рисование фигур ============
function drawShape(shape, x1, y1, x2, y2, color) {
    const file = getActiveFile();
    if (!file) return;
    ctx = file.ctx;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = x2 - x1;
    const h = y2 - y1;
    const cx = x1 + w / 2;
    const cy = y1 + h / 2;

    ctx.beginPath();

    switch (shape) {
        case 'line':
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            break;

        case 'rect':
            ctx.rect(x1, y1, w, h);
            break;

        case 'ellipse':
            ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
            break;

        case 'triangle':
            ctx.moveTo(cx, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x1, y2);
            ctx.closePath();
            break;

        case 'star':
            drawStar(cx, cy, 5, Math.min(Math.abs(w), Math.abs(h)) / 2, Math.min(Math.abs(w), Math.abs(h)) / 4);
            break;

        case 'arrow': {
            const angle = Math.atan2(h, w);
            const headLen = 15;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
            break;
        }

        case 'heart': {
            const hw = Math.abs(w) / 2;
            const hh = Math.abs(h) / 2;
            ctx.moveTo(cx, y1 + hh * 0.3);
            ctx.bezierCurveTo(cx + hw, y1 - hh * 0.3, cx + hw, cy, cx, y2);
            ctx.bezierCurveTo(cx - hw, cy, cx - hw, y1 - hh * 0.3, cx, y1 + hh * 0.3);
            break;
        }

        case 'diamond':
            ctx.moveTo(cx, y1);
            ctx.lineTo(x2, cy);
            ctx.lineTo(cx, y2);
            ctx.lineTo(x1, cy);
            ctx.closePath();
            break;
    }

    ctx.stroke();
}

// Рисование звезды
function drawStar(cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
        rot += step;
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
}

// Рисование незамкнутого контура лассо
function drawLasso(points, currentX, currentY) {
    const file = getActiveFile();
    if (!file || points.length === 0) return;
    ctx = file.ctx;
    
    ctx.strokeStyle = '#0078d7';
    ctx.fillStyle = 'rgba(0, 120, 215, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    // Добавление текущей позиции мыши
    ctx.lineTo(currentX, currentY);
    // Замыкание контура, если есть хотя бы 2 точки
    if (points.length > 1) {
        ctx.closePath();
        ctx.fill();
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

// Рисование замкнутого выделения лассо
function drawLassoSelection(points) {
    const file = getActiveFile();
    if (!file || points.length < 2) return;
    ctx = file.ctx;
    
    ctx.strokeStyle = '#0078d7';
    ctx.fillStyle = 'rgba(0, 120, 215, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
}

// ============ Заливка области (Flood Fill) ============
function floodFill(x, y, fillColor) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    const c = file.canvas;
    const cctx = file.ctx;

    const imageData = cctx.getImageData(0, 0, c.width, c.height);
    const data = imageData.data;

    const target = getPixelColor(data, c.width, x, y);
    const fill = hexToRgb(fillColor);
    if (colorsMatch(target, fill)) return;

    const stack = [[x, y]];
    const visited = new Set();

    while (stack.length) {
        const [cx, cy] = stack.pop();
        const key = cx + ',' + cy;

        if (visited.has(key)) continue;
        if (cx < 0 || cx >= c.width || cy < 0 || cy >= c.height) continue;

        const cur = getPixelColor(data, c.width, cx, cy);
        if (!colorsMatch(cur, target)) continue;

        visited.add(key);
        setPixelColor(data, c.width, cx, cy, fill);

        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    cctx.putImageData(imageData, 0, 0);
}

// Получение цвета пикселя
function getPixelColor(data, width, x, y) {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

// Установка цвета пикселя
function setPixelColor(data, width, x, y, color) {
    const i = (y * width + x) * 4;
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = 255;
}

// Сравнение цветов (с допуском)
function colorsMatch(c1, c2) {
    return Math.abs(c1.r - c2.r) < 5 && Math.abs(c1.g - c2.g) < 5 && Math.abs(c1.b - c2.b) < 5;
}

// Преобразование HEX в RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// ============ Работа с текстом ============
function showTextInput(clientX, clientY, canvasX, canvasY, color) {
    const file = getActiveFile();
    if (!file) return;

    if (!dom.textInputOverlay || !dom.textInput) return;

    const overlay = dom.textInputOverlay;
    const textarea = dom.textInput;

    const rect = dom.canvasWrapper ? dom.canvasWrapper.getBoundingClientRect() : { left: 0, top: 0 };
    overlay.style.display = 'block';
    overlay.style.left = (clientX - rect.left) + 'px';
    overlay.style.top = (clientY - rect.top) + 'px';

    textarea.style.color = color;
    textarea.style.fontSize = (12 + brushSize * 2) + 'px';
    textarea.value = '';
    textarea.focus();

    // Обработка потери фокуса (сохранение текста)
    textarea.onblur = () => {
        if (textarea.value) {
            file.ctx.font = `${12 + brushSize * 2}px Arial`;
            file.ctx.fillStyle = color;
            const lines = textarea.value.split('\n');
            lines.forEach((line, i) => {
                file.ctx.fillText(line, canvasX, canvasY + (i + 1) * (14 + brushSize * 2));
            });
            saveState();
        }
        overlay.style.display = 'none';
    };
}

// ============ Система истории (Undo/Redo) ============
// Сброс истории для файла
function resetHistory(file) {
    file.history = [];
    file.historyIndex = -1;
}

// Улучшенный захват состояния с явным названием действия
// Улучшенный захват состояния — автоматически определяет название действия
function captureState(file) {
    let action = 'Изменение';

    // Приоритет 1: если в текущем инструменте есть понятное название
    if (currentTool) {
        const toolNames = {
            'brush': 'Рисование кистью',
            'pencil': 'Рисование карандашом',
            'eraser': 'Стирание',
            'fill': 'Заливка',
            'text': 'Добавление текста',
            'line': 'Линия',
            'rect': 'Прямоугольник',
            'ellipse': 'Эллипс',
            'lasso': 'Выделение лассо',
            'select': 'Выделение',
            'crop': 'Обрезка',
            'profile': 'Профиль'
        };
        if (toolNames[currentTool]) action = toolNames[currentTool];
    }

    return {
        w: file.canvas.width,
        h: file.canvas.height,
        data: file.ctx.getImageData(0, 0, file.canvas.width, file.canvas.height),
        timestamp: Date.now(),
        action: action
    };
}

// Восстановление состояния canvas из снимка
function restoreState(file, state) {
    file.canvas.width = state.w;
    file.canvas.height = state.h;
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.putImageData(state.data, 0, 0);
    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();  // Без параметров для сброса позиции
        updateCanvasSize();
    }
}

// Добавление состояния в историю
function pushState(file) {
    file.historyIndex++;
    file.history = file.history.slice(0, file.historyIndex);
    file.history.push(captureState(file));

    if (file.history.length > maxHistory) {
        file.history.shift();
        file.historyIndex--;
    }

    // Обновляем окно истории, если оно открыто
    if (typeof isHistoryModalOpen === 'function' && isHistoryModalOpen()) {
        updateHistoryModal();
    }
}

// Сохранение текущего состояния
function saveState() {
    const file = getActiveFile();
    if (!file) return;
    pushState(file);
}

// Перерисовка canvas из последнего состояния истории
function redrawFromHistory() {
    const file = getActiveFile();
    if (!file) return;
    if (file.historyIndex < 0) return;
    const state = file.history[file.historyIndex];
    // Проверка соответствия размеров
    if (file.canvas.width !== state.w || file.canvas.height !== state.h) {
        restoreState(file, state);
        return;
    }
    file.ctx.putImageData(state.data, 0, 0);
}

// Отмена последнего действия
function undo() {
    const file = getActiveFile();
    if (!file) return;
    if (file.historyIndex > 0) {
        file.historyIndex--;
        restoreState(file, file.history[file.historyIndex]);
    }
}

// Повтор отмененного действия
function redo() {
    const file = getActiveFile();
    if (!file) return;
    if (file.historyIndex < file.history.length - 1) {
        file.historyIndex++;
        restoreState(file, file.history[file.historyIndex]);
    }
}

// ============ Управление масштабом ============
let zoomTargetX = null; // Точка масштабирования по X (относительно canvas)
let zoomTargetY = null; // Точка масштабирования по Y (относительно canvas)

function zoomIn(clientX, clientY) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    
    const container = dom.canvasWrapper;
    const containerRect = container.getBoundingClientRect();
    
    // Вычисляем точку масштабирования в координатах canvas ДО изменения зума
    let targetCanvasX, targetCanvasY;
    
    if (clientX !== undefined && clientY !== undefined) {
        // Координаты курсора относительно контейнера с учетом прокрутки
        const scrollX = container.scrollLeft;
        const scrollY = container.scrollTop;
        
        // Точка масштабирования в координатах canvas (до масштабирования)
        targetCanvasX = (scrollX + clientX - containerRect.left) / zoom;
        targetCanvasY = (scrollY + clientY - containerRect.top) / zoom;
    }
    
    const oldZoom = zoom;
    zoom = Math.min(zoom * 1.2, 32);
    
    // Применяем зум
    applyZoom(targetCanvasX, targetCanvasY, oldZoom);
}

function zoomOut(clientX, clientY) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    
    const container = dom.canvasWrapper;
    const containerRect = container.getBoundingClientRect();
    
    // Вычисляем точку масштабирования в координатах canvas ДО изменения зума
    let targetCanvasX, targetCanvasY;
    
    if (clientX !== undefined && clientY !== undefined) {
        // Координаты курсора относительно контейнера с учетом прокрутки
        const scrollX = container.scrollLeft;
        const scrollY = container.scrollTop;
        
        // Точка масштабирования в координатах canvas (до масштабирования)
        targetCanvasX = (scrollX + clientX - containerRect.left) / zoom;
        targetCanvasY = (scrollY + clientY - containerRect.top) / zoom;
    }
    
    const oldZoom = zoom;
    zoom = Math.max(zoom / 1.2, 0.01);
    
    // Применяем зум
    applyZoom(targetCanvasX, targetCanvasY, oldZoom);
}

function zoomReset() {
    zoom = 1;
    zoomTargetX = null; // Сбрасываем точку масштабирования
    zoomTargetY = null;
    applyZoom();  // Без параметров для сброса позиции
}

/**
 * Автоматически подгоняет изображение под размер видимой области экрана
 */
function fitImageToScreen() {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    
    // Получаем размеры видимой области canvasHost
    const container = dom.canvasHost;
    if (!container) return;
    
    const containerWidth = container.clientWidth - 40; // Учитываем отступы
    const containerHeight = container.clientHeight - 40;
    
    const imgWidth = file.canvas.width;
    const imgHeight = file.canvas.height;
    
    // Рассчитываем коэффициент масштабирования чтобы изображение поместилось полностью
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    
    // Используем меньший коэффициент чтобы изображение вписалось полностью
    zoom = Math.min(scaleX, scaleY, 1); // Не увеличиваем если изображение маленькое
    zoomTargetX = null; // Сбрасываем точку масштабирования при автоподгонке
    zoomTargetY = null;
    
    applyZoom();  // Без параметров для сброса позиции
}

/**
 * Функция applyZoom() применяет масштабирование к активному холсту (canvas).
 * Обновляет размеры холста в DOM и отображает текущий уровень зума.
 * Если задана точка масштабирования, позиционирует canvas так,
 * чтобы эта точка оставалась под курсором.
 * @param {number} targetCanvasX - Точка масштабирования в координатах canvas (опционально)
 * @param {number} targetCanvasY - Точка масштабирования в координатах canvas (опционально)
 * @param {number} oldZoom - Старый коэффициент зума (опционально)
 */
function applyZoom(targetCanvasX, targetCanvasY, oldZoom) {
    // Получаем текущий активный файл (предположительно, объект с данными изображения)
    const file = getActiveFile();

    // Проверяем, что файл существует и содержит элемент canvas
    if (!file || !file.canvas){
        // Если условий нет, выходим из функции (зум не применим)
        return;
    }

    const container = dom.canvasWrapper;
    
    // Если переданы параметры точки масштабирования, используем их
    if (targetCanvasX !== undefined && targetCanvasY !== undefined && oldZoom !== undefined) {
        // Вычисляем позицию точки на экране ДО изменения размера
        const oldScreenX = targetCanvasX * oldZoom;
        const oldScreenY = targetCanvasY * oldZoom;
        
        // Координаты точки относительно левого верхнего угла контейнера
        const relativeX = container.scrollLeft + oldScreenX;
        const relativeY = container.scrollTop + oldScreenY;
        
        // Масштабируем ширину холста
        file.canvas.style.width = `${file.canvas.width * zoom}px`;
        file.canvas.style.height = `${file.canvas.height * zoom}px`;
        
        // Новая позиция точки масштабирования после изменения размера
        const newScreenX = targetCanvasX * zoom;
        const newScreenY = targetCanvasY * zoom;
        
        // Корректируем прокрутку так, чтобы точка осталась на месте
        container.scrollLeft = relativeX - newScreenX;
        container.scrollTop = relativeY - newScreenY;
    } else {
        // Стандартное применение зума без коррекции позиции
        file.canvas.style.width = `${file.canvas.width * zoom}px`;
        file.canvas.style.height = `${file.canvas.height * zoom}px`;
        file.canvas.style.transform = 'none';
        file.canvas.style.transformOrigin = '0 0';
    }

    // Проверяем, существует ли элемент интерфейса для отображения уровня зума
    if (dom.zoomLevel) {
        // Округляем zoom до целых процентов и обновляем текстовое содержимое элемента
        dom.zoomLevel.textContent = `Масштаб: ${Math.round(zoom * 100)}%`;
        // Пример: если zoom = 1.5, отобразится "150%"
    }
}

// ============ Управление холстом ============
function updateCanvasSize() {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    if (dom.canvasSize) {
        dom.canvasSize.textContent = `${file.canvas.width} × ${file.canvas.height} пикселей`;
    }
    updateActiveFilePreview(file.id);
}

// ============ Работа с файлами ============
// Создание нового изображения
function newImage() {
    createBlankFile('Безымянный');
    
    // Фокусируемся на новом canvas после создания
    const file = getActiveFile();
    if (file && file.canvas) {
        setTimeout(() => {
            file.canvas.focus();
        }, 10);
    }
}

// Загрузка изображения из файла
function loadImage(event) {
    const files = event.target.files;
    
    // Если пользователь нажал "Отмена", файлы будут пустыми
    if (!files || files.length === 0) {
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                createFileFromImage(file.name, img);
                
                // Фокусируемся на новом canvas после загрузки
                const newFile = openFiles.find(f => f.filename === file.name);
                if (newFile && newFile.canvas) {
                    setTimeout(() => {
                        newFile.canvas.focus();
                    }, 10);
                }
                
                // Сохраняем файл в недавние
                addToRecentFiles({
                    name: file.name,
                    lastModified: file.lastModified,
                    size: file.size,
                    type: file.type,
                    data: e.target.result // Сохраняем данные для быстрого открытия
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    // Сброс input уже выполняется в обработчике DOMContentLoaded
}


// Очистка холста
function clearCanvas() {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    file.ctx.fillStyle = '#ffffff';
    file.ctx.fillRect(0, 0, file.canvas.width, file.canvas.height);
    saveState();
}

// ============ Модальное окно изменения размера ============
function showResizeModal() {
    const file = getActiveFile();
    if (!file || !file.canvas || !dom.resizeModal) return;
    if (dom.newWidth) dom.newWidth.value = file.canvas.width;
    if (dom.newHeight) dom.newHeight.value = file.canvas.height;
    dom.resizeModal.classList.add('active');
}

function closeResizeModal() {
    if (dom.resizeModal) {
        dom.resizeModal.classList.remove('active');
    }
}

function applyResize() {
    const file = getActiveFile();
    if (!file || !file.canvas || !dom.newWidth || !dom.newHeight) return;

    const newWidth = parseInt(dom.newWidth.value) || 800;
    const newHeight = parseInt(dom.newHeight.value) || 600;

    if (newWidth < 1 || newHeight < 1) {
        alert('Размеры должны быть положительными числами!');
        return;
    }

    // Создание временного canvas для изменения размера
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    
    // Заливка белым фоном
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, newWidth, newHeight);
    
    // Копирование изображения с сохранением пропорций
    const scale = Math.min(newWidth / file.canvas.width, newHeight / file.canvas.height);
    const x = (newWidth - file.canvas.width * scale) / 2;
    const y = (newHeight - file.canvas.height * scale) / 2;
    
    tempCtx.drawImage(file.canvas, x, y, file.canvas.width * scale, file.canvas.height * scale);

    // Обновление основного canvas
    file.canvas.width = newWidth;
    file.canvas.height = newHeight;
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(tempCanvas, 0, 0);
    
    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        updateCanvasSize();
        applyZoom();  // Без параметров для сброса позиции
    }
    
    saveState();
    closeResizeModal();
}

// ============ Операции с изображением ============
function rotateCanvas(degrees) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    // Показываем модальное окно прогресса
    showProgressModal('Поворот изображения', false);
    
    // Используем setTimeout чтобы дать UI обновиться перед тяжелой операцией
    setTimeout(() => {
        updateProgress(20, 'Вычисление новых размеров...');
        
        const radians = degrees * Math.PI / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        
        const newWidth = Math.floor(file.canvas.width * cos + file.canvas.height * sin);
        const newHeight = Math.floor(file.canvas.width * sin + file.canvas.height * cos);

        updateProgress(50, 'Создание повернутого изображения...');
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        
        tempCtx.translate(newWidth / 2, newHeight / 2);
        tempCtx.rotate(radians);
        tempCtx.drawImage(file.canvas, -file.canvas.width / 2, -file.canvas.height / 2);

        updateProgress(80, 'Применение изменений...');
        
        file.canvas.width = newWidth;
        file.canvas.height = newHeight;
        file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
        file.ctx.drawImage(tempCanvas, 0, 0);
        
        if (file.id === activeFileId) {
            canvas = file.canvas;
            ctx = file.ctx;
            updateCanvasSize();
            applyZoom();  // Без параметров для сброса позиции
        }
        
        updateProgress(100, 'Готово!');
        saveState();
        
        // Закрываем модальное окно через небольшую задержку
        setTimeout(() => {
            closeProgressModal();
        }, 300);
    }, 50);
}

function flipCanvas(direction) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = file.canvas.width;
    tempCanvas.height = file.canvas.height;
    
    if (direction === 'horizontal') {
        tempCtx.translate(file.canvas.width, 0);
        tempCtx.scale(-1, 1);
    } else if (direction === 'vertical') {
        tempCtx.translate(0, file.canvas.height);
        tempCtx.scale(1, -1);
    }
    
    tempCtx.drawImage(file.canvas, 0, 0);
    file.ctx.clearRect(0, 0, file.canvas.width, file.canvas.height);
    file.ctx.drawImage(tempCanvas, 0, 0);
    
    updateCanvasSize();
    saveState();
}

function invertColors() {
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    const imageData = file.ctx.getImageData(0, 0, file.canvas.width, file.canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i]; // R
        data[i + 1] = 255 - data[i + 1]; // G
        data[i + 2] = 255 - data[i + 2]; // B
    }
    
    file.ctx.putImageData(imageData, 0, 0);
    saveState();
}

function grayscale() {
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    const imageData = file.ctx.getImageData(0, 0, file.canvas.width, file.canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg; // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
    }
    
    file.ctx.putImageData(imageData, 0, 0);
    saveState();
}

// ============ Буфер обмена (базовая реализация) ============
function copySelection() {
    if (!selection || !selectionData) {
        alert('Сначала выделите область!');
        return;
    }
    // В реальном приложении здесь была бы работа с буфером обмена
    alert('Копирование в буфер обмена (в демо-версии ограничено)');
}

function pasteFromClipboard() {
    // В реальном приложении здесь была бы работа с буфером обмена
    alert('Вставка из буфера обмена (в демо-версии ограничено)');
}

function cutSelection() {
    if (!selection || !selectionData) {
        alert('Сначала выделите область!');
        return;
    }
    // В реальном приложении здесь была бы работа с буфером обмена
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    file.ctx.fillStyle = '#ffffff';
    file.ctx.fillRect(selection.x, selection.y, selection.w, selection.h);
    saveState();
    alert('Вырезание в буфер обмена (в демо-версии ограничено)');
}

// ============ Функции для инструмента лассо ============
function lassoDelete() {
    if (!selection || !selectionData || !isLassoClosed) {
        alert('Сначала создайте выделение лассо!');
        return;
    }
    
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    
    // Создание маски для удаления
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = selection.w;
    tempCanvas.height = selection.h;
    
    // Создание маски полигона
    tempCtx.beginPath();
    tempCtx.moveTo(selection.points[0].x - selection.x, selection.points[0].y - selection.y);
    for (let i = 1; i < selection.points.length; i++) {
        tempCtx.lineTo(selection.points[i].x - selection.x, selection.points[i].y - selection.y);
    }
    tempCtx.closePath();
    tempCtx.clip();
    
    // Заливка белым цветом (удаление)
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, selection.w, selection.h);
    
    // Копирование обратно на основной canvas
    file.ctx.drawImage(tempCanvas, selection.x, selection.y);
    
    saveState();
    selection = null;
    selectionData = null;
    lassoPoints = [];
    isLassoClosed = false;
}

function lassoFill() {
    if (!selection || !selectionData || !isLassoClosed) {
        alert('Сначала создайте выделение лассо!');
        return;
    }
    
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    
    // Создание маски для заливки
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = selection.w;
    tempCanvas.height = selection.h;
    
    // Создание маски полигона
    tempCtx.beginPath();
    tempCtx.moveTo(selection.points[0].x - selection.x, selection.points[0].y - selection.y);
    for (let i = 1; i < selection.points.length; i++) {
        tempCtx.lineTo(selection.points[i].x - selection.x, selection.points[i].y - selection.y);
    }
    tempCtx.closePath();
    tempCtx.clip();
    
    // Заливка основным цветом
    tempCtx.fillStyle = primaryColor;
    tempCtx.fillRect(0, 0, selection.w, selection.h);
    
    // Копирование обратно на основной canvas
    file.ctx.drawImage(tempCanvas, selection.x, selection.y);
    
    saveState();
}

function lassoFeather() {
    if (!selection || !selectionData || !isLassoClosed) {
        alert('Сначала создайте выделение лассо!');
        return;
    }
    
    alert('Размытие краев выделения лассо (в демо-версии ограничено)');
    // В полной версии здесь была бы реализация размытия краев
}

// ============ Функции для загрузки  ============
function showLoadMethodModal() {
    document.getElementById("loadMethodModal").classList.add('active');
}




function closeLoadMethodModal() {
    document.getElementById("loadMethodModal").classList.remove('active');
}
function loadToLocal() {
    closeLoadMethodModal();
    document.getElementById('run').click();
}
function loadToServer_old() {
    closeLoadMethodModal();
    showLoadFromServerModal()
}
function loadToServer() {
    closeLoadMethodModal();
    showServerCommander('open', (filePath) => {
        loadImageFromServer(filePath); // существующая функция
    });
}




// ============ Функции для загрузки с сервера ============






// ============ Недавние файлы (локальные) ============




// ============ Недавние файлы (локальные) ============
// const RECENT_FILES_KEY = 'wtis_recent_files';
// const MAX_RECENT_FILES = 15;

// Инициализация
function initRecentFiles() {
    if (!localStorage.getItem(RECENT_FILES_KEY)) {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify([]));
    }
    updateRecentFilesMenu();
}

// Добавление файла в недавние (с защитой от больших файлов)
function addToRecentFiles(fileInfo) {
    try {
        let recent = getRecentFiles();

        // Удаляем дубликат, если уже есть
        recent = recent.filter(f => f.name !== fileInfo.name);

        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            name: fileInfo.name || 'Безымянный',
            lastModified: fileInfo.lastModified || Date.now(),
            size: fileInfo.size || 0,
            type: fileInfo.type || 'image/png',
            openedAt: new Date().toISOString()
        };

        // Сохраняем dataURL ТОЛЬКО если файл маленький (< 700 КБ)
        if (fileInfo.data && fileInfo.size < 700000) {
            entry.data = fileInfo.data;
        }

        recent.unshift(entry);

        if (recent.length > MAX_RECENT_FILES) recent.pop();

        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(recent));
        updateRecentFilesMenu();
    } catch (err) {
        console.warn('Не удалось сохранить недавний файл (localStorage полный?)', err);
        // Очищаем старые записи и пробуем снова
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify([]));
    }
}

// Получить список
function getRecentFiles() {
    try {
        const data = localStorage.getItem(RECENT_FILES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Ошибка чтения недавних файлов', e);
        return [];
    }
}

// Обновление меню в шапке
function updateRecentFilesMenu() {
    const container = document.getElementById('recentFilesList');
    if (!container) return;

    const files = getRecentFiles();
    container.innerHTML = '';

    if (files.length === 0) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.textContent = 'Нет недавних файлов';
        container.appendChild(item);
        return;
    }

    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.style.cursor = 'pointer';
        div.innerHTML = `
            <span style="margin-right:8px">📄</span>
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${file.name}
            </span>
            <span style="font-size:10px; color:#888; margin-left:8px;">
                ${formatRecentDate(file.openedAt)}
            </span>
        `;

        div.onclick = (e) => {
            e.stopPropagation();
            openRecentFile(file);
        };
        container.appendChild(div);
    });
}

// Открытие недавнего файла
function openRecentFile(file) {
    if (file.data) {
        // Есть сохранённые данные → открываем сразу
        const byteCharacters = atob(file.data.split(',')[1]);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: file.type || 'image/png' });

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = () => {
                createFileFromImage(file.name, img);
                // Обновляем время открытия
                addToRecentFiles({
                    name: file.name,
                    lastModified: Date.now(),
                    size: file.size,
                    type: file.type
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(blob);
    } 
    else {
        // Нет данных (файл был большой) → просим открыть вручную
        alert(`Файл «${file.name}» был открыт ранее.\n\nВыберите его заново через «Файл → Открыть» или перетащите на окно.`);
        document.getElementById('run').click(); // открываем диалог сразу
    }
}

// Форматирование даты
function formatRecentDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // минуты

    if (diff < 1) return 'только что';
    if (diff < 60) return `${diff} мин. назад`;
    if (diff < 1440) return `${Math.floor(diff/60)} ч. назад`;
    return date.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit'});
}

// Показать модальное окно недавних файлов
window.showRecentFilesModal = function() {
    const modal = document.getElementById('recentFilesModal');
    if (modal) {
        updateRecentFilesModal();
        modal.classList.add('active');
    }
};
// Очистка списка
function clearRecentFiles() {
    if (confirm('Очистить список недавних файлов?')) {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify([]));
        updateRecentFilesMenu();
        if (typeof closeRecentFilesModal === 'function') closeRecentFilesModal();
    }
}
// Открыть недавний файл по индексу
window.openRecentFile = function(index) {
    const recent = getRecentFiles();
    const fileInfo = recent[index];
    if (!fileInfo || !fileInfo.data) {
        alert('Данные файла недоступны');
        return;
    }
    // Загружаем изображение из dataURL
    const img = new Image();
    img.onload = function() {
        createFileFromImage(fileInfo.name, img);
    };
    img.src = fileInfo.data;
};
// Удалить конкретный файл из недавних
window.removeRecentFile = function(index) {
    let recent = getRecentFiles();
    recent.splice(index, 1);
    saveRecentFiles(recent);
    updateRecentFilesMenu();
    updateRecentFilesModal();
};

// Очистить весь список недавних
window.clearRecentFiles = function() {
    if (confirm('Очистить список недавних файлов?')) {
        saveRecentFiles([]);
        updateRecentFilesMenu();
        updateRecentFilesModal();
    }
};
// Обновить модальное окно недавних файлов
function updateRecentFilesModal() {
    const container = document.getElementById('recentFilesContainer');
    const countSpan = document.getElementById('recentFilesCount');
    if (!container) return;
    const recent = getRecentFiles();
    if (countSpan) countSpan.textContent = `Всего: ${recent.length}`;

    if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Нет недавних файлов</div>';
        return;
    }

    let html = '';
    recent.forEach((file, idx) => {
        const date = file.lastModified ? new Date(file.lastModified).toLocaleString() : 'неизвестно';
        const size = file.size ? (file.size / 1024).toFixed(1) + ' KB' : '—';
        html += `
            <div class="recent-file-item" onclick="openRecentFile(${idx})" style="display:flex; align-items:center; padding:8px; border-bottom:1px solid #eee; cursor:pointer;">
                <div style="width:32px; height:32px; background:#f0f0f0; border:1px solid #ddd; margin-right:10px; display:flex; align-items:center; justify-content:center;">🖼️</div>
                <div style="flex:1;">
                    <div><strong>${file.name}</strong></div>
                    <div style="font-size:11px; color:#666;">${date} • ${size}</div>
                </div>
                <button class="file-close-btn" onclick="event.stopPropagation(); removeRecentFile(${idx})" title="Удалить из списка">✕</button>
            </div>
        `;
    });
    container.innerHTML = html;
}
// Инициализация недавних файлов (вызывается при загрузке)
function initRecentFiles() {
    updateRecentFilesMenu();
    updateRecentFilesModal();
}




// ============ Новые функции для меню ============
function newFromTemplate() {
    alert('Создание из шаблона (функция в разработке)');
}

function saveImageAs() {
    const format = prompt('Введите формат (png, jpg, gif, bmp):', 'png');
    if (format && ['png', 'jpg', 'gif', 'bmp'].includes(format.toLowerCase())) {
        saveImage(format.toLowerCase());
    }
}

function exportImage(format) {
    alert(`Экспорт в формате ${format.toUpperCase()} (функция в разработке)`);
}

function printImage() {
    alert('Печать изображения (функция в разработке)');
}

function showSettings() {
    alert('Настройки программы (функция в разработке)');
}

function exitApp() {
    if (confirm('Вы уверены, что хотите выйти? Все несохраненные изменения будут потеряны.')) {
        alert('Выход из программы (в веб-версии закрытие вкладки)');
    }
}

function pasteAsNewLayer() {
    alert('Вставка как новый слой (функция в разработке)');
}

function pasteWithTransparency() {
    alert('Вставка с прозрачностью (функция в разработке)');
}

function pasteWithScaling() {
    alert('Вставка с масштабированием (функция в разработке)');
}

function autoAdjustColors() {
    alert('Автонастройка цветов (функция в разработке)');
}

function autoContrast() {
    alert('Автоконтраст (функция в разработке)');
}

function autoBrightness() {
    alert('Автояркость (функция в разработке)');
}

function autoGamma() {
    alert('Автогамма (функция в разработке)');
}

function zoomToWindow() {
    alert('Масштабирование по размеру окна (функция в разработке)');
}

function zoomToSelection() {
    alert('Масштабирование по выделению (функция в разработке)');
}

function zoomCustom() {
    const value = prompt('Введите масштаб в процентах (10-800%):', '100');
    if (value) {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 10 && num <= 800) {
            zoom = num / 100;
            zoomTargetX = null; // Сбрасываем точку масштабирования при ручном вводе
            zoomTargetY = null;
            applyZoom();  // Без параметров для сброса позиции
        }
    }
}

function toggleGrid() {
    const btn = document.getElementById('toggleGrid');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon.classList.contains('fa-th')) {
        icon.classList.remove('fa-th');
        icon.classList.add('fa-th-large');
        btn.innerHTML = '<i class="fas fa-th-large icon"></i> Сетка';
    } else {
        icon.classList.remove('fa-th-large');
        icon.classList.add('fa-th');
        btn.innerHTML = '<i class="fas fa-th icon"></i> Сетка';
    }
    alert('Переключение сетки (функция в разработке)');
}

function toggleRulers() {
    const btn = document.getElementById('toggleRulers');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon.classList.contains('fa-ruler')) {
        icon.classList.remove('fa-ruler');
        icon.classList.add('fa-ruler-combined');
        btn.innerHTML = '<i class="fas fa-ruler-combined icon"></i> Линейки';
    } else {
        icon.classList.remove('fa-ruler-combined');
        icon.classList.add('fa-ruler');
        btn.innerHTML = '<i class="fas fa-ruler icon"></i> Линейки';
    }
    alert('Переключение линеек (функция в разработке)');
}

function toggleGuides() {
    const btn = document.getElementById('toggleGuides');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon.classList.contains('fa-drafting-compass')) {
        icon.classList.remove('fa-drafting-compass');
        icon.classList.add('fa-slash');
        btn.innerHTML = '<i class="fas fa-slash icon"></i> Направляющие';
    } else {
        icon.classList.remove('fa-slash');
        icon.classList.add('fa-drafting-compass');
        btn.innerHTML = '<i class="fas fa-drafting-compass icon"></i> Направляющие';
    }
    alert('Переключение направляющих (функция в разработке)');
}

function togglePixelGrid() {
    const btn = document.getElementById('togglePixelGrid');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon.classList.contains('fa-border-all')) {
        icon.classList.remove('fa-border-all');
        icon.classList.add('fa-border-none');
        btn.innerHTML = '<i class="fas fa-border-none icon"></i> Пиксельная сетка';
    } else {
        icon.classList.remove('fa-border-none');
        icon.classList.add('fa-border-all');
        btn.innerHTML = '<i class="fas fa-border-all icon"></i> Пиксельная сетка';
    }
    alert('Переключение пиксельной сетки (функция в разработке)');
}

function newWindow() {
    window.open(window.location.href, '_blank');
}

function arrangeWindows() {
    alert('Упорядочивание окон (функция в разработке)');
}

function cascadeWindows() {
    alert('Расположение окон каскадом (функция в разработке)');
}

function tileWindows() {
    alert('Расположение окон мозаикой (функция в разработке)');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function rotateCanvasCustom() {
    const degrees = prompt('Введите угол поворота в градусах:', '45');
    if (degrees) {
        const num = parseInt(degrees);
        if (!isNaN(num)) {
            rotateCanvas(num);
        }
    }
}

function adjustBrightness() {
    alert('Коррекция яркости/контраста (функция в разработке)');
}

function adjustHueSaturation() {
    alert('Коррекция цветового тона/насыщенности (функция в разработке)');
}

function adjustLevels() {
    alert('Коррекция уровней (функция в разработке)');
}

function adjustCurves() {
    alert('Коррекция кривых (функция в разработке)');
}

function applyBlur(type) {
    alert(`Применение размытия: ${type} (функция в разработке)`);
}

function applySharpen(type) {
    alert(`Применение резкости: ${type} (функция в разработке)`);
}

function applyNoise() {
    alert('Добавление шума (функция в разработке)');
}

function applyEmboss() {
    alert('Применение тиснения (функция в разработке)');
}

function sepiaTone() {
    alert('Применение сепии (функция в разработке)');
}

function cropToSelection() {
    alert('Обрезка по выделению (функция в разработке)');
}

function cropToContent() {
    alert('Обрезка по содержимому (функция в разработке)');
}

function cropCustom() {
    alert('Произвольная обрезка (функция в разработке)');
}

function showHelp() {
    alert('Открытие справки (функция в разработке)');
}

function showTips() {
    alert('Советы и подсказки (функция в разработке)');
}

function openTutorials() {
    window.open('https://example.com/tutorials', '_blank');
}

function openGallery() {
    window.open('https://example.com/gallery', '_blank');
}

function openForum() {
    window.open('https://example.com/forum', '_blank');
}

function checkUpdates() {
    alert('Проверка обновлений (функция в разработке)');
}

function showAbout() {
    alert('Paint Web Application\nВерсия 1.0\n© 2023 Все права защищены');
}

// Переменные для редактирования профиля
let currentProfile = null;          // { x1, y1, x2, y2 }
let dragMode = 'none';              // 'none', 'start', 'end', 'whole'
let dragOffsetX = 0, dragOffsetY = 0; // смещение для перемещения всего профиля
let originalProfile = null;         // исходные координаты при перемещении

// Расстояние от точки (px, py) до отрезка (x1,y1)-(x2,y2)
function distanceToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = len_sq === 0 ? 0 : dot / len_sq;
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Отрисовка профиля и маркеров
function drawProfile(profile) {
    if (!profile) return;
    const file = getActiveFile();
    if (!file) return;
    const ctx = file.ctx;

    // Рисуем линию профиля
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(profile.x1, profile.y1);
    ctx.lineTo(profile.x2, profile.y2);
    ctx.stroke();

    // Рисуем концевые маркеры (синие кружки)
    ctx.fillStyle = '#0078d7';
    ctx.beginPath();
    ctx.arc(profile.x1, profile.y1, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(profile.x2, profile.y2, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Обновляем график
    updateGraph(profile.x1, profile.y1, profile.x2, profile.y2);
}
// Отрисовка линии профиля во время создания (красная линия + синие маркеры)
function drawProfileInProgress(x1, y1, x2, y2) {
    const file = getActiveFile();
    if (!file) return;
    const ctx = file.ctx;

    // Линия красным цветом
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Маркеры на концах (синие кружки)
    ctx.fillStyle = '#0078d7';
    ctx.beginPath();
    ctx.arc(x1, y1, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, 5, 0, 2 * Math.PI);
    ctx.fill();
}
// ==========================================
// Функции для переключения вкладок (Tabs)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // // Контент для ribbon-панели по каждой вкладке
    // const ribbonContent = {
    //     'file': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showLoadMethodModal()">
    //                     <svg class="icon"><use href="#icon-folder"></use></svg> Открыть
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showSaveMethodModal()">
    //                     <svg class="icon"><use href="#icon-save"></use></svg> Сохранить
    //                 </button>
    //             </div>
    //             <span class="ribbon-group-title">Файл</span>
    //         </div>
    //     `,
    //     'edit': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="undo()">
    //                     <svg class="icon"><use href="#icon-undo"></use></svg> Отмена
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="redo()">
    //                     <svg class="icon"><use href="#icon-redo"></use></svg> Повтор
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showHistoryModal()">
    //                     <svg class="icon"><use href="#icon-history"></use></svg> История
    //                 </button>
    //             </div>
    //             <span class="ribbon-group-title">Правка</span>
    //         </div>
    //     `,
    //     'view': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="zoomIn()">
    //                     <svg class="icon"><use href="#icon-zoom-in"></use></svg> +
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="zoomOut()">
    //                     <svg class="icon"><use href="#icon-zoom-out"></use></svg> −
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="zoomReset()">100%</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="fitImageToScreen()">По размеру</button>
    //             </div>
    //             <span class="ribbon-group-title">Вид</span>
    //         </div>
    //     `,
    //     'image': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="cropToSelection()">
    //                     <svg class="icon"><use href="#icon-crop"></use></svg> Обрезать
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="rotateCanvas(90)">
    //                     <svg class="icon"><use href="#icon-rotate-right"></use></svg> 90°
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="flipCanvas('horizontal')">
    //                     <svg class="icon"><use href="#icon-flip-h"></use></svg> ↔
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="flipCanvas('vertical')">
    //                     <svg class="icon"><use href="#icon-flip-v"></use></svg> ↕
    //                 </button>
    //             </div>
    //             <span class="ribbon-group-title">Изображение</span>
    //         </div>
    //     `,
    //     'filters': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="applyEdgeFilter()">Контур</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="applyEdgeDetection()">Границы</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="applyReliefFilter()">Рельеф</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="applySobelFilter()">Sobel</button>
    //             </div>
    //             <span class="ribbon-group-title">Фильтры</span>
    //         </div>
    //     `,
    //     'adjustments': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showBrightnessContrastModal()">Яркость/Контраст</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showColorBalanceModal()">Цвет</button>
    //             </div>
    //             <span class="ribbon-group-title">Регулировка</span>
    //         </div>
    //     `,
    //     'shapes': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="setTool('line')">Линия</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="setTool('rect')">Прямоуг.</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="setTool('ellipse')">Эллипс</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="setTool('triangle')">Треуг.</button>
    //             </div>
    //             <span class="ribbon-group-title">Фигуры</span>
    //         </div>
    //     `,
    //     'tools': `
    //         <div class="ribbon-group">
    //             <div class="ribbon-buttons">
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showCodeLabModal()">
    //                     <svg class="icon"><use href="#icon-code"></use></svg> Скрипты
    //                 </button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showSRTIModal()">СРТИ</button>
    //                 <button class="ribbon-btn ribbon-tab-btn" onclick="showFXMModal()">ФХМ</button>
    //             </div>
    //             <span class="ribbon-group-title">Инструменты</span>
    //         </div>
    //     `
    // };
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Убираем активный класс со всех кнопок и панелей
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Добавляем активный класс текущей кнопке и панели
            this.classList.add('active');
            const targetPane = document.getElementById('tab-' + tabId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
            
            // Обновляем контент ribbon-панели
            const ribbonDynamicContent = document.getElementById('ribbonDynamicContent');
            if (ribbonDynamicContent && ribbonContent[tabId]) {
                ribbonDynamicContent.innerHTML = ribbonContent[tabId];
            }
            
            // Обновляем поле с файлом в tabs-container
            updateTabsFileField();
        });
    });
    
    // Инициализация при загрузке
    updateTabsFileField();
});

// Функция обновления поля с файлом
function updateTabsFileField() {
    const tabsFileField = document.getElementById('tabsFileField');
    const tabsFileName = document.getElementById('tabsFileName');
    const currentFileLabel = document.getElementById('currentFileLabel');
    
    if (tabsFileField && tabsFileName && currentFileLabel) {
        // Показываем поле с файлом во всех вкладках
        tabsFileField.style.display = 'flex';
        
        // Получаем имя текущего файла из ribbon
        if (currentFileLabel.style.display !== 'none') {
            tabsFileName.textContent = currentFileLabel.textContent;
        } else {
            tabsFileName.textContent = 'Безымянный';
        }
    }
}
