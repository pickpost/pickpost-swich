/**
 * xhook 编译成 es6, 方便后续功能定制
 * 对 xhr，fetch 进行重写
 */
let WINDOW = null;
if ((typeof WorkerGlobalScope !== 'undefined') && self instanceof WorkerGlobalScope) {
	WINDOW = self;
} else if (typeof global !== 'undefined') {
	WINDOW = global;
} else {
	WINDOW = window;
}

//for compression
const { document } = WINDOW;
const BEFORE = 'before';
const AFTER = 'after';
const READY_STATE = 'readyState';
const ON = 'addEventListener';
const OFF = 'removeEventListener';
const FIRE = 'dispatchEvent';
const XMLHTTP = 'XMLHttpRequest';
const FETCH = 'fetch';
const FormData = 'FormData';

const UPLOAD_EVENTS = ['load', 'loadend', 'loadstart'];
const COMMON_EVENTS = ['progress', 'abort', 'error', 'timeout'];


//parse IE version
const useragent = (typeof navigator !== 'undefined') && navigator['useragent'] ? navigator.userAgent : '';
let msie = parseInt((/msie (\d+)/.exec((useragent).toLowerCase()) || [])[1]);
if (isNaN(msie)) { msie = parseInt((/trident\/.*; rv:(\d+)/.exec((useragent).toLowerCase()) || [])[1]); }

const slice = (o,n) => Array.prototype.slice.call(o,n);

const depricatedProp = p => ['returnValue','totalSize','position'].includes(p);

const mergeObjects = function(src, dst) {
	for (let k in src) {
		const v = src[k]; // eslint-disable-line
		if (depricatedProp(k) || dst[k] !== undefined) { continue; }
		try { dst[k] = src[k]; } catch (error) {}
	}
	return dst;
};

const nullify = function(res) {
	if (res === undefined) {
		return null;
	}
	return res;
};

//proxy events from one emitter to another
const proxyEvents = function(events, src, dst) {
	const p = event => function(e) {
		const clone = {};
		//copies event, with dst emitter inplace of src
		for (let k in e) {
			if (depricatedProp(k)) { continue; }
			const val = e[k];
			clone[k] = val === src ? dst : val;
		}
		//emits out the dst
		return dst[FIRE](event, clone);
	} ;
	//dont proxy manual events
	for (let event of Array.from(events)) {
		if (dst._has(event)) {
			src[`on${event}`] = p(event);
		}
	}
};

//create fake event
const fakeEvent = function(type) {
	if (document && (document.createEventObject != null)) {
		const msieEventObject = document.createEventObject();
		msieEventObject.type = type;
		return msieEventObject;
	} else {
		// on some platforms like android 4.1.2 and safari on windows, it appears
		// that new Event is not allowed
		try { return new Event(type); }
		catch (error) { return {type}; }
	}
};

//tiny event emitter
const EventEmitter = function(nodeStyle) {
	//private
	let events = {};
	const listeners = event => events[event] || [];
	//public
	const emitter = {};
	emitter[ON] = function(event, callback, i) {
		events[event] = listeners(event);
		if (events[event].indexOf(callback) >= 0) { return; }
		i = i === undefined ? events[event].length : i;
		events[event].splice(i, 0, callback);
	};
	emitter[OFF] = function(event, callback) {
		//remove all
		if (event === undefined) {
			events = {};
			return;
		}
		//remove all of type event
		if (callback === undefined) {
			events[event] = [];
		}
		//remove particular handler
		const i = listeners(event).indexOf(callback);
		if (i === -1) { return; }
		listeners(event).splice(i, 1);
	};
	emitter[FIRE] = function() {
		const args = slice(arguments);
		const event = args.shift();
		if (!nodeStyle) {
			args[0] = mergeObjects(args[0], fakeEvent(event));
		}
		const legacylistener = emitter[`on${event}`];
		if (legacylistener) {
			legacylistener.apply(emitter, args);
		}
		const iterable = listeners(event).concat(listeners('*'));
		for (let i = 0; i < iterable.length; i++) {
			const listener = iterable[i];
			listener.apply(emitter, args);
		}
	};
	emitter._has = event => !!(events[event] || emitter[`on${event}`]);
	//add extra aliases
	if (nodeStyle) {
		emitter.listeners = event => slice(listeners(event));
		emitter.on = emitter[ON];
		emitter.off = emitter[OFF];
		emitter.fire = emitter[FIRE];
		emitter.once = function(e, fn) {
			var fire = function() {
				emitter.off(e, fire);
				return fn.apply(null, arguments);
			};
			return emitter.on(e, fire);
		};
		emitter.destroy = () => events = {};
	}

	return emitter;
};

