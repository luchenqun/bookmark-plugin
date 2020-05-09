(function (window) {
  var server = 'https://mybookmark.cn/';
  chrome.storage.sync.get({ bookmarkServer: 'https://mybookmark.cn/' }, function (items) {
    server = items.bookmarkServer;
    $('.js-popup-server').text(server);
    chrome.tabs.getSelected(null, function (tab) {
      var bg = chrome.extension.getBackgroundPage();
      var tags = [];
      var tagId = null;
      var originUrl = tab.url;
      var originTitle = tab.title || '';
      var title = originTitle.split('-')[0].trim();

      $('#js-url').val(originUrl);
      $('#js-title').val(title);
      $('.js-tags-loading').addClass('active');

      function getTags() {
        bg.jqAjax(server + 'api/tags/', 'GET', {}, function (reply) {
          // console.log('get tags', reply);
          $('.js-tags-loading').removeClass('active');

          if (reply.code == 0) {
            $(".js-add-bookmark").show();
            $(".js-login").hide();

            tags = reply.data;
            tags.sort((a, b) => a.lastUse > b.lastUse ? -1 : 1);
            for (let tag of tags) {
              $('#js-add-tag').before(`<div class="ui label js-tag" id="${tag.id}" style="margin:3px 10px 8px 0px;cursor:default;">${tag.name}</div>`);
            }

            $("html").css("width", "750px");
            $("html").css("height", $(".js-add-bookmark").height() + 25);

            if (tags.length > 0) {
              $('#' + tags[0].id).addClass('green');
              tagId = tags[0].id;
            }

            $('#js-add-tag').click(function () {
              toastr.info('请到网站分类页面添加分类，3秒后自动打开新的网页。', '提示');
              setTimeout(() => {
                chrome.tabs.create({
                  url: server + '#/tags',
                });
                window.close();
              }, 3000);
            });

            $('.js-tag').click(function () {
              $('.js-tag.green').removeClass('green');
              tagId = $(this).attr('id');
              $('#' + tagId).addClass('green');
            });
          } else if (reply.code == 401) {
            $(".js-add-bookmark").hide();
            $(".js-login").show();
            $("html").css("width", "350px");
            $("html").css("height", "260px");

            $('.js-send-login').click(function () {
              let params = {
                username: $('#js-username').val(),
                password: $('#js-password').val()
              };

              $('.js-login-loading').addClass('active');
              bg.jqAjax(server + "api/userLogin/", 'POST', JSON.stringify(params), function (reply) {
                console.log('userLogin reply = ', reply);
                $('.js-login-loading').removeClass('active');
                if (reply.code == 0) {
                  $(".js-add-bookmark").show();
                  $(".js-login").hide();
                  chrome.storage.sync.set({ Authorization: reply.data.token }, function () {
                    bg.reloadStorage(getTags);
                  });
                } else {
                  toastr.error('登录失败，请重试。', '错误');
                }
              })
            });
          }
        });
      }

      getTags();

      $('#js-restore-title').click(() => {
        $('#js-title').val(originTitle);
      });

      $('.js-cancel').click(() => {
        window.close();
      });

      $('.js-send-bookmark').click(() => {
        var url = server + 'api/bookmarkAdd/';
        var params = {
          url: $('#js-url').val(),
          title: $('#js-title').val(),
          public: $('.ui.checkbox.js-public').checkbox('is checked') ? '1' : '0',
          tagId,
          description: $('#js-desc').val(),
        };

        if (!/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/.test(params.url)) {
          toastr.error('检撤到您的书签链接非法，是否忘记加http或者https了？建议直接从打开浏览器地址栏复制出来直接粘贴到输入框。', '错误');
        } else if (!tagId) {
          toastr.error('您必须要选择一个分类！可新增分类，如果暂时没想到放到哪个分类，可以先选择未分类', '错误');
        } else if (!params.title) {
          toastr.error('书签标题不能为空！', '错误');
        } else {
          bg.jqAjax(url, 'POST', JSON.stringify(params), function (reply) {
            if (reply.code == 0) {
              // var msg = '[ ' + params.title + ' ] 添加成功！' + '\n窗口 1 秒后自动关闭。';
              // toastr.success(msg, '提示');
              $('body').dimmer('show');
              setTimeout(() => { window.close(); }, 1000);
            } else {
              if (reply.code == 401) {
                $(".js-add-bookmark").hide();
                $(".js-login").show();
                $("html").css("width", "350px");
                $("html").css("height", "280px");
              }
              toastr.error('[ ' + params.title + ' ] 添加失败', '提示');
            }
          });
        }
        bg.init();
      });
    });
  });
})(window);
