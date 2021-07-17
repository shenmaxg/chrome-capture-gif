let port, promises, quality, frame;

let width, height;

// 右键菜单演示
chrome.contextMenus.create({
    title: "GIF 截图",
    onclick: function(){
        sendMessageToContentScript({cmd:'prepare capture'});
    }
});

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    dispatchEvent(request, sender, sendResponse);
    return true;
});

// 发送信息到ContentScript
function sendMessageToContentScript(message, callback) {
    chrome.tabs.query({active: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            if(callback) callback(response);
        });
    });
}

// 事件分发
function dispatchEvent(request, sender, sendResponse) {
    switch (request.cmd) {
        case 'capture screen':
            handlerCaptureScreenEvent(request.params);
            sendResponse({});
            break;
        default:
            return false;
    }
}

chrome.runtime.onConnect.addListener(function(e) {
    if (e.name === "shenmax") {
        port = e;
        port.onMessage.addListener(function(request) {
            switch (request.cmd) {
                case 'start recording':
                    handlerStartRecordingEvent(request.params);
                    break;
                case 'capture gif':
                    handlerRecordingEvent(request.params);
                    break;
                case 'stop recording':
                    handlerStopRecordingEvent(request.params);
                    break;
                default:
                    return false;
            }
        });
    }
});

// 截屏
function handlerCaptureScreenEvent({sx, sy, sWidth, sHeight, quality, clientHeight, clientWidth}) {
    capture(quality).then((dataUrl) => {
        slice(dataUrl,sx, sy, sWidth, sHeight, clientWidth, clientHeight).then((canvas) => {
            window.open("editor.html").frameList = [canvas];
        })
    });
}

// 开始记录 GIF
function handlerStartRecordingEvent(params) {
    promises = [];
    quality = params.quality;
    frame = params.frame;
}

// 记录单个 frame
function handlerRecordingEvent({sx, sy, sWidth, sHeight}) {
    promises.push(capture(quality).then((dataUrl) => {
        return slice(dataUrl, sx, sy, sWidth, sHeight);
    }));
}

// 跳转到编辑页
function handlerStopRecordingEvent() {
    Promise.all(promises).then((canvasList) => {
        window.open("editor.html").frameList = canvasList;
        quality = null;
        frame = null;
        promises = null;
        port.disconnect();
    });
}

// 截图
function capture(quality) {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.captureVisibleTab(null, {
                quality : 10 * quality
            }, function(dataUrl) {
                resolve(dataUrl)
            });
        } catch (e) {
            reject(e)
        }
    })
}

// 图片切割
function slice(dataUrl, sx, sy, sWidth, sHeight, clientWidth, clientHeight) {
    return new Promise((resolve, reject) => {
        try {
            // 创建画布
            let canvas = document.getElementsByTagName('canvas');
            if (canvas.length === 0) {
                canvas = document.createElement("canvas");
            }

            const devicePixelRatio = window.devicePixelRatio
            canvas.width = sWidth * devicePixelRatio;
            canvas.height = sHeight * devicePixelRatio;
            canvas.style.width = sWidth;
            canvas.style.height = sHeight;
            const context = canvas.getContext("2d");

            dataUrl2Img(dataUrl, clientWidth, clientHeight).then((img) => {
                // 裁剪 canvas
                context.drawImage(img, sx * devicePixelRatio, sy * devicePixelRatio, sWidth * devicePixelRatio, sHeight * devicePixelRatio, 0, 0, sWidth * devicePixelRatio, sHeight * devicePixelRatio);
                resolve(canvas);
            });
        } catch (e) {
            reject(e)
        }
    })
}

// dataUrl 转变为 img
function dataUrl2Img(dataUrl, clientWidth, clientHeight) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();

            img.width = clientWidth;
            img.height = clientHeight;
            img.style.width = clientWidth;
            img.style.height = clientHeight;
            img.src = dataUrl;
            img.onload = function(){
                resolve(img);
            };
        } catch (e) {
            reject(e)
        }
    });
}
