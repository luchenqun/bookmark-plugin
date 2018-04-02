(function(window) {

window.AtaviExt = {
	
	host: 'atavi.com',
	
	tab: null,
	
	init: function() {
		document.getElementById('js-site-link').textContent = chrome.i18n.getMessage('pageaction_link');
		document.getElementById('js-delete').textContent = chrome.i18n.getMessage('pageaction_delete');
		document.getElementById('js-caption').placeholder = chrome.i18n.getMessage('pageaction_caption');
		document.getElementById('js-submit').value = chrome.i18n.getMessage('pageaction_submit_create');
		document.getElementById('js-close').textContent = chrome.i18n.getMessage('pageaction_close');
		AtaviExt.initForm();
	},
	
	initForm: function() {
		AtaviExt.loadOn();
		
		chrome.tabs.query({active: true}, function(tabs) {

			var tab = tabs[0];
			AtaviExt.tab = tab;
			
			document.getElementById('js-close').onclick = function(event) {
				window.close();
				return false;
			};
			
			document.getElementById('js-submit').onclick = function(event) {
				AtaviExt.save();
				return false;
			};
			
			document.getElementById('js-delete').onclick = function(event) {
				AtaviExt.remove();
				return false;
			};

			AtaviExt.ajax('/extension/init', {from: 'ext-chrome', url: tab.url}, function(xhr, data) {
				AtaviExt.loadOff();
				document.getElementById('js-create-form').style.display = 'block';
				if (data.caption) {
					document.getElementById('js-caption').value = data.caption;
					document.getElementById('js-submit').value = chrome.i18n.getMessage('pageaction_submit_edit');
					document.getElementById('js-delete').style.display = 'block';
				} else {
					document.getElementById('js-caption').value = tab.title;
					document.getElementById('js-submit').value = chrome.i18n.getMessage('pageaction_submit_create');
					document.getElementById('js-delete').style.display = 'none';
				}
				document.getElementById('js-url').value = tab.url;
				
				var sel = document.getElementById('js-groupid');
				if (data.group && data.group.list) {
					
					var list = Object.keys(data.group.list);
					if (data.group.order) {
						list = data.group.order;
					}
					
					for (var k in list) {
						var id = list[k];
						var isSelected = false;
						if (data.group.active && data.group.active == id) {
							isSelected = true;
						}
						sel.options[sel.options.length] = new Option(data.group.list[id], id, false, isSelected);
					}
					sel.style.display = 'block';
					
				} else {
					sel.style.display = 'none';
					
				}
				
				document.getElementById('js-caption').select();
				
			}, function() {
				setTimeout(function() {
					AtaviExt.initForm();
				}, 3000);
			});
		});
	},
	
	save: function() {
		AtaviExt.errorClear();
		AtaviExt.loadOn();
		
		var data = {};
		data.url = document.getElementById('js-url').value;
		data.caption = document.getElementById('js-caption').value;
		data.groupid = document.getElementById('js-groupid').value;
		
		AtaviExt.ajax('/extension/save', data, function(xhr, data) {
			window.close();
		}, function(xhr, data) {
			AtaviExt.loadOff();
			if (data && data.message) {
				if (typeof data.message === 'string') {
					AtaviExt.errorAdd('caption', data.message);
				} else if (typeof data.message === 'object') {
					AtaviExt.errorsAdd(data.message);
				}
			}
		});
	},
	
	remove: function() {
		AtaviExt.errorClear();
		AtaviExt.loadOn();
		
		var data = {};
		data.url = document.getElementById('js-url').value;
		
		AtaviExt.ajax('/extension/delete', data, function(xhr, data) {
			window.close();
		}, function(xhr, data) {
			AtaviExt.loadOff();
			if (data && data.message) {
				AtaviExt.errorAdd('caption', chrome.i18n.getMessage('pageaction_error_delete'));
			}
		});
	},
	
	errorClear: function() {
		var sections = document.getElementsByClassName('section');
		var i;
		for (i in sections) {
			if (!isNaN(i) && sections[i].classList.contains('error')) {
				sections[i].classList.remove('error');
			}
		}
		var sections = document.getElementsByClassName('em_');
		var i;
		for (i in sections) {
			if (!isNaN(i)) {
				sections[i].textContent = '';
			}
		}
	},
	errorsAdd: function(messages) {
		var k;
		for (k in messages) {
			AtaviExt.errorAdd(k, messages[k]);
		}
	},
	errorAdd: function(name, message) {
		var section = document.getElementById('js-section-'+name);
		if (section) {
			section.classList.add('error');
		}
		var ermess = document.getElementById(name+'_em_');
		if (ermess) {
			ermess.textContent = (typeof message === Object) ? message.join('. ') : message;
		}
	},
	
	loadOn: function() {
		document.getElementById('js-body').classList.add('process');
	},
	
	loadOff: function() {
		document.getElementById('js-body').classList.remove('process');
	},
	
	ajax: function(url, data, callbackSuccess, callbackError) {
		var request = 'http://' + AtaviExt.host + url;
		
		data = data || {};
		data['_t'] = Math.random();

		var params = '?';
		for (var name in data) {
			if (params !== '?') {
				params += '&';
			}
			params += encodeURIComponent(name) + '=' + encodeURIComponent(data[name]);
		}

		var xhr = new window.XMLHttpRequest();
		xhr.open('GET', request+params, true);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.withCredentials = true;
		
		xhr.responseType = 'json';
		
		xhr.timeout = 10000;
		xhr.ontimeout = function() {
			if (typeof callbackError === 'function') {
				callbackError();
			}
		};

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					var data = xhr.response;
					if (data.success) {
						if (typeof callbackSuccess === 'function') {
							callbackSuccess(xhr, data);
						}
					} else {
						if (typeof callbackError === 'function') {
							callbackError(xhr, data);
						}
					}
				} else {
					if (typeof callbackError === 'function') {
						callbackError(xhr, {});
					}
				}
			}
		};
		xhr.send(null);
	}

};

document.addEventListener('DOMContentLoaded', function() {
	AtaviExt.init();
});

})(window);
