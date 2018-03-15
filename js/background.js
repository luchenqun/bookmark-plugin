
// 预留一个方法给popup调用
function showMsg(body, title, time) {
	var note = new Notification(title || "通知", {  
		dir: "auto",  
		tag: "bookmark",  
		body: body,  
		icon: "img/note.png",
		renotify: true,
	});

	if(time){
		setTimeout(() => {
			note.close();
		}, time);
	}
}
