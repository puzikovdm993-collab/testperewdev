# Изменения для блокировки кнопок при отсутствии файлов

## Описание
Добавлен функционал, который делает кнопки неактивными и серыми, когда нет загруженных файлов.

## Файлы с изменениями

### 1. styles/index.css
**Строки 176-198**: Добавлены CSS стили для disabled состояния кнопок

```css
.tab-action-btn:disabled,
.ribbon-btn:disabled {
    opacity: 0.5;
    background: #e5e7eb;
    color: #9ca3af;
    border-color: #d1d5db;
    cursor: not-allowed;
    pointer-events: none;
}

.tab-action-btn:disabled:hover,
.ribbon-btn:disabled:hover {
    background: #e5e7eb;
    border-color: #d1d5db;
    transform: none;
    box-shadow: none;
}

.tab-action-btn:disabled img,
.ribbon-btn:disabled img {
    opacity: 0.5;
}
```

**Что делают стили:**
- `opacity: 0.5` - делает кнопки полупрозрачными
- `background: #e5e7eb` - серый фон
- `color: #9ca3af` - серый текст
- `cursor: not-allowed` - курсор "запрещено"
- `pointer-events: none` - блокирует клики
- Отключает hover-эффекты для неактивных кнопок

### 2. scripts/index.js

#### Функция updateButtonsState() (строки 407-420)
```javascript
function updateButtonsState() {
    const hasFiles = openFiles.length > 0;

    const buttonsToDisable = document.querySelectorAll(`
        .tab-action-btn:not([onclick*="showLoadMethodModal"]):not([onclick*="showSaveMethodModal"]),
        .ribbon-btn:not(#openFilesDropdownBtn)
    `);

    buttonsToDisable.forEach(btn => {
        btn.disabled = !hasFiles;
    });
}
```

**Что делает функция:**
- Проверяет наличие файлов в массиве `openFiles`
- Находит все кнопки редактирования (кроме "Открыть" и "Сохранить")
- Устанавливает атрибут `disabled` когда файлов нет

#### Точки вызова функции:
1. **Строка 96**: При загрузке страницы (`DOMContentLoaded`)
2. **Строка 404**: При обновлении списка открытых файлов (`updateOpenFilesList()`)

## Результат
- Когда нет загруженных файлов - все кнопки редактирования неактивны и серые
- Кнопки "Открыть" и "Сохранить" остаются активными всегда
- При загрузке файла все кнопки становятся активными
- Визуально понятно, какие функции недоступны
