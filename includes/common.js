(function(window) {

AtaviExt.loadConfig((config) => {
	var selfinfo = {
		browser: "chrome",
		id: chrome.runtime.id,
		name: config.extensions.filter(ext => ext.id == chrome.runtime.id)[0].name,
		features: config.features
	};
	if(document.domain === AtaviExt.host || document.domain === "atavi.test") {
		AtaviExt.includeScript("includes/inject.js", {selfinfo: selfinfo});
	}
});

document.addEventListener('DOMContentLoaded', function() {
	AtaviExt.init();
});

})(window);