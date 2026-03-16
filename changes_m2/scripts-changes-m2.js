/**
 * ИЗМЕНЕНИЯ М2: Функция управления состоянием кнопок
 * Блокирует кнопки редактирования, если нет загруженных файлов
 */

/**
 * Обновляет состояние кнопок в зависимости от наличия открытых файлов
 * Вызывать после каждого изменения массива openFiles
 */
function updateButtonsState() {
    const hasFiles = openFiles && openFiles.length > 0;
    
    // Селекторы кнопок, которые должны блокироваться при отсутствии файлов
    const editableButtons = document.querySelectorAll(`
        .tab-action-btn:not(.btn-open):not(.btn-save),
        .ribbon-btn:not(.btn-open):not(.btn-save)
    `);
    
    editableButtons.forEach(button => {
        if (hasFiles) {
            button.removeAttribute('disabled');
        } else {
            button.setAttribute('disabled', 'true');
        }
    });
}

// Точки вызова функции:

// 1. При загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateButtonsState();
});

// 2. После загрузки файла (добавить в функцию обработки загрузки)
// Пример: после successful upload
// updateButtonsState();

// 3. После закрытия файла (добавить в функцию закрытия)
// Пример: после удаления из openFiles
// updateButtonsState();

// 4. После очистки всех файлов
// Пример: в функции clearAll()
// updateButtonsState();
