let mode,
    frame,
    frameList,
    imgTimer,
    imgIndex = 0,
    imgDataUrlMap = {},
    imageEle,
    fabricCanvas,
    editor,
    scale = 1,
    initWidth,
    initHeight,
    pointer,
    pencil,
    rectangle,
    text,
    undoBtn,
    saveBtn,
    select,
    colorConfig,
    pencilConfig,
    rectangleConfig,
    textConfig;

$(function() {
    // 区分图片和GIF
    if (window.frameList.length === 1) {
        mode = 'CAMERA';
    }
    if (window.frameList.length >1) {
        mode = 'VIDEO';
    }

    // 画布初始化大小设置
    frameList = window.frameList;
    initWidth = frameList[0].width;
    initHeight = frameList[0].height;

    initDom();
    initConfigValue();
    // 滚轮事件
    initWheel();
    // 绑定各种事件
    bindEvent();
    // 展示截屏
    showImage();
    // canvas 监听鼠标事件
    initCanvasMouseEvent();
    // 默认是移动，缩放模式
    changeOperation(pointer);
});

function initDom() {
    // 图片显示界面
    imageEle = $('#chrome-extension-capture-editor-img');
    fabricCanvas = new fabric.Canvas('chrome-extension-capture-editor-canvas');
    editor = $('.chrome-extension-capture-editor-background');
    updateFabricSize(scale);

    // 编辑器操作按钮
    saveBtn = $('.chrome-extension-capture-editor-save');
    pointer = $('.chrome-extension-capture-editor-pointer');
    pencil = $('.chrome-extension-capture-editor-pencil');
    rectangle = $('.chrome-extension-capture-editor-rectangle');
    text = $('.chrome-extension-capture-editor-text');
    undoBtn = $('.chrome-extension-capture-editor-undo');

    // 编辑器配置项
    colorConfig = $('#chrome-extension-capture-color-config');
    pencilConfig = $('#chrome-extension-capture-pencil-config');
    rectangleConfig = $('#chrome-extension-capture-rectangle-config');
    textConfig = $('#chrome-extension-capture-text-config');
}

function initConfigValue() {
    const colorList = [
        {
            text: '薄暮',
            id: '#f5222d'
        },
        {
            text: '日出',
            id: '#fadb14'
        },
        {
            text: '青柠',
            id: '#a0d911'
        },
        {
            text: '明青',
            id: '#13c2c2'
        },
        {
            text: '拂晓蓝',
            id: '#1890ff'
        },
        {
            text: '酱紫',
            id: '#722ed1'
        }
    ];

    // 初始化颜色
    colorConfig.select2({
        placeholder : '选择颜色',
        minimumResultsForSearch: -1,
        data: colorList
    });

    chrome.storage.sync.get({color: '#f5222d'}, function(items) {
        const color = items.color;

        colorConfig.val(color).trigger('change');
    });

    // 初始化画笔大小
    pencilConfig.select2({
        placeholder : '选择笔画的粗度',
        minimumResultsForSearch: -1,
        data: [1,3,5,7,9]
    });

    chrome.storage.sync.get({pencilSize: 3}, function(items) {
        const pencilSize = items.pencilSize;

        pencilConfig.val(pencilSize).trigger('change');
    });

    // 初始化边框宽度
    rectangleConfig.select2({
        placeholder : '选择边框大小',
        minimumResultsForSearch: -1,
        data: [1, 2, 3,5,7,9]
    });

    chrome.storage.sync.get({borderSize: 2}, function(items) {
        const borderSize = items.borderSize;

        rectangleConfig.val(borderSize).trigger('change');
    });

    // 初始化文字大小
    textConfig.select2({
        placeholder : '选择文字大小',
        minimumResultsForSearch: -1,
        data: [8,12,14,18,24,36]
    });

    chrome.storage.sync.get({fontSize: 14}, function(items) {
        const fontSize = items.fontSize;

        textConfig.val(fontSize).trigger('change');
    });
}

