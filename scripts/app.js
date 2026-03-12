//app.js
// Вычисление коэффициентов полинома методом наименьших квадратов
function _computePolynomialCoefficients(matrix, width, height, order, allArea) {
                
    // 1. Подсчет точек и коэффициентов
    // N — общее число точек
    // K — число коэффициентов полинома
    const N = allArea ? width * height : this._countSelectedPixels(matrix, width, height);
    const K = this._calculatePolynomialTerms(order);
    
    if (N <= 2 * K) {
        console.warn("Insufficient data points for polynomial fit (N <= 2*K)");
        return { coefficients: null, success: false };
    }

    // 2. Инициализация матрицы сумм (K×K) и вектора b (K элементов)
    const sums = Array(K + 1).fill(0).map(() => Array(K + 1).fill(0));// Матрица A^T A
    const b = Array(K + 1).fill(0);// Вектор A^T y

    // 3. Заполнение матрицы и вектора через метод `_buildSystemMatrix`
    this._buildSystemMatrix(matrix, width, height, order, allArea, sums, b);
    
    // 4. Решение системы линейных уравнений методом Гаусса
    const coefficients = this._solveGaussianElimination(sums, b);
    
    return { coefficients, success: true };// Возвращаем коэффициенты и флаг успеха

}

// Подсчет количества точек в выделенной области (заглушка)
function  _countSelectedPixels(matrix, width, height) {
    // В реальном приложении здесь должна быть логика работы с выделением
    // Пока считаем все пиксели
    return width * height;
}

// Расчет количества членов полинома для заданного порядка
function _calculatePolynomialTerms(order) {
    // Формула для количества членов: (order+1)(order+2)/2 - 1
    return (order + 1) * (order + 2) / 2 - 1;
}

