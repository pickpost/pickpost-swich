var spmDataKey = 'data-aspm';
var spmDPosMarkAttr = 'data-aspm-click';
var spmDPosTagPattern = /^a|area$/i;
const isEmptry = x => [null, undefined, ''].indexOf(x) !== -1;
let sectionCount = 0; // section exposure count
let contentCount = 0; // content exposure count
let atomCount = 0; // atom element exposure count
let clickCount = 0; // click element count
const sectionExposureList = {}; // section exposure dom list
const contentExposureList = {}; // content exposure dom list
const atomExposureList = {}; // atom element exposure dom list
const clickList = {}; // click dom list

function nodeListToArray(nodes) {
	var arr, length;

	try {
		arr = [].slice.call(nodes);
		return arr;
	} catch (err) {
		arr = [];
		length = nodes.length;

		for (var i = 0; i < length; i++) {
			arr.push(nodes[i]);
		}

		return arr;
	}
}

function getAttr(element, attr_name) {
	return element && element.getAttribute ? (element.getAttribute(attr_name) || '') : '';
}

function isDom (dom) {
	return dom!=null && typeof dom=='object' && dom.nodeType == 1;
}

function isViewDom (dom) {
	if (!dom || !isDom(dom) || dom==document.body || dom==document.documentElement) {
		return false;
	}

	return true;
}

/**
 * 获取页面spm元数据
 * 元数据包括：
 * 1. spm a位，在meta标签里 name 为 data-aspm 的 content 中
 * 2. 页面bizType，在meta标签里 name 为 data-bizType 的 content 中
 */
function getMetaSpm () {
	var metaList = nodeListToArray(document.getElementsByTagName('meta'));
	var len = metaList.length;
	var i, metaItem, name, content;
	var bizType, spmAPos;
	for(i=0; i<len; i++) {
		metaItem = metaList[i];
		name = getAttr(metaItem, 'name');
		content = getAttr(metaItem, 'content');

		switch(name) {
		case spmDataKey:
			spmAPos = content;
			break;
		case 'data-bizType':
			bizType = content;
			break;
		}

		if (spmAPos && bizType) {
			break;
		}
	}

	return {
		spmAPos: spmAPos,
		bizType: bizType
	};
}

/**
 * 获取spm b位数据
 * b位数据为 body 元素 data-aspm 的值
 */
function getSpmBPos () {
	var spmBPos = getAttr(document.body, spmDataKey);
	return spmBPos;
}

/**
 * 获取spm c位数据
 * c位数据挂载在dom上，属性 data-aspm 的值
 */
function getSpmCPos (dom) {
	if (!isViewDom(dom)){
		return '';
	}

	var spmCPos = '';
	while( (dom = dom.parentNode) && dom != document.body ) {
		spmCPos = getAttr(dom, spmDataKey);
		if (spmCPos) {
			break;
		}
	}

	return spmCPos;
}

function getDPosDom (dom) {
	if (!isViewDom(dom)){
		return null;
	}

	do {
		if ( spmDPosTagPattern.test(dom.tagName) || dom.hasAttribute(spmDPosMarkAttr) ) {
			return dom;
		}
	} while ( (dom=dom.parentNode) && dom!=document.body && !getAttr(dom, spmDataKey) );
}

/**
 * 获取spm d位数据
 * 1. 如果dom上有 data-aspm-click 属性，则 d 位信息为其属性值
 * 2. 默认情况下会对 a, area 获取其在父元素中的索引作为其 d 位信息
 */
function getSpmDPos (dom) {
	if (!isViewDom(dom)) {
		return '';
	}

	if ( !(spmDPosTagPattern.test(dom.tagName) || dom.hasAttribute(spmDPosMarkAttr)) ) {
		dom = getDPosDom(dom);
	}

	if (!dom) {
		return '';
	}

	var spmDPos = getAttr(dom, spmDPosMarkAttr);
	var tagName = dom.tagName;
	if ( typeof spmDPos == 'string' || spmDPosTagPattern.test(tagName) ) {
		if (!spmDPos) {
			var idx = 0;
			var rollDom = dom;
			do {
				if ( isDom(rollDom) ) {
					if ( tagName == rollDom.tagName ) {
						idx++;
					}
				}
			} while( (rollDom=rollDom.previousSibling) && rollDom );

			spmDPos = idx;
		}
	}

	return spmDPos + '';
}


