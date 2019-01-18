/**
 * 项目代码头部引入加载器
 * 当 url 中开关开启时，额外加载 fireworm，重写请求。
 * 
 * 开关开启方式：
 * 1. 通过url传参 __fireworm=true
 * 
 * 开关关闭方式：
 * 1. 通过url传参 __fireworm=false
 * 2. 如果开关开启，后续页面上显示一个小浮标，点击可以关闭 Mock 开关。
 */
var firewormUrl = '';

// 根据环境打出不同的引用路径
window.local = __LOCAL__;
if (__LOCAL__) {
	firewormUrl = '/dist/main.js';
} else {
	firewormUrl = 'https://a.test.alipay.net/g/fireworm/fireworm/0.0.1/main.js';
}

function needLoading() {
	if (/([a-zA-Z0-9]?\.)?\.net/.test(location.host)) {
		return true;
	}  
	if (/render-pre/.test(location.host)) {
		return true;
	}
	if (/[\?&]__fireworm=true/.test(location.href)) {
		return true;
	}
	return false;
}

function loading() {
	if (needLoading()) {
		var script = document.createElement('script');
		script.src = firewormUrl;
		if (document.readyState === 'loading') {
			document.write(script.outerHTML);
		} else if (document.readyState === 'complete') {
			document.head.appendChild(script);
		}
	}
}

loading();
