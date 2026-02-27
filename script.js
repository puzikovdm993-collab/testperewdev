// Инициализация графа
let graph;
let canvas;

document.addEventListener('DOMContentLoaded', function() {
    // Создаем граф
    graph = new LGraph();
    
    // Создаем холст
    canvas = new LGraphCanvas("#graph-canvas", graph);
    
    // Настройки холста
    canvas.allow_dragcanvas = true;
    canvas.allow_dragnodes = true;
    canvas.allow_interaction = true;
    canvas.middle_click_slot_add_default_node = true;
    
    // Обновляем граф
    graph.start();

    // Добавляем обработчики для перетаскивания узлов
    setupNodeDragHandlers();

    // Обработчик кнопки запуска
    document.getElementById('run-workflow').addEventListener('click', runWorkflow);

    // Обновляем превью
    updatePreview();
});

function setupNodeDragHandlers() {
    const nodeItems = document.querySelectorAll('.node-item');
    
    nodeItems.forEach(item => {
        item.addEventListener('mousedown', function(e) {
            const type = this.getAttribute('data-type');
            startDragOperation(type, e);
        });
    });
}

function startDragOperation(nodeType, event) {
    // Получаем позицию курсора относительно холста
    const canvasRect = document.getElementById('graph-canvas').getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;
    
    // Создаем новый узел в зависимости от типа
    let node;
    switch(nodeType) {
        case 'image-input':
            node = LiteGraph.createNode("image/input");
            break;
        case 'blur-filter':
            node = LiteGraph.createNode("image/filter_blur");
            break;
        case 'brightness-filter':
            node = LiteGraph.createNode("image/filter_brightness");
            break;
        case 'contrast-filter':
            node = LiteGraph.createNode("image/filter_contrast");
            break;
        case 'image-output':
            node = LiteGraph.createNode("image/output");
            break;
        default:
            node = LiteGraph.createNode("basic/value");
    }
    
    if (node) {
        node.pos = [x, y];
        graph.add(node);
        canvas.setDirty(true, true);
    }
}

function runWorkflow() {
    console.log("Running workflow...");
    // Запускаем вычисление графа
    graph.runStep();
    
    // Обновляем превью
    updatePreview();
}

function updatePreview() {
    // Здесь будет реализация обновления превью
    // на основе выходных данных графа
    const previewCanvas = document.getElementById('output-preview');
    const ctx = previewCanvas.getContext('2d');
    
    // Очищаем холст
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // Рисуем тестовое изображение
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Output Preview', previewCanvas.width/2, previewCanvas.height/2);
    
    ctx.beginPath();
    ctx.arc(previewCanvas.width/2, previewCanvas.height/2, 50, 0, Math.PI * 2);
    ctx.stroke();
}

// Регистрируем базовые узлы для работы с изображениями
LiteGraph.registerNodeType("image/input", {
    title: "Image Input",
    inputs: [],
    outputs: [["image", "image"]],
    properties: { filename: "", data: null },
    onExecute: function() {
        // Здесь будет реализация загрузки изображения
        if (!this.properties.data) {
            // Заглушка для демонстрации
            this.properties.data = "sample_image_data";
        }
        this.setOutputData(0, this.properties.data);
    }
});

LiteGraph.registerNodeType("image/filter_blur", {
    title: "Blur Filter",
    inputs: [["image", "image"]],
    outputs: [["image", "image"]],
    properties: { strength: 1.0 },
    onExecute: function() {
        // Получаем входные данные
        var inputImage = this.getInputData(0);
        if (!inputImage) return;
        
        // Применяем эффект размытия
        // Здесь будет реальная реализация
        var output = inputImage; // Заглушка
        this.setOutputData(0, output);
    }
});

LiteGraph.registerNodeType("image/filter_brightness", {
    title: "Brightness Filter",
    inputs: [["image", "image"]],
    outputs: [["image", "image"]],
    properties: { brightness: 0 },
    onExecute: function() {
        // Получаем входные данные
        var inputImage = this.getInputData(0);
        if (!inputImage) return;
        
        // Применяем эффект яркости
        // Здесь будет реальная реализация
        var output = inputImage; // Заглушка
        this.setOutputData(0, output);
    }
});

LiteGraph.registerNodeType("image/filter_contrast", {
    title: "Contrast Filter",
    inputs: [["image", "image"]],
    outputs: [["image", "image"]],
    properties: { contrast: 1.0 },
    onExecute: function() {
        // Получаем входные данные
        var inputImage = this.getInputData(0);
        if (!inputImage) return;
        
        // Применяем эффект контраста
        // Здесь будет реальная реализация
        var output = inputImage; // Заглушка
        this.setOutputData(0, output);
    }
});

LiteGraph.registerNodeType("image/output", {
    title: "Image Output",
    inputs: [["image", "image"]],
    outputs: [],
    onExecute: function() {
        // Получаем входные данные
        var inputImage = this.getInputData(0);
        if (!inputImage) return;
        
        // Отображаем результат
        console.log("Output image:", inputImage);
    }
});