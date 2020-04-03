(function (window) {
  var server = 'https://mybookmark.cn/';
  chrome.storage.sync.get({ bookmarkServer: 'https://mybookmark.cn/' }, function (items) {
    server = items.bookmarkServer;
    $('.js-popup-server').text(server);
    chrome.tabs.getSelected(null, function (tab) {
      var bg = chrome.extension.getBackgroundPage();
      // console.log(tab);
      var tags = [];
      var selectedTag = null;
      var login = false;
      var originUrl = tab.url;
      var originTitle = tab.title || '';
      var title = originTitle.split('-')[0].trim();

      $('#js-url').val(originUrl);
      $('#js-title').val(title);
      $('.ui.inverted.dimmer').addClass('active');

      let url = server + 'api/tags/';

      bg.jqAjax(
        url,
        'GET',
        {},
        function (_tags, textStatus, jqXHR) {
          login = true;
          tags = _tags;
          tags.sort((a, b) => {
            return a.last_use > b.last_use ? -1 : 1;
          });
          for (let tag of tags) {
            $('#js-add-tag').before(`<div class="ui label js-tag" id="${tag.id}" style="margin:3px 10px 8px 0px;cursor:default;">${tag.name}</div>`);
          }
        },
        function (xhr, textStatus) {
          if (xhr.status === 401) {
            toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', '错误');
            setTimeout(() => {
              chrome.tabs.create({
                url: server + '#/login',
              });
            }, 3000);
            login = false;
          }
        },
        null,
        function () {
          $('.ui.inverted.dimmer').removeClass('active');
          if (tags.length > 0) {
            $('#' + tags[0].id).addClass('green');
            selectedTag = tags[0].id;
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
            selectedTag = $(this).attr('id');
            $('#' + selectedTag).addClass('green');
          });
        }
      );

      $('#js-restore-title').click(() => {
        $('#js-title').val(originTitle);
      });

      $('.js-cancel').click(() => {
        window.close();
      });

      $('.js-send-bookmark').click(() => {
        if (!login) {
          toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', '错误');
          setTimeout(() => {
            chrome.tabs.create({
              url: server + '#/login',
            });
          }, 3000);
        }

        var url = server + 'api/addBookmark/';
        var params = {
          id: '',
          url: $('#js-url').val(),
          title: $('#js-title').val(),
          public: $('.ui.checkbox.js-public').checkbox('is checked') ? '1' : '0',
          tags: [selectedTag],
          description: $('#js-desc').val(),
        };

        if (!/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/.test(params.url)) {
          toastr.error('检撤到您的书签链接非法，是否忘记加http或者https了？建议直接从打开浏览器地址栏复制出来直接粘贴到输入框。', '错误');
          return;
        }
        if (!selectedTag) {
          toastr.error('您必须要选择一个分类！可新增分类，如果暂时没想到放到哪个分类，可以先选择未分类', '错误');
          return;
        }
        if (!params.title) {
          toastr.error('书签标题不能为空！', '错误');
          return;
        }

        bg.jqAjax(
          url,
          'POST',
          JSON.stringify({
            params: params,
          }),
          function (data, textStatus, jqXHR) {
            if (data.title) {
              var msg = '[ ' + data.title + ' ] 添加成功！\n' + (data.update ? '系统检测到该书签之前添加过，只更新链接，描述，标题，分类。创建日期与最后点击日期不更新！' : '') + '\n窗口 3 秒后自动关闭。';
              bg.showMsg(msg, '书签添加成功', 3000);
              window.close();
            } else {
              toastr.error('[ ' + params.title + ' ] 添加失败', '提示');
            }
          },
          function (xhr, textStatus) {
            toastr.error('[ ' + params.title + ' ] 添加失败', '提示');
          }
        );
        bg.init();
      });

      $('.js-send-note').click(() => {
        if (!login) {
          toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', '错误');
          setTimeout(() => {
            chrome.tabs.create({
              url: server + '#/login',
            });
          }, 3000);
        }

        if (!selectedTag) {
          toastr.error('您必须选择一个分类！', '错误');
          return;
        }

        var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
        var content = $('#js-desc').val();
        content = content.replace(regex, '');
        var url = server + 'api/addNote/';
        var params = {
          tag_id: selectedTag,
          content: content,
        };

        if (!params.content) {
          toastr.error('请输入备忘内容！', '错误');
          return;
        }

        while (params.content.indexOf('\n\n\n') > 0) {
          params.content = params.content.replace(/\n\n\n/g, '\n\n');
        }

        bg.jqAjax(
          url,
          'POST',
          JSON.stringify({
            params: params,
          }),
          function (data, textStatus, jqXHR) {
            var brief = params.content.length > 60 ? params.content.substring(0, 60) + ' ......' : params.content;
            if (data.retCode === 0) {
              var msg = '备忘 [ ' + brief + ' ] 添加成功！\n';
              bg.showMsg(msg, '备忘录添加成功', 3000);
              window.close();
            } else {
              toastr.error('备忘 [ ' + brief + ' ] 添加失败', '提示');
            }
          },
          function (xhr, textStatus) {
            toastr.error('备忘 [ ' + brief + ' ] 添加失败', '提示');
          }
        );
      });
    });
  });
})(window);
