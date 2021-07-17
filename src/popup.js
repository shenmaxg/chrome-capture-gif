let frameEle, qualityEle, submitBtn, alertEle;

$(function() {
    // 定义dom
    initDom();
	// 初始化select
	initSelect();
	// 初始确定化事件监听
	initListener();
});

function initSelect() {
    frameEle.select2({
        placeholder : '选择每秒帧数',
        minimumResultsForSearch: -1,
        data: [
            6, 8, 10, 12, 14, 16, 18, 20
        ]
    });

    chrome.storage.sync.get({frame: 10}, function(items) {
        const frame = items.frame;

        frameEle.val(frame).trigger('change');
    });

    qualityEle.select2({
        placeholder : '选择画质( 10 为最佳)',
        minimumResultsForSearch: -1,
        data: [
            10, 8, 6, 4, 2
        ]
    });

    chrome.storage.sync.get({quality: 10}, function(items) {
        const quality = items.quality;

        qualityEle.val(quality).trigger('change');
    });
}

function initListener() {
    alertMsg(`请在页面上点击【右键 -> GIF 截图】`, 'default');

    // 提交基本配置
    submitBtn.on("click", function() {
        const frame = frameEle.select2('val');

        // 校验非空
        if (!frame) {
            alertMsg('请选择帧数', 'danger');
        } else {
            window.close();
        }
    });

    // 选中帧数
    frameEle.on("select2:select",function(e){
        const frame = e.target.value;

        chrome.storage.sync.set({frame});
    });

    // 选中画质
    qualityEle.on("select2:select",function(e){
        const quality = e.target.value;

        chrome.storage.sync.set({quality});
    });
}

function alertMsg(msg, type) {
    if (type === 'danger') {
        alertEle.css('color','#c40014');
        alertEle.css('backgroundColor','#f2dede');
    }
    else if (type === 'success') {
        alertEle.css('backgroundColor','#f6ffed');
        alertEle.css('color','#27c14c');
    }
    else if (type === 'default') {
        alertEle.css('backgroundColor','#f0f2f5');
        alertEle.css('color','#1890ff');
    }
    alertEle.html(msg);
}

function initDom() {
    frameEle = $('#chrome-extension-capture-gif-frame');
    qualityEle = $('#chrome-extension-capture-gif-quality');
    submitBtn = $('#chrome-extension-capture-gif-submit-config');
    alertEle = $('#chrome-extension-capture-gif-popup-alert');
}

