var
	path = window.location.pathname,
	topic = decodeURI(path.split('/')[3]),
	email = $.cookie('user'),
	max_reconnects = 30,
	socket = io.connect(window.location.protocol+'//'+window.location.host, {
		'reconnection limit': 5000,
		'max reconnection attempts': max_reconnects
	});


$(function() {
	var
		$facebar = $('.facebar'),
		$facetpl = $facebar.find('.face').first().remove(),
		$submit = $('body > button'),
		$disconnected = $('.disconnected'),
		dtoffset = 0;

	$('title').text(topic + ' - ' + $('title').text());
	$('h2').text(topic);

	socket.on('update', function(freshdata) {
		dtoffset = (new Date()).getTime() - freshdata.dt;
		//console.log('Date/Time offset is now ', dtoffset, 'seconds');

		var $newFacebar = $('<div/>');
		for (var i = 0; i < freshdata.attendees.length; i++) {
			var
				attendee = freshdata.attendees[i]
				$face = $facetpl.clone().appendTo($newFacebar);

			$face.find('.frame').css('background-image', 'url(http://www.gravatar.com/avatar/'+attendee.hash+'?s=150&d=identicon&r=x)');
			$face.find('.name').text(attendee.email);
			$face.data('id', attendee.email);
			$face.attr('data-id', attendee.email);
			$face.toggleClass('myself', attendee.email == email);
		}

		$facebar.quicksand($newFacebar.children('.face'));
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
		if(++retrycnt >= max_reconnects)
			$disconnected.find('.cnt').text('Ω');
		else
			$disconnected.find('.cnt').text(retrycnt);
	});

	$submit.on('click', function() {
		socket.emit('want');
	});
});
