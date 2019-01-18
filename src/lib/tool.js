/**
 * Utility Functions
 */

/**
 * get formatted date by timestamp
 * @param  int    time
 * @return  object
 */
export function getDate(time) {
	let d = time>0 ? new Date(time) : new Date();
	let day = d.getDate()<10 ? '0'+d.getDate() : d.getDate(),
		month = d.getMonth()<9 ? '0'+(d.getMonth()+1) : (d.getMonth()+1),
		year = d.getFullYear(),
		hour = d.getHours()<10 ? '0'+d.getHours() : d.getHours(),
		minute = d.getMinutes()<10 ? '0'+d.getMinutes() : d.getMinutes(),
		second = d.getSeconds()<10 ? '0'+d.getSeconds() : d.getSeconds(),
		millisecond = d.getMilliseconds()<10 ? '0'+d.getMilliseconds() : d.getMilliseconds();
	if (millisecond<100) { millisecond = '0' + millisecond; }
	return {
		time: (+d),
		year: year,
		month: month,
		day: day,
		hour: hour,
		minute: minute,
		second: second,
		millisecond: millisecond
	};
}

export function isAndroid() {
	return (/android/i).test(navigator.userAgent);
}

export function isIOS() {
	return (/iphone|ipad/i).test(navigator.userAgent);
}

export function isWK() {
	return (/WK/).test(navigator.userAgent);
}

/**
 * determines whether the passed value is a specific type
 * @param mixed value
 * @return boolean
 */
export function isNumber(value) {
	return Object.prototype.toString.call(value) == '[object Number]';
}
export function isString(value) {
	return Object.prototype.toString.call(value) == '[object String]';
}
export function isArray(value) {
	return Object.prototype.toString.call(value) == '[object Array]';
}
export function isBoolean(value) {
	return Object.prototype.toString.call(value) == '[object Boolean]';
}
export function isUndefined(value) {
	return value === undefined;
}
export function isNull(value) {
	return value === null;
}
export function isSymbol(value) {
	return Object.prototype.toString.call(value) == '[object Symbol]';
}
export function isObject(value) {
	return (
		Object.prototype.toString.call(value) == '[object Object]'
    ||
    // if it isn't a primitive value, then it is a common object
    (!isNumber(value) &&
      !isString(value) &&
      !isBoolean(value) &&
      !isArray(value) &&
      !isNull(value) &&
      !isFunction(value) &&
      !isUndefined(value) &&
      !isSymbol(value)
    )
	);
}
export function isFunction(value) {
	return Object.prototype.toString.call(value) == '[object Function]';
}
export function isElement(value) {
	return (
		typeof HTMLElement === 'object' ? value instanceof HTMLElement : //DOM2
			value && typeof value === 'object' && value !== null && value.nodeType === 1 && typeof value.nodeName==='string'
	);
}
export function isWindow(value) {
	var toString = Object.prototype.toString.call(value);
	return toString == '[object global]' || toString == '[object Window]' || toString == '[object DOMWindow]';
}

/**
 * check whether an object is plain (using {})
 * @param object obj
 * @return boolean
 */
export function isPlainObject(obj) {
	let hasOwn = Object.prototype.hasOwnProperty;
	// Must be an Object.
	if (!obj || typeof obj !== 'object' || obj.nodeType || isWindow(obj)) {
		return false;
	}
	try {
		if (obj.constructor && !hasOwn.call(obj, 'constructor') && !hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')) {
			return false;
		}
	} catch (e) {
		return false;
	}
	let key;
	for (key in obj) {}
	return key === undefined || hasOwn.call(obj, key);
}



/**
 * HTML encode a string
 * @param string text
 * @return string
 */
export function htmlEncode(text) {
	return document.createElement('a').appendChild( document.createTextNode(text) ).parentNode.innerHTML;
}

/**
 * JSON stringify, support circular structure
 */

export function JSONStringify(stringObject, formatOption = '\t', replaceString = 'CIRCULAR_DEPENDECY_OBJECT') {
	let cache = [];
	const returnStringObject = JSON.stringify(stringObject, (key, value) => {
		if (typeof value === 'object' && value !== null) {
			if (~cache.indexOf(value)) {
				return replaceString;
			} 
			cache.push(value);
		}
		return value;
	}, formatOption);
	cache = null;
	return returnStringObject;
}

