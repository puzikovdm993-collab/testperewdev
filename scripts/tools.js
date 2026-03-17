// tools.js – только лассо, профиль и перемещение выделения
// ============ Управление инструментами ============

// Глобальная ссылка на div графика
const plotlyDiv = document.getElementById('graphCanvas');

// Переменные для перемещения выделения
let isMoving = false;
let moveStartX = 0, moveStartY = 0;
let moveOffsetX = 0, moveOffsetY = 0;
let moveSelectionCanvas = null;
let moveMaskData = null;
let moveBBox = { minX:0, minY:0, maxX:0, maxY:0, width:0, height:0 };

// Обновление информации об инструменте в статус-баре
function updateToolInfo() {
    const toolNames = {
        lasso: 'Лассо',
        profile: 'Профиль',
        move: 'Перемещение выделения'
    };
    const toolInfoElement = document.getElementById('toolInfo');
    if (toolInfoElement) {
        toolInfoElement.textContent = `Инструмент: ${toolNames[currentTool] || currentTool}`;
    }
}

// Установка курсора для canvas
function setCanvasCursor() {
    const file = getActiveFile();
    if (!file) return;
    const cursor = currentTool === 'move' ? 'move' : 'crosshair';
    file.canvas.style.cursor = cursor;
}

// Установка активного инструмента
function setTool(tool) {
    currentTool = tool;

    // Показываем график только для профиля
    if (tool !== 'profile') {
        document.getElementById('graphModal').classList.add('active');
    }

    // Обновление UI кнопок
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
    if (toolBtn) toolBtn.classList.add('active');
    updateToolInfo();
    setCanvasCursor();

    // Сброс лассо при переключении с него
    if (tool !== 'lasso') {
        lassoPoints = [];
        isLassoClosed = false;
    }

    // Подсказка для лассо
    if (tool === 'lasso') {
        const toolInfoElement = document.getElementById('toolInfo');
        if (toolInfoElement) {
            toolInfoElement.textContent = 'Инструмент: Лассо (Клик для начала, двойной клик для завершения)';
        }
    }

    // Если переключились с move во время перемещения – отменяем
    if (tool !== 'move' && isMoving) {
        isMoving = false;
        moveSelectionCanvas = null;
        redrawFromHistory();
        const file = getActiveFile();
        if (file) drawSelectionOverlay(file);
    }

    // Убираем нарисованный профиль при переключении с профиля
    if (tool !== 'profile') {
        const file = getActiveFile();
        if (file) {
            redrawFromHistory();
        }
        currentProfile = null;
        dragMode = 'none';
    }
}

// ============ Управление цветами ============

// Инициализация цветовой панели (Color Bar)
function initColorBar() {
    const gradient = document.getElementById('colorBarGradient');
    const picker = document.getElementById('colorBarPicker');
    
    if (!gradient || !picker) return;
    
    // Обработка клика по градиенту - открытие пикера
    gradient.addEventListener('click', () => {
        currentColorTarget = 'primary';
        picker.value = primaryColor;
        picker.click();
    });
    
    // Обработка изменения цвета в пикере
    picker.addEventListener('input', (e) => {
        setPrimaryColor(e.target.value);
    });
    
    // Обработка движения мыши по градиенту для выбора цвета
    let isDragging = false;
    
    gradient.addEventListener('mousedown', (e) => {
        isDragging = true;
        selectColorFromGradient(e, gradient);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = gradient.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            selectColorFromGradient(e, gradient);
        }
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Выбор цвета из градиента на основе позиции Y
function selectColorFromGradient(e, gradient) {
    const rect = gradient.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const ratio = 1 - (y / height); // Инвертируем, т.к. градиент сверху вниз
    
    // Создаём временный canvas для получения цвета из градиента
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Воспроизводим тот же градиент
    const grad = tempCtx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#ff0000');
    grad.addColorStop(0.17, '#ffff00');
    grad.addColorStop(0.33, '#00ff00');
    grad.addColorStop(0.5, '#00ffff');
    grad.addColorStop(0.67, '#0000ff');
    grad.addColorStop(0.83, '#ff00ff');
    grad.addColorStop(1, '#ff0000');
    
    tempCtx.fillStyle = grad;
    tempCtx.fillRect(0, 0, 1, height);
    
    // Получаем цвет в нужной позиции
    const imageData = tempCtx.getImageData(0, y, 1, 1).data;
    const color = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
    
    // Конвертируем в hex
    const hex = rgbToHex(imageData[0], imageData[1], imageData[2]);
    setPrimaryColor(hex);
    
    // Обновляем позицию маркера
    const marker = gradient.querySelector('.color-bar-marker');
    if (marker) {
        marker.style.top = `${y - 2}px`;
    }
}

// Конвертация RGB в HEX
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function setPrimaryColor(color) {
    primaryColor = color;
    const primaryColorElement = document.getElementById('primaryColor');
    if (primaryColorElement) {
        primaryColorElement.style.backgroundColor = color;
    }
}

function setSecondaryColor(color) {
    secondaryColor = color;
    const secondaryColorElement = document.getElementById('secondaryColor');
    if (secondaryColorElement) {
        secondaryColorElement.style.backgroundColor = color;
    }
}

let currentColorTarget = 'primary';
function openColorPicker(target) {
    currentColorTarget = target;
    if (dom.colorPicker) {
        dom.colorPicker.value = target === 'primary' ? primaryColor : secondaryColor;
        dom.colorPicker.click();
    }
}

if (dom.colorPicker) {
    dom.colorPicker.addEventListener('input', (e) => {
        if (currentColorTarget === 'primary') setPrimaryColor(e.target.value);
        else setSecondaryColor(e.target.value);
    });
}

function initPalette() {
    const colors = [
        '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8',
        '#3f48cc', '#a349a4', '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0',
        '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7', '#f0e68c', '#dda0dd', '#98fb98', '#afeeee'
    ];

    const paletteContainer = document.getElementById('paletteColors');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = '';

    colors.forEach(color => {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'palette-color';
        colorDiv.style.backgroundColor = color;
        colorDiv.addEventListener('click', () => setPrimaryColor(color));
        colorDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            setSecondaryColor(color);
        });
        paletteContainer.appendChild(colorDiv);
    });
}

