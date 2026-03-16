# Изменения М2: Блокировка кнопок при отсутствии файлов

## Описание
Реализация функционала блокировки кнопок редактирования, когда не загружено ни одного изображения. Кнопки становятся серыми и неактивными.

## Файлы изменений

### 1. styles-changes-m2.css
Содержит CSS стили для визуального отображения неактивного состояния кнопок:
- Полупрозрачность (opacity: 0.5)
- Серый фон (#e5e7eb)
- Серый текст (#9ca3af)
- Заблокированный курсор (not-allowed)
- Отключение hover-эффектов

### 2. scripts-changes-m2.js
Содержит JavaScript функцию `updateButtonsState()`:
- Проверяет наличие файлов в массиве `openFiles`
- Устанавливает атрибут `disabled` для кнопок редактирования
- Кнопки "Открыть" и "Сохранить" остаются активными всегда

## Интеграция

### Шаг 1: Подключение CSS
Добавьте стили из `styles-changes-m2.css` в ваш основной CSS файл или подключите отдельным файлом:

```html
<link rel="stylesheet" href="changes_m2/styles-changes-m2.css">
```

Или скопируйте содержимое в `styles/index.css`.

### Шаг 2: Подключение JavaScript
Добавьте функцию из `scripts-changes-m2.js` в ваш основной JS файл:

1. Скопируйте функцию `updateButtonsState()` в `scripts/index.js`
2. Добавьте вызов функции в следующих местах:
   - При загрузке страницы (DOMContentLoaded)
   - После успешной загрузки файла
   - После закрытия файла
   - После очистки всех файлов

### Пример интеграции в index.js:

```javascript
// В начале файла добавьте функцию
function updateButtonsState() {
    const hasFiles = openFiles && openFiles.length > 0;
    
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

// При загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateButtonsState();
});

// В функции загрузки файла (после добавления в openFiles)
function handleFileUpload(file) {
    // ... существующий код загрузки ...
    openFiles.push(file);
    updateButtonsState(); // <-- Добавить эту строку
}

// В функции закрытия файла
function closeFile(index) {
    // ... существующий код закрытия ...
    openFiles.splice(index, 1);
    updateButtonsState(); // <-- Добавить эту строку
}
```

## Результат
- При запуске приложения без загруженных файлов все кнопки редактирования заблокированы
- Кнопки имеют серый цвет и не реагируют на наведение
- После загрузки первой файла кнопки становятся активными
- При закрытии последнего файла кнопки снова блокируются

## Примечания
- Кнопки "Открыть" и "Сохранить" всегда остаются активными
- Для правильной работы необходимо, чтобы массив открытых файлов назывался `openFiles`
- Если используются другие классы кнопок, обновите селекторы в функции `updateButtonsState()`
