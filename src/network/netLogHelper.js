import { JSONStringify } from '../lib/tool';
const networkList = [];
const MAX_NETWORK_LIST_LEN = 100;
let count = 0;

function saveNetwork(net) {
	if (count >= MAX_NETWORK_LIST_LEN) {
		count = 0;
	}
	networkList[count] = net;
	++count; 
}

export function getOriginPrinter() {
	let { console: printer } = window.fireworm;
	if (!printer) {
		printer = console;
	}
	return printer;
}


export function getJsonLog(logNo) {
	const printer = getOriginPrinter();
	if (logNo >= MAX_NETWORK_LIST_LEN || !networkList[logNo]) {
		printer.log('暂时无此请求！');
		return;
	}
	const { req = {}, res = {}} = networkList[logNo] || {};
	let { url, operationType } = req;
	url = url ? url : operationType;
	printer.log('url', url);
	printer.log('request');
	printer.log(JSONStringify(req));
	printer.log('response');
	printer.log(JSONStringify(res));
}

export function printNetworkLog({req = {}, res = {}, needPrint = true}) {
	saveNetwork({req, res});
	const printer = getOriginPrinter();
	if (needPrint) {
		let { url, operationType } = req;
		url = url ? url : operationType;
		printer.log('url', url, 'printId', count - 1);
		printer.log('request', req);
		printer.log('response', res);
	}
}
