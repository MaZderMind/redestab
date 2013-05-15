var
	path = window.location.pathname,
	topic = path.split('/')[3],
	email = $.cookie('user'),
	socket = io.connect(window.location.protocol+'//'+window.location.host, {
		'reconnection limit': 5000,
		'max reconnection attempts': 30
	});


$(function() {
	var
		$facebar = $('.facebar'),
		$faceTpl = $facebar.find('.face').first().clone(),
		$submit = $('body > button'),
		$disconnected = $('.disconnected');

	$('title').text(topic + ' - ' + $('title').text());
	$('h2').text(topic);

	socket.on('faces', function(faces) {
		$facebar.html('');
		for (var i = 0; i < faces.length; i++) {
			var $face = $faceTpl.clone();
			$face.find('.frame').css('background-image', 'url(http://www.gravatar.com/avatar/'+faces[i].hash+'?s=150&d=identicon&r=x)');
			$face.find('.name').text(faces[i].email);
			$face.find('.state').text(faces[i].state);
			$face.appendTo($facebar);
		};
	});

	var retrycnt = 0
	socket.on('connect', function() {
		retrycnt = 0;
		$disconnected.css('display', 'none');
		socket.emit('ident', {'topic': topic, 'email': email});
	});

	socket.on('disconnect', function() {
		$disconnected.css('display', 'block');
	});

	socket.on('reconnecting', function () {
		$disconnected.find('.cnt').text(++retrycnt);
	});

	socket.on('reconnect_failed', function () {
		$disconnected.find('.cnt').text('Ω');
	});

	$submit.on('click', function() {});
});
