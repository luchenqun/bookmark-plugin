(function (window) {
	chrome.tabs.getSelected(null, function (tab) {
		var bg = chrome.extension.getBackgroundPage();
		// console.log(tab);
		var tags = [];
		var selectedTag = null;
		var userId = null;
		var login = false;
		var firstSelectTag = true;

		$("#js-url").val(tab.url);
		$("#js-title").val(tab.title);
		$(".ui.inverted.dimmer").addClass("active");

		let url = 'http://mybookmark.cn/api/tags/';

		bg.jqAjax(url, 'GET', {}, function (_tags, textStatus, jqXHR) {
			login = true;
			tags = _tags;
			tags.sort((a, b) => {
				return (a.last_use > b.last_use) ? -1 : 1;
			})
			for (let tag of tags) {
				$('#js-add-tag').before(`<div class="ui label js-tag" id="${tag.id}" style="margin:3px 10px 8px 0px;cursor:default;">${tag.name}</div>`);
			}
		}, function (xhr, textStatus) {
			if (xhr.status === 401) {
				toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', "错误");
				setTimeout(() => {
					chrome.tabs.create({
						url: 'http://mybookmark.cn/#/login'
					});
				}, 3000);
				login = false;
			}
		}, null, function () {
			$(".ui.inverted.dimmer").removeClass("active");
			if (tags.length > 0) {
				$("#" + tags[0].id).addClass("green");
				selectedTag = tags[0].id;
			}

			$("#js-add-tag").click(function () {
				toastr.info('请到网站分类页面添加分类，3秒后自动打开新的网页。', "提示");
				setTimeout(() => {
					chrome.tabs.create({
						url: 'http://mybookmark.cn/#/tags'
					});
					window.close();
				}, 3000);
			});

			$(".js-tag").click(function () {
				$(".js-tag.green").removeClass("green");
				selectedTag = $(this).attr("id");
				$("#" + selectedTag).addClass("green");
			});
		})

		$('.js-cancel').click(() => {
			window.close();
		});

		$('.js-send-bookmark').click(() => {
			if (!login) {
				toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', "错误");
				setTimeout(() => {
					chrome.tabs.create({
						url: 'http://mybookmark.cn/#/login'
					});
				}, 3000);
			}

			var url = "http://mybookmark.cn/api/addBookmark/";
			var params = {
				id: "",
				url: $("#js-url").val(),
				title: $("#js-title").val(),
				public: $('.ui.checkbox.js-public').checkbox('is checked') ? '1' : '0',
				tags: [selectedTag],
				description: $("#js-desc").val()
			}

			if (!/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/.test(params.url)) {
				toastr.error('检撤到您的书签链接非法，是否忘记加http或者https了？建议直接从打开浏览器地址栏复制出来直接粘贴到输入框。', "错误");
				return;
			}
			if (!selectedTag) {
				toastr.error('您必须要选择一个分类！可新增分类，如果暂时没想到放到哪个分类，可以先选择未分类', "错误");
				return;
			}
			if (!params.title) {
				toastr.error('书签标题不能为空！', "错误");
				return;
			}

			bg.jqAjax(url, "POST", JSON.stringify({
				params: params
			}), function (data, textStatus, jqXHR) {
				if (data.title) {
					var msg = '[ ' + data.title + ' ] 添加成功！\n' + (data.update ? '系统检测到该书签之前添加过，只更新链接，描述，标题，分类。创建日期与最后点击日期不更新！' : '') + '\n窗口 3 秒后自动关闭。';
					bg.showMsg(msg, "书签添加成功", 3000);
					window.close();
				} else {
					toastr.error('[ ' + params.title + ' ] 添加失败', "提示");
				}
			}, function (xhr, textStatus) {
				toastr.error('[ ' + params.title + ' ] 添加失败', "提示");
			})
			bg.init();
		});

		$('.js-send-note').click(() => {
			if (!login) {
				toastr.error('您必须先登陆！3秒后自动跳转到登陆页面。', "错误");
				setTimeout(() => {
					chrome.tabs.create({
						url: 'http://mybookmark.cn/#/login'
					});
				}, 3000);
			}

			if (!selectedTag) {
				toastr.error('您必须选择一个分类！', "错误");
				return;
			}

			var url = "http://mybookmark.cn/api/addNote/";
			var params = {
				tag_id: selectedTag,
				content: $("#js-desc").val(),
			}

			if (!params.content) {
				toastr.error('请输入备忘内容！', "错误");
				return;
			}

			bg.jqAjax(url, "POST", JSON.stringify({
				params: params
			}), function (data, textStatus, jqXHR) {
				var brief = params.content.length > 60 ? (params.content.substring(0, 60) + ' ......') : (params.content);
				if (data.retCode === 0) {
					var msg = '备忘 [ ' + brief + ' ] 添加成功！\n';
					bg.showMsg(msg, "备忘录添加成功", 3000);
					window.close();
				} else {
					toastr.error('备忘 [ ' + brief + ' ] 添加失败', "提示");
				}
			}, function (xhr, textStatus) {
				toastr.error('备忘 [ ' + brief + ' ] 添加失败', "提示");
			})
		});
	});
})(window);