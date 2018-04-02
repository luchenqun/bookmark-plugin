(function(window) {

window.AtaviExt = {
	host: 'atavi.com',
	notificationseq: 0,
	init: function() {
		var flag = document.createElement('div');
		flag.id = 'js-atavi-extension-install';
		document.body.appendChild(flag);
	},

	onBookmarkAdd: function(url) {
		var request = 'http://' + AtaviExt.host + '/extension/save?from='+(this.config.referent || 'ext-chrome')+'&url=' + encodeURIComponent(url) + '&_t=' + Math.random();
		var resource = AtaviExt.messageCreate(chrome.i18n.getMessage('bookmark_process_add'));
		var timeout = window.setTimeout(function() {
			AtaviExt.messageUpdate(resource, chrome.i18n.getMessage('bookmark_process_error'), 5000);
		}, 15000);

		chrome.runtime.sendMessage({
			method: 'GET',
			action: 'xhttp',
			url: request,
			data: null,
			xRequestedWith: 'XMLHttpRequest',
			withCredentials: true,
			}, function (response) {
				var data = JSON.parse(response);
				if (data.success) {
					window.clearTimeout(timeout);
					AtaviExt.messageUpdate(resource, chrome.i18n.getMessage('bookmark_process_added'), 5000);
				}
			}
		);
	},

	destroy: function() {
		return false;
	},
	
	messageCreate: function(content) {
		var resource = ++AtaviExt.notificationseq;
		
		var message = document.createElement('div');
		message.className = 'atavi-message';
		message.id = 'js-atavi-message-create-ext-'+resource;
		message.textContent = content;
		
		document.body.appendChild(message);
		
		return resource;
	},
	messageUpdate: function(resource, content, delay) {
		var message = document.getElementById('js-atavi-message-create-ext-' + resource);
		if (message) {
			message.textContent = content;
		}
		if (delay) {
			window.setTimeout(function() {
				AtaviExt.messageClear(resource);
			}, delay);
		}
	},
	messageClear: function(resource) {
		var message = document.getElementById('js-atavi-message-create-ext-' + resource);
		if (message) {
			message.parentNode.removeChild(message);
		}
	},
	getFileAsString: function(path, callback) {
		var xhr = new window.XMLHttpRequest();
		xhr.open('GET', chrome.extension.getURL(path), true);
		var callbackFunction = callback;
		xhr.onreadystatechange = function() {
		    if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
		        callbackFunction(xhr.responseText);
		    }
		};
		xhr.send();
	},
	includeScript: function(path, params, callback) {
		this.getFileAsString(path, function(script) {
			var el = document.createElement("script");
			el.innerHTML = "(function(window) {\nvar params = " + JSON.stringify(params, function(key, value) {
  				if (typeof value === 'function') return undefined;
				return value;
  			}, "\t") + ";\n" + script + "\n})(window);"
			document.head.appendChild(el);
			if (typeof callback == "function") callback();
		});
	},
	loadConfig: function(callback) {
		this.getFileAsString("config.json", (string) => {
			this.config = JSON.parse(string);
			if (typeof callback == "function") callback(this.config);
		});
	}
};

})(window);