/**
 * get an object's all keys ignore whether they are not enumerable
 */
export function getObjAllKeys(obj) {
	if (!isObject(obj) && !isArray(obj)) {
		return [];
	}
	let dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	];
	let keys = [];
	for (let key in obj) {
		if (dontEnums.indexOf(key) < 0) {
			keys.push(key);
		}
	}
	keys = keys.sort();
	return keys;
}

/**
 * get an object's prototype name
 */
export function getObjName(obj) {
	return Object.prototype.toString.call(obj).replace('[object ', '').replace(']', '');
}

/**
 * localStorage methods
 */
export function setStorage(key, value) {
	if (!window.localStorage) {
		return;
	}
	key = 'fireworm_' + key;
	localStorage.setItem(key, value);
}

export function getStorage(key) {
	if (!window.localStorage) {
		return;
	}
	key = 'fireworm_' + key;
	return localStorage.getItem(key);
}

function whichTransitionEvent(){
	var t,
		el = document.createElement('fakeelement');

	var transitions = {
		'transition'      : 'transitionend',
		'OTransition'     : 'oTransitionEnd',
		'MozTransition'   : 'transitionend',
		'WebkitTransition': 'webkitTransitionEnd',
		'MsTransition' : 'msTransitionEnd'
	};

	for (t in transitions){
		if (el.style[t] !== undefined){
			return transitions[t];
		}
	}
}

export const transitionEvent = whichTransitionEvent();

export function isInBody(dom) {
	if (dom === document || dom === document.body) return true;
	if (dom && dom.parentNode) {
		dom = dom.parentNode;
		return isInBody(dom);
	}
	return false;
}

export function setEleFontSize($dom) {
	let dpr = window.devicePixelRatio || 1;
	let viewportEl = document.querySelector('[name="viewport"]');
	if (viewportEl && viewportEl.content) {
		let initialScale = viewportEl.content.match(/initial\-scale\=\d+(\.\d+)?/); // eslint-disable-line
		let scale = initialScale ? parseFloat(initialScale[0].split('=')[1]) : 1;
		if (scale < 1) {
			$dom.style.fontSize = 13 * dpr + 'px';
		}
	}
}

/**
   * generate an unique id string (32)
   * @private
   * @return string
   */
export function	getUniqueID() {
	let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		// r&03 实际上是取r二进制的后两位，即0000-0011之间的数，表示0-3，然后再|0x8实际上是加上1000变成取1000-1011之间的数字，即最终结果在[9,b]。
		let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8); 
		return v.toString(16);
	});
	return id;
}

export function getSupportedPropertyName(property) {
	const prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
	const upperProp = property.charAt(0).toUpperCase() + property.slice(1);

	for (let i = 0; i < prefixes.length; i++) {
		const prefix = prefixes[i];
		const toCheck = prefix ? `${prefix}${upperProp}` : property;
		if (typeof document.body.style[toCheck] !== 'undefined') {
			return toCheck;
		}
	}
	return null;
}

export function isInViewport(node, offset = 0, x = true) {
	const { top, right, bottom, left, width, height } = node.getBoundingClientRect();
	const { clientWidth, clientHeight } = document.documentElement;
	// width > 0 || height > 0 is to fix "display: none"
	return (width > 0 || height > 0) && bottom >= -offset && top < (clientHeight + offset) &&
    (!x || (right >= -offset && left < (clientWidth + offset)));
}

export function setAttributes(element, attributes) {
	Object.keys(attributes).forEach(function(prop) {
		const value = attributes[prop];
		if (value !== false) {
			element.setAttribute(prop, attributes[prop]);
		} else {
			element.removeAttribute(prop);
		}
	});
}

export function isNumeric(n) {
	return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

export function setStyles(element, styles) {
	Object.keys(styles).forEach(prop => {
		let unit = '';
		// add unit if the value is numeric and is one of the following
		if (
			['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !==
        -1 &&
      isNumeric(styles[prop])
		) {
			unit = 'px';
		}
		element.style[prop] = styles[prop] + unit;
	});
}

export function getStyleComputedProperty(element, property) {
	if (element.nodeType !== 1) {
		return [];
	}
	// NOTE: 1 DOM access here
	const window = element.ownerDocument.defaultView;
	const css = window.getComputedStyle(element, null);
	return property ? css[property] : css;
}