// Построение матрицы сумм и вектора b
function _buildSystemMatrix(matrix, width, height, order, allArea, sums, b) {
    const terms = this._getPolynomialTerms(order);
    const N = allArea ? width * height : this._countSelectedPixels(matrix, width, height);
    
    // Обходим все пиксели
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            //const index = y * width + x;
            const value = matrix[y][x];
            
            // Пропуска точек вне выделенной области (если нужно)
            if (!allArea && !this._isPixelSelected(x, y)) {
                continue;
            }
            
            // Вычисляем вектор A для текущей точки
            const A = this._calculatePolynomialTerms1(x, y, order);
            
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

// Проверка, находится ли пиксель в выделенной области (заглушка)
function _isPixelSelected(x, y) {
    // В реальном приложении здесь должна быть логика работы с выделением
    return true;
}



// Генерация списка членов полинома для заданного порядка
function _getPolynomialTerms(order) {
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

// Вычисление вектора A для конкретной точки (x, y)
function _calculatePolynomialTerms1(x, y, order) {
    const terms = this._getPolynomialTerms(order);
    const A = [1.0]; // Первый член - константа
    
    for (let i = 1; i < terms.length; i++) {
        const term = terms[i];
        const xTerm = Math.pow(x, term.m - term.n);
        const yTerm = Math.pow(y, term.n);
        A.push(xTerm * yTerm);
    }
    
    return A;
}

// Метод Гаусса для решения системы уравнений
function  _solveGaussianElimination(sums, b) {
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

// Применение полинома к изображенияю
function _applyPolynomialCorrection(matrix, width, height, coefficients, allArea) {
    const order = Math.floor(Math.sqrt(2 * coefficients.length + 1)) - 1;
    const terms = this._getPolynomialTerms(order);

            //   console.log(order);
            //   console.log(terms);
    
    //const correctedData = new Float32Array(grayData.length);
    const correctedData = new Array(height);



    // Обрабатываем все пиксели
    for (let y = 0; y < height; y++) {
        correctedData[y] = new Array(width)
        for (let x = 0; x < width; x++) {

            //const index = y * width + x;
            const value = matrix[y][x];
            
            // Пропуска точек вне выделенной области (если нужно)
            if (!allArea && !this._isPixelSelected(x, y)) {
                correctedData[y][x] = value; // Оставляем исходное значение
                //correctedData[index] = value; // Оставляем исходное значение
                continue;
            }
            
            // Вычисляем вектор A для текущей точки
            const A = this._calculatePolynomialTerms1(x, y, order);
            
            // Вычисляем значение полинома
            let val = 0;
            for (let i = 0; i < coefficients.length; i++) {
                val += coefficients[i] * A[i];
            }
            //console.log(val);
            //  console.log(coefficients);

            // Коррекция: исходное значение - фоновое значение
            //correctedData[index] = Math.max(0, Math.min(1, value - val));

            correctedData[y][x] = val;
            //correctedData[y][x] = Math.max(0, Math.min(1, value - val));
        }
    }
    
    return correctedData;
}

// Конвертация обратно в RGBA
function  _convertToRGBA(grayData, width, height) {
    const rgbaData = new Uint8ClampedArray(grayData.length * 4);
    
    for (let i = 0; i < grayData.length; i++) {
        const value = Math.min(255, Math.max(0, grayData[i] * 255));
        const idx = i * 4;
        rgbaData[idx] = value;
        rgbaData[idx + 1] = value;
        rgbaData[idx + 2] = value;
        rgbaData[idx + 3] = 255; // Альфа-канал
    }
    
    return rgbaData;
}


function getColormap(name) {
    const colormaps = {
        'hot': (t) => ({
            r: t < 0.5 ? 0 : 2 * t,
            g: t < 0.25 ? 0 : t < 0.75 ? 2 * t - 0.5 : 1,
            b: t < 0.75 ? 0 : 2 * t - 1
        }),
        'jet': (t) => {
            const h = 240 * (1 - t); // От синего (t=0) до красного (t=1)
            const hslToRgb = (h) => {
                const hue = h / 360; // Нормализуем до [0, 1]
                const i = Math.floor(hue * 6); // Индекс сегмента
                const f = hue * 6 - i; // Дополнительная доля
                
                // Значения для RGB (избегаем дублирования имён)
                const red = [1, f, 1 - f, 0, 0, 0][i % 6];
                const green = [1 - f, 1, 1, 1 - f, 1 - f, 1 - f][i % 6];
                const blue = [0, 0, 0, 0, 1 - f, 1][i % 6];
                
                return { r: red, g: green, b: blue }; // Теперь ключи объекта не конфликтуют
            };
            return hslToRgb(h);
        },
        'gray': (t) => ({ r: t, g: t, b: t }),
        'viridis': (t) => { // Упрощённая версия
            const x = 1 - t;
            const a = 16.0, b = 254.0;
            const red = ((6.0 - 2.4 * x) * x * x * x + (-4.8 * x * x * x + 18.0 * x * x - 22.2 * x + 8.3) * x * x * x + (b - a) * x * x * x * x * x * x + a) / 255;
            const green = ((13.0 - 1.5 * x) * x * x * x + (-12.0 * x * x * x + 45.0 * x * x - 49.5 * x + 17.0) * x * x * x + (b - a) * x * x * x * x * x * x + a) / 255;
            const blue = ((b - a) * x * x * x * x * x * x + a) / 255;
            return { r: red, g: green, b: blue }; // Ключи объекта не конфликтуют
        }
    };

    if (!colormaps[name]) {
        console.warn(`Цветовая карта "${name}" не найдена. Используется "gray".`);
        return colormaps['gray'];
    }
    return colormaps[name];
}

/**
 * Применяет медианный фильтр к матрице m × n.
 * @param {number[][]} matrix - Входная матрица (массив массивов).
 * @param {number} kernelSize - Размер окна фильтра (нечетное число, например 3).
 * @returns {number[][]} - Отфильтрованная матрица.
 */
 function _medianFilter(matrix, kernelSize) {
    const m = matrix.length;
    const n = matrix[0].length;
    const padSize = Math.floor(kernelSize / 2);
    
    updateProgress(30, 'Создание расширенной матрицы...');
    const paddedMatrix = this._createPaddedMatrix(matrix, padSize);
    const filteredMatrix = [];

    const totalPixels = m * n;
    let processedPixels = 0;

    for (let i = 0; i < m; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            // Извлекаем подматрицу (окрестность) размера kernelSize × kernelSize
            const window = this._extractWindow(paddedMatrix, i + padSize, j + padSize, kernelSize);
            // Находим медиану
            const median = this._calculateMedian(window);
            row.push(median);
            
            processedPixels++;
            const progress = Math.round(40 + (processedPixels / totalPixels) * 50);
            if (processedPixels % Math.max(1, Math.floor(totalPixels / 100)) === 0 || processedPixels === totalPixels) {
                updateProgress(progress, 'Фильтрация изображения...');
            }
        }
        filteredMatrix.push(row);
    }

    return filteredMatrix;
}

/**
    * Создает расширенную матрицу с нулевыми границами для обработки краев.
    */
 function _createPaddedMatrix(matrix, padSize) {
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
 function _extractWindow(matrix, x, y, size) {
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
 function _calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
        ? sorted[mid] 
        : (sorted[mid - 1] + sorted[mid]) / 2;
}




// сохранения
function saveToTptFile(file, filename = null) {
    return new Promise((resolve, reject) => {
        try {
            // Получаем данные из node.properties
            //const { width, height, data, minValue, maxValue, filename: originalFilename } = file;

            const width = file.matrix.length;
            const height = file.matrix[0].length;
        
            const data = file.matrix;
            const minValue = file.minValue
            const maxValue = file.maxValue
            const filename = file.filename;


            
            // Если filename не указан, используем оригинальный или генерируем новый
            const outputFilename = filename || originalFilename || `matrix_${Date.now()}.tpt`;
            
            // Формируем строки файла
            const header = `${height}\n${width}\n`;
            const matrixLines = data.map(row => 
                row.map(val => val.toString()).join('\t') // Числа разделены табуляцией (можно заменить на пробел)
            ).join('\n');
            
            // Объединяем заголовок и матрицу
            const fileContent = header + matrixLines;
            
            // Создаём Blob (UTF-8 текст)
            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            
            // Сохраняем файл (используем FileSaver.js или нативный способ)
            if (typeof saveAs === 'function') {
                // Если доступна библиотека FileSaver.js
                saveAs(blob, outputFilename);
            } else {
                // Альтернативный способ (без FileSaver.js)
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = outputFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            //resolve(`Файл "${outputFilename}" успешно сохранён!`);
        } catch (error) {
            reject(`Ошибка сохранения файла: ${error.message}`);
        }
    });
}




// ============ Сохранение ============
function showSaveModal() {
    const file = getActiveFile();
    if (!file) return;
    document.getElementById("saveModal").classList.add('active');
    // dom.saveModal.classList.add('active');
}
// Закрытие модального окна
function closeSaveModal() {
    document.getElementById("saveModal").classList.remove('active');
}
// Применение сохраннеия
function applySave() {

    const file = getActiveFile();
    if (!file) return;

    const name = document.getElementById("saveName").value;
    const format = document.getElementById("saveFormat").value;

    saveImage(format,name);

    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();
        updateCanvasSize();
    }

    saveState();

    closeSaveModal();
}
 
// ============ Медианный фильтр ============
function showMedianModal() {
    const file = getActiveFile();
    if (!file) return;

    document.getElementById('medianModal').classList.add('active');
}

// Закрытие модального окна
function closeMedianModal() {
   document.getElementById('medianModal').classList.remove('active');
}
// Применение медианного фильтра
function applyMedianFilter() {

    const file = getActiveFile();
    if (!file) return;
const t = document.getElementById('newAperture').value;

    // Показываем модальное окно прогресса
    showProgressModal('Поворот изображения', false);
    // Используем setTimeout чтобы дать UI обновиться перед тяжелой операцией
    setTimeout(() => {
        updateProgress(20, 'Вычисление новых размеров...');

    const aprture = parseInt(t, 10);
    const filtered123 = _medianFilter(file.matrix, aprture); 

    const width = file.matrix.length;
    const height = file.matrix[0].length;

 updateProgress(50, 'Создание повернутого изображения...');

    const minVal = file.minValue;
    const maxVal = file.maxValue;

    const autoscale = true;
    const colormap = 'gray';
    const colorMap = getColormap(colormap);
    const data = new Uint8ClampedArray(width * height * 4);
    let dataIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            const normalizedValue = autoscale 
                ? (filtered123[y][x] - minVal) / (maxVal - minVal + 1e-9) 
                : (filtered123[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }
    const imageData = new ImageData(data, width, height);

    // Создаем временный canvas для исходного ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 500;
    tempCanvas.height = 500;

    tempCtx.putImageData(imageData, 0, 0); // Полное копирование ImageData

 updateProgress(80, 'Применение изменений...');
    file.matrix = filtered123;

    file.canvas.width = tempCanvas.width;
    file.canvas.height = tempCanvas.height;
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(tempCanvas, 0, 0);

    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();
        updateCanvasSize();
    }
 updateProgress(100, 'Готово!');
    saveState();
        // Закрываем модальное окно через небольшую задержку
        setTimeout(() => {
            closeProgressModal();
        }, 300);
    closeMedianModal();
     }, 50);
}

// ============ Нормализация ============
function showNormalisatioModal() {
    const file = getActiveFile();
    if (!file) return;

    const begin = document.getElementById("normalizBegin");
    const end = document.getElementById("normalizEnd");
    begin.value = session.normbegin;
    end.value = session.normend;
    dom.normaizModal.classList.add('active');
}

// Закрытие Нормализация окна
function closeNormalisatioModal() {
    dom.normaizModal.classList.remove('active');
}
// Применение Нормализация фильтра
function applyNormalisatioFilter() {
    const file = getActiveFile();
    if (!file) return;

    const min_norm = parseInt(document.getElementById("normalizBegin").value, 10);
    const max_norm = parseInt(document.getElementById("normalizEnd").value, 10);

    session.normbegin = min_norm;
    session.normend = max_norm ;

    const width = file.matrix.length;
    const height = file.matrix[0].length;
   



    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const normalizedValue = (file.matrix[y][x] - file.minValue) / (file.maxValue - file.minValue) * (max_norm - min_norm) + min_norm;
            
            file.matrix[y][x] = normalizedValue;
        }
    }

    
    
    file.minValue = min_norm;
    file.maxValue = max_norm;



    const autoscale = true;
    const colormap = 'gray';
    const colorMap = getColormap(colormap);
    const data = new Uint8ClampedArray(width * height * 4);
    let dataIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            const normalizedValue = autoscale 
                ? ( file.matrix[y][x] - file.minValue) / (file.maxValue - file.minValue + 1e-9) 
                : ( file.matrix[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }


    const imageData = new ImageData(data, width, height);

    // Создаем временный canvas для исходного ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width ;
    tempCanvas.height = height;

    tempCtx.putImageData(imageData, 0, 0); // Полное копирование ImageData
    
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(tempCanvas, 0, 0);

    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();
        updateCanvasSize();
    }

    saveState();

    closeNormalisatioModal();

}


// ============ Собель фильтр ============
function showSobelModal() {
}
// Закрытие модального окна
function closeSobelModal() {
}

// Применение медианного фильтра
function applySobelFilter() {

    const file = getActiveFile();
    if (!file) return;



    const width = file.matrix.length;
    const height = file.matrix[0].length;

    const minVal = file.minValue;
    const maxVal = file.maxValue;

    const result = { data: new Array(height).fill(0).map(() => new Array(width).fill(0)) };

                    // Ядра Собеля для вычисления градиентов
                    const sobelKernels = {
                        // Горизонтальный градиент
                        gx: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], 
                        // Вертикальный градиент
                        gy: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]   
                    };
    
    
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            let gxSum = 0, gySum = 0;
                            // Применяем свёртку (3x3 окно)
                            for (let ky = -1; ky <= 1; ky++) {
                                for (let kx = -1; kx <= 1; kx++) {
                                    const px = x + kx;
                                    const py = y + ky;
    
                                    // Проверка границ
                                    if (px >= 0 && px < width && py >= 0 && py < height) {
                                        // Вклад в градиенты
                                        gxSum += file.matrix[py][px] * sobelKernels.gx[ky + 1][kx + 1];
                                        gySum += file.matrix[py][px] * sobelKernels.gy[ky + 1][kx + 1];
                                    }
                                }
                            }
                            result.data[y][x] = Math.sqrt(gxSum * gxSum + gySum * gySum);
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
                ? (result.data[y][x] - minVal) / (maxVal - minVal + 1e-9) 
                : (result.data[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }
    const imageData = new ImageData(data, width, height);

    // Создаем временный canvas для исходного ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 500;
    tempCanvas.height = 500;

    tempCtx.putImageData(imageData, 0, 0); // Полное копирование ImageData


    file.matrix = result.data;

    file.canvas.width = tempCanvas.width;
    file.canvas.height = tempCanvas.height;
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(tempCanvas, 0, 0);

    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();
        updateCanvasSize();
    }

    saveState();
}


