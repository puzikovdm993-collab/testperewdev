// Новый интерфейс WTIS - JavaScript

document.addEventListener('DOMContentLoaded', () => {
    initInterface();
});

function initInterface() {
    // Инициализация меню
    initMenus();
    
    // Инициализация инструментов
    initTools();
    
    // Инициализация модальных окон
    initModals();
    
    // Инициализация вкладок
    initTabs();
    
    // Инициализация холста
    initCanvas();
    
    // Инициализация ползунков
    initSliders();
    
    // Инициализация выбора цвета
    initColorPicker();
}

// ===== МЕНЮ =====
function initMenus() {
    // Обработка выпадающих меню
    const menuDropdowns = document.querySelectorAll('.menu-dropdown');
    
    menuDropdowns.forEach(dropdown => {
        const items = dropdown.querySelectorAll('.dropdown-item, .btn-small');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                const action = item.dataset.action;
                if (action) {
                    handleMenuAction(action);
                }
            });
        });
    });
}

function handleMenuAction(action) {
    console.log('Menu action:', action);
    
    switch(action) {
        case 'new':
            createNewFile();
            break;
        case 'open':
            openFile();
            break;
        case 'save':
            saveFile();
            break;
        case 'save-as':
            saveFileAs();
            break;
        case 'undo':
            undo();
            break;
        case 'redo':
            redo();
            break;
        case 'history':
            showHistoryModal();
            break;
        case 'zoom-in':
            zoomIn();
            break;
        case 'zoom-out':
            zoomOut();
            break;
        case 'zoom-reset':
            zoomReset();
            break;
        case 'settings':
            showSettingsModal();
            break;
        case 'server-manager':
            showServerManager();
            break;
        default:
            console.log('Unhandled action:', action);
    }
}

// ===== ИНСТРУМЕНТЫ =====
function initTools() {
    const toolBtns = document.querySelectorAll('.tool-btn');
    
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Убираем активный класс у всех кнопок
            toolBtns.forEach(b => b.classList.remove('active'));
            // Добавляем активный класс нажатой кнопке
            btn.classList.add('active');
            
            const tool = btn.dataset.tool;
            console.log('Tool selected:', tool);
            onToolChange(tool);
        });
    });
}

function onToolChange(tool) {
    // Логика смены инструмента
    switch(tool) {
        case 'select':
            setCursor('default');
            break;
        case 'move':
            setCursor('move');
            break;
        case 'brush':
            setCursor('crosshair');
            break;
        case 'eraser':
            setCursor('cell');
            break;
        case 'eyedropper':
            setCursor('copy');
            break;
        default:
            setCursor('default');
    }
}

function setCursor(cursor) {
    const canvas = document.getElementById('mainCanvas');
    if (canvas) {
        canvas.style.cursor = cursor;
    }
}

// ===== МОДАЛЬНЫЕ ОКНА =====
function initModals() {
    // Закрытие модальных окон по кнопкам
    const closeBtns = document.querySelectorAll('[data-modal]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            hideModal(modalId);
        });
    });
    
    // Закрытие по клику на overlay
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
    
    // Вкладки настроек
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            switchSettingsTab(targetTab);
        });
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function showHistoryModal() {
    showModal('historyModal');
    renderHistoryTimeline();
}

function showSettingsModal() {
    showModal('settingsModal');
}

function switchSettingsTab(tabName) {
    // Убираем активный класс у всех вкладок
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    
    // Добавляем активный класс выбранной вкладке
    const activeTab = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
    const activePanel = document.getElementById(`${tabName}Settings`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activePanel) activePanel.classList.add('active');
}

function renderHistoryTimeline() {
    const timeline = document.getElementById('historyTimeline');
    if (!timeline) return;
    
    // Пример данных истории
    const historyItems = [
        { name: 'Открыть файл', time: '10:30:45' },
        { name: 'Применить фильтр', time: '10:31:12' },
        { name: 'Обрезка', time: '10:32:08' },
        { name: 'Коррекция цвета', time: '10:33:22' }
    ];
    
    timeline.innerHTML = historyItems.map((item, index) => `
        <div class="history-item" style="
            padding: 10px 12px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-sm);
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <span style="color: var(--text-secondary); font-size: 13px;">${index + 1}. ${item.name}</span>
            <span style="color: var(--text-muted); font-size: 11px;">${item.time}</span>
        </div>
    `).join('');
}

// ===== ВКЛАДКИ ФАЙЛОВ =====
function initTabs() {
    const tabsList = document.getElementById('tabsList');
    const newTabBtn = document.querySelector('.new-tab-btn');
    
    if (newTabBtn) {
        newTabBtn.addEventListener('click', () => {
            createNewTab();
        });
    }
    
    if (tabsList) {
        tabsList.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-item');
            const tabClose = e.target.closest('.tab-close');
            
            if (tabClose && tabItem) {
                closeTab(tabItem);
            } else if (tabItem) {
                activateTab(tabItem);
            }
        });
    }
}

