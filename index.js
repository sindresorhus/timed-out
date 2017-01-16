'use strict';

module.exports = function (req, time) {
	if (req.timeoutTimer) {
		return req;
	}

	var delays = isNaN(time) ? time : {socket: time, connect: time};
	var host = req._headers ? (' to ' + req._headers.host) : '';

	if (delays.connect !== undefined) {
		req.timeoutTimer = setTimeout(function timeoutHandler() {
			req.abort();
			var e = new Error('Connection timed out on request' + host);
			e.code = 'ETIMEDOUT';
			req.emit('error', e);
		}, delays.connect);
	}

	if (delays.socket !== undefined) {
		// Abort the request if there is no activity on the socket for more
		// than `delays.socket` milliseconds.
		req.setTimeout(delays.socket, function socketTimeoutHandler() {
			req.abort();
			var e = new Error('Socket timed out on request' + host);
			e.code = 'ESOCKETTIMEDOUT';
			req.emit('error', e);
		});
	}

	// Clear the connection timeout timer once a socket is assigned to the
	// request and is connected.
	req.on('socket', function assign(socket) {
		// Socket may come from Agent pool and may be already connected.
		if (!(socket.connecting || socket._connecting)) {
			clear();
			return;
		}

		socket.once('connect', clear);
	});

	function clear() {
		if (req.timeoutTimer) {
			clearTimeout(req.timeoutTimer);
			req.timeoutTimer = null;
		}
	}

	return req.on('error', clear);
};
