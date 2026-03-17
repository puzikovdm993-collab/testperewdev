// math-utils.js - Математические утилиты для обработки изображений

/**
 * Вычисление коэффициентов полинома методом наименьших квадратов
 */
export function computePolynomialCoefficients(matrix, width, height, order, allArea, 
    countSelectedPixels, buildSystemMatrix, solveGaussianElimination, getPolynomialTerms) {
    
    // 1. Подсчет точек и коэффициентов
    // N — общее число точек
    // K — число коэффициентов полинома
    const N = allArea ? width * height : countSelectedPixels(matrix, width, height);
    const K = calculatePolynomialTerms(order);
    
    if (N <= 2 * K) {
        console.warn("Insufficient data points for polynomial fit (N <= 2*K)");
        return { coefficients: null, success: false };
    }

    // 2. Инициализация матрицы сумм (K×K) и вектора b (K элементов)
    const sums = Array(K + 1).fill(0).map(() => Array(K + 1).fill(0));
    const b = Array(K + 1).fill(0);

    // 3. Заполнение матрицы и вектора через метод _buildSystemMatrix
    buildSystemMatrix(matrix, width, height, order, allArea, sums, b, getPolynomialTerms, countSelectedPixels);
    
    // 4. Решение системы линейных уравнений методом Гаусса
    const coefficients = solveGaussianElimination(sums, b);
    
    return { coefficients, success: true };
}

/**
 * Расчет количества членов полинома для заданного порядка
 */
export function calculatePolynomialTerms(order) {
    // Формула для количества членов: (order+1)(order+2)/2 - 1
    return (order + 1) * (order + 2) / 2 - 1;
}

/**
 * Генерация списка членов полинома для заданного порядка
 */
export function getPolynomialTerms(order) {
    const terms = [];
    let count = 0;
    
    for (let m = 0; m <= order; m++) {
        for (let n = 0; n <= m; n++) {
            terms.push({ m: m, n: n });
            count++;
        }
    }
    
    return terms;
}

/**
 * Вычисление вектора A для конкретной точки (x, y)
 */
export function calculatePolynomialTermsVector(x, y, order, getPolynomialTermsFn) {
    const terms = getPolynomialTermsFn(order);
    const A = [1.0]; // Первый член - константа
    
    for (let i = 1; i < terms.length; i++) {
        const term = terms[i];
        const xTerm = Math.pow(x, term.m - term.n);
        const yTerm = Math.pow(y, term.n);
        A.push(xTerm * yTerm);
    }
    
    return A;
}

/**
 * Построение матрицы сумм и вектора b
 */
export function buildSystemMatrix(matrix, width, height, order, allArea, sums, b, 
    getPolynomialTermsFn, countSelectedPixelsFn, isPixelSelectedFn) {
    const terms = getPolynomialTermsFn(order);
    const N = allArea ? width * height : countSelectedPixelsFn(matrix, width, height);
    
    // Обходим все пиксели
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const value = matrix[y][x];
            
            // Пропуск точек вне выделенной области (если нужно)
            if (!allArea && !isPixelSelectedFn(x, y)) {
                continue;
            }
            
            // Вычисляем вектор A для текущей точки
            const A = calculatePolynomialTermsVector(x, y, order, getPolynomialTermsFn);
            
            // Обновляем матрицу сумм
            for (let i = 0; i < A.length; i++) {
                for (let j = 0; j < A.length; j++) {
                    sums[i][j] += A[i] * A[j];
                }
            }
            
            // Обновляем вектор b
            for (let i = 0; i < A.length; i++) {
                b[i] += A[i] * value;
            }
        }
    }
}

/**
 * Проверка, находится ли пиксель в выделенной области (заглушка)
 */
export function isPixelSelected(x, y) {
    // В реальном приложении здесь должна быть логика работы с выделением
    return true;
}

/**
 * Подсчет количества точек в выделенной области (заглушка)
 */
export function countSelectedPixels(matrix, width, height) {
    // В реальном приложении здесь должна быть логика работы с выделением
    // Пока считаем все пиксели
    return width * height;
}

/**
 * Метод Гаусса для решения системы уравнений
 */