// 修改操作类型
function changeOperation(operation) {
    if (select === operation) {
        changeOperation(pointer);
        return;
    }

    if (operation === pointer) {
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.selection = true;

        fabricCanvas.forEachObject((obj) => {
            obj.selectable = true;
        })
    }

    if (operation !== pointer) {
        fabricCanvas.selection = false;

        fabricCanvas.forEachObject((obj) => {
            obj.selectable = false;
        })
    }

    if (operation !== pencil) {
        stopDrawingMode();
    }

    select = operation;
    $('svg').attr("fill", '#777778');
    select.children(":first").attr("fill", 'red');
}

// 显示截图
function showImage() {
    if (isCamera()) {
        imageEle.attr('src', frameList[0].toDataURL());
    }
    if (isVideo()) {
        chrome.storage.sync.get({frame: 10}, function(items) {
            frame = items.frame;
            imgTimer = setInterval(carouselImage, 1e3 / frame);
        });
    }
}

// 循环显示图片
function carouselImage() {
    imgIndex = imgIndex > frameList.length - 1? 0: imgIndex;
    let dataUrl = null;

    if (imgDataUrlMap[imgIndex]) {
        dataUrl = imgDataUrlMap[imgIndex]
    } else {
        dataUrl = frameList[imgIndex].toDataURL();
        imgDataUrlMap[imgIndex] = dataUrl;
    }

    imgIndex++;
    imageEle.attr('src', dataUrl);
}

// 画布随滚轮变化大小
function initWheel() {
    editor.on('mousewheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        scale = e.originalEvent.deltaY > 0 ? .98 * scale : 1.02 * scale;

        updateFabricSize(scale);
    })
}

// 更新大小
function updateFabricSize(scale) {
    fabricCanvas.setDimensions({
        width: Math.round(initWidth * scale),
        height: Math.round(initHeight * scale)
    });
    fabricCanvas.setZoom(scale)
}

// 制作动图
function makeGif(imgList) {
    const gifWorker = new GIF({
        workers: 4,
        quality: 10,
        dither: true,
        workerScript:'./libs/gif/gif.worker.js'
    });

    return new Promise((resolve, reject) => {
        try {
            imgList.forEach((img) => {
                // 一帧时长 1e3 / frame
                gifWorker.addFrame(img, {delay: 1e3 / frame});
            });
            //最后生成一个blob对象
            gifWorker.on('finished', function(blob) {
                resolve(URL.createObjectURL(blob));
            });
            gifWorker.render();
        } catch (e) {
            reject(e)
        }
    })
}

function bindEvent() {
    // 保存按钮
    saveBtn.click(function(){
        const cvs =  fabricCanvas.contextContainer.canvas;
        const canvasList = [];

        // 每帧的图片合成
        frameList.forEach((canvas) => {
            const newCvs = document.createElement("canvas");
            newCvs.width = initWidth;
            newCvs.height = initHeight;

            newCvs.getContext("2d").drawImage(canvas, 0, 0);
            newCvs.getContext("2d").drawImage(cvs, 0, 0, initWidth, initHeight);
            canvasList.push(newCvs);
        });

        // 图片直接打开
        if (isCamera()) {
            window.chrome.tabs.create({
                url: canvasList[0].toDataURL()
            })
        }

        // gif 下载
        if (isVideo()) {
            makeGif(canvasList).then((dataUrl) => {
                download(dataUrl);
            })
        }
    });

    // 选择按钮
    pointer.click(function(){
        fabricCanvas.defaultCursor = 'default';
        changeOperation(pointer);
    });

    // 自由绘制
    pencil.click(function(){
        changeOperation(pencil);
        startDrawingMode();
    });

    // 框线绘制
    rectangle.click(function(){
        changeOperation(rectangle);
    });

    // 添加文本
    text.click(function(){
        fabricCanvas.defaultCursor = 'text';
        changeOperation(text);
    });

    // 清空
    undoBtn.click(function(){
        fabricCanvas.clear();
    });

    // 选中颜色
    colorConfig.on("select2:select",function(e){
        const color = e.target.value;

        if (fabricCanvas.freeDrawingBrush) {
            fabricCanvas.freeDrawingBrush.color = color;
        }
        chrome.storage.sync.set({color});
    });

    // 改变画笔
    pencilConfig.on("select2:select",function(e){
        const pencilSize = e.target.value;

        if (fabricCanvas.freeDrawingBrush) {
            fabricCanvas.freeDrawingBrush.width = pencilSize;
        }
        chrome.storage.sync.set({pencilSize});
    });

    // 改变矩形框
    rectangleConfig.on("select2:select",function(e){
        const borderSize = e.target.value;

        chrome.storage.sync.set({borderSize});
    });

    // 改变文字大小
    textConfig.on("select2:select",function(e){
        const fontSize = e.target.value;

        chrome.storage.sync.set({fontSize});
    });
}

