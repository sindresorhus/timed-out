/* global describe, before, after, it */

'use strict';

var assert = require('assert');
var http = require('http');
var timeout = require('./');

it('should do HTTP request with a lot of time', function (done) {
	var req = http.get('http://google.com', function (res) {
		assert.ok(res.statusCode > 300 && res.statusCode < 399);
		done();
	});

	req.on('error', done);

	timeout(req, 1000);
});

it('should emit ETIMEDOUT when time is not enough', function (done) {
	var req = http.get('http://google.com', function () {});

	req.on('error', function (err) {
		if (err.code === 'ETIMEDOUT') {
			assert.equal(err.message, 'Connection timed out on request to google.com');
			done();
		}
	});

	timeout(req, 1);
});

describe('when only headers was sent', function () {
	var server;

	before(function (done) {
		server = http.createServer(function (request, res) {
			setTimeout(function() {
				res.writeHead(200, {'content-type':'text/plain'});
				res.write('waited');
				res.end();
			}, 200);
		});

		server.listen(8081, function (err) {
			done(err);
		});
	});

	after(function (done) {
		server.close(done);
	});

	it('should emit ESOCKETTIMEDOUT', function (done) {
		var req = http.get('http://0.0.0.0:8081', function () {});

		req.on('error', function (err) {
			if (err.code === 'ESOCKETTIMEDOUT') {
				assert.equal(err.message, 'Socket timed out on request to 0.0.0.0:8081');
				done();
			}
		});

		timeout(req, 400);
	});
});