//use event emitter to store hooks
const xhook = EventEmitter(true);
xhook.EventEmitter = EventEmitter;
xhook[BEFORE] = function(handler, i) {
	if ((handler.length < 1) || (handler.length > 2)) {
		throw 'invalid hook';
	}
	return xhook[ON](BEFORE, handler, i);
};
xhook[AFTER] = function(handler, i) {
	if ((handler.length < 2) || (handler.length > 3)) {
		throw 'invalid hook';
	}
	return xhook[ON](AFTER, handler, i);
};
xhook.enable = function() {
	WINDOW[XMLHTTP] = XHookHttpRequest;
	if (typeof XHookFetchRequest === 'function') { WINDOW[FETCH] = XHookFetchRequest; }
	if (NativeFormData) { WINDOW[FormData] = XHookFormData; }
};
xhook.disable = function() {
	WINDOW[XMLHTTP] = xhook[XMLHTTP];
	WINDOW[FETCH] = xhook[FETCH];
	if (NativeFormData) { WINDOW[FormData] = NativeFormData; }
};

//helper
const convertHeaders = (xhook.headers = function(h, dest) {
	let name;
	if (dest == null) { dest = {}; }
	switch (typeof h) {
	case 'object':
		var headers = [];
		for (let k in h) {
			const v = h[k];
			name = k.toLowerCase();
			headers.push(`${name}:\t${v}`);
		}
		return headers.join('\n') + '\n';
	case 'string':
		headers = h.split('\n');
		for (let header of Array.from(headers)) {
			if (/([^:]+):\s*(.+)/.test(header)) {
				name = RegExp.$1 != null ? RegExp.$1.toLowerCase() : undefined;
				const value = RegExp.$2;
				if (dest[name] == null) { dest[name] = value; }
			}
		}
		return dest;
	}
});

//patch FormData
// we can do this safely because all XHR
// is hooked, so we can ensure the real FormData
// object is used on send
var NativeFormData = WINDOW[FormData];
var XHookFormData = function(form) {
	this.fd = form ? new NativeFormData(form) : new NativeFormData();
	this.form = form;
	const entries = [];
	Object.defineProperty(this, 'entries', { get() {
		//extract form entries
		const fentries = !form ? [] :
			slice(form.querySelectorAll('input,select')).filter(e => !['checkbox','radio'].includes(e.type) || e.checked).map(e => [e.name, e.type === 'file' ? e.files : e.value]);
		//combine with js entries
		return fentries.concat(entries);
	}
	}
	);
	this.append = function() {
		const args = slice(arguments);
		entries.push(args);
		return this.fd.append.apply(this.fd, args);
	}.bind(this);
};

if (NativeFormData) {
	//expose native formdata as xhook.FormData incase its needed
	xhook[FormData] = NativeFormData;
	WINDOW[FormData] = XHookFormData;
}

