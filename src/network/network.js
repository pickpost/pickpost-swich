/**
 * Fireworm Network Tab
 */
import $ from '../lib/query.js';
import * as tool from '../lib/tool.js';
import FirewormPlugin from '../lib/plugin.js';
import tplTabbox from './tpl/tabbox.html';
import tplHeader from './tpl/header.html';
import tplPickpostBtn from './tpl/pickpostBtn.html';
import tplClientInfo from './tpl/client.html';
import tplItem from './tpl/item.html';
const { transitionEvent } = tool;
import { PICKPOST_ENABLED_KEY, ID } from '../lib/const.js';
import {getJsonLog} from './netLogHelper';
import './network.less';
import './tpl/pickpostBtn.less';
import middleware from './middleware/middleware';

class NetworkTab extends FirewormPlugin {

	constructor(...args) {
		super(...args);

		this.$tabbox = $.render(tplTabbox, {});
		this.$header = null;
		this.reqList = {}; // URL as key, request item as value
		this.domList = {}; // URL as key, dom item as value
		this.isReady = false;
		this.isShow = false;
		this.isInBottom = true; // whether the panel is in the bottom
		this._open = undefined; // the origin function
		this._send = undefined;

		middleware({
			renderInFireworm: this.updateRequest.bind(this),
		});
	}

	onInit() {
		if (this.fireworm) {
			this.fireworm.getJsonLog = getJsonLog;
			this.fireworm.socketIo = this.socketIo;
		}
	}

	onRenderTab(callback) {
		callback(this.$tabbox);
	}

	onAddTool(callback) {
		let that = this;
		let toolList = [
			{
				name: 'Clear',
				global: false,
				onClick: function() {
					that.clearLog();
				}
			}];
		callback(toolList);
	}

	onReady() {
		var that = this;
		that.isReady = true;

		// header
		this.renderHeader();
		this.renderPickpost();

		// expend group item
		$.delegate($.one('.vc-log', this.$tabbox), 'click', '.vc-group-preview', function(e) {
			let reqID = this.dataset.reqid;
			let $group = this.parentNode;
			if ($.hasClass($group, 'vc-actived')) {
				$.removeClass($group, 'vc-actived');
				that.updateRequest(reqID, {actived: false});
			} else {
				$.addClass($group, 'vc-actived');
				that.updateRequest(reqID, {actived: true});
			}
			e.preventDefault();
		});

		let $content = $.one('.vc-content');
		$.bind($content, 'scroll', function() {
			if (!that.isShow) {
				return;
			}
			if ($content.scrollTop + $content.offsetHeight >= $content.scrollHeight) {
				that.isInBottom = true;
			} else {
				that.isInBottom = false;
			}
		});

		for (let k in that.reqList) {
			that.updateRequest(k, {});
		}
	}

	onShow() {
		this.isShow = true;
		if (this.isInBottom === true) {
			this.scrollToBottom();
		}
	}

	onHide() {
		this.isShow = false;
	}

	onShowConsole() {
		if (this.isInBottom === true) {
			this.scrollToBottom();
		}
	}

	scrollToBottom() {
		let $box = $.one('.vc-content');
		$box.scrollTop = $box.scrollHeight - $box.offsetHeight;
	}

	clearLog() {
		// remove list
		this.reqList = {};

		// remove dom
		for (let id in this.domList) {
			this.domList[id].remove();
			this.domList[id] = undefined;
		}
		this.domList = {};

		// update header
		this.renderHeader();
	}

	renderHeader() {
		let count = Object.keys(this.reqList).length,
			$header = $.render(tplHeader, {count: count}),
			$logbox = $.one('.vc-log', this.$tabbox);
		if (this.$header) {
			// update
			this.$header.parentNode.replaceChild($header, this.$header);
		} else {
			// add
			$logbox.parentNode.insertBefore($header, $logbox);
		}
		this.$header = $header;
	}

	renderPickpost() {
		const open = localStorage.getItem(PICKPOST_ENABLED_KEY) === 'true' || /[\?&]__pickpost=true/.test(location.href);
		const key = `${ID}+${location.pathname}`;		
		const id = localStorage.getItem(key);
		if (id) {
			const $clientInfo = $.render(tplClientInfo, {id});
			this.$tabbox.insertBefore($clientInfo, this.$header);
		}
		const $pickpostBtn = $.render(tplPickpostBtn, {open});
		this.$tabbox.insertBefore($pickpostBtn, this.$header);
		const mockBtn = $.one('#mock', this.$tabbox);
		$.bind(mockBtn, 'click', function(e) {
			e.preventDefault();
			if ($.hasClass(mockBtn, 'open')) {
				$.removeClass(mockBtn, 'open');
				localStorage.setItem(PICKPOST_ENABLED_KEY, 'false');
			} else {
				$.addClass(mockBtn, 'open');
				localStorage.setItem(PICKPOST_ENABLED_KEY, 'true');
			}  
		});
		$.bind(mockBtn, transitionEvent, function() {
			location.reload();
		});
	}

	/**
   * add or update a request item by request ID
   * @private
   * @param string id
   * @param object data
   */
	updateRequest(id, data) {
		// see whether add new item into list
		let preCount = Object.keys(this.reqList).length;

		// update item
		let item = this.reqList[id] || {};
		for (let key in data) {
			item[key] = data[key];
		}
		this.reqList[id] = item;
		// console.log(item);

		if (!this.isReady) {
			return;
		}

		// update dom
		let domData = {
			id: id,
			url: item.url,
			status: item.status,
			method: item.method || '-',
			costTime: item.costTime>0 ? item.costTime+'ms' : '-',
			header: item.header || null,
			getData: item.getData || null,
			postData: item.postData || null,
			response: null,
			actived: !!item.actived
		};
		switch (item.responseType) {
		case '':
		case 'text':
			// try to parse JSON
			if (tool.isString(item.response)) {
				try {
					domData.response = JSON.parse(item.response);
					domData.response = JSON.stringify(domData.response, null, 1);
					domData.response = tool.htmlEncode(domData.response);
				} catch (e) {
					// not a JSON string
					domData.response = tool.htmlEncode(item.response);
				}
			} else if (typeof item.response != 'undefined') {
				domData.response = Object.prototype.toString.call(item.response);
			}
			break;
		case 'json':
			if (typeof item.response != 'undefined') {
				domData.response = JSON.stringify(item.response, null, 1);
				domData.response = tool.htmlEncode(domData.response);
			}
			break;
		case 'blob':
		case 'document':
		case 'arraybuffer':
		default:
			if (typeof item.response != 'undefined') {
				domData.response = Object.prototype.toString.call(item.response);
			}
			break;
		}
		if (item.readyState == 0 || item.readyState == 1) {
			domData.status = 'Pending';
		} else if (item.readyState == 2 || item.readyState == 3) {
			domData.status = 'Loading';
		} else if (item.readyState == 4) {
			// do nothing
		} else {
			domData.status = 'Unknown';
		}
		let $new = $.render(tplItem, domData),
			$old = this.domList[id];
		if (item.status >= 400) {
			$.addClass($.one('.vc-group-preview', $new), 'vc-table-row-error');
		}
		if ($old) {
			$old.parentNode.replaceChild($new, $old);
		} else {
			$.one('.vc-log', this.$tabbox).insertAdjacentElement('beforeend', $new);
		}
		this.domList[id] = $new;

		// update header
		let curCount = Object.keys(this.reqList).length;
		if (curCount != preCount) {
			this.renderHeader();
		}

		// scroll to bottom
		if (this.isInBottom) {
			this.scrollToBottom();
		}
	}

} // END class

export default NetworkTab;