// ============ Апроксимация ============
function showApproximationModal() {
    const file = getActiveFile();
    if (!file) return;

    const node_order = document.getElementById("node_order");
    node_order.value = session.node_orderApproximation;
    dom.approximationModal.classList.add('active');
    
}
// Закрытие модального окна
function closeApproximationModal() {
    dom.approximationModal.classList.remove('active');
}

// Применение медианного фильтра
function applyApproximationFilter() {

    const file = getActiveFile();
    if (!file) return;



    const width = file.matrix.length;
    const height = file.matrix[0].length;


    //const result = { data: new Array(height).fill(0).map(() => new Array(width).fill(0)) };


                        // Вычисляем коэффициенты полиномиальной модели фона методом наименьших квадратов
                        const { coefficients, success } = _computePolynomialCoefficients(
                            file.matrix, width, height, 
                            session.node_orderApproximation, 
                            true
                        );

                        // Применяем коррекцию
                        const result = _applyPolynomialCorrection(
                            file.matrix, width, height, 
                            coefficients, 
                            true
                        );


            var max_result = result[0][0];
            var min_result = result[0][0];
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {

                    if(result[y][x] > max_result) {
                        max_result = result[y][x];
                    }
                    if(result[y][x] < min_result) {
                        min_result = result[y][x];
                    }
                }
            }

            const minVal = min_result;
            const maxVal = max_result;
            file.minValue = minVal;
            file.maxValue = maxVal;
        

    const autoscale = true;
    const colormap = 'gray';
    const colorMap = getColormap(colormap);
    const data = new Uint8ClampedArray(width * height * 4);
    let dataIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            const normalizedValue = autoscale 
                ? (result[y][x] - minVal) / (maxVal - minVal + 1e-9) 
                : (result[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }
    const imageData = new ImageData(data, width, height);

    // Создаем временный canvas для исходного ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.putImageData(imageData, 0, 0); // Полное копирование ImageData


    file.matrix = result;

    file.canvas.width = tempCanvas.width;
    file.canvas.height = tempCanvas.height;
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(tempCanvas, 0, 0);

    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();
        updateCanvasSize();
    }
    closeApproximationModal();
    saveState();
}