var pageSpmInfo = getMetaSpm();

/**
 * 获取页面spm
 * a位与b位
 */
export function getPageSpm () {
	var spmBPos = getSpmBPos();
	pageSpmInfo = getMetaSpm();
	if (pageSpmInfo.spmAPos && spmBPos) {
		return [pageSpmInfo.spmAPos, spmBPos];
	} else {
		return [];
	}
}

/**
 * 获取行动点spm
 */
function getClickSpm (dom) {
	var spmDPos =  getSpmDPos(dom);
	var result = {
		dom: dom,
		spmId: ''
	};

	if (spmDPos) {
		var spmIdList = spmDPos.split('.');
		var spmIdListlen = spmIdList.length;
		var hasSpmId = true;

		switch (spmIdListlen) {
		case 1:
			spmIdList.unshift( getSpmCPos(dom) );
		case 2:
			spmIdList.unshift( getSpmBPos() );
		case 3:
			spmIdList.unshift( pageSpmInfo.spmAPos );
		}

		var len = 4;
		for (var i=0; i<len; i++) {
			if (!spmIdList[i]) {
				hasSpmId = false;
				break;
			}
		}

		if (hasSpmId) {
			result.spmId = spmIdList.join('.');
		}
	}

	return result;
}

function findDom(dom, attr) {
	if (dom === document) return null;
	if (dom.getAttribute(attr)) return dom;
	return findDom(dom.parentNode, attr);
}

export function expose(showSpmPopover) {
	Object.keys(sectionExposureList).forEach(key => {
		const dom = sectionExposureList[key];
		if (!dom.parentNode) {
			// dom 已经删除
			delete contentExposureList[key];
		} else {
			// 在视区中，上报区块曝光，从 sectionExposureList 中移除
			const c = dom.getAttribute('data-aspm');
			const param = dom.getAttribute('data-aspm-param');
			const spmInfo = {
				spmId: `${getPageSpm().join('.')}.${c}`,
				actionId: 'exposure',
				params: BizLog.call('parse', param),
			};
			showSpmPopover(dom, spmInfo);
		}
	});

	Object.keys(contentExposureList).forEach(key => {
		const dom = contentExposureList[key];
		if (!dom.parentNode) {
			// dom 已经删除
			delete contentExposureList[key];
		} else {
			// 在视区中，上报区块合并曝光，从 contentExposureList 中移除
			const c = dom.getAttribute('data-aspm-parent');
			const param = dom.getAttribute('data-aspm-param');
			const spmInfo =  {
				spmId: `${getPageSpm().join('.')}.${c}`,
				actionId: 'mergeExpose',
				params: BizLog.call('parse', param),
			};
			showSpmPopover(dom, spmInfo);
		}
	});

	Object.keys(atomExposureList).forEach(key => {
		const dom = atomExposureList[key];
		if (!dom.parentNode) {
			// dom 已经删除
			delete atomExposureList[key];
		} else {
			// 在视区中，上报 D 位曝光，从 atomExposureList 中移除
			const c = dom.getAttribute('data-aspm-parent');
			const d = dom.getAttribute('data-aspm-click');
			const param = dom.getAttribute('data-aspm-param');
			const spmInfo = {
				spmId: `${getPageSpm().join('.')}.${c}.${d}`,
				actionId: 'exposure',
				params: BizLog.call('parse', param),
			};
			showSpmPopover(dom, spmInfo);
		}
	});
	Object.keys(clickList).forEach(key => {
		const dom = clickList[key];
		if (!dom.parentNode) {
			// dom 已经删除
			delete clickList[key];
		} else {
			// 在视区中，上报 D 位曝光，从 atomExposureList 中移除
			const param = dom.getAttribute('data-aspm-param');
			const spmInfo = {
				spmId: getClickSpm(dom).spmId || '',
				actionId: 'clicked',
				params: BizLog.call('parse', param),
			};
			showSpmPopover(dom, spmInfo);
		}
	});
}

