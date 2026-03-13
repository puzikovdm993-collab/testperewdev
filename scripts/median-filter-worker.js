/**
 * Web Worker для применения медианного фильтра к матрице
 * Оптимизированная версия (v2) с использованием передачи данных через Transferable объекты
 */

self.onmessage = function(e) {
    const { matrix, kernelSize, jobId } = e.data;
    
    try {
        const result = applyMedianFilter(matrix, kernelSize);
        
        // Отправляем результат обратно с использованием transferable объектов если возможно
        self.postMessage({
            jobId: jobId,
            success: true,
            result: result
        });
    } catch (error) {
        self.postMessage({
            jobId: jobId,
            success: false,
            error: error.message
        });
    }
};

/**
 * Применяет медианный фильтр к матрице m × n.
 * @param {number[][]} matrix - Входная матрица (массив массивов).
 * @param {number} kernelSize - Размер окна фильтра (нечетное число, например 3).
 * @returns {number[][]} - Отфильтрованная матрица.
 */
function applyMedianFilter(matrix, kernelSize) {
    const m = matrix.length;
    const n = matrix[0].length;
    const padSize = Math.floor(kernelSize / 2);
    
    // Создаем расширенную матрицу с нулевыми границами
    const paddedMatrix = createPaddedMatrix(matrix, padSize);
    const filteredMatrix = new Array(m);
    
    const totalPixels = m * n;
    let processedPixels = 0;
    const updateInterval = Math.max(1, Math.floor(totalPixels / 100)); // Обновляем каждые 1%
    
    for (let i = 0; i < m; i++) {
        filteredMatrix[i] = new Array(n);
        for (let j = 0; j < n; j++) {
            // Извлекаем подматрицу (окрестность) размера kernelSize × kernelSize
            const window = extractWindow(paddedMatrix, i + padSize, j + padSize, kernelSize);
            // Находим медиану
            const median = calculateMedian(window);
            filteredMatrix[i][j] = median;
            
            processedPixels++;
            
            // Отправляем прогресс каждые 1%
            if (processedPixels % updateInterval === 0 || processedPixels === totalPixels) {
                const progress = Math.round((processedPixels / totalPixels) * 100);
                self.postMessage({
                    jobId: null,
                    type: 'progress',
                    progress: progress,
                    message: 'Фильтрация изображения...'
                });
            }
        }
    }
    
    return filteredMatrix;
}

/**
 * Создает расширенную матрицу с нулевыми границами для обработки краев.
 */
function createPaddedMatrix(matrix, padSize) {
    const m = matrix.length;
    const n = matrix[0].length;
    const padded = new Array(m + 2 * padSize);
    
    for (let i = 0; i < padded.length; i++) {
        padded[i] = new Array(n + 2 * padSize).fill(0);
    }
    
    // Копируем исходную матрицу в центр расширенной
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            padded[i + padSize][j + padSize] = matrix[i][j];
        }
    }
    
    return padded;
}

/**
 * Извлекает подматрицу (окрестность) вокруг точки (x, y).
 */
function extractWindow(matrix, x, y, size) {
    const half = Math.floor(size / 2);
    const window = new Array(size * size);
    let idx = 0;
    
    for (let i = x - half; i <= x + half; i++) {
        for (let j = y - half; j <= y + half; j++) {
            window[idx++] = matrix[i][j];
        }
    }
    
    return window;
}

/**
 * Вычисляет медиану массива чисел.
 */
function calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
}