// ============ Логарифмирование ============
function showLogorifmModal() {
}
// Закрытие Логарифмирование окна
function closeLogorifmModal() {

}

// Применение Логарифмирование фильтра
function applyLogorifmFilter() {

    const file = getActiveFile();
    if (!file) return;



    const width = file.matrix.length;
    const height = file.matrix[0].length;


    const result = { data: new Array(height).fill(0).map(() => new Array(width).fill(0)) };


    
    
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const a = file.matrix[y][x] ?? 0;
                        const ln_matrix = Math.log(a);                            
                        result.data[y][x] = ln_matrix;
                    }
                }

                var max_result = result.data[0][0];
                var min_result = result.data[0][0];
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {

                        if(result.data[y][x] > max_result) {
                            max_result = result.data[y][x];
                        }
                        if(result.data[y][x] < min_result) {
                            min_result = result.data[y][x];
                        }
                    }
                }
                
            const minVal = min_result;
            const maxVal = max_result;
            file.minValue = minVal;
            file.maxValue = maxVal;

    const autoscale = true;
    const colormap = 'gray';
    const colorMap = getColormap(colormap);
    const data = new Uint8ClampedArray(width * height * 4);
    let dataIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            const normalizedValue = autoscale 
                ? (result.data[y][x] - minVal) / (maxVal - minVal + 1e-9) 
                : (result.data[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }
    const imageData = new ImageData(data, width, height);

    // Создаем временный canvas для исходного ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.putImageData(imageData, 0, 0); // Полное копирование ImageData


    file.matrix = result.data;

    file.canvas.width = tempCanvas.width;
    file.canvas.height = tempCanvas.height;
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(tempCanvas, 0, 0);

    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();
        updateCanvasSize();
    }

    saveState();
}