// ============ Рисование (только профиль) ============
function drawShape(shape, x1, y1, x2, y2, color) {
    if (shape !== 'profile') return; // другие фигуры не поддерживаются

    const file = getActiveFile();
    if (!file) return;
    const ctx = file.ctx;

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    updateGraph(x1, y1, x2, y2);
}

// Алгоритм Брезенхема для профиля
function bresenham(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0, y = y0;
    while (true) {
        points.push({x: Math.round(x), y: Math.round(y)});
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 <  dx) { err += dx; y += sy; }
    }
    return points;
}

// Отсечение отрезка (Коэн‑Сазерленд)
function clipLine(x0, y0, x1, y1, minX, minY, maxX, maxY) {
    const INSIDE = 0; const LEFT = 1; const RIGHT = 2; const BOTTOM = 4; const TOP = 8;

    function computeOutCode(x, y) {
        let code = INSIDE;
        if (x < minX) code |= LEFT;
        else if (x > maxX) code |= RIGHT;
        if (y < minY) code |= BOTTOM;
        else if (y > maxY) code |= TOP;
        return code;
    }

    let code0 = computeOutCode(x0, y0);
    let code1 = computeOutCode(x1, y1);
    let accept = false;

    while (true) {
        if (!(code0 | code1)) {
            accept = true;
            break;
        } else if (code0 & code1) {
            break;
        } else {
            let codeOut = code0 ? code0 : code1;
            let x, y;

            if (codeOut & TOP) {
                x = x0 + (x1 - x0) * (maxY - y0) / (y1 - y0);
                y = maxY;
            } else if (codeOut & BOTTOM) {
                x = x0 + (x1 - x0) * (minY - y0) / (y1 - y0);
                y = minY;
            } else if (codeOut & RIGHT) {
                y = y0 + (y1 - y0) * (maxX - x0) / (x1 - x0);
                x = maxX;
            } else if (codeOut & LEFT) {
                y = y0 + (y1 - y0) * (minX - x0) / (x1 - x0);
                x = minX;
            }

            if (codeOut == code0) {
                x0 = x; y0 = y;
                code0 = computeOutCode(x0, y0);
            } else {
                x1 = x; y1 = y;
                code1 = computeOutCode(x1, y1);
            }
        }
    }

    if (accept) {
        return { x0, y0, x1, y1 };
    } else {
        return null;
    }
}