export function solveGaussianElimination(sums, b) {
    const K = sums.length - 1;
    const a = Array(K + 1).fill(0);
    
    // Прямой ход (элиминация)
    for (let k = 0; k < K; k++) {
        // Поиск ведущего элемента (для устойчивости)
        let maxRow = k;
        for (let i = k + 1; i < K; i++) {
            if (Math.abs(sums[i][k]) > Math.abs(sums[maxRow][k])) {
                maxRow = i;
            }
        }
        
        // Проверка на сингулярность
        if (sums[maxRow][k] === 0) {
            console.error("Singular matrix - cannot solve system");
            return null;
        }
        
        // Перестановка строк
        if (maxRow !== k) {
            for (let j = k; j <= K; j++) {
                [sums[k][j], sums[maxRow][j]] = [sums[maxRow][j], sums[k][j]];
            }
            [b[k], b[maxRow]] = [b[maxRow], b[k]];
        }
        
        // Нормализация строки
        const factor = sums[k][k];
        for (let j = k; j <= K; j++) {
            sums[k][j] /= factor;
        }
        b[k] /= factor;
        
        // Исключение переменных
        for (let i = k + 1; i < K; i++) {
            const factor = sums[i][k];
            for (let j = k; j <= K; j++) {
                sums[i][j] -= factor * sums[k][j];
            }
            b[i] -= factor * b[k];
        }
    }
    
    // Обратный ход
    for (let i = K - 1; i >= 0; i--) {
        a[i] = b[i];
        for (let j = i + 1; j < K; j++) {
            a[i] -= sums[i][j] * a[j];
        }
        a[i] /= sums[i][i];
    }
    
    return a;
}

/**
 * Применяет медианный фильтр к матрице m × n.
 */
