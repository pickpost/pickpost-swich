import * as http from './http/showInFireworm';
import inception from '../../lib/inception';

import mockAjax from './pickpost';
import { PICKPOST_ENABLED_KEY } from '../../lib/const';
const inceptArr = [http];

export default function middleware({ renderInFireworm }) {
	const openMock = localStorage.getItem(PICKPOST_ENABLED_KEY) === 'true' || /[\?&]__pickpost=true/.test(location.href);
	if (openMock) {
		mockAjax();
	}
	// 注入http请求打印中间件
	inceptArr.forEach(ele => {
		inception.before(ele.before);
		inception.after((request, response, callback) => {
			ele.after(request, response, renderInFireworm, callback);
		});
	});
}
