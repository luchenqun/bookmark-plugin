console.log('bookmark init background');
var server = 'https://mybookmark.cn/';
chrome.storage.sync.get({ bookmarkServer: 'https://mybookmark.cn/' }, function (items) {
  server = items.bookmarkServer;
});

// 预留一个方法给popup调用
function showMsg(body, title, time) {
  var note = new Notification(title || '通知', {
    dir: 'auto',
    tag: 'bookmark',
    body: body,
    icon: 'img/note.png',
    renotify: true,
  });

  if (time) {
    setTimeout(() => {
      note.close();
    }, time);
  }
}

function jqAjax(url, type, data, successCallback, errorCallback, beforeSendCallback, completeCallback) {
  //console.log(url, type, data);
  $.ajax({
    url: url,
    type: type, //GET POST
    contentType: 'application/json', //必须有
    async: true, //或false,是否异步
    data: data,
    timeout: 3000, //超时时间
    dataType: 'json', //返回的数据格式：json/xml/html/script/jsonp/text
    success: function (data, textStatus, jqXHR) {
      successCallback && successCallback(data, textStatus, jqXHR);
    },
    error: function (xhr, textStatus) {
      errorCallback && errorCallback(xhr, textStatus);
    },
    beforeSend: function (xhr) {
      beforeSendCallback && beforeSendCallback(xhr);
    },
    complete: function () {
      completeCallback && completeCallback();
    },
  });
}

function addBookmark(info, tab, tagId) {
  let url = server + 'api/addBookmark/';
  let params = {
    id: '',
    url: info.pageUrl,
    title: tab.title,
    public: '1',
    tags: [tagId],
    description: '',
  };
  jqAjax(
    url,
    'POST',
    JSON.stringify({
      params: params,
    }),
    function (data, textStatus, jqXHR) {
      if (data.title) {
        var msg = '[ ' + data.title + ' ] 添加成功！\n' + (data.update ? '系统检测到该书签之前添加过，只更新链接，描述，标题，分类。创建日期与最后点击日期不更新！' : '') + '\n窗口 3 秒后自动关闭。';
        showMsg(msg, '书签添加成功', 3000);
        init();
      } else {
        showMsg('[ ' + params.title + ' ] 添加失败', '书签添加失败', 3000);
      }
    },
    function (xhr, textStatus) {
      showMsg('[ ' + params.title + ' ] 添加失败', '书签添加失败', 3000);
    }
  );
}

function addNote(info, tab, tagId) {
  let url = server + 'api/addNote/';
  let params = {
    tag_id: tagId,
    content: info.selectionText,
  };

  while (params.content.indexOf('\n\n\n') > 0) {
    params.content = params.content.replace(/\n\n\n/g, '\n\n');
  }

  jqAjax(
    url,
    'POST',
    JSON.stringify({
      params: params,
    }),
    function (data, textStatus, jqXHR) {
      var brief = params.content.length > 60 ? params.content.substring(0, 60) + ' ......' : params.content;
      if (data.retCode === 0) {
        var msg = '备忘 [ ' + brief + ' ] 添加成功！\n';
        showMsg(msg, '备忘录添加成功', 3000);
      } else {
        showMsg('备忘 [ ' + brief + ' ] 添加失败', '备忘录添加失败！', 6000);
      }
    },
    function (xhr, textStatus) {
      showMsg('备忘 [ ' + brief + ' ] 添加失败', '备忘录添加失败！', 6000);
    }
  );
}

function init() {
  console.log('bookmark init contextMenus');
  jqAjax(
    server + 'api/tags/',
    'GET',
    {},
    function (tags, textStatus, jqXHR) {
      chrome.contextMenus.removeAll();
      tags.sort((a, b) => {
        return a.last_use > b.last_use ? -1 : 1;
      });

      const contextPageAddUrl = 'page';
      const contextSelectionAddNote = 'selection';

      var parentIdPageAddUrl = chrome.contextMenus.create({
        title: '添加当前网址到书签系统',
        id: 'PageAddUrl',
        contexts: [contextPageAddUrl],
        onclick: function (info, tab) {
          addBookmark(info, tab, tags[0].id);
        },
      });

      var parentIdSelectionAddNote = chrome.contextMenus.create({
        title: '添加备忘到系统',
        id: 'SelectionAddNote',
        contexts: [contextSelectionAddNote],
        onclick: function (info, tab) {
          addNote(info, tab, tags[0].id);
        },
      });

      for (const tag of tags) {
        chrome.contextMenus.create({
          title: tag.name,
          id: 'u' + tag.id.toString(),
          contexts: [contextPageAddUrl],
          parentId: parentIdPageAddUrl,
          onclick: function (info, tab) {
            addBookmark(info, tab, tag.id);
          },
        });

        chrome.contextMenus.create({
          title: tag.name,
          id: 'n' + tag.id.toString(),
          contexts: [contextSelectionAddNote],
          parentId: parentIdSelectionAddNote,
          onclick: function (info, tab) {
            chrome.tabs.executeScript(
              {
                code: 'window.getSelection().toString();',
              },
              function (selection) {
                info.selectionText = selection[0];
                var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
                // 清掉emoji
                info.selectionText = info.selectionText.replace(regex, '');
                addNote(info, tab, tag.id);
              }
            );
          },
        });
      }
    },
    function (xhr, textStatus) {
      if (xhr.status === 401) {
        chrome.contextMenus.removeAll();
        chrome.contextMenus.create({
          title: '点我登陆bookmark并重启浏览器让插件能添加书签与备忘',
          id: 'login',
          contexts: ['page'],
          onclick: function (info, tab) {
            chrome.tabs.create({
              url: server + '#/login',
            });
          },
        });
      } else {
        // 出错1分钟重试一次
        setTimeout(function () {
          init();
        }, 60000);
      }
    }
  );
}

setTimeout(() => {
  init();
}, 100);