export async function medianFilter(matrix, kernelSize, createPaddedMatrix, extractWindow, calculateMedian, updateProgress) {
    const m = matrix.length;
    const n = matrix[0].length;
    const padSize = Math.floor(kernelSize / 2);
    
    updateProgress(30, 'Создание расширенной матрицы...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const paddedMatrix = createPaddedMatrix(matrix, padSize);
    const filteredMatrix = [];

    const totalPixels = m * n;
    let processedPixels = 0;
    const updateInterval = Math.max(1, Math.floor(totalPixels / 100));

    for (let i = 0; i < m; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            // Извлекаем подматрицу (окрестность) размера kernelSize × kernelSize
            const window = extractWindow(paddedMatrix, i + padSize, j + padSize, kernelSize);
            // Находим медиану
            const median = calculateMedian(window);
            row.push(median);
            
            processedPixels++;
            
            // Обновляем прогресс каждые 1% или в конце
            if (processedPixels % updateInterval === 0 || processedPixels === totalPixels) {
                const progress = Math.round(40 + (processedPixels / totalPixels) * 50);
                updateProgress(progress, 'Фильтрация изображения...');
                // Небольшая пауза для отрисовки прогресс-бара
                if (processedPixels % (updateInterval * 5) === 0 || processedPixels === totalPixels) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
        }
        filteredMatrix.push(row);
    }

    return filteredMatrix;
}

/**
 * Создает расширенную матрицу с нулевыми границами для обработки краев.
 */
export function createPaddedMatrix(matrix, padSize) {
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
export function extractWindow(matrix, x, y, size) {
    const half = Math.floor(size / 2);
    const window = [];

    for (let i = x - half; i <= x + half; i++) {
        for (let j = y - half; j <= y + half; j++) {
            window.push(matrix[i][j]);
        }
    }

    return window;
}

/**
 * Вычисляет медиану массива чисел.
 */
export function calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Получает цветовую карту по имени
 */
export function getColormap(name) {
    const colormaps = {
        'hot': (t) => ({
            r: t < 0.5 ? 0 : 2 * t,
            g: t < 0.25 ? 0 : t < 0.75 ? 2 * t - 0.5 : 1,
            b: t < 0.75 ? 0 : 2 * t - 1
        }),
        'jet': (t) => {
            const h = 240 * (1 - t);
            const hslToRgb = (h) => {
                const hue = h / 360;
                const i = Math.floor(hue * 6);
                const f = hue * 6 - i;
                
                const red = [1, f, 1 - f, 0, 0, 0][i % 6];
                const green = [1 - f, 1, 1, 1 - f, 1 - f, 1 - f][i % 6];
                const blue = [0, 0, 0, 0, 1 - f, 1][i % 6];
                
                return { r: red, g: green, b: blue };
            };
            return hslToRgb(h);
        },
        'gray': (t) => ({ r: t, g: t, b: t }),
        'viridis': (t) => {
            const x = 1 - t;
            const a = 16.0, b = 254.0;
            const red = ((6.0 - 2.4 * x) * x * x * x + (-4.8 * x * x * x + 18.0 * x * x - 22.2 * x + 8.3) * x * x * x + (b - a) * x * x * x * x * x * x + a) / 255;
            const green = ((13.0 - 1.5 * x) * x * x * x + (-12.0 * x * x * x + 45.0 * x * x - 49.5 * x + 17.0) * x * x * x + (b - a) * x * x * x * x * x * x + a) / 255;
            const blue = ((b - a) * x * x * x * x * x * x + a) / 255;
            return { r: red, g: green, b: blue };
        },
        // Новые RGB палитры
        'plasma': (t) => {
            // Plasma: от синего через фиолетовый к желтому
            const r = Math.min(255, Math.max(0, Math.round(240 * t + 50 * Math.sin(Math.PI * t))));
            const g = Math.min(255, Math.max(0, Math.round(100 * t + 80 * Math.sin(Math.PI * 2 * t))));
            const b = Math.min(255, Math.max(0, Math.round(200 * (1 - t) + 50 * Math.sin(Math.PI * t))));
            return { r: r / 255, g: g / 255, b: b / 255 };
        },
        'inferno': (t) => {
            // Inferno: от черного через красный к желтому
            const r = Math.min(255, Math.max(0, Math.round(255 * Math.pow(t, 0.5))));
            const g = Math.min(255, Math.max(0, Math.round(255 * Math.pow(t, 1.5))));
            const b = Math.min(255, Math.max(0, Math.round(150 * (1 - t))));
            return { r: r / 255, g: g / 255, b: b / 255 };
        },
        'magma': (t) => {
            // Magma: от черного через розовый к белому
            const r = Math.min(255, Math.max(0, Math.round(100 + 155 * t)));
            const g = Math.min(255, Math.max(0, Math.round(50 + 100 * Math.pow(t, 1.5))));
            const b = Math.min(255, Math.max(0, Math.round(100 + 100 * t)));
            return { r: r / 255, g: g / 255, b: b / 255 };
        },
        'cividis': (t) => {
            // Cividis: оптимизирована для дальтоников
            const r = Math.min(255, Math.max(0, Math.round(50 + 200 * t)));
            const g = Math.min(255, Math.max(0, Math.round(70 + 150 * t)));
            const b = Math.min(255, Math.max(0, Math.round(100 + 120 * t)));
            return { r: r / 255, g: g / 255, b: b / 255 };
        },
        'rainbow': (t) => {
            // Rainbow: классическая радуга
            const h = 360 * t;
            const s = 1, l = 0.5;
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;
            let r, g, b;
            if (h < 60) { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }
            return { r: r + m, g: g + m, b: b + m };
        },
        'coolwarm': (t) => {
            // Coolwarm: от синего через белый к красному
            const r = t < 0.5 ? 0.5 + 0.5 * (t * 2) : 0.5 + 0.5 * ((t - 0.5) * 2);
            const g = 0.5 + 0.3 * Math.sin(Math.PI * t);
            const b = t < 0.5 ? 0.5 + 0.5 * ((0.5 - t) * 2) : 0.5 - 0.5 * ((t - 0.5) * 2);
            return { r: Math.min(1, Math.max(0, r)), g: Math.min(1, Math.max(0, g)), b: Math.min(1, Math.max(0, b)) };
        },
        'spring': (t) => {
            // Spring: от зеленого к голубому
            const r = 0;
            const g = 1;
            const b = t;
            return { r: r, g: g, b: b };
        },
        'summer': (t) => {
            // Summer: от зеленого к синему
            const r = 0;
            const g = 0.5 + 0.5 * t;
            const b = 0.5 + 0.5 * (1 - t);
            return { r: r, g: g, b: b };
        },
        'autumn': (t) => {
            // Autumn: от красного к желтому
            const r = 1;
            const g = t;
            const b = 0;
            return { r: r, g: g, b: b };
        },
        'winter': (t) => {
            // Winter: от синего к зеленому
            const r = 0;
            const g = t;
            const b = 1;
            return { r: r, g: g, b: b };
        }
    };

    if (!colormaps[name]) {
        console.warn(`Цветовая карта "${name}" не найдена. Используется "gray".`);
        return colormaps['gray'];
    }
    return colormaps[name];
}
