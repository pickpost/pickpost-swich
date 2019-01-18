import { NETWORK_LOG_KEY } from '../../../lib/const.js';
import {printNetworkLog} from '../../netLogHelper';
import * as tool from '../../../lib/tool.js';


const printNetLog = localStorage.getItem(NETWORK_LOG_KEY) === 'true';
export const before  = (request, callback) => {
	request.startTime = (+new Date());
	callback();
};

export const after = (request, response, renderInFireworm = () => {}, callback) => {
	printNetworkLog({
		req: request,
		res: response,
		needPrint: printNetLog,
	});
	const id = tool.getUniqueID();
	const { method, headerNames, body, startTime, url } = request;
	const { status, data } = response;
	const endTime = (+new Date());
	const costTime = endTime - startTime;
	const item = {
		url,
		method: method.toUpperCase() || '-',
		header: headerNames,
		costTime,
		status,
		readyState: 4,
		response: data,
		responseType: typeof data === 'string' ? 'text' : 'json',
	};
	let query = url.split('?'); // a.php?b=c&d=?e => ['a.php', 'b=c&d=', 'e']
	item.url = query.shift(); // => ['b=c&d=', 'e']

	if (query.length > 0) {
		item.getData = {};
		query = query.join('?'); // => 'b=c&d=?e'
		query = query.split('&'); // => ['b=c', 'd=?e']
		for (let q of query) {
			q = q.split('=');
			item.getData[ q[0] ] = q[1];
		}
	}

	if (item.method == 'POST') {
		// save POST data
		if (tool.isString(body)) {
			let arr = body.split('&');
			item.postData = {};
			for (let q of arr) {
				q = q.split('=');
				item.postData[ q[0] ] = decodeURIComponent(q[1]);
			}
		} else if (tool.isPlainObject(body)) {
			item.postData = body;
		}
	}
	renderInFireworm(id, item);
	callback(response);
};