// ============ Порог ============
function showThresholdModal() {
    const min = document.getElementById("thresholdMin");
    const lessmin = document.getElementById("thresholdLessMin");
    const max = document.getElementById("thresholdMax");
    const moremax = document.getElementById("thresholdMoreMax");
    
    min.value = session.thresholdmin;
    lessmin.value = session.thresholdlessmin;
    max.value = session.thresholdmax;
    moremax.value = session.thresholdmoremax;

    dom.thresholdModal.classList.add('active');
}
// Закрытие Порог окна
function closeThresholdModal() {
    dom.thresholdModal.classList.remove('active');
}

// Применение Порог фильтра
function applyThresholdFilter() {

    const file = getActiveFile();
    if (!file) return;



    const width = file.matrix.length;
    const height = file.matrix[0].length;


    const result = { data: new Array(height).fill(0).map(() => new Array(width).fill(0)) };


    
    
    // Выполняем поэлементное деление
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            result.data[y][x] = file.matrix[y][x];

            if(result.data[y][x] > session.thresholdmax) {
                result.data[y][x] = session.thresholdmoremax;
            }
            
            if(result.data[y][x] < session.thresholdmin) {
                result.data[y][x] = session.thresholdlessmin;
            }
        }
    }

                var max_result = result.data[0][0];
                var min_result = result.data[0][0];
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {

                        if(result.data[y][x] > max_result) {
                            max_result = result.data[y][x];
                        }
                        if(result.data[y][x] < min_result) {
                            min_result = result.data[y][x];
                        }
                    }
                }
                
            const minVal = min_result;
            const maxVal = max_result;
            file.minValue = minVal;
            file.maxValue = maxVal;

    const autoscale = true;
    const colormap = 'gray';
    const colorMap = getColormap(colormap);
    const data = new Uint8ClampedArray(width * height * 4);
    let dataIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            const normalizedValue = autoscale 
                ? (result.data[y][x] - minVal) / (maxVal - minVal + 1e-9) 
                : (result.data[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }
    const imageData = new ImageData(data, width, height);

    // Создаем временный canvas для исходного ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;

    tempCtx.putImageData(imageData, 0, 0); // Полное копирование ImageData


    file.matrix = result.data;

    file.canvas.width = tempCanvas.width;
    file.canvas.height = tempCanvas.height;
    file.ctx = file.canvas.getContext('2d', { willReadFrequently: true });
    file.ctx.drawImage(tempCanvas, 0, 0);

    if (file.id === activeFileId) {
        canvas = file.canvas;
        ctx = file.ctx;
        applyZoom();
        updateCanvasSize();
    }
    closeThresholdModal();
    saveState();
}



