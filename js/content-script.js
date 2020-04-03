// 注意，必须设置了run_at=document_start 此段代码才会生效
document.addEventListener('DOMContentLoaded', function () {
  // injectCustomJs(); // 注入自定义JS
});

// 向页面注入JS
function injectCustomJs(jsPath) {
  jsPath = jsPath || 'js/inject.js';
  var temp = document.createElement('script');
  temp.setAttribute('type', 'text/javascript');
  temp.src = chrome.extension.getURL(jsPath);// 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.onload = function () {
    this.parentNode.removeChild(this);
  };
  document.body.appendChild(temp);
}
