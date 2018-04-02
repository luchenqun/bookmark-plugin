(function(window) {

window.AtaviImport = {
	
	host: 'atavi.com',
	$list: null,
	$folderList: null,
	
	bookmarks: [],
	
	init: function() {
		
		$('#js-lang-import-bookmark').html(chrome.i18n.getMessage('options_import_bookmark')); // h1
		$('#js-import-start').val(chrome.i18n.getMessage('options_import_button_start')); // button
		$('#js-import-checkbox-label').html(chrome.i18n.getMessage('options_import_checkbox_all')); // label
		$('#js-folder-item-0').html(chrome.i18n.getMessage('options_import_folder_all')); // folder all
		$('#js-goto-atavi').val(chrome.i18n.getMessage('options_import_goto_atavi')); // goto atavi
		
		AtaviImport.$list = $('#js-import-list');
		AtaviImport.$folderList = $('#js-folder-list');
		
		AtaviImport.initBookmarks();
		
		$('#js-import-start').on('click', AtaviImport.onBookmarkImport);
		$('#js-goto-atavi').on('click', AtaviImport.onGotoAtavi);
		$('#js-folder-list .folder-item').on('click', AtaviImport.onSwitchFolder);
		$('#js-import-checkbox-all').on('change', function() {
			var $items = $('#js-import-list input[type=checkbox]:visible');
			if ($(this).is(':checked')) {
				$items.prop('checked', true);
			} else {
				$items.removeAttr('checked');
			}
		});
	},
	
		
	initBookmarks: function() {
		chrome.bookmarks.getTree(function(treeNode) {
			AtaviImport.eachTreeNode(treeNode[0], AtaviImport.createBookmark, null);
		});
	},
	
	eachTreeNode: function(node, callback, folder) {
		if (!node.url || node.url.match(/^http[s]?:\/\//i)) {
			callback(node, folder);
		}
		if (node.children) {
			for (var k in node.children) {
				AtaviImport.eachTreeNode(node.children[k], callback, node);
			}
		}
	},
		
	createBookmark: function(node, folder) {
		if (!node.url || !folder) {
			return;
		}

		var $folderBox = $('#js-folder-'+folder.id);
		if ($folderBox.length === 0) {
			$folderBox = AtaviImport.addFolder(folder.title, folder.id);
		}

		var $check = $('<input type="checkbox" checked>').attr('id', 'import-bookmark-' + node.id).val(node.url).
				attr('title', node.title);
		if (folder.id > 1) {
			$check.attr('data-folder', folder.title);
		}
		
		var url = node.url.substr(0,50);
		var $link = $('<a>').attr('href', node.url).attr('target', '_blank')
			.html(url + (node.url === url ? '':'... '));

		var title = node.title.substr(0,70);
		var $label = $('<label>').attr('for', 'import-bookmark-' + node.id)
			.html(title + (node.title === title ? '':'... ')).append($link);
		
		var $item = $('<div>').append($check).append($label).append($('<br>'));
		$folderBox.append($item);

		$('#js-bookmark-count').html($('#js-import-list input').length);
	},
	
	onBookmarkImport: function() {
		
		$('#js-import-start').hide();
		$('.import input[type=checkbox]').attr('disabled', 'disabled');
		$('#js-import-preloader').show();
		
		var list = document.querySelectorAll('#js-import-list input[type=checkbox]');
		for (var k in list) {
			var item = list[k];
			if (!item.checked) {
				continue;
			}
			AtaviImport.bookmarks.push({
				caption: item.getAttribute('title'),
				url: item.getAttribute('value'),
				group: item.getAttribute('data-folder')
			});
		}
	
		if (AtaviImport.bookmarks.length > 0) {
			AtaviImport.bookmarkSend(AtaviImport.bookmarks, AtaviImport.importFinish);
		} else {
			AtaviImport.importFinish(false);
		}
	},
	
	importFinish: function(status) {
		if (status) {
			$('#js-import-preloader').hide();
			document.location='http://atavi.com/?from=ext-chrome';
			$('#js-goto-atavi').show();
			alert(chrome.i18n.getMessage('options_import_finish'));
		} else {
			$('#js-import-start').show();
			$('#js-import-preloader').hide();
			$('.import input[type=checkbox]').removeAttr('disabled');
			alert(chrome.i18n.getMessage('options_import_notfound'));
		}
	},
	
	onSwitchFolder: function() {
		AtaviImport.switchFolder($(this));
	},
	
	switchFolder: function($item) {
		var $folder = $('#js-folder-' + $item.attr('data-id'));
		if ($folder.length > 0) {
			$('#js-import-list .folder').hide();
			$folder.show();
		} else {
			$('#js-import-list .folder').show();
		}
		$('.import .folder-list .folder-item').removeClass('active');
		$item.addClass('active');
	},

	bookmarkSend: function(items, callback) {
		var request = 'http://' + AtaviImport.host + '/extension/import?' + '_t=' + Math.random();

		var xhr = new window.XMLHttpRequest();
		xhr.open('POST', request, true);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		xhr.withCredentials = true;
		
		var timeout = setTimeout(function() {callback(false)}, 15000);

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var data = JSON.parse(xhr.responseText);
				if (data.success) {
					callback(true);
				} else {
					callback(false);
				}
				clearTimeout(timeout);
			}
		};

		xhr.send("items=" + encodeURIComponent(JSON.stringify(items)));
	},
	
	addFolder: function(title, id) {
		var $folderBox = $('<div>').attr('id', 'js-folder-'+id)
			.addClass('folder');
		AtaviImport.$list.append($folderBox);
		var $folderItem = $('<div>').attr('id', 'js-folder-item-'+id)
			.addClass('folder-item')
			.attr('data-id', id)
			.html(title.substr(0,30))
			.on('click', AtaviImport.onSwitchFolder);
		AtaviImport.$folderList.append($folderItem);
		
		return $folderBox;
	},
	
	onGotoAtavi: function() {
		document.location = 'http://' + AtaviImport.host + '/?from=ext-chrome';
	},
	
	destroy: function() {
		return false;
	}

};

document.addEventListener('DOMContentLoaded', function() {
	AtaviImport.init();
});

})(window);
