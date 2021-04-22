/* global describe, before, after, it */
import {strict as assert} from 'node:assert';
import http from 'node:http';
import net from 'node:net';
import timedOut from './index.js';

const port = Math.floor((Math.random() * (60000 - 30000)) + 30000);

// Helper functions to return socket timeout property and value
const socketTimeout = socket => ('timeout' in socket) ? socket.timeout : socket._idleTimeout;
const socketClosedValue = socket => ('timeout' in socket) ? 0 : -1;

it('should do HTTP request with a lot of time', done => {
	const request = http.get('http://google.com', response => {
		assert.ok(response.statusCode > 300 && response.statusCode < 399);
		done();
	});

	request.on('error', done);

	timedOut(request, 1000);
});

it('should emit ETIMEDOUT when connection timeout expires', done => {
	// To prevent the connection from being established use a non-routable IP
	// address. See https://tools.ietf.org/html/rfc5737#section-3
	const request = http.get('http://192.0.2.1');

	request.on('error', error => {
		if (error.code === 'ETIMEDOUT') {
			assert.equal(error.message, 'Connection timed out on request to 192.0.2.1');
			done();
		}
	});

	timedOut(request, 200);
});

describe('when connection is established', () => {
	let server;

	before(done => {
		server = http.createServer();
		server.listen(port, done);
	});

	after(done => {
		server.close(done);
	});

	it('should emit ESOCKETTIMEDOUT (no data)', done => {
		server.once('request', () => {});

		const request = http.get(`http://0.0.0.0:${port}`);

		request.on('error', error => {
			if (error.code === 'ESOCKETTIMEDOUT') {
				assert.equal(error.message, `Socket timed out on request to 0.0.0.0:${port}`);
				done();
			}
		});

		timedOut(request, 200);
	});

	it('should emit ESOCKETTIMEDOUT (only first chunk of body)', done => {
		server.once('request', (request, response) => {
			response.writeHead(200, {'content-type': 'text/plain'});
			setTimeout(() => {
				response.write('chunk');
			}, 100);
		});

		let isCalled = false;
		let body = '';
		const request = http.get(`http://0.0.0.0:${port}`);

		request.on('response', response => {
			isCalled = true;
			assert.equal(response.statusCode, 200);
			assert.equal(response.headers['content-type'], 'text/plain');
			response.setEncoding('utf8');
			response.on('data', chunk => {
				body += chunk;
			});
		});

		request.on('error', error => {
			if (error.code === 'ESOCKETTIMEDOUT') {
				assert.ok(isCalled);
				assert.equal(body, 'chunk');
				assert.equal(error.message, `Socket timed out on request to 0.0.0.0:${port}`);
				done();
			}
		});

		timedOut(request, {socket: 200, connect: 50});
	});

	it('should be able to only apply connect timeout', done => {
		server.once('request', (request, response) => {
			setTimeout(() => {
				response.writeHead(200);
				response.end('data');
			}, 100);
		});

		const request = http.get(`http://0.0.0.0:${port}`);

		request.on('error', done);
		request.on('finish', done);

		timedOut(request, {connect: 50});
	});

	it('should be able to only apply socket timeout', done => {
		server.once('request', (request, response) => {
			setTimeout(() => {
				response.writeHead(200);
				response.end('data');
			}, 200);
		});

		const request = http.get(`http://0.0.0.0:${port}`);

		request.on('error', error => {
			if (error.code === 'ESOCKETTIMEDOUT') {
				assert.equal(error.message, `Socket timed out on request to 0.0.0.0:${port}`);
				done();
			}
		});

		timedOut(request, {socket: 50});
	});

	// Different requests may reuse one socket if keep-alive is enabled
	it('should not add event handlers twice for the same socket', done => {
		server.on('request', (request, response) => {
			response.writeHead(200);
			response.end('data');
		});

		let socket = null;
		const keepAliveAgent = new http.Agent({
			maxSockets: 1,
			keepAlive: true
		});

		const requestOptions = {
			hostname: '0.0.0.0',
			port,
			agent: keepAliveAgent
		};

		const request1 = http.get(requestOptions, response => {
			response.resume();
			const request2 = http.get(requestOptions, response => {
				response.resume();
				keepAliveAgent.destroy();
				server.removeAllListeners('request');
				done();
			});
			timedOut(request2, 100);

			request2.on('socket', socket_ => {
				assert.equal(socket_, socket);
				assert.equal(socket_.listeners('connect').length, 0);
			});
		});
		timedOut(request1, 100);

		request1.on('socket', socket_ => {
			socket = socket_;
		});
	});

	it('should set socket timeout if socket is already connected', done => {
		server.once('request', () => {});

		const socket = net.connect(port, '0.0.0.0', () => {
			const request = http.get({
				createConnection: () => socket,
				hostname: '0.0.0.0',
				port
			});

			request.on('error', error => {
				if (error.code === 'ESOCKETTIMEDOUT') {
					done();
				}
			});

			timedOut(request, 200);
		});
	});

	it('should clear socket timeout for keep-alive sockets', done => {
		server.once('request', (request, response) => {
			response.writeHead(200);
			response.end('data');
		});

		let socket = null;
		const agent = new http.Agent({
			keepAlive: true,
			maxSockets: 1
		});

		const options = {
			hostname: '0.0.0.0',
			agent,
			port
		};

		const request = http.get(options, response => {
			assert.equal(socketTimeout(socket), 100);
			response.resume();
			response.on('end', () => {
				assert.equal(socket.destroyed, false);
				assert.equal(socketTimeout(socket), socketClosedValue(socket));
				agent.destroy();
				done();
			});
		});

		timedOut(request, 100);

		request.on('socket', socket_ => {
			socket_.once('connect', () => {
				assert.equal(socketTimeout(socket), 100);
			});
			socket = socket_;
		});
	});
});