function createNewTab() {
    const tabsList = document.getElementById('tabsList');
    if (!tabsList) return;
    
    const tabCount = tabsList.querySelectorAll('.tab-item').length + 1;
    const tab = document.createElement('div');
    tab.className = 'tab-item';
    tab.innerHTML = `
        <span class="tab-icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>
        </span>
        <span class="tab-name">Без названия-${tabCount}</span>
        <button class="tab-close">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;
    
    tabsList.appendChild(tab);
    activateTab(tab);
}

function activateTab(tab) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
}

function closeTab(tab) {
    const tabsList = document.getElementById('tabsList');
    if (tabsList.querySelectorAll('.tab-item').length > 1) {
        tab.remove();
    }
}

// ===== ХОЛСТ =====
function initCanvas() {
    const canvas = document.getElementById('mainCanvas');
    const overlay = document.getElementById('overlayCanvas');
    const container = document.getElementById('canvasContainer');
    
    if (!canvas || !overlay) return;
    
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlay.getContext('2d');
    
    // Очистка холста
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Отслеживание позиции курсора
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);
        
        updateCursorPosition(x, y);
    });
    
    // Масштабирование колесом мыши
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.ctrlKey) {
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    });
}

function updateCursorPosition(x, y) {
    const positionEl = document.getElementById('cursorPosition');
    if (positionEl) {
        positionEl.textContent = `X: ${x}, Y: ${y}`;
    }
}

// ===== ЗУМ =====
let currentZoom = 100;

function zoomIn() {
    currentZoom = Math.min(currentZoom + 10, 500);
    updateZoom();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom - 10, 10);
    updateZoom();
}

function zoomReset() {
    currentZoom = 100;
    updateZoom();
}

function updateZoom() {
    const canvas = document.getElementById('mainCanvas');
    const overlay = document.getElementById('overlayCanvas');
    const zoomInfo = document.getElementById('zoomInfo');
    const zoomLevel = document.querySelector('.zoom-level');
    
    if (canvas && overlay) {
        const scale = currentZoom / 100;
        canvas.style.transform = `scale(${scale})`;
        overlay.style.transform = `scale(${scale})`;
    }
    
    if (zoomInfo) zoomInfo.textContent = `${currentZoom}%`;
    if (zoomLevel) zoomLevel.textContent = `${currentZoom}%`;
}

// ===== ПОЛЗУНКИ =====
function initSliders() {
    const sliders = document.querySelectorAll('.slider');
    
    sliders.forEach(slider => {
        slider.addEventListener('input', () => {
            updateSliderValue(slider);
        });
    });
}

function updateSliderValue(slider) {
    const valueSpan = document.getElementById(`${slider.id}Value`);
    if (valueSpan) {
        let value = slider.value;
        if (slider.id.includes('Opacity') || slider.id.includes('Hardness')) {
            value += '%';
        }
        valueSpan.textContent = value;
    }
}

// ===== ВЫБОР ЦВЕТА =====
function initColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    const foregroundColor = document.getElementById('foregroundColor');
    const swatches = document.querySelectorAll('.color-swatch');
    
    if (foregroundColor && colorPicker) {
        foregroundColor.addEventListener('click', () => {
            colorPicker.click();
        });
        
        colorPicker.addEventListener('input', (e) => {
            foregroundColor.style.backgroundColor = e.target.value;
        });
    }
    
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.dataset.color;
            if (foregroundColor) {
                foregroundColor.style.backgroundColor = color;
            }
            if (colorPicker) {
                colorPicker.value = color;
            }
        });
    });
}

// ===== ФАЙЛОВЫЕ ОПЕРАЦИИ =====
function createNewFile() {
    console.log('Creating new file...');
    // TODO: Реализовать создание нового файла
}

function openFile() {
    console.log('Opening file...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tpt,.png,.jpg,.jpeg';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            loadFile(file);
        }
    };
    input.click();
}

function loadFile(file) {
    console.log('Loading file:', file.name);
    // TODO: Реализовать загрузку файла
}

function saveFile() {
    console.log('Saving file...');
    // TODO: Реализовать сохранение файла
}

function saveFileAs() {
    console.log('Saving file as...');
    // TODO: Реализовать сохранение файла как
}

// ===== ИСТОРИЯ =====
function undo() {
    console.log('Undo');
    // TODO: Реализовать отмену действия
}

function redo() {
    console.log('Redo');
    // TODO: Реализовать повтор действия
}

// ===== СЕРВЕР =====
function showServerManager() {
    console.log('Showing server manager...');
    window.location.href = '/appdb.html';
}

// Экспорт функций для глобального доступа
window.undo = undo;
window.redo = redo;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.zoomReset = zoomReset;
window.showHistoryModal = showHistoryModal;
window.showSettingsModal = showSettingsModal;
window.showServerManager = showServerManager;

// ===== TAB ПАНЕЛИ =====
function initTabPanels() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Убираем активный класс у всех кнопок и панелей
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            // Добавляем активный класс выбранной кнопке и панели
            btn.classList.add('active');
            const panel = document.getElementById(targetTab);
            if (panel) {
                panel.classList.add('active');
            }
            
            // Показываем панель с инструментами
            const panelsContainer = document.querySelector('.tab-panels');
            if (panelsContainer) {
                panelsContainer.classList.add('active');
            }
        });
    });
    
    // Закрытие панели при клике вне её
    document.addEventListener('click', (e) => {
        const panelsContainer = document.querySelector('.tab-panels');
        const tabMenu = document.querySelector('.tab-menu');
        
        if (panelsContainer && !panelsContainer.contains(e.target) && !tabMenu.contains(e.target)) {
            panelsContainer.classList.remove('active');
        }
    });
}

// Добавляем инициализацию tab-панелей
const originalInit = initInterface;
initInterface = function() {
    originalInit();
    initTabPanels();
}
