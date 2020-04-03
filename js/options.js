(function () {
  setTimeout(function () {
    chrome.storage.sync.get({ bookmarkServer: '' }, function (items) {
      $('.js-options-server').val(items.bookmarkServer);
    });

    $('.js-options-ok').click(() => {
      var server = $('.js-options-server').val();
      server = server.trim();
      chrome.storage.sync.set({ bookmarkServer: server }, function () {
        var bg = chrome.extension.getBackgroundPage();
        bg.showMsg(server + ' 已设置为您的默认服务器，请点右上角×关闭页面', '设置成功', 3000);
        $('.js-options-server').val(server);
      });
    });
  }, 100);
})();
