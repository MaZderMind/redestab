var
	StaticServer = require('node-static').Server,
	file = new StaticServer('./public'),
	path = require('path'),
	url = require('url'),
	async = require('async'),
	fs = require('fs'),
	less = require('less'),
	http = require('http'),
	argv = require('optimist').argv,
	crypto = require('crypto');

http.ServerResponse.prototype.endError = function(code, msg) {
	this.writeHead(code, {
		'Content-Type': 'text/plain'
	});
	this.end(msg);
	return this;
}

http.createServer(function (request, response) {

	if(handleApiCalls(request, response)) return;
	//if(handleSocketIo(request, response)) return;

	if(argv.develop) {
		handleLessRecompile(request, response, function() {
			file.serve(request, response);
		});
	}
	else file.serve(request, response);

}).listen(8080);

function handleApiCalls(request, response) {
	var urldata = url.parse(request.url, true);

	switch(urldata.pathname) {
		case '/gravatar':
			return handleGravatar(request, response, urldata);

		default:
			return false;
	}
}

function handleGravatar(request, response, urldata) {
	var md5 = crypto.createHash('md5');
	md5.update((urldata.query.email || '').trim().toLowerCase(), 'utf8');

	response.writeHead(200, {
		'Content-Type': 'text'
	});
	response.end(md5.digest('hex'));
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

	console.log('recompiling ', lessname, ' -> ', cssname);

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
