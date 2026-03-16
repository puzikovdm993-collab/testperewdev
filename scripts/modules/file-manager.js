// file-manager.js - Управление файлами и историей

/**
 * Генерация уникального ID
 */
export function makeId() {
    try {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (_) {}
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
}

/**
 * Создание структуры нового файла
 */
export function createFileStructure(id, filename, canvas, ctx) {
    return {
        id: id,
        filename: filename || 'Безымянный',
        canvas: canvas,
        ctx: ctx,
        history: [],
        historyIndex: -1,
        matrix: null,
        minValue: 0,
        maxValue: 1
    };
}

/**
 * Сброс истории файла
 */
export function resetHistory(file) {
    file.history = [];
    file.historyIndex = -1;
}

/**
 * Сохранение состояния в историю
 */
export function captureState(file) {
    if (!file || !file.canvas) return null;
    
    const state = {
        imageData: file.ctx.getImageData(0, 0, file.canvas.width, file.canvas.height),
        matrix: file.matrix ? JSON.parse(JSON.stringify(file.matrix)) : null,
        minValue: file.minValue,
        maxValue: file.maxValue
    };
    
    return state;
}

/**
 * Восстановление состояния из истории
 */
export function restoreState(file, state) {
    if (!file || !file.ctx || !state) return;
    
    if (state.imageData) {
        file.ctx.putImageData(state.imageData, 0, 0);
    }
    
    if (state.matrix) {
        file.matrix = state.matrix;
    }
    
    if (state.minValue !== undefined) {
        file.minValue = state.minValue;
    }
    
    if (state.maxValue !== undefined) {
        file.maxValue = state.maxValue;
    }
}

/**
 * Добавление состояния в историю
 */
export function pushState(file, maxHistory = 50) {
    const state = captureState(file);
    if (!state) return;
    
    // Удаляем все состояния после текущей позиции
    file.history = file.history.slice(0, file.historyIndex + 1);
    
    // Добавляем новое состояние
    file.history.push(state);
    
    // Ограничиваем размер истории
    if (file.history.length > maxHistory) {
        file.history.shift();
    } else {
        file.historyIndex++;
    }
}

/**
 * Отмена действия (Undo)
 */
export function undo(file) {
    if (!file || file.historyIndex <= 0) return false;
    
    file.historyIndex--;
    restoreState(file, file.history[file.historyIndex]);
    return true;
}

/**
 * Повтор действия (Redo)
 */
export function redo(file) {
    if (!file || file.historyIndex >= file.history.length - 1) return false;
    
    file.historyIndex++;
    restoreState(file, file.history[file.historyIndex]);
    return true;
}

/**
 * Сохранение последних открытых файлов в localStorage
 */
export function saveRecentFiles(files, key = 'paint_recent_files', maxFiles = 20) {
    try {
        const recentFiles = files.slice(0, maxFiles).map(f => ({
            filename: f.filename,
            lastOpened: Date.now()
        }));
        localStorage.setItem(key, JSON.stringify(recentFiles));
    } catch (e) {
        console.warn('Не удалось сохранить последние файлы:', e);
    }
}

/**
 * Загрузка последних открытых файлов из localStorage
 */
export function loadRecentFiles(key = 'paint_recent_files') {
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Не удалось загрузить последние файлы:', e);
    }
    return [];
}

/**
 * Форматирование размера файла
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
