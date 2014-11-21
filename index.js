'use strict';

module.exports = function (req, time) {
	if (req.timeoutTimer) { return req; }

	req.timeoutTimer = setTimeout(function timeoutHandler() {
		req.abort();
		var e = new Error('ETIMEDOUT');
		e.code = 'ETIMEDOUT';
		req.emit('error', e);
	}, time);

	// Set additional timeout on socket - in case if remote
	// server freeze after sending headers
	req.setTimeout(time, function socketTimeoutHandler() {
		req.abort();
		var e = new Error('ESOCKETTIMEDOUT');
		e.code = 'ESOCKETTIMEDOUT';
		req.emit('error', e);
	});

	function clear() {
		if (req.timeoutTimer) {
			clearTimeout(req.timeoutTimer);
			req.timeoutTimer = null;
		}
	}

	return req
		.on('response', clear)
		.on('error', clear);
};
