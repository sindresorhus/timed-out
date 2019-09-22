# timed-out [![Build Status](https://travis-ci.org/sindresorhus/timed-out.svg?branch=master)](https://travis-ci.org/sindresorhus/timed-out)

> Timeout HTTP/HTTPS requests

Emits Error object with `code` property equal `ETIMEDOUT` or `ESOCKETTIMEDOUT` when ClientRequest is hanged.


## Usage

```js
const timedOut = require('timed-out');
const http = require('http');
const timedOut = require('timed-out');

const request = http.get('http://www.google.ru');
timedOut(request, 2000); // Sets a 2 seconds limit
```


## API

### timedout(request, time)

#### request

*Required*
Type: [`ClientRequest`](https://nodejs.org/api/http.html#http_class_http_clientrequest)

The request to watch.

#### time

*Required*
Type: `number | object`

Time in milliseconds to wait for a `connect` event on the socket and also time to wait on inactive socket.

Or you can pass an object with the following fields:

- `connect` - Time to wait for a connection.
- `socket`  - Time to wait for activity on the socket.


---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-timed-out?utm_source=npm-timed-out&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
