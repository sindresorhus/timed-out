export default function timedOut(request, time) {
	if (request.timeoutTimer) {
		return request;
	}

	const delays = typeof time === 'number' ? {socket: time, connect: time} : time;
	const host = request.getHeaders().host ?? request.host ?? request.hostname;
	const hostString = host ? ` to ${host}` : '';

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
				request.destroy();
				const error = new Error(`Socket timed out on request${hostString}`);
				error.code = 'ESOCKETTIMEDOUT';
				request.emit('error', error);
			});
		}
	};

	if (delays.connect !== undefined) {
		request.timeoutTimer = setTimeout(() => {
			request.destroy();
			const error = new Error(`Connection timed out on request${hostString}`);
			error.code = 'ETIMEDOUT';
			request.emit('error', error);
		}, delays.connect);
	}

	// Clear the connection timeout timer once a socket is assigned to the
	// request and is connected.
	request.once('socket', socket => {
		// Socket may come from `Agent` pool and may be already connected.
		if (socket.connecting) {
			socket.once('connect', connect);
		} else {
			connect();
		}
	});

	request.once('error', clear);
	request.once('abort', clear);
	request.once('close', clear);

	return request;
}
