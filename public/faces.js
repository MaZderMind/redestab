var
	path = window.location.pathname,
	topic = path.split('/')[3],
	email = $.cookie('user'),
	socket = io.connect(window.location.protocol+'//'+window.location.host);

$(function() {
	var
		$facebar = $('.facebar'),
		$faceTpl = $facebar.find('.face').first().clone();

	$('title').text(topic + ' - ' + $('title').text());
	$('h2').text(topic);
	$facebar.html('');

	socket.on('status', function(status) {
		console.log(status);
		for (var i = 0; i < status.faces.length; i++) {
			var $face = $faceTpl.clone();
			$face.find('.frame').css('background-image', 'url(http://www.gravatar.com/avatar/'+status.faces[i].hash+'?s=150&d=identicon&r=x)');
			$face.find('.name').text(status.faces[i].name);
			$face.find('.state').text(status.faces[i].state);
			$face.appendTo($facebar);
		};
	});
	socket.emit('ident', {'topic': topic, 'email': email});
});
