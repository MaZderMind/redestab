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
		dtoffset = 0,
		currentdata = {attendees: {}, stack: []};

	$('title').text(topic + ' - ' + $('title').text());
	$('h2').text(topic);

	socket.on('update', function(freshdata) {
		dtoffset = (new Date()).getTime() - freshdata.dt;
		//console.log('Date/Time offset is now ', dtoffset, 'seconds');

		var
			dropout = Object.keys(currentdata.attendees),
			nAttendees = dropout.length;

		for (var i = 0; i < freshdata.attendees.length; i++) {
			var
				attendee = freshdata.attendees[i],
				idx = dropout.indexOf(attendee.email);

			if(idx == -1) {
				console.log('ENTER', attendee.email)
				currentdata.attendees[attendee.email] = attendee;

				var $face = $facetpl.clone();
				$face.find('.frame').css('background-image', 'url(http://www.gravatar.com/avatar/'+attendee.hash+'?s=150&d=identicon&r=x)');
				$face.find('.name').text(attendee.email);
				$face.data('email', attendee.email);
				attendee.$el = $face;
				$face.appendTo($facebar)

				// don't animate the initial occurrence of faces, only the ones coming later
				if(nAttendees > 0) {
					$face.css('opacity', 0).animate({
						'opacity': 1
					}, {
						duration: 750
					});
				}
			}
			else {
				var currentAttendee = currentdata.attendees[attendee.email];
				if(currentAttendee.dropTimeout)
					clearTimeout(currentAttendee.dropTimeout);

				console.log('KEEP', currentAttendee.email, currentAttendee.dropTimeout)
				dropout.splice(idx, 1);
			}
		}

		for (var i = 0; i < dropout.length; i++) {
			var attendee = currentdata.attendees[dropout[i]];

			if(attendee.dropTimeout)
				clearTimeout(attendee.dropTimeout);

			attendee.dropTimeout = setTimeout(function() {
				console.log('DROP', attendee.email);
				attendee.$el.animate({
					'opacity': 0
				}, {
					duration: 750,
					complete: function() {
						$(this).remove();
					}
				});

				delete currentdata.attendees[attendee.email];
			}, 750);
			console.log('DROP (WAITING)', attendee.email, attendee.dropTimeout);

		}

/*
*/

		// compare the fesh stack with the old onw
		//  move as necessary
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
