var
	StaticServer = require('node-static').Server,
	file = new StaticServer('./public'),
	path = require('path'),
	url = require('url'),
	fs = require('fs'),
	less = require('less'),
	http = require('http'),
	argv = require('optimist').argv,
	crypto = require('crypto'),
	io = require('socket.io'),
	cookie = require('cookie'),
	topics = {};

http.ServerResponse.prototype.endError = function(code, msg, headers) {
	headers = headers || {};

	if(!headers['Content-Type'])
		headers['Content-Type'] = 'text/plain';

	this.writeHead(code, headers);
	this.end(msg);
	return this;
}

String.prototype.startsWith = function(prefix) {
	return (this.length >= prefix.length) && this.indexOf(prefix) === 0;
}

String.prototype.endsWith = function(suffix) {
	return (this.length >= suffix.length) && this.lastIndexOf(suffix) === this.length - suffix.length;
}

var server = http.createServer(function(request, response) {

	if(handleApiCalls(request, response)) return;
	//if(handleSocketIo(request, response)) return;

	console.log(request.url+' -> file');
	if(argv.develop) {
		handleLessRecompile(request, response, function() {
			file.serve(request, response);
		});
	}
	else file.serve(request, response);

}).listen(8080);

var srv = io.listen(server);
srv.configure(function() {

	srv.enable('browser client minificatsrvn');  // send minified client
	srv.enable('browser client gzip');          // gzip the file
	srv.set('log level', 1);                    // reduce logging

}).sockets.on('connection', function(socket) {
	var ident;
	socket.on('disconnect', function () {
		if(!ident) return;

		var topic = topics[ident.topic];
		if(!topic) return;

		var idleTimeout=750;
		console.log('user '+ident.email+' about to leave topic '+ident.topic+', giving '+idleTimeout+'ms to recover');

		ident.idleTimer = setTimeout(function() {
			topic.attendees.splice(topic.attendees.indexOf(ident), 1);

			console.log('user '+ident.email+' left topic '+ident.topic+' (still '+topic.attendees.length+' talking on that topic)');
			if(topic.attendees.length == 0) {
				console.log('destroying topic '+ident.topic);
				delete topics[ident.topic];
			}
			else sendUpdate(topic);
		}, idleTimeout);
	});

	socket.on('ident', function(_ident) {
		// check if there already is an ident for that mail
		if(topics[_ident.topic]) {
			var topic = topics[_ident.topic];
			for (var i = 0; i < topic.attendees.length; i++) {
				if(topic.attendees[i].email == _ident.email && topic.attendees[i].idleTimer) {
					ident = topic.attendees[i];
					ident.socket = socket;
					console.log('user '+ident.email+' was about to leave topic '+ident.topic+', overtaking ident');

					clearTimeout(ident.idleTimer);
					delete ident.idleTimer;

					sendUpdate(topic);
					return;
				}
			}
		}

		ident = _ident;
		if(!topics[ident.topic]) {
			console.log('creating topic '+ident.topic)
			topics[ident.topic] = {attendees: [], stack: []};
		}

		console.log('user '+ident.email+' entered topic '+ident.topic);
		var topic = topics[ident.topic];
		ident.hash = mail2gravatarHash(ident.email);
		ident.socket = socket;
		topic.attendees.push(ident);

		sendUpdate(topic);
	});

	socket.on('want', function() {
		if(!ident) return;

		var topic = topics[ident.topic];
		if(!topic) return;

		for (var i = 0; i < topic.stack.length; i++) {
			// already on stack
			if(topic.stack[i].email == ident.email)
				return;
		};

		console.log(ident.email+' wants to talk on topic '+ident.topic);
		topic.stack.push({
			email: ident.email,
			dt: (new Date()).getTime()
		});

		sendUpdate(topic);
	});
});

