// ============ Функция обновления состояния кнопок ============
// Делает кнопки неактивными и серыми если нет загруженных файлов

/**
 * Обновление состояния кнопок (делает их неактивными если нет загруженных файлов)
 */
function updateButtonsState() {
    const hasFiles = openFiles.length > 0;

    // Селекторы для всех кнопок которые должны быть неактивны без файлов
    const buttonsToDisable = document.querySelectorAll(`
        .tab-action-btn:not([onclick*="showLoadMethodModal"]):not([onclick*="showSaveMethodModal"]),
        .ribbon-btn:not(#openFilesDropdownBtn)
    `);

    buttonsToDisable.forEach(btn => {
        btn.disabled = !hasFiles;
    });
}

// Примечание: Функция вызывается в следующих местах:
// 1. При загрузке страницы (строка 96): updateButtonsState();
// 2. При обновлении списка открытых файлов (строка 404): updateButtonsState();
