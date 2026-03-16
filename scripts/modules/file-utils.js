// file-utils.js - Утилиты для работы с файлами и изображениями

/**
 * Сохранение матрицы в TPT файл
 */
export function saveToTptFile(file, filename = null) {
    return new Promise((resolve, reject) => {
        try {
            const width = file.matrix.length;
            const height = file.matrix[0].length;
        
            const data = file.matrix;
            const minValue = file.minValue;
            const maxValue = file.maxValue;
            const originalFilename = file.filename;

            // Если filename не указан, используем оригинальный или генерируем новый
            const outputFilename = filename || originalFilename || `matrix_${Date.now()}.tpt`;
            
            // Формируем строки файла
            const header = `${height}\n${width}\n`;
            const matrixLines = data.map(row => 
                row.map(val => val.toString()).join('\t')
            ).join('\n');
            
            // Объединяем заголовок и матрицу
            const fileContent = header + matrixLines;
            
            // Создаём Blob (UTF-8 текст)
            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            
            // Сохраняем файл
            if (typeof saveAs === 'function') {
                saveAs(blob, outputFilename);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = outputFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            resolve(`Файл "${outputFilename}" успешно сохранён!`);
        } catch (error) {
            reject(`Ошибка сохранения файла: ${error.message}`);
        }
    });
}

/**
 * Конвертация матрицы в RGBA формат
 */
export function convertToRGBA(grayData, width, height) {
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

/**
 * Применение полиномиальной коррекции к изображению
 */
export function applyPolynomialCorrection(matrix, width, height, coefficients, allArea, 
    getPolynomialTermsFn, calculatePolynomialTermsVectorFn, isPixelSelectedFn) {
    const order = Math.floor(Math.sqrt(2 * coefficients.length + 1)) - 1;
    const terms = getPolynomialTermsFn(order);
    
    const correctedData = new Array(height);

    // Обрабатываем все пиксели
    for (let y = 0; y < height; y++) {
        correctedData[y] = new Array(width);
        for (let x = 0; x < width; x++) {
            const value = matrix[y][x];
            
            // Пропуск точек вне выделенной области (если нужно)
            if (!allArea && !isPixelSelectedFn(x, y)) {
                correctedData[y][x] = value;
                continue;
            }
            
            // Вычисляем вектор A для текущей точки
            const A = calculatePolynomialTermsVectorFn(x, y, order, getPolynomialTermsFn);
            
            // Вычисляем значение полинома
            let val = 0;
            for (let i = 0; i < coefficients.length; i++) {
                val += coefficients[i] * A[i];
            }

            correctedData[y][x] = val;
        }
    }
    
    return correctedData;
}