//patch XHR
const NativeXMLHttp = WINDOW[XMLHTTP];
xhook[XMLHTTP] = NativeXMLHttp;
var XHookHttpRequest = (WINDOW[XMLHTTP] = function() {
	const ABORTED = -1;
	const xhr = new (xhook[XMLHTTP])();

	//==========================
	// Extra state
	const request = {};
	let status = null;
	let hasError = undefined;
	let transiting = undefined;
	let response = undefined;

	//==========================
	// Private API

	//read results from real xhr into response
	const readHead = function() {
		// Accessing attributes on an aborted xhr object will
		// throw an 'c00c023f error' in IE9 and lower, don't touch it.
		response.status = status || xhr.status;
		if ((status !== ABORTED) || !(msie < 10)) { response.statusText = xhr.statusText; }
		if (status !== ABORTED) {
			const object = convertHeaders(xhr.getAllResponseHeaders());
			for (let key in object) {
				const val = object[key];
				if (!response.headers[key]) {
					const name = key.toLowerCase();
					response.headers[name] = val;
				}
			}
			return;
		}
	};

	const readBody = function() {
		//https://xhr.spec.whatwg.org/
		if (!xhr.responseType || (xhr.responseType === 'text')) {
			response.text = xhr.responseText;
			response.data = xhr.responseText;
		} else if (xhr.responseType === 'document') {
			response.xml = xhr.responseXML;
			response.data = xhr.responseXML;
		} else {
			response.data = xhr.response;
		}
		//new in some browsers
		if ('responseURL' in xhr) {
			response.finalUrl = xhr.responseURL;
		}
	};

	//write response into facade xhr
	const writeHead = function() {
		facade.status = response.status;
		facade.statusText = response.statusText;
	};

	const writeBody = function() {
		if ('text' in response) {
			facade.responseText = response.text;
		}
		if ('xml' in response) {
			facade.responseXML = response.xml;
		}
		if ('data' in response) {
			facade.response = response.data;
		}
		if ('finalUrl' in response) {
			facade.responseURL = response.finalUrl;
		}
	};

	//ensure ready state 0 through 4 is handled
	const emitReadyState = function(n) {
		while ((n > currentState) && (currentState < 4)) {
			facade[READY_STATE] = ++currentState;
			// make fake events for libraries that actually check the type on
			// the event object
			if (currentState === 1) {
				facade[FIRE]('loadstart', {});
			}
			if (currentState === 2) {
				writeHead();
			}
			if (currentState === 4) {
				writeHead();
				writeBody();
			}
			facade[FIRE]('readystatechange', {});
			//delay final events incase of error
			if (currentState === 4) {
				setTimeout(emitFinal, 0);
			}
		}
	};

	var emitFinal = function() {
		if (!hasError) {
			facade[FIRE]('load', {});
		}
		facade[FIRE]('loadend', {});
		if (hasError) {
			facade[READY_STATE] = 0;
		}
	};

	//control facade ready state
	var currentState = 0;
	const setReadyState = function(n) {
		//emit events until readyState reaches 4
		if (n !== 4) {
			emitReadyState(n);
			return;
		}
		//before emitting 4, run all 'after' hooks in sequence
		const hooks = xhook.listeners(AFTER);
		var process = function() {
			if (!hooks.length) {
				return emitReadyState(4);
			}
			const hook = hooks.shift();
			if (hook.length === 2) {
				hook(request, response);
				return process();
			} else if ((hook.length === 3) && request.async) {
				return hook(request, response, process);
			} else {
				return process();
			}
		};
		process();
	};

	//==========================
	// Facade XHR
	var facade = (request.xhr = EventEmitter());

	//==========================

	// Handle the underlying ready state
	xhr.onreadystatechange = function() {
		//pull status and headers
		try {
			if (xhr[READY_STATE] === 2) {
				readHead();
			}
		} catch (error) {}
		//pull response data
		if (xhr[READY_STATE] === 4) {
			transiting = false;
			readHead();
			readBody();
		}

		setReadyState(xhr[READY_STATE]);
	};

	//mark this xhr as errored
	const hasErrorHandler = function() {
		hasError = true;
	};
	facade[ON]('error', hasErrorHandler);
	facade[ON]('timeout', hasErrorHandler);
	facade[ON]('abort', hasErrorHandler);
	// progress means we're current downloading...
	facade[ON]('progress', function() {
		//progress events are followed by readystatechange for some reason...
		if (currentState < 3) {
			setReadyState(3);
		} else {
			facade[FIRE]('readystatechange', {}); //TODO fake an XHR event
		}
	});

	// initialise 'withCredentials' on facade xhr in browsers with it
	// or if explicitly told to do so
	if ('withCredentials' in xhr || xhook.addWithCredentials) {
		facade.withCredentials = false;
	}
	facade.status = 0;

	// initialise all possible event handlers
	for (let event of Array.from(COMMON_EVENTS.concat(UPLOAD_EVENTS))) {
		facade[`on${event}`] = null;
	}

	facade.open = function(method, url, async, user, pass) {
		// Initailize empty XHR facade
		currentState = 0;
		hasError = false;
		transiting = false;
		request.headers = {};
		request.headerNames = {};
		request.status = 0;
		response = {};
		response.headers = {};

		request.method = method;
		request.url = url;
		request.async = async !== false;
		request.user = user;
		request.pass = pass;
		// openned facade xhr (not real xhr)
		setReadyState(1);
	};

	facade.send = function(body) {
		//read xhr settings before hooking
		let modk;
		for (var k of ['type', 'timeout', 'withCredentials']) {
			modk = k === 'type' ? 'responseType' : k;
			if (modk in facade) { request[k] = facade[modk]; }
		}

		request.body = body;
		const send = function() {
			//proxy all events from real xhr to facade
			proxyEvents(COMMON_EVENTS, xhr, facade);
			if (facade.upload) { proxyEvents(COMMON_EVENTS.concat(UPLOAD_EVENTS), xhr.upload, facade.upload); }

			//prepare request all at once
			transiting = true;
			//perform open
			xhr.open(request.method, request.url, request.async, request.user, request.pass);

			//write xhr settings
			for (k of ['type', 'timeout', 'withCredentials']) {
				modk = k === 'type' ? 'responseType' : k;
				if (k in request) { xhr[modk] = request[k]; }
			}

			//insert headers
			for (let header in request.headers) {
				const value = request.headers[header];
				if (header) {
					xhr.setRequestHeader(header, value);
				}
			}
			//extract real formdata
			if (request.body instanceof XHookFormData) {
				request.body = request.body.fd;
			}
			//real send!
			xhr.send(request.body);
		};

		const hooks = xhook.listeners(BEFORE);
		//process hooks sequentially
		var process = function() {
			if (!hooks.length) {
				return send();
			}
			//go to next hook OR optionally provide response
			const done = function(userResponse) {
				//break chain - provide dummy response (readyState 4)
				if ((typeof userResponse === 'object') &&
          ((typeof userResponse.status === 'number') ||
            (typeof response.status === 'number'))) {
					mergeObjects(userResponse, response);
					if (!Array.from(userResponse).includes('data')) {
						userResponse.data = userResponse.response || userResponse.text;
					}
					setReadyState(4);
					return;
				}
				//continue processing until no hooks left
				process();
			};
			//specifically provide headers (readyState 2)
			done.head = function(userResponse) {
				mergeObjects(userResponse, response);
				return setReadyState(2);
			};
			//specifically provide partial text (responseText  readyState 3)
			done.progress = function(userResponse) {
				mergeObjects(userResponse, response);
				return setReadyState(3);
			};

			const hook = hooks.shift();
			//async or sync?
			if (hook.length === 1) {
				return done(hook(request));
			} else if ((hook.length === 2) && request.async) {
				//async handlers must use an async xhr
				return hook(request, done);
			} else {
				//skip async hook on sync requests
				return done();
			}
		};
		//kick off
		process();
	};

	facade.abort = function() {
		status = ABORTED;
		if (transiting) {
			xhr.abort(); //this will emit an 'abort' for us
		} else {
			facade[FIRE]('abort', {});
		}
	};
	facade.setRequestHeader = function(header, value) {
		//the first header set is used for all future case-alternatives of 'name'
		const lName = header != null ? header.toLowerCase() : undefined;
		const name = (request.headerNames[lName] = request.headerNames[lName] || header);
		//append header to any previous values
		if (request.headers[name]) {
			value = request.headers[name] + ', ' + value;
		}
		request.headers[name] = value;
	};
	facade.getResponseHeader = function(header) {
		const name = header != null ? header.toLowerCase() : undefined;
		return nullify(response.headers[name]);
	};
	facade.getAllResponseHeaders = () => nullify(convertHeaders(response.headers));

	//proxy call only when supported
	if (xhr.overrideMimeType) {
		facade.overrideMimeType = function() {
			return xhr.overrideMimeType.apply(xhr, arguments);
		};
	}

	//create emitter when supported
	if (xhr.upload) {
		facade.upload = (request.upload = EventEmitter());
	}

	facade.UNSENT = 0;
	facade.OPENED = 1;
	facade.HEADERS_RECEIVED = 2;
	facade.LOADING = 3;
	facade.DONE = 4;

	// fill in default values for an empty XHR object according to the spec
	facade.response = '';
	facade.responseText = '';
	facade.responseXML = null;
	facade.readyState = 0;
	facade.statusText = '';

	return facade;
});

