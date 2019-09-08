'use strict';

module.exports = (request, time) => {
	if (request.timeoutTimer) {
		return request;
	}

	const delays = typeof time === 'number' ? {socket: time, connect: time} : time;
	const host = `to ${request.getHeaders().host}`;

	if (delays.connect !== undefined) {
		request.timeoutTimer = setTimeout(() => {
			request.abort();
			const error = new Error(`Connection timed out on request ${host}`);
			error.code = 'ETIMEDOUT';
			request.emit('error', error);
		}, delays.connect);
	}

	// Clear the connection timeout timer once a socket is assigned to the
	// request and is connected.
	request.on('socket', socket => {
		// Socket may come from `Agent` pool and may be already connected.
		if (!(socket.connecting || socket._connecting)) {
			connect();
			return;
		}

		socket.once('connect', connect);
	});

	const clear = () => {
		if (request.timeoutTimer) {
			clearTimeout(request.timeoutTimer);
			request.timeoutTimer = undefined;
		}
	};

	const connect = () => {
		clear();

		if (delays.socket !== undefined) {
			// Abort the request if there is no activity on the socket for more
			// than `delays.socket` milliseconds.
			request.setTimeout(delays.socket, () => {
				request.abort();
				const error = new Error(`Socket timed out on request ${host}`);
				error.code = 'ESOCKETTIMEDOUT';
				request.emit('error', error);
			});
		}
	};

	return request.on('error', clear);
};
