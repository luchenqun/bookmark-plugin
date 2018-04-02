(function(window) {

AtaviExt.loadConfig((config) => {
	ataviExtCommunicator.init(config.extensions, config.features, config.referent);
	ataviExtCommunicator.enableFeature('context-menu', () => {
		chrome.contextMenus.create({
			'documentUrlPatterns': ['http://*/*', 'https://*/*'],
			'title': chrome.i18n.getMessage('contextmenu_title_all'),
			'contexts': ['page','image','frame','editable','video','selection'],
			'onclick': function(info, tab) {
				chrome.tabs.executeScript(tab.id, {
					code: "window.AtaviExt.onBookmarkAdd('" + info.pageUrl + "')"
				});
			}
		});
		chrome.contextMenus.create({
			'documentUrlPatterns': ['http://*/*', 'https://*/*'],
			'title': chrome.i18n.getMessage('contextmenu_title_link'),
			'contexts': ['link'],
			'onclick': function(info, tab) {
				chrome.tabs.executeScript(tab.id, {
					code: "window.AtaviExt.onBookmarkAdd('" + info.linkUrl + "')"
				});
			}
		});
	}, chrome.contextMenus.removeAll);
});

// action page
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (tab.url.indexOf('http') === 0) {
		chrome.pageAction.show(tabId);
	}
});

// omnibox
var results = [];
chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
	var request = 'http://atavi.com/extension/searchBookmark?q=' + encodeURIComponent(text) + '&limit=5&_t=' + Math.random();
	
	var xhr = new window.XMLHttpRequest();
	xhr.open('GET', request, true);
	xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	xhr.withCredentials = true;
	
	xhr.onreadystatechange = function () {2
		if (xhr.readyState === 4 && xhr.status === 200) {
			var data = JSON.parse(xhr.responseText);
			if (data.success) { 
				var items = [];
				for (var i in data.items) {
					var item = data.items[i];
					items.push({content: item.url, description: item.caption});
				}
				suggest(items);
			}
		}
	};
	
	xhr.send(null);
});

chrome.omnibox.onInputEntered.addListener(function(text) {
	chrome.tabs.getSelected(null, function(tab) {
		var url;
		if (text.substr(0, 7) === 'http://') {
			url = text;
		} else {
			url = 'http://atavi.com/index/search/?q=' + encodeURIComponent(text);
		}
		chrome.tabs.update(tab.id, {url: url});
	});
});

/* Possible parameters for request:
 *  action: "xhttp" for a cross-origin HTTP request
 *  method: Default "GET"
 *  url: required, but not validated
 *  data: data to send in a POST request
 *  xRequestedWith: set header
 *  withCredentials
 */
chrome.runtime.onMessage.addListener(function(request, sender, callback) {
	if (request.action === "xhttp") {
		var xhr = new XMLHttpRequest();
		var method = request.method ? request.method.toUpperCase() : 'GET';
		xhr.open(method, request.url, true);
		if (method == 'POST') {
		    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		}
		if (request.xRequestedWith) {
			xhr.setRequestHeader('X-Requested-With', request.xRequestedWith);
		}
		xhr.withCredentials = request.withCredentials;
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200)
				callback(xhr.responseText);
		};
		xhr.send(request.data);
		return true; // prevents the callback from being called too early on return
	}
});

})(window);