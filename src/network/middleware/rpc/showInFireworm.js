import { NETWORK_LOG_KEY } from '../../../lib/const.js';
import {printNetworkLog} from '../../netLogHelper';
import {parseRPCParamForData} from '../../../lib/rpc';
import * as tool from '../../../lib/tool.js';

const printNetLog = localStorage.getItem(NETWORK_LOG_KEY) === 'true';

export const before = (request, callback) => {
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
	const { operationType, requestData, startTime } = request;
	const { result, status, success, data } = response;
	const endTime = (+new Date());
	const costTime = endTime - startTime;
	const item = {
		url: operationType,
		method: 'RPC',
		costTime,
		status: (success || status === 1 || status === 'succeed') ? 200 : 403,
		readyState: 4,
		response: result || data || response,
		postData: parseRPCParamForData(requestData),
		responseType: 'json',
	};
	renderInFireworm(id, item);
	callback();
};