// Обновление графика профиля
function updateGraph(x1, y1, x2, y2) {
    const file = getActiveFile();
    if (!file) return;

    const minX = 0, minY = 0, maxX = file.width - 1, maxY = file.height - 1;
    const clipped = clipLine(x1, y1, x2, y2, minX, minY, maxX, maxY);
    if (!clipped) return;

    const pts = bresenham(
        Math.round(clipped.x0), Math.round(clipped.y0),
        Math.round(clipped.x1), Math.round(clipped.y1)
    );
    if (pts.length < 2) return;

    const reds = pts.map(p => file.matrix[p.y][p.x]);
    const minVal = Math.min(...reds);
    const maxVal = Math.max(...reds);
    const padding = (maxVal - minVal) * 0.08 || 10;
    const yMin = Math.max(0, Math.floor(minVal - padding));
    const yMax = Math.min(255, Math.ceil(maxVal + padding));

    Plotly.update(plotlyDiv, {
        x: [Array.from({ length: reds.length }, (_, i) => i)],
        y: [reds]
    }, {
        'yaxis.range': [yMin, yMax]
    }, [0]);
}

// ============ Лассо (только контур без заливки при рисовании) ============
const LASSO_COLOR = '#0078d7';
const LASSO_FILL_OPACITY = 0.15; // для готового выделения

