function jqAjax(url, type, data, successCallback, errorCallback, beforeSendCallback, completeCallback) {
	console.log(url, type, data);
	$.ajax({
		url: url,
		type: type, //GET POST
		contentType: "application/json", //必须有  
		async: true,    //或false,是否异步
		data: data,
		timeout: 3000,    //超时时间
		dataType: 'json',    //返回的数据格式：json/xml/html/script/jsonp/text
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

(function (window) {
	chrome.tabs.getSelected(null, function (tab) {
		console.log(tab);
		var tags = [];
		var selectedTags = new Set();
		var userId = null;
		var login = false;
		var firstSelectTag = true;

		$("#js-url").val(tab.url);
		$("#js-title").val(tab.title);
		$(".ui.inverted.dimmer").addClass("active");

		let url = 'http://mybookmark.cn/api/tags/';

		jqAjax(url, 'GET', {}, function(_tags, textStatus, jqXHR){
			login = true;
			tags = _tags;
			tags.sort((a, b) => {
				return (a.last_use > b.last_use) ? -1 : 1;
			})
			console.log(tags);
			for (let tag of tags) {
				$('#js-add-tag').before(`<div class="ui label js-tag" id="${tag.id}" style="margin:3px 10px 8px 0px;cursor:default;">${tag.name}</div>`);
			}
		}, function(xhr, textStatus){
			if(xhr.status === 401){
				toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', "错误");
				setTimeout(() => {
					chrome.tabs.create({ url: 'http://mybookmark.cn/#/login' });
				}, 3000);
				login = false;
			}
		}, null, function(){
			$(".ui.inverted.dimmer").removeClass("active");
			if (tags.length > 0) {
				$("#" + tags[0].id).addClass("green");
				selectedTags.add(tags[0].id);
			}

			$("#js-add-tag").click(function () {
				toastr.info('请到网站分类页面添加分类，3秒后自动打开新的网页。', "提示");
				setTimeout(() => {
					chrome.tabs.create({ url: 'http://mybookmark.cn/#/tags' });
				}, 3000);
			});

			$(".js-tag").click(function () {
				if ($(this).hasClass("green")) {
					$(this).removeClass("green");
					selectedTags.delete($(this).attr("id"));
				} else {
					if ($(".js-tag.green").length >= 3) {
						toastr.error('您至少要选择一个分类！最多选择三个分类！如果暂时没想到放到哪个分类，可以先选择未分类。', "错误");
					} else {
						if(firstSelectTag){
							$("#"+tags[0].id).removeClass("green");
							selectedTags.delete(tags[0].id);
						}
						$(this).addClass("green");
						selectedTags.add($(this).attr("id"));
						firstSelectTag = false;
					}
				}
			});
		})

		$('.js-cancel').click(() => {
			window.close();
		});

		$('.js-send').click(() => {
			if(!login){
				toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', "错误");
				setTimeout(() => {
					chrome.tabs.create({ url: 'http://mybookmark.cn/#/login' });
				}, 3000);
			}

			var url = "http://mybookmark.cn/api/addBookmark/";
			var params = {
				id: "",
				url: $("#js-url").val(),
				title: $("#js-title").val(),
				public: $('.ui.checkbox.js-public').checkbox('is checked') ? '1' : '0',
				tags: Array.from(selectedTags),
				description: $("#js-desc").val()
			}

			if (!/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/.test(params.url)) {
				toastr.error('检撤到您的书签链接非法，是否忘记加http或者https了？建议直接从打开浏览器地址栏复制出来直接粘贴到输入框。', "错误");
				return;
			}
			if (params.tags.length < 1 || params.tags.length > 3) {
				toastr.error('您至少要选择一个分类！最多选择三个分类！如果暂时没想到放到哪个分类，可以先选择未分类', "错误");
				return;
			}
			if (!params.title) {
				toastr.error('书签标题不能为空！', "错误");
				return;
			}

			jqAjax(url, "POST", JSON.stringify({params:params}), function (data, textStatus, jqXHR) {
				if (data.title) {
					var msg = '[ ' + data.title + ' ] 添加成功！\n' + (data.update ? '系统检测到该书签之前添加过，只更新链接，描述，标题，分类。创建日期与最后点击日期不更新！' : '') + '\n窗口 3 秒后自动关闭。';
					var bg = chrome.extension.getBackgroundPage();
					bg.showMsg(msg, "书签添加成功", 3000);
					window.close();
				} else {
					toastr.error('[ ' + params.title + ' ] 添加失败', "提示");
				}
			}, function (xhr, textStatus) {
				toastr.error('[ ' + params.title + ' ] 添加失败', "提示");
			})
		});
	});
})(window);


