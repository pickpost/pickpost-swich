import inception from '../../lib/inception';
import { http, https } from '../../config/pickpost';
const pickpostHost = location.protocol === 'http:' ? http : https;

const whiteList = [
	http,
	https,
];
function getLocation(href) {
	const l = document.createElement('a');
	l.href = href;
	return l;
}

function getSystem(url) {
	const l = getLocation(url);
	const hostname = l.hostname;
	let system = '';
	if (hostname.indexOf('crmhome') >= 0) {
		system = 'crmhome';
	} else if (hostname.indexOf('kbservcenter') >= 0) {
		system = 'kbservcenter';
	} else {
		// console.warn('未知的业务系统！');
	}

	return system;
}

function isSPI(url) {
	return /^http[s]?:.+\.alipay\.(net|com)\/spigw\.json/.test(url);
}

function isSocket(url) {
	return /socket/.test(url) || /sockjs-node/.test(url);
}

function isInWhiteList(url) {
	for (let i = 0; i < whiteList.length; ++i) {
		if (url.indexOf(whiteList[i]) !== -1) {
			return true;
		}
	}
	return false; 
}

function getValue(name, search) {
	if (!name) {
		return '';
	}
	const result = search.match(new RegExp(`${name}=([^\&]+)`, 'i'));
	if (result === null || result.length < 1) {
		return '';
	}
	return result[1];
}

/**
 * 是否符合转发请求：必须是SPI请求，且存在body值
 * @param request
 * @returns boolean
 */
function isMatchRequest(request) {
	const { url } = request;
	return !isInWhiteList(url) && !isSocket(url);
}

/**
 * @param url
 */
function replaceUrl(request) {
	const { url, body } = request;
	let targetUrl = '';
	// 匹配到系统才转发
	const system = getSystem(url);
	let bizType;
	if (body) {
		bizType	 = getValue('bizType', body);
	}
	// 判断是不是 SPI 接口
	if (isSPI(url)) {
		targetUrl = `${pickpostHost}/mock/spi/${system}/${bizType}`;
	} else {
		let mockUrlPrefix = pickpostHost;
		if (system) {
			mockUrlPrefix = `${pickpostHost}/mock/http/${system}`;
		}
		const pattern = /^http[s]?:.+\.alipay\.(net|com)/;
		targetUrl = url.replace(pattern, mockUrlPrefix);
	}

	return targetUrl;
}

export default function mockAjax() {
	inception.before(function (request, callback) {
		// 仅重写非 pickpost 请求
		// Todo: 针对 pickpost 接口状态，进行判断是否拦截
		if (isMatchRequest(request)) {
			Object.defineProperty(request, 'url', {
				value: replaceUrl(request),
				writable:false,
				enumerable:false,
				configuration:true
			});
			callback();
		} else {
			callback();
		}
	});
}