// Сохранение изображения в файл
function saveImage(format,filename) {
    const file = getActiveFile();
    if (!file) return;

    if(format == "tpt"){
        //console.log(filename);
        saveToTptFile(file,  filename)
        .then(message => console.log(message))
        .catch(error => console.error(error));
    }
    else   {
        const link = document.createElement('a');
        const base = file.filename.replace(/\.(png|jpg|jpeg)$/i, '');
        link.download = `${base}.${format}`;
        link.href = file.canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
        link.click();
    }
}

// Создание файла из ImageData
function createFileFromImageData(filename, matrix, width, height, minValue, maxValue) {
    const id = makeId();

    // Создаем canvas элемент
    const cnv = document.createElement('canvas');
    cnv.className = 'paint-canvas';
    cnv.id = `canvas-${id}`;
    cnv.width = width;
    cnv.height = height;
    cnv.style.display = 'none';

    attachCanvasEvents(cnv);
    dom.canvasHost.appendChild(cnv);
    


    // Рисуем ImageData на canvas

    const autoscale = true;
    const colormap = 'gray';
    const colorMap = getColormap(colormap);
    const data = new Uint8ClampedArray(width * height * 4);
    let dataIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const normalizedValue = autoscale 
                ? (matrix[y][x] - minValue) / (maxValue - minValue + 1e-9) 
                : (matrix[y][x] - scale[0]) / (scale[1] - scale[0] + 1e-9);
            
            const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
            data[dataIndex++] = color.r * 255;
            data[dataIndex++] = color.g * 255;
            data[dataIndex++] = color.b * 255;
            data[dataIndex++] = 255;
        }
    }
    // const canvas = document.createElement('canvas');
    // canvas.width = width;
    // canvas.height = height;

    const imageData = new ImageData(data, width, height);



    const file = {
        id: id,
        filename: filename || 'UnownName',
        matrix:matrix,
        minValue: minValue,
        maxValue: maxValue,
        autoscale:true,
        colormap:'gray',
        canvas: cnv,
        ctx: cnv.getContext('2d', { willReadFrequently: true }),
        tabEl: null,
        history: [],
        historyIndex: -1
    };

    file.ctx.putImageData(imageData, 0, 0);
    file.matrix = matrix;
    file.minValue = minValue;
    file.maxValue = maxValue;
    resetHistory(file);
    pushState(file);
    openFiles.push(file);
    switchToFile(id);
    updateOpenFilesList();
    
    // Применяем зум и обновляем размеры canvas чтобы превью было во весь канвас
    setTimeout(() => {
        applyZoom();
        updateCanvasSize();
    }, 10);
    
    return file;
}

