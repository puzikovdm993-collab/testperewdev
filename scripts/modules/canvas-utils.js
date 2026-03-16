// canvas-utils.js - Утилиты для работы с Canvas и отрисовки

/**
 * Рисование линии алгоритмом Брезенхема
 */
export function bresenham(x0, y0, x1, y1) {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        points.push({ x: x0, y: y0 });
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }

    return points;
}

/**
 * Отсечение линии по алгоритму Лианга-Барски
 */
export function clipLine(x0, y0, x1, y1, minX, minY, maxX, maxY) {
    let t0 = 0, t1 = 1;
    const dx = x1 - x0;
    const dy = y1 - y0;

    const clipEdge = (p, q) => {
        if (p === 0) return q >= 0;
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
        return t0 <= t1;
    };

    if (!clipEdge(-dx, x0 - minX)) return null;
    if (!clipEdge(dx, maxX - x0)) return null;
    if (!clipEdge(-dy, y0 - minY)) return null;
    if (!clipEdge(dy, maxY - y0)) return null;

    return {
        x0: x0 + t0 * dx,
        y0: y0 + t0 * dy,
        x1: x0 + t1 * dx,
        y1: y0 + t1 * dy
    };
}

/**
 * Рисование звезды
 */
export function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);

    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerR;
        y = cy + Math.sin(rot) * outerR;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerR;
        y = cy + Math.sin(rot) * innerR;
        ctx.lineTo(x, y);
        rot += step;
    }

    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
}

/**
 * Рисование лассо
 */
export function drawLasso(ctx, points, currentX, currentY, color = '#0078d7') {
    if (points.length === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }

    // Линия к текущей позиции курсора
    if (currentX !== undefined && currentY !== undefined) {
        ctx.lineTo(currentX, currentY);
    }

    ctx.stroke();
    ctx.setLineDash([]);
}

/**
 * Рисование выделения лассо
 */
export function drawLassoSelection(ctx, points, width, height, color = '#0078d7', fillOpacity = 0.15) {
    if (points.length === 0) return;

    // Создаем маску выделения
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');

    maskCtx.beginPath();
    maskCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        maskCtx.lineTo(points[i].x, points[i].y);
    }
    maskCtx.closePath();
    maskCtx.fillStyle = 'white';
    maskCtx.fill();

    // Рисуем обводку
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
}

/**
 * Растеризация полигона лассо в маску
 */
export function rasterizeLasso(points, width, height) {
    const mask = new Array(height).fill(0).map(() => new Array(width).fill(false));
    
    if (points.length < 3) return mask;

    // Находим bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }

    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(width - 1, Math.ceil(maxX));
    maxY = Math.min(height - 1, Math.ceil(maxY));

    // Ray casting algorithm
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            let inside = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const xi = points[i].x, yi = points[i].y;
                const xj = points[j].x, yj = points[j].y;
                
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            mask[y][x] = inside;
        }
    }

    return mask;
}

/**
 * Преобразование HEX цвета в RGB
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

/**
 * Проверка совпадения цветов
 */
export function colorsMatch(c1, c2, tolerance = 0) {
    return Math.abs(c1.r - c2.r) <= tolerance &&
           Math.abs(c1.g - c2.g) <= tolerance &&
           Math.abs(c1.b - c2.b) <= tolerance;
}

/**
 * Получение цвета пикселя из ImageData
 */
export function getPixelColor(data, width, x, y) {
    const idx = (y * width + x) * 4;
    return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
    };
}

/**
 * Установка цвета пикселя в ImageData
 */
export function setPixelColor(data, width, x, y, color) {
    const idx = (y * width + x) * 4;
    data[idx] = color.r;
    data[idx + 1] = color.g;
    data[idx + 2] = color.b;
    data[idx + 3] = color.a !== undefined ? color.a : 255;
}

/**
 * Алгоритм заливки (Flood Fill)
 */
export function floodFill(imageData, width, height, startX, startY, fillColor, tolerance = 0) {
    const data = imageData.data;
    const startColor = getPixelColor(data, width, startX, startY);
    
    if (colorsMatch(startColor, fillColor, tolerance)) return imageData;

    const stack = [[startX, startY]];
    
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const currentColor = getPixelColor(data, width, x, y);
        
        if (!colorsMatch(currentColor, startColor, tolerance)) continue;
        
        setPixelColor(data, width, x, y, fillColor);
        
        if (x > 0) stack.push([x - 1, y]);
        if (x < width - 1) stack.push([x + 1, y]);
        if (y > 0) stack.push([x, y - 1]);
        if (y < height - 1) stack.push([x, y + 1]);
    }
    
    return imageData;
}
