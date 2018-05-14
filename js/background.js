// 预留一个方法给popup调用
function showMsg(body, title, time) {
	var note = new Notification(title || "通知", {
		dir: "auto",
		tag: "bookmark",
		body: body,
		icon: "img/note.png",
		renotify: true,
	});

	if (time) {
		setTimeout(() => {
			note.close();
		}, time);
	}
}

function jqAjax(url, type, data, successCallback, errorCallback, beforeSendCallback, completeCallback) {
	// console.log(url, type, data);
	$.ajax({
		url: url,
		type: type, //GET POST
		contentType: "application/json", //必须有  
		async: true, //或false,是否异步
		data: data,
		timeout: 3000, //超时时间
		dataType: 'json', //返回的数据格式：json/xml/html/script/jsonp/text
		success: function (data, textStatus, jqXHR) {
			successCallback && successCallback(data, textStatus, jqXHR)
		},
		error: function (xhr, textStatus) {
			errorCallback && errorCallback(xhr, textStatus)
		},
		beforeSend: function (xhr) {
			beforeSendCallback && beforeSendCallback(xhr)
		},
		complete: function () {
			completeCallback && completeCallback();
		}
	})
}

function init() {
	jqAjax("http://mybookmark.cn/api/tags/", "GET", {}, function (data, textStatus, jqXHR) {
		chrome.contextMenus.removeAll();

		const contextPageAddUrl = "page";
		const contextSelectionAddNote = "selection";

		var parentIdPageAddUrl = chrome.contextMenus.create({
			"title": "添加当前网址到书签系统",
			"id": "PageAddUrl",
			"contexts": [contextPageAddUrl],
		});

		var parentIdSelectionAddNote = chrome.contextMenus.create({
			"title": "添加备忘到系统",
			"id": "SelectionAddNote",
			"contexts": [contextSelectionAddNote],
		});

		data.sort((a, b) => {
			return (a.last_use > b.last_use) ? -1 : 1;
		})

		for (const tag of data) {
			chrome.contextMenus.create({
				"title": tag.name,
				"id": "u" + tag.id.toString(),
				"contexts": [contextPageAddUrl],
				"parentId": parentIdPageAddUrl,
				"onclick": function (info, tab) {
					let url = "http://mybookmark.cn/api/addBookmark/";
					let params = {
						id: "",
						url: info.pageUrl,
						title: tab.title,
						public: '1',
						tags: [tag.id],
						description: ""
					}
					jqAjax(url, "POST", JSON.stringify({
						params: params
					}), function (data, textStatus, jqXHR) {
						if (data.title) {
							var msg = '[ ' + data.title + ' ] 添加成功！\n' + (data.update ? '系统检测到该书签之前添加过，只更新链接，描述，标题，分类。创建日期与最后点击日期不更新！' : '') + '\n窗口 3 秒后自动关闭。';
							showMsg(msg, "书签添加成功", 3000);
						} else {
							showMsg('[ ' + params.title + ' ] 添加失败', "书签添加失败", 3000);
						}
					}, function (xhr, textStatus) {
						showMsg('[ ' + params.title + ' ] 添加失败', "书签添加失败", 3000);
					})
					init();
				}
			});

			chrome.contextMenus.create({
				"title": tag.name,
				"id": "n" + tag.id.toString(),
				"contexts": [contextSelectionAddNote],
				"parentId": parentIdSelectionAddNote,
				"onclick": function (info, tab) {
					let url = "http://mybookmark.cn/api/addNote/";
					let params = {
						tag_id: tag.id,
						content: info.selectionText,
					}
					jqAjax(url, "POST", JSON.stringify({
						params: params
					}), function (data, textStatus, jqXHR) {
						var brief = params.content.length > 60 ? (params.content.substring(0, 60) + ' ......') : (params.content);
						if (data.retCode === 0) {
							var msg = '备忘 [ ' + brief + ' ] 添加成功！\n';
							showMsg(msg, "备忘录添加成功", 3000);
						} else {
							showMsg('备忘 [ ' + brief + ' ] 添加失败', "备忘录添加失败！", 6000);
						}
					}, function (xhr, textStatus) {
						showMsg('备忘 [ ' + brief + ' ] 添加失败', "备忘录添加失败！", 6000);
					})
				}
			});
		}
	})
}

init();