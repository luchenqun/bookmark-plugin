(function(window) {

var dbg = function(text) {
	/*var date = new Date();
	console.log(
		date.toLocaleTimeString(
			'en-US', {hour12: false, hour: "numeric", minute: "numeric", second: "numeric"}
		) + " " + date.getMilliseconds() + " " + text
	);*/
};

var Extension = function(data) {
	for (var key in data) {
	    if (!data.hasOwnProperty(key))
	    	continue;
	    this[key] = data[key];
	}
	this.sendMessage = function(data) {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(this.id, data, function(response) {
				resolve(response);
			});
			dbg("Message sended to " + this.id + " - " + data.type);
		});
	};
	this.installed = false;
};

window.ataviExtCommunicator = {
	init: function(data, features, referent) {
		chrome.runtime.onInstalled.addListener(function (details) {
			if (details.reason != 'install')
				return;
			chrome.cookies.get({url: "http://atavi.com/", name: "a-ext-installed"}, (cookie) => {
				if (cookie && cookie.value) {

				} else {
					chrome.tabs.create({url: "http://atavi.com/?from="+referent});
					var exp = new Date().getTime() / 1000 + 60 * 60 * 24 * 30;
					chrome.cookies.set({
						url: "http://atavi.com/",
						path: "/",
						domain: ".atavi.com",
						name: "a-ext-installed",
						value: "1",
						expirationDate: exp
					});
				}
			});
		});
		this.setUninstallUrl();

		this.features = features;

		//Создаем объекты для всех расширений
		data.forEach((item) => {
			obj = new Extension(item);
			this.list.push(obj);
			if (obj.id == chrome.runtime.id) {
				obj.installed = true;
				obj.features = this.features;
				this.current = obj;
			}
		});
		//Обрабатываем входящие сообщения
		chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
			dbg("Message received - " + message.type);
			switch (message.type) {
				//Записывает информацию об отправителе и отправляет информацию о себе
				case 'handshake':
					var obj = this.getByName(message.name);
					obj.installed = true;
					obj.features = message.features;
					sendResponse({success: true, name: this.current.name, id: this.current.id, features: this.features});
					return true;
					break
				//Выключает определенную функциональность
				case 'disable-feature':
					typeof this.featureDisablers[message.feature] === 'function' && this.featureDisablers[message.feature]();
					sendResponse({success: true, name: this.current.name, id: this.current.id});
					break
				//Включает или отключает заданное расширение
				case 'set-extension-state':
					chrome.permissions.contains({permissions: ['management']}, (result) => {
						if (result) {
							this.setExtensionState(message.id, message.state, (ret) => {
								sendResponse(ret);
							});
						} else {
							chrome.permissions.request({
								permissions: ['management']
							}, (granted) => {
								if (granted) {
									this.setExtensionState(message.id, message.state, (ret) => {
										sendResponse(ret);
									});
								} else {
									sendResponse({success: false, message: "Management permission was not granted"});
								}
							});
						}
					});

					//Ответ не будет отправлен, если функция-обработчик завершилась
					//Чтобы это предотвратить, нужно возвращать true
					return true;
					break
				//Служит для того, чтобы проверить, активно ли расширение на данный момент
				//Так же возвращает информацию о наличии прав для управления другими расширениями
				case 'get-extension-info':
					chrome.permissions.contains({permissions: ['management']}, (management) => {
						chrome.permissions.contains({permissions: ['bookmarks']}, (bookmarks) => {
							sendResponse({success: true, management: management, import: bookmarks});
						});
					});
					return true;
					break
				case 'run-import':
					chrome.permissions.contains({permissions: ['bookmarks']}, (result) => {
						if (result) {
							chrome.tabs.create({url: chrome.extension.getURL("options/import.html")});
							sendResponse({success: true});
						} else {
							chrome.permissions.request({permissions: ['bookmarks']}, (granted) => {
								if (granted) {
									chrome.tabs.create({url: chrome.extension.getURL("options/import.html")});
									sendResponse({success: true});
								} else {
									sendResponse({success: false, message: "Bookmarks permission was not granted"});
								}
							});
						}
					});

					//Ответ не будет отправлен, если функция-обработчик завершилась
					//Чтобы это предотвратить, нужно возвращать true
					return true;
					break
				case 'get-bookmarks':
					chrome.permissions.contains({permissions: ['bookmarks']}, (has) => {
						if (has) {
							chrome.bookmarks.getTree(function(tree) {
								sendResponse({success: true, tree: tree});
							});
						} else {
							sendResponse({success: false, message: "Bookmarks permission was not granted"});
						}
					});
					return true;
					break
				case 'search-history':
					if (!message.query) {
						sendResponse({success: false, message: "Query was not provided"});
					}
					chrome.permissions.contains({permissions: ['history']}, (has) => {
						if (has) {
							chrome.history.search(message.query, function(result) {
								sendResponse({success: true, result: result});
							});
						} else {
							sendResponse({success: false, message: "History permission was not granted"});
						}
					});
					return true;
					break
				default:
					sendResponse({success: false, name: this.current.name, id: this.current.id});
			}
		});
				
		this.inited = this.handshake();

	},
	list: [],
	features: [],
	featureDisablers: [],
	enableFeature: function(name, callback, disabler) {
		this.featureDisablers[name] = disabler;
		this.inited.then(() => {
			if (!this.getAbove(true).filter(item => item.features.indexOf(name) > -1).length) {
				callback();
				this.broadcast({type: "disable-feature", feature: name}, this.getBelow());
			}
		});
	},

	//Рассылает сообщения указанным расширениям
	broadcast: function(message, destinations, callback) {
		var promises = [];
		destinations.forEach((item) => {
			promises.push(item.sendMessage(message));
		});

		//Когда пришел ответ на все сообщения
		return Promise.all(promises).then((responses) => {
			responses.forEach((item, i) => {
				typeof callback === 'function' && callback(item, destinations[i]);
			});
		});
	},
	each: function(callback) {
		this.list.forEach(callback, this);
	},
	getByName: function(name) {
		return this.list.filter(item => item.name == name)[0];
	},
	getByIndex: function(index) {
		return this.list[index];
	},
	getById: function(id) {
		return this.list.filter(item => item.id == id)[0];
	},
	getAbove: function(installed) {
		return this.list.filter(
			(item, i) => (i < this.list.indexOf(this.current)) && ((installed == undefined) || (installed===item.installed))
		);
	},
	getBelow: function(installed) {
		return this.list.filter((item, i) => 
			(i > this.list.indexOf(this.current)) && ((installed == undefined) || (installed===item.installed))
		);
	},
	setExtensionState: function(id, state, callback) {
		chrome.management.getAll((extensions) => {
			if (!extensions.filter(i => i.id == id).length) {
				//Если расширение не установлено
				callback({success:false, message: "Extension is not installed"});
				return;
			}
			if (!state && chrome.runtime.id == id) {
				this.handshake().then(()=>{
					if (this.list.filter(i => i.installed).length <= 1) {
						chrome.cookies.remove({
							url: "http://atavi.com/",
							name: "a-ext-installed"
						});
						callback({success:true, state:state, close:true});
					} else {
						//Callback должен быть вызван до того, как расширение отключится
						callback({success:true, state:state});
					}
					setTimeout(() => { chrome.management.setEnabled(id, state); }, 300);
				});
			} else {
				chrome.management.setEnabled(id, state, () => { callback({success:true, state:state}); });
			}
		});
	},
	//Запрашивает и записывает информацию о других расишрениях, отправляя информацию о себе
	//Возвращает promise
	handshake: function() {
		return this.broadcast(
			{type: "handshake", name: this.current.name, id: this.current.id, features: this.features},
			this.list.filter(item => item != this.current),
			(response, from) => {
				if (response && response.success) {
					from.installed = true;
					from.features = response.features;
				} else {
					from.installed = false;
				}
			}
		);
	},

	setUninstallUrl: function(url) {
		chrome.management.getSelf(function(info) {
			url = url || 'https://atavi.com/extension/goodbye/';
			url += '?eid=' + encodeURIComponent(info.id);
			url += '&v=' + encodeURIComponent(info.version);
			chrome.runtime.setUninstallURL(url);
		});
	}
}

})(window);