//patch Fetch
if (typeof WINDOW[FETCH] === 'function') {
	const NativeFetch = WINDOW[FETCH];
	xhook[FETCH] = NativeFetch;
	var XHookFetchRequest = (WINDOW[FETCH] = function(url, options) {
		if (options == null) { options = { headers: {} }; }
		options.url = url;
		let request = null;
		const beforeHooks = xhook.listeners(BEFORE);
		const afterHooks = xhook.listeners(AFTER);

		return new Promise(function(resolve, reject) {

			const getRequest = function() {
				if (options.body instanceof XHookFormData) {
					options.body = options.body.fd;
				}

				if (options.headers) {
					options.headers = new Headers(options.headers);
				}

				if (!request) {
					request = new Request(options.url, options);
				}
				return mergeObjects(options, request);
			};

			var processAfter = function(response) {
				if (!afterHooks.length) {
					return resolve(response);
				}

				const hook = afterHooks.shift();

				if (hook.length === 2) {
					hook(getRequest(), response);
					return processAfter(response);
				} else if (hook.length === 3) {
					return hook(getRequest(), response, processAfter);
				} else {
					return processAfter(response);
				}
			};

			const done = function(userResponse) {
				if (userResponse !== undefined) {
					const response = new Response(userResponse.body || userResponse.text, userResponse);
					resolve(response);
					processAfter(response);
					return;
				}
				//continue processing until no hooks left
				processBefore();
			};

			var processBefore = function() {
				if (!beforeHooks.length) {
					const reqeust = getRequest();
					send(new Request(reqeust.url, reqeust));
					return;
				}

				const hook = beforeHooks.shift();

				if (hook.length === 1) {
					return done(hook(options));
				} else if (hook.length === 2) {
					return hook(getRequest(), done);
				}
			};

			var send = (request) =>
				NativeFetch(request)
					.then(response => processAfter(response))
					.catch(function(err) {
						processAfter(err);
						return reject(err);
					})
      ;

			processBefore();
		});
	});
}

XHookHttpRequest.UNSENT = 0;
XHookHttpRequest.OPENED = 1;
XHookHttpRequest.HEADERS_RECEIVED = 2;
XHookHttpRequest.LOADING = 3;
XHookHttpRequest.DONE = 4;

// export default xhook;

//publicise (amd+commonjs+window)
if ((typeof define === 'function') && define.amd) {
	define('xhook', [], () => xhook);
} else {
	(this.exports || this).xhook = xhook;
}