export function setSpm(C, showSpmPopover) {
	C.forEach(config => {
		const { code, selector, exposure: cExposure = true, share = {}, children: D = [] } = config;
		if (selector) {
			// 设置 C 位元素
			const domArr = [].slice.call(document.querySelectorAll(selector));
			domArr.forEach(dom => {
				const n = dom.getAttribute('data-aspm-n');
				const value = [code, n].filter(v => !isEmptry(v)).join('_');
				const spmc = dom.getAttribute('data-aspm');
				// spmc 未设置 或者 spmc 有变化（dom diff 更新）
				if (cExposure && (spmc === null || spmc !== value)) {
					sectionExposureList[sectionCount] = dom;
					sectionCount += 1;
				}
				dom.setAttribute('data-aspm', value);
			});

			// 设置 share 元素
			const { selector: shareSelector } = share;
			if (shareSelector) {
				const { exposure: contentExposure = false } = share;
				const shareDomArr = [].slice.call(document.querySelectorAll(`${selector} ${shareSelector}`));
				shareDomArr.forEach(dom => {
					if (!dom.hasAttribute('data-aspm-share')) {
						dom.setAttribute('data-aspm-share', true);
						const cDom = findDom(dom, 'data-aspm');
						if (cDom) {
							const cParam = BizLog.call('parse', cDom.getAttribute('data-aspm-param')) || {};
							const shareParam = BizLog.call('parse', dom.getAttribute('data-aspm-param')) || {};
							const param = BizLog.call('stringify', { ...cParam, ...shareParam });
							if (param) dom.setAttribute('data-aspm-param', param);
							if (contentExposure) {
								contentExposureList[contentCount] = dom;
								contentCount += 1;
								dom.setAttribute('data-aspm-parent', cDom.getAttribute('data-aspm'));
							}
						}
					}
				});
			}

			// 设置 D 元素
			D.forEach(dConfig => {
				const { code: dCode, selector: dSelector, exposure: contentExposure = false,
					atomExposure = false } = dConfig;
				if (dSelector) {
					const dDomArr = [].slice.call(document.querySelectorAll(`${selector} ${dSelector}`));
					dDomArr.forEach(dom => {
						const shareDom = findDom(dom, 'data-aspm-share');
						const cDom = findDom(shareDom || dom, 'data-aspm');
						if (cDom) {
							const n = dom.getAttribute('data-aspm-n') || (shareDom && shareDom.getAttribute('data-aspm-n'));
							const value = [dCode, n].filter(v => !isEmptry(v)).join('_');
							const cParam = BizLog.call('parse', cDom.getAttribute('data-aspm-param')) || {};
							const shareParam = (shareDom && BizLog.call('parse', shareDom.getAttribute('data-aspm-param'))) || {};
							const dParam = BizLog.call('parse', dom.getAttribute('data-aspm-param')) || {};
							const param = BizLog.call('stringify', { ...cParam, ...shareParam, ...dParam });
							if (param) dom.setAttribute('data-aspm-param', param);
							const spmd = dom.getAttribute('data-aspm-click');
							// spmd 未设置 或者 spmd 有变化（dom diff 更新）
							if (spmd === null || spmd !== value) {
								if (atomExposure) {
									atomExposureList[atomCount] = dom;
									atomCount += 1;
								} else if (contentExposure) {
									contentExposureList[contentCount] = dom;
									contentCount += 1;
								}
								dom.setAttribute('data-aspm-parent', cDom.getAttribute('data-aspm'));
							}
							dom.setAttribute('data-aspm-click', value);
							clickList[clickCount++] = dom;
						}
					});
				}
			});
		}
	});
	expose(showSpmPopover);
}
