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

io.listen(server).sockets.on('connection', function(socket) {
	socket.on('ident', function(ident) {
		if(!topics[ident.topic])
			topics[ident.topic] = {faces: [], sockets: []};

		var topic = topics[ident.topic];
		ident.hash = mail2gravatarHash(ident.email);
		topic.faces.push(ident);

		for (var i = 0; i < topic.sockets.length; i++) {
			topic.sockets[i].emit('status', topic);
		};
	});
});

function handleApiCalls(request, response) {
	var urldata = url.parse(request.url, true);

	switch(true) {
		case(urldata.pathname == '/gravatar'):
			console.log(request.url+' -> gravatarHandler');
			return handleGravatar(request, response, urldata);

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
	response.end(
		mail2gravatarHash(urldata.query.email || '')
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