function sendUpdate(topic)
{
	var freshdata = {
		attendees: [],
		stack: topic.stack,
		dt: (new Date()).getTime()
	}

	for (var i = 0; i < topic.attendees.length; i++) {
		freshdata.attendees.push({
			email: topic.attendees[i].email,
			hash: topic.attendees[i].hash
		});
	};

	for (var i = 0; i < topic.attendees.length; i++) {
		topic.attendees[i].socket.emit('update', freshdata);
	};
}

function handleApiCalls(request, response) {
	var urldata = url.parse(request.url, true);

	switch(true) {
		case(urldata.pathname == '/gravatar'):
			console.log(request.url+' -> gravatarHandler');
			return handleGravatar(request, response, urldata);

		case(urldata.pathname == '/insight'):
			if(request.socket.remoteAddress != '127.0.0.1' && request.socket.remoteAddress != '::1')
				return response.endError(403, 'Du du du du du!! '+request.socket.remoteAddress);

			console.log(request.url+' -> insightHandler');
			return handleInsight(request, response, urldata);

		case (urldata.pathname.startsWith('/mitreden/bei/')):
			var
				topic = urldata.pathname.split('/')[3],
				cookies = request.headers['cookie'] ? cookie.parse(request.headers['cookie']) : {};

			if(!cookies['user'] || cookies['user'] == '') {
				var dsturl = 'http://'+request.headers['host']+'/'

				console.log(request.url+' -> no user, redirect to '+dsturl);
				return response.endError(307, 'Temporary Redirect, see '+dsturl, {'Location': dsturl, 'Set-Cookie': cookie.serialize('topic', topic, {path: '/'})});
			}

			console.log(request.url+' -> facesGui');
			return file.serveFile('/faces.html', 200, {}, request, response);

		default:
			return false;
	}
}

function mail2gravatarHash(mail) {
	if(!mail || mail.length == 0)
		return '-';

	var md5 = crypto.createHash('md5');
	md5.update(mail.trim().toLowerCase(), 'utf8');
	return md5.digest('hex');
}

function handleGravatar(request, response, urldata) {
	response.writeHead(200, {
		'Content-Type': 'text'
	});
	return response.end(
		mail2gravatarHash(urldata.query.email || '')
	);
}

function handleInsight(request, response, urldata) {
	response.writeHead(200, {
		'Content-Type': 'application/json'
	});

	var insight = {};
	for(topic in topics) {
		var attendees = [];
		for (var i = 0; i < topics[topic].attendees.length; i++) {
			attendees.push({
				email: topics[topic].attendees[i].email,
				hash: topics[topic].attendees[i].hash,
				state: 'tbd;'
			});
		};

		insight[topic] = {
			attendees: attendees,
			stack: topics[topic].stack
		}
	};

	return response.end(
		JSON.stringify(insight, null, "\t")
	);
}

function handleLessRecompile(request, response, cb) {
	var url = request.url;
	
	// test if this is a request for a css file, otherwise go on
	if(path.extname(url) != '.css')
		return cb();
	
	// build the potential lesscss-file path
	var
		cssname = path.join('./public/', url),
		lessname = path.join('./public/', path.dirname(url)+path.basename(url, '.css')+'.less');

	console.log('lessc: recompiling ', lessname, ' -> ', cssname);

	// test if there is a less file
	fs.exists(lessname, function(exists) {
		// otherwise go on
		if(!exists) return cb();

		// read less file
		fs.readFile(lessname, {encoding: 'utf8'}, function(err, lesscode) {
			if(err) return response.endError(500, 'unable to read less file: ' + lessname);

			try {
				less.render(
					lesscode,
					{
						conpress: true,
						relativeUrls: true
					},
					function(err, csscode) {
						if(err) return response.endError(500, less.formatError(err));

						fs.writeFile(cssname, csscode, {encoding: 'utf8'}, function(err) {
							if(err) {
								console.log('unable to write css file ' + cssfile + ', returning css-file dynamicly');
								response.writeHead(200, {
									'Content-Type': 'text/css'
								});
								return response.end(csscode);
							}

							return cb();
						});
					}
				);
			}
			catch(err) {
				if(err) return response.endError(500, less.formatError(err));
			}

		})
	});
}