function initCanvasMouseEvent() {
    let x, y, start;

    fabricCanvas.on('mouse:down', (opt) => {
        // 当前位置
        const pos = opt.absolutePointer;

        switch (select) {
            case pointer:
                fabricCanvas.renderAll();
                break;
            case text:
                addText(pos);
                changeOperation(pointer);
                break;
            case rectangle:
                if (!start) {
                    x = pos.x;
                    y = pos.y;
                    start = true;
                    addRectangle(pos);
                }
                break;
            default:
                break
        }
    });

    fabricCanvas.on('mouse:move', (opt) => {
        const pos = opt.absolutePointer;
        switch (select) {
            case rectangle:
                if (start) {
                    resizeRectangle(x, y, pos);
                }
                break;
            default:
                break
        }
    });

    fabricCanvas.on('mouse:up', () => {
        switch (select) {
            case rectangle:
                if (start) {
                    const square = fabricCanvas.getActiveObject();
                    fabricCanvas.add(square);

                    changeOperation(pointer);
                    x = y = 0;
                    start = false;
                }
                break;
            default:
                break
        }
    });

    $(document).bind('click', function(event) {
        let evt = event.srcElement ? event.srcElement : event.target;
        const tagName = evt.tagName;

        if (tagName.toUpperCase() !== 'CANVAS') {
            fabricCanvas.discardActiveObject();

            fabricCanvas.renderAll()
        }
    });
}

// 添加文本
function addText (pos) {
    const color = colorConfig.val();
    const fontSize = textConfig.val();
    const text = new fabric.IText('', {
        borderColor: color,
        editingBorderColor: color,
        left: pos.x,
        top: pos.y - 10,
        transparentCorners: true,
        fontSize: fontSize,
        fill: color,
        padding: 5,
        cornerSize: 5,
        cornerColor: color,
        rotatingPointOffset: 20
    });

    fabricCanvas.add(text).setActiveObject(text);
    text.enterEditing();
}

// canvas 添加矩形边框
function addRectangle(pos) {
    const color = colorConfig.val();
    const borderSize = rectangleConfig.val();
    const square = new fabric.Rect({
        strokeWidth: parseInt(borderSize, 10),
        stroke: color,
        editingBorderColor: color,
        width: 1,
        height: 1,
        left: pos.x,
        top: pos.y,
        fill: 'transparent',
        padding: 5,
        cornerSize: 5,
        cornerColor: color,
        rotatingPointOffset: 20,
    });

    fabricCanvas.add(square);
    fabricCanvas.setActiveObject(square);
}

// 更新矩形框的大小
function resizeRectangle(initX, initY, pos) {
    const x = Math.min(pos.x, initX),
        y = Math.min(pos.y, initY),
        w = Math.abs(pos.x - initX),
        h = Math.abs(pos.y - initY);
    const square = fabricCanvas.getActiveObject();
    if (square) {
        console.log(square);
        square.set('top', y).set('left', x).set('width', w).set('height', h);
        fabricCanvas.renderAll();
    }
}

// 开启自由绘制模式
function startDrawingMode() {
    const color = colorConfig.val();
    const pencilSize = pencilConfig.val();
    const brush = new fabric.PencilBrush(fabricCanvas);

    fabricCanvas.isDrawingMode = true;
    brush.color = color;
    brush.width = pencilSize;
    fabricCanvas.freeDrawingBrush = brush;
}

// 关闭自由绘制
function stopDrawingMode() {
    fabricCanvas.isDrawingMode = false
}

// 根据链接下载文件
function download(href) {
    const a = document.createElement("a");
    a.target = '_blank';
    a.href = href;
    a.click();
}

function isCamera() {
    return mode === 'CAMERA';
}

function isVideo() {
    return mode === 'VIDEO';
}