// Загрузка изображения и преобразование в ImageData
function loadImage(e) {
    console.log('Вызвана функция loadImage(e)  ');
    const files = e.target.files;
    if (!files || !files.length) return;

    const file = files[0]; // Работаем с первым файлом (можно изменить на foreach)
    //if (!file.type.startsWith('image/')) return;

    // Создаем canvas для обработки изображения
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const filenameParts123 = file.name.split('.'); // Разделяем по точке (например, "data.tpt" → ["data", "tpt"])
    const filename123 = filenameParts123.slice(0, -1).join('.'); // Базовое имя без расширения (["data"] → "data")
    const fileExtension123 = filenameParts123.pop().toLowerCase() || 'unknown'; // Получаем расширение в нижнем регистре (["tpt"] → "tpt")

    console.log(filenameParts123);
    console.log(filename123);
    console.log(fileExtension123);


    const reader = new FileReader();

    reader.onerror = (err) => {
        // Логируем тип ошибки (например, "NOT_READABLE_ERROR")
        console.error('Ошибка чтения файла:', err.target.error);
        // Передаём сообщение об ошибке
        reject('Ошибка чтения файла: ' + err.target.error.message);
    };


    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Устанавливаем размеры canvas под изображение
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Рисуем изображение на canvas
            ctx.drawImage(img, 0, 0);
            
            // Получаем ImageData
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            
            // Преобразуем RGBA данные в матрицу значений яркости
            const width = img.width;
            const height = img.height;
            const matrix = [];
            let minVal = Infinity;
            let maxVal = -Infinity;
            
            for (let y = 0; y < height; y++) {
                const row = [];
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    // Вычисляем яркость по формуле: 0.299*R + 0.587*G + 0.114*B
                    const brightness = (imageData.data[idx] * 0.299 + 
                                       imageData.data[idx + 1] * 0.587 + 
                                       imageData.data[idx + 2] * 0.114) / 255;
                    row.push(brightness);
                    
                    if (brightness < minVal) minVal = brightness;
                    if (brightness > maxVal) maxVal = brightness;
                }
                matrix.push(row);
            }
            
            // Создаем файл из матрицы данных
            createFileFromImageData(file.name, matrix, width, height, minVal, maxVal);
            console.log(imageData);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    //reader.readAsText(file);


    // Сброс значения input для возможности повторной загрузки того же файла
    e.target.value = '';
}

        // run
        document.getElementById('run').onclick = async () => {
            console.log('Вызвана функция document.getElementById(\'run\').onclick = async () => { ');
            const btn = document.getElementById('run');
            btn.classList.add('running');
            btn.disabled = true;
            // const inspector = document.getElementById('inspector');
            // if (!inspector) return;
            //inspector.classList.remove('visible');
            try {


                    // Создаём промис для асинхронной загрузки файла
                    await new Promise((resolve, reject) => {

                        // Создаём элемент <input type="file"> и настраиваем его:
                        // Создаём HTML-инпут
                        const input = document.createElement('input');
                        // Указываем тип как "файл"
                        input.type = 'file';
                        // Разрешаем только файлы с расширением .tpt
                        input.accept = '.tpt';
                        // Обрабатываем выбор файла пользователем
                        input.onchange = async (e) => {
                            // Получаем первый выбранный файл
                            const file = e.target.files[0];
                            // Если файл не выбран
                            if (!file) {
                                // Отклоняем промис с ошибкой
                                reject('Файл не выбран');
                                // Прерываем выполнение
                                return;
                            }




                            //Проверяем расширение файла:
                            // Получаем расширение (например, "tpt")
                            const filenameParts123 = file.name.split('.'); // Разделяем по точке (например, "data.tpt" → ["data", "tpt"])
                            const filename123 = filenameParts123.slice(0, -1).join('.'); // Базовое имя без расширения (["data"] → "data")
                            const fileExtension123 = filenameParts123.pop().toLowerCase() || 'unknown'; // Получаем расширение в нижнем регистре (["tpt"] → "tpt")
                            if (fileExtension123 !== 'tpt') {
                                // Ошибка
                                reject('Файл должен иметь расширение .tpt');
                                return;
                            }

                                // Создаём FileReader для чтения содержимого файла:
                            const reader = new FileReader();

                            // Обработчик ошибок чтения файла (например, CORS или повреждение):
                            reader.onerror = (err) => {
                                // Логируем тип ошибки (например, "NOT_READABLE_ERROR")
                                console.error('Ошибка чтения файла:', err.target.error);
                                // Передаём сообщение об ошибке
                                reject('Ошибка чтения файла: ' + err.target.error.message);
                            };
    
                            // Обработчик успешного чтения файла (содержимое доступно в ev.target.result):
                            reader.onload = (ev) => {

                                // Обрабатываем строки файла:
                                const lines = ev.target.result.split('\n')  // Разбиваем текст по строкам
                                    .map(line => line.trim())               // Удаляем лишние пробелы в начале/конце
                                    .filter(line => line !== '');           // Оставляем только непустые строки
                               
                                // Проверяем минимальное количество строк (должно быть ≥ 3: width, height, matrix):
                                if (lines.length < 3) {
                                    reject('Файл .tpt должен содержать минимум 3 строки: width, height, matrix');
                                    return;
                                }

                                //Парсим ширину и высоту матрицы:
                                // Первая строка — ширина
                                const width = parseInt(lines[0], 10);
                                // Вторая строка — высота
                                const height = parseInt(lines[1], 10);

                                // Проверяем, что width и height — корректные числа:
                                // Если не числа
                                const matrix = lines.slice(2).map(line => line.split(/\s+/).map(Number));
                                if (isNaN(width) || isNaN(height)) {
                                    reject('Ширина и высота должны быть числами');// Ошибка
                                    return;
                                }
                                console.log(matrix);
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

                                // Ограничение на размер матрицы (максимум 5000x5000 элементов):
                                // if (width * height > 25_000_000) {
                                //     reject('Матрица слишком большая (максимум 25 000 000 элементов)');
                                //     return;
                                // }

                                // Находим минимальное и максимальное значения в матрице:
                                let minVal = Infinity, maxVal = -Infinity;  // Инициализация
                                for (let y = 0; y < height; y++) {          // Проходим по строкам
                                    for (let x = 0; x < width; x++) {       // Проходим по столбцам
                                        const val = matrix[y][x];           // Текущее значение
                                        if (val < minVal) minVal = val;     // Обновляем минимум
                                        if (val > maxVal) maxVal = val;     // Обновляем максимум
                                    }
                                }



                                // Создаем файл из ImageData
                                //createFileFromImageData(file.name, matrix,width,height,minVal,maxVal);
                                createFileFromImageData(file.name, matrix, width, height, minVal, maxVal);
                                //console.log(matrix);

      






                                // Сохраняем параметры в свойствах узла (node.properties):
                                // node.properties.width = width;              // Ширина матрицы
                                // node.properties.height = height;            // Высота матрицы
                                // node.properties.data = matrix;              // Сама матрица (массив массивов)
                                // node.properties.minValue = minVal;          // Минимальное значение
                                // node.properties.maxValue = maxVal;          // Максимальное значение
                                // node.properties.filename = filename123;     // Имя файла без расширения
                                // node.properties.format =  fileExtension123; // Формат файла (tpt)

                                // Отмечаем граф как "грязный" (требующий перерисовки):
                                //graph.setDirtyCanvas(true);

                                // Завершаем промис (успешное выполнение):
                                resolve();
                            };

                            // Альтернативный обработчик ошибок:
                            reader.onerror = () => reject('Ошибка чтения файла');
                            // Начинаем чтение файла как текста:
                            reader.readAsText(file);
                        };
                        // Принудительно открываем диалог выбора файла:
                        input.click();
                    });
  
                //const nodesInOrder = graph.computeExecutionOrder(false);
                // Убедитесь, что эта функция не рекурсивна
                //await animateExecution(nodesInOrder); 
            } catch (err) {
                alert(`Ошибка: ${err}`);
            } finally {
                btn.classList.remove('running');
                btn.disabled = false;
            }
        };

        // tabBar: document.getElementById('tabBar'),
        // windowTitle: document.getElementById('windowTitle'),
        // canvasHost: document.getElementById('canvasHost'),
        // canvasWrapper: document.getElementById('canvasWrapper'),
        // cursorPos: document.getElementById('cursorPos'),
        // canvasSize: document.getElementById('canvasSize'),
        // zoomLevel: document.getElementById('zoomLevel'),
        // shapesPanel: document.getElementById('shapesPanel'),
        // shapesBtn: document.getElementById('shapesBtn'),
        // resizeModal: document.getElementById('resizeModal'),
        // medianModal: document.getElementById('medianModal'),
        // medianAperture: document.getElementById('newAperture'),
        // newWidth: document.getElementById('newWidth'),
        // newHeight: document.getElementById('newHeight'),
        // textInputOverlay: document.getElementById('textInputOverlay'),
        // textInput: document.getElementById('textInput'),
        // colorPicker: document.getElementById('colorPicker'),
        // saveModal: document.getElementById('saveModal'),
        // saveName: document.getElementById('saveName'),
        // saveFormat: document.getElementById('saveFormat'),
        // normaizModal: document.getElementById('normalizModal'),
        // approximationModal: document.getElementById('approximationModal'),
        // thresholdModal: document.getElementById('thresholdModal'),
        // windowTitle: document.getElementById('windowTitle'),
        // canvasHost: document.getElementById('canvasHost'),
        // canvasWrapper: document.getElementById('canvasWrapper'),
        // cursorPos: document.getElementById('cursorPos'),
        // canvasSize: document.getElementById('canvasSize'),
        // zoomLevel: document.getElementById('zoomLevel'),
        // shapesPanel: document.getElementById('shapesPanel'),
        // shapesBtn: document.getElementById('shapesBtn'),
        // resizeModal: document.getElementById('resizeModal'),
        // newWidth: document.getElementById('newWidth'),
        // newHeight: document.getElementById('newHeight'),
        // textInputOverlay: document.getElementById('textInputOverlay'),
        // textInput: document.getElementById('textInput'),
        // colorPicker: document.getElementById('colorPicker'),
        // saveMethodModal: document.getElementById('saveMethodModal'),
        // filenameModal: document.getElementById('filenameModal'),
        // loadFromServerModal: document.getElementById('loadFromServerModal'),
        // recentFilesModal: document.getElementById('recentFilesModal'),
        // recentFilesContainer: document.getElementById('recentFilesContainer'),
        // recentFilesCount: document.getElementById('recentFilesCount')