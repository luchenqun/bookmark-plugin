(function () {
  setTimeout(function () {
    chrome.storage.sync.get({ bookmarkServer: '' }, function (items) {
      $('.js-options-server').val(items.bookmarkServer);
    });

    $('.js-options-ok').click(() => {
      var server = $('.js-options-server').val();
      server = server.trim();
      chrome.storage.sync.set({ bookmarkServer: server }, function () {
        toastr.options.positionClass = "toast-top-full-width";
        toastr.info(server + ' 已设置为您的默认服务器，请点右上角×关闭页面');
        $('.js-options-server').val(server);
      });
    });
  }, 100);
})();