function drawLasso(points, currentX, currentY) {
    const file = getActiveFile();
    if (!file || points.length === 0) return;
    const ctx = file.ctx;

    ctx.strokeStyle = LASSO_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawLassoSelection(points) {
    const file = getActiveFile();
    if (!file || points.length < 2) return;
    const ctx = file.ctx;

    ctx.strokeStyle = LASSO_COLOR;
    ctx.fillStyle = `rgba(0, 120, 215, ${LASSO_FILL_OPACITY})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

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

// ============ Работа с маской выделения ============

function ensureSelectionMask(file) {
    if (!file.selectionMask) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = file.width;
        maskCanvas.height = file.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, file.width, file.height);
        file.selectionMask = maskCtx.getImageData(0, 0, file.width, file.height);
    }
    return file.selectionMask;
}

function rasterizeLasso(points, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    return ctx.getImageData(0, 0, width, height);
}

function masksIntersect(mask1, mask2) {
    const data1 = mask1.data;
    const data2 = mask2.data;
    for (let i = 0; i < data1.length; i += 4) {
        if (data1[i] > 0 && data2[i] > 0) return true;
    }
    return false;
}

function mergeMasks(mask1, mask2) {
    const data1 = mask1.data;
    const data2 = mask2.data;
    for (let i = 0; i < data1.length; i += 4) {
        if (data2[i] > 0) {
            data1[i] = data1[i+1] = data1[i+2] = 255;
            data1[i+3] = 255;
        }
    }
}

function completeLasso() {
    const file = getActiveFile();
    if (!file || lassoPoints.length < 3) return;

    const newMask = rasterizeLasso(lassoPoints, file.width, file.height);
    const currentMask = ensureSelectionMask(file);

    let hasSelection = false;
    const curData = currentMask.data;
    for (let i = 0; i < curData.length; i += 4) {
        if (curData[i] > 0) {
            hasSelection = true;
            break;
        }
    }

    if (hasSelection) {
        if (masksIntersect(currentMask, newMask)) {
            mergeMasks(currentMask, newMask);
        } else {
            currentMask.data.set(newMask.data);
        }
    } else {
        currentMask.data.set(newMask.data);
    }

    lassoPoints = [];
    isLassoClosed = true;

    redrawFromHistory();
    drawSelectionOverlay(file);
}

function drawSelectionOverlay(file) {
    if (!file || !file.selectionMask) return;

    const ctx = file.ctx;
    const mask = file.selectionMask;

    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = file.width;
    overlayCanvas.height = file.height;
    const overlayCtx = overlayCanvas.getContext('2d');
    overlayCtx.putImageData(mask, 0, 0);
    overlayCtx.globalCompositeOperation = 'source-in';
    overlayCtx.fillStyle = `rgba(0, 120, 215, ${LASSO_FILL_OPACITY})`;
    overlayCtx.fillRect(0, 0, file.width, file.height);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(overlayCanvas, 0, 0);
    ctx.restore();
}

function lassoFill() {
    const file = getActiveFile();
    if (!file || !file.selectionMask) return;

    const mask = file.selectionMask;
    const ctx = file.ctx;
    const imageData = ctx.getImageData(0, 0, file.width, file.height);
    const data = imageData.data;
    const maskData = mask.data;
    const fillColor = hexToRgb(primaryColor);

    for (let i = 0; i < data.length; i += 4) {
        if (maskData[i] > 0) {
            data[i] = fillColor.r;
            data[i+1] = fillColor.g;
            data[i+2] = fillColor.b;
            data[i+3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    saveState();
    clearSelection(file);
}

function lassoDelete() {
    const file = getActiveFile();
    if (!file || !file.selectionMask) return;

    const mask = file.selectionMask;
    const ctx = file.ctx;
    const imageData = ctx.getImageData(0, 0, file.width, file.height);
    const data = imageData.data;
    const maskData = mask.data;

    for (let i = 0; i < data.length; i += 4) {
        if (maskData[i] > 0) {
            data[i] = 0;
            data[i+1] = 0;
            data[i+2] = 0;
            data[i+3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    saveState();
    clearSelection(file);
}

function clearSelection(file) {
    if (!file || !file.selectionMask) return;
    const mask = file.selectionMask;
    const maskData = mask.data;
    for (let i = 0; i < maskData.length; i++) {
        maskData[i] = 0;
    }
    redrawFromHistory();
}

// ============ Перемещение выделения ============

function startMove(e) {
    const file = getActiveFile();
    if (!file || !file.selectionMask) return false;

    const rect = file.canvas.getBoundingClientRect();
    const scaleX = file.canvas.width / rect.width;
    const scaleY = file.canvas.height / rect.height;
    const mouseX = Math.floor((e.clientX - rect.left) * scaleX);
    const mouseY = Math.floor((e.clientY - rect.top) * scaleY);

    const mask = file.selectionMask;
    const idx = (mouseY * file.width + mouseX) * 4;
    if (mask.data[idx] === 0) return false;

    // Вычисляем bounding box выделения
    let minX = file.width, minY = file.height, maxX = 0, maxY = 0;
    const maskData = mask.data;
    for (let y = 0; y < file.height; y++) {
        for (let x = 0; x < file.width; x++) {
            if (maskData[(y * file.width + x) * 4] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (minX > maxX) return false;

    moveBBox = {
        minX, minY,
        maxX, maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
    };

    // Создаём временный canvas с вырезанным выделением
    const cutCanvas = document.createElement('canvas');
    cutCanvas.width = moveBBox.width;
    cutCanvas.height = moveBBox.height;
    const cutCtx = cutCanvas.getContext('2d');

    const imageData = file.ctx.getImageData(minX, minY, moveBBox.width, moveBBox.height);
    const imgData = imageData.data;

    for (let y = 0; y < moveBBox.height; y++) {
        for (let x = 0; x < moveBBox.width; x++) {
            const globalX = minX + x;
            const globalY = minY + y;
            const maskIdx = (globalY * file.width + globalX) * 4;
            if (maskData[maskIdx] === 0) {
                const imgIdx = (y * moveBBox.width + x) * 4;
                imgData[imgIdx + 3] = 0;
            }
        }
    }

    cutCtx.putImageData(imageData, 0, 0);
    moveSelectionCanvas = cutCanvas;
    moveMaskData = new Uint8ClampedArray(maskData);

    moveOffsetX = mouseX - minX;
    moveOffsetY = mouseY - minY;

    isMoving = true;
    moveStartX = mouseX;
    moveStartY = mouseY;

    return true;
}

function updateMove(e) {
    if (!isMoving) return;

    const file = getActiveFile();
    if (!file) return;

    const rect = file.canvas.getBoundingClientRect();
    const scaleX = file.canvas.width / rect.width;
    const scaleY = file.canvas.height / rect.height;
    const mouseX = Math.floor((e.clientX - rect.left) * scaleX);
    const mouseY = Math.floor((e.clientY - rect.top) * scaleY);

    let newX = mouseX - moveOffsetX;
    let newY = mouseY - moveOffsetY;
    newX = Math.max(0, Math.min(newX, file.width - moveBBox.width));
    newY = Math.max(0, Math.min(newY, file.height - moveBBox.height));

    redrawFromHistory();

    const ctx = file.ctx;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.drawImage(moveSelectionCanvas, newX, newY);
    ctx.restore();
}

function finishMove(e) {
    if (!isMoving) return;

    const file = getActiveFile();
    if (!file || !moveSelectionCanvas) {
        isMoving = false;
        return;
    }

    const rect = file.canvas.getBoundingClientRect();
    const scaleX = file.canvas.width / rect.width;
    const scaleY = file.canvas.height / rect.height;
    const mouseX = Math.floor((e.clientX - rect.left) * scaleX);
    const mouseY = Math.floor((e.clientY - rect.top) * scaleY);

    let newX = mouseX - moveOffsetX;
    let newY = mouseY - moveOffsetY;
    newX = Math.max(0, Math.min(newX, file.width - moveBBox.width));
    newY = Math.max(0, Math.min(newY, file.height - moveBBox.height));

    if (newX === moveBBox.minX && newY === moveBBox.minY) {
        isMoving = false;
        redrawFromHistory();
        drawSelectionOverlay(file);
        return;
    }

    const ctx = file.ctx;
    const imageData = ctx.getImageData(0, 0, file.width, file.height);
    const data = imageData.data;
    const maskData = file.selectionMask.data;
    const bgColor = hexToRgb(secondaryColor);

    // Затираем старую область
    for (let y = moveBBox.minY; y <= moveBBox.maxY; y++) {
        for (let x = moveBBox.minX; x <= moveBBox.maxX; x++) {
            const maskIdx = (y * file.width + x) * 4;
            if (maskData[maskIdx] > 0) {
                const idx = (y * file.width + x) * 4;
                data[idx] = bgColor.r;
                data[idx+1] = bgColor.g;
                data[idx+2] = bgColor.b;
                data[idx+3] = 255;
            }
        }
    }

    // Рисуем вырезанное содержимое в новом месте
    const cutCtx = moveSelectionCanvas.getContext('2d');
    const cutImageData = cutCtx.getImageData(0, 0, moveSelectionCanvas.width, moveSelectionCanvas.height);
    const cutData = cutImageData.data;

    for (let y = 0; y < moveSelectionCanvas.height; y++) {
        for (let x = 0; x < moveSelectionCanvas.width; x++) {
            const cutIdx = (y * moveSelectionCanvas.width + x) * 4;
            if (cutData[cutIdx+3] > 0) {
                const globalX = newX + x;
                const globalY = newY + y;
                if (globalX >= 0 && globalX < file.width && globalY >= 0 && globalY < file.height) {
                    const idx = (globalY * file.width + globalX) * 4;
                    data[idx] = cutData[cutIdx];
                    data[idx+1] = cutData[cutIdx+1];
                    data[idx+2] = cutData[cutIdx+2];
                    data[idx+3] = 255;
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Обновляем маску выделения
    const newMask = new Uint8ClampedArray(file.width * file.height * 4);
    for (let y = 0; y < moveSelectionCanvas.height; y++) {
        for (let x = 0; x < moveSelectionCanvas.width; x++) {
            const cutIdx = (y * moveSelectionCanvas.width + x) * 4;
            if (cutData[cutIdx+3] > 0) {
                const globalX = newX + x;
                const globalY = newY + y;
                if (globalX >= 0 && globalX < file.width && globalY >= 0 && globalY < file.height) {
                    const maskIdx = (globalY * file.width + globalX) * 4;
                    newMask[maskIdx] = 255;
                    newMask[maskIdx+1] = 255;
                    newMask[maskIdx+2] = 255;
                    newMask[maskIdx+3] = 255;
                }
            }
        }
    }
    file.selectionMask.data.set(newMask);

    saveState();

    isMoving = false;
    moveSelectionCanvas = null;
    moveMaskData = null;

    redrawFromHistory();
    drawSelectionOverlay(file);
}

// ============ Заливка (flood fill) ============
function floodFill(x, y, fillColor) {
    const file = getActiveFile();
    if (!file) return;

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

function getPixelColor(data, width, x, y) {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

function setPixelColor(data, width, x, y, color) {
    const i = (y * width + x) * 4;
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = 255;
}

function colorsMatch(c1, c2) {
    return Math.abs(c1.r - c2.r) < 5 && Math.abs(c1.g - c2.g) < 5 && Math.abs(c1.b - c2.b) < 5;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// ============ Инициализация графика ============
if (plotlyDiv) {
    Plotly.newPlot(plotlyDiv, [{
        x: [], y: [],
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgb(220, 60, 80)', width: 2.2 }
    }], {
        title: { text: '', font: { size: 14 } },
        xaxis: { title: 'Пиксель вдоль линии' },
        yaxis: { 
            title: 'Интенсивность (R)',
            range: [0, 255],
            autorange: false
        },
        margin: { t: 30, l: 50, r: 35, b: 50 },
        showlegend: false,
        autosize: true
    }, { responsive: true, displayModeBar: false });
}


console.log('✅ tools.js загружен (лассо, профиль, перемещение)');