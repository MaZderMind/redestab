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

var port = process.env.PORT || 8080;
console.log('creating http-server on port', port);
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

}).listen(port);

var srv = io.listen(server);
srv.configure(function() {

	srv.enable('browser client minificatsrvn');  // send minified client
	srv.enable('browser client gzip');          // gzip the file
	srv.set('log level', 1);                    // reduce logging
	srv.set("transports", ["xhr-polling"]);
	srv.set("polling duration", 10);
	//srv.set("heartbeat interval", 15);
	//srv.set("heartbeat timeout", 20);

}).sockets.on('connection', function(socket) {
	var ident;

	socket.on('disconnect', function () {
		if(!ident) return;

		var topic = topics[ident.topic];
		if(!topic) return;

		ident.sockets.splice(ident.sockets.indexOf(socket), 1);
		console.log('a socket left ident '+ident.email+' (still '+ident.sockets.length+' sockets on that ident)');

		if(ident.sockets.length == 0) {
			delete topic.attendees[ident.email];
			var nAttendees = Object.keys(topic.attendees).length;
			console.log('ident '+ident.email+' left topic '+ident.topic+' (still '+nAttendees+' talking on that topic)');

			var indexOnStack = topic.stack.indexOf(ident.email);
			if(indexOnStack != -1) {
				console.log('  also removing ident '+ident.email+' from stack of topic '+ident.topic+' (was on position '+indexOnStack+')');
				topic.stack.splice(indexOnStack, 1);
			}

			if(nAttendees == 0) {
				console.log('destroying topic '+ident.topic);
				delete topics[ident.topic];
			}
			else sendUpdate(topic);
		}
	});

	socket.on('ident', function(_ident) {
		if(!topics[_ident.topic]) {
			console.log('creating topic '+_ident.topic)
			topics[_ident.topic] = {attendees: [], stack: []};
		}

		var topic = topics[_ident.topic];

		if(topic.attendees[_ident.email]) {
			console.log('ident '+_ident.email+' is already on that topic, adding another socket')
			ident = topic.attendees[_ident.email];
			ident.sockets.push(socket);
		}
		else {
			console.log('ident '+_ident.email+' entered topic '+_ident.topic);
			ident = _ident;
			ident.hash = mail2gravatarHash(ident.email);
			ident.sockets = [socket];

			topic.attendees[ident.email] = ident;
		}

		sendUpdate(topic);
	});

	socket.on('want', function() {
		if(!ident) return;

		var topic = topics[ident.topic];
		if(!topic) return;

		var indexOnStack = topic.stack.indexOf(ident.email);
		if(indexOnStack == -1) {
			console.log(ident.email+' wants to talk on topic '+ident.topic);
			topic.stack.push(ident.email);
			ident.dt = (new Date()).getTime();
		}
		else {
			if(indexOnStack == 0)
				console.log(ident.email+' finished talking on topic '+ident.topic);
			else
				console.log(ident.email+' don\'t want to talk on topic '+ident.topic+' anymore');

			topic.stack.splice(indexOnStack, 1);
			delete ident.dt;

			// if the speaker has finished and has been removed, update the dt of the new speaker
			if(indexOnStack == 0 && topic.stack.length > 0)
				topic.attendees[topic.stack[0]].dt = (new Date()).getTime();
		}

		sendUpdate(topic);
	});
});

function sendUpdate(topic)
{
	var freshdata = {
		attendees: {},
		stack: topic.stack,
		dt: (new Date()).getTime()
	}

	for (var email in topic.attendees) {
		var attendee = topic.attendees[email];
		freshdata.attendees[email] = {
			email: attendee.email,
			hash: attendee.hash,
			dt: attendee.dt
		};
	};

	for (var email in topic.attendees) {
		var attendee = topic.attendees[email];
		for (var i = 0; i < attendee.sockets.length; i++) {
			attendee.sockets[i].emit('update', freshdata);
		}
	}
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
	for(var topic in topics) {
		insight[topic] = {
			attendees: {},
			stack: topics[topic].stack
		}

		for(var email in topics[topic].attendees) {
			var attendee = topics[topic].attendees[email];

			insight[topic].attendees[email] = {
				email: attendee.email,
				hash: attendee.hash,
				dt: attendee.dt,
				nSockets: attendee.sockets.length
			};
		};
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
