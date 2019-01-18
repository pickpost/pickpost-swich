import Fireworm from './fireworm';

window.fireworm = new Fireworm({
	defaultPlugins: ['info', 'log', 'network', 'toolKit', 'element', 'storage'], // 可以在此设定要默认加载的面板
	maxLogNumber: 1000,
	// disableLogScrolling: true,
	onReady: function() {
		console.log('Fireworm is ready. let\'s do it.'); // eslint-disable-line
	},
	onClearLog: function() {
		console.log('on clearLog');  // eslint-disable-line
	}
});
