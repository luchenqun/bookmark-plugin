(function(window){

var pAuth = {

	domain: 'atavi.com',
	debug: false,
	identityCookieName: '518447ec77892418088834a955bc3791',

	identityCookie: null,
	identityStorage: null,
	hasAccount: null,

	init: function() {
		this.process();
		chrome.cookies.onChanged.addListener((result) => {
			var cookie = result.cookie;
			if (cookie.domain === '.' + this.domain && cookie.name === this.identityCookieName)
				setTimeout(() => this.process(), 500);
		});
		chrome.storage.onChanged.addListener((storageChanges, area) => {
			if (area != 'sync' || storageChanges.identity === undefined)
				return;
			this.process();
		});
	},

	load: function(callback) {
		chrome.storage.sync.get('identity', (storage) => {
			this.identityStorage = storage.identity || null;
			chrome.cookies.getAll({domain: '.' + this.domain}, (cookies) => {
				var hasAccount = null, identityCookie = null;
				for (var key in cookies) {
					if (cookies[key].name ==='has-account')
						hasAccount = cookies[key].value;
					if (cookies[key].name === this.identityCookieName) {
						identityCookie = cookies[key];
					}
				}
				this.hasAccount = hasAccount;
				this.identityCookie = identityCookie;
				callback && callback();
			});
		});
	},

	process: function(callback) {
		this.load(() => {
			if (this.identityCookie) {
				this.saveToStorage(callback);
			} else {
				if (this.hasAccount > 0) {
					this.removeFromStorage(callback);
				} else {
					this.setIdentityCookie(callback);
				}
			}
		});
	},

	saveToStorage: function(callback) {
		if (this.identityStorage && this.identityStorage.value === this.identityCookie.value) {
			this.log('Skipping save to storage');
			return callback && callback('skip');
		}
		chrome.storage.sync.set({'identity': this.identityCookie}, () => {
			callback && callback('save')
			this.log('Identity saved to storage');
		});
	},

	removeFromStorage: function(callback) {
		if (this.identityStorage === null) {
			this.log('Skipping remove from storage');
			return callback && callback('skip');
		}
		chrome.storage.sync.remove('identity', () => {
			callback && callback('logout');
			this.log('Identity removed from storage');
		});	
	},

	setIdentityCookie: function(callback) {
		chrome.cookies.set({
			url: "http://" + this.domain + "/",
			path: "/",
			domain: "." + this.domain,
			name: this.identityCookieName,
			value: this.identityStorage.value,
			expirationDate: this.identityStorage.expirationDate
		}, (cookie) => {
			callback && callback('auth')
			this.log('Identity cookie saved');
		});
	},

	log: function() {
		var args = Array.from(arguments);
		args.push({
			cookie: this.identityCookie,
			storage: this.identityStorage,
			hasAccount: this.hasAccount
		});
		this.debug && console.log.apply(null, args);
	}
};

pAuth.init();


chrome.runtime.onMessage.addListener(function(request, sender, callback) {
	if (request.action !== "processPersistentAuth")
		return;
	pAuth.process(callback);
	return true; // prevents the callback from being called too early on return
});

})(window);
