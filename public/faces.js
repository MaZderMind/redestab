var
	path = window.location.pathname,
	topic = decodeURI(path.split('/')[3]),
	email = $.cookie('user'),
	indexOnStack = -1,
	stack = [],
	max_reconnects = 30,
	socket = io.connect(window.location.protocol+'//'+window.location.host, {
		'reconnection limit': 5000,
		'max reconnection attempts': max_reconnects
	});

Array.prototype.uIndexOf = function(fn) {
	for (var i = 0; i < this.length; i++) {
		if(fn(this[i]))
			return i;
	};
	return -1;
}

function formatTiming(msecs)
{
	var secs = Math.round(msecs / 1000, 0);
	if(secs < 60) {
		var
			plural = (secs != 1);

		return secs+(plural ? ' Sekunden' : ' Sekunde');
	}
	else if(secs < 60*60) {
		var 
			mins = parseInt(secs / 60),
			plural = (mins != 1);

		return mins+(plural ? ' Minuten' : ' Minute');
	}
	else if(secs < 60*60*24) {
		var 
			hours = parseInt(secs / 60 / 60),
			mins = parseInt((secs % (60 * 60)) / 60),
			hoursplural = (hours != 1);
			hasmins = mins > 0,
			minsplural = (mins != 1);

		return hours+(hoursplural ? ' Stunden' : ' Stunde')+(hasmins ? ' und '+mins+(minsplural ? ' Minuten' : ' Minute') : '');
	}
	else return 'zu lag...';
}



$(function() {
	var
		$facebar = $('.facebar'),
		$facetpl = $facebar.find('.face').first().remove(),
		$submit = $('body > button'),
		$disconnected = $('.disconnected'),
		dtoffset = 0;


	$facetpl.instanciate = function(attendee) {
		var $face = $facetpl.clone();

		$face.find('.frame').css('background-image', 'url(http://www.gravatar.com/avatar/'+attendee.hash+'?s=150&d=identicon&r=x)');
		$face.find('.name').text(attendee.email);
		$face.data('id', attendee.email);
		$face.attr('data-id', attendee.email);
		$face.toggleClass('myself', attendee.email == email);

		return $face;
	}

	$('title').text(topic + ' - ' + $('title').text());
	$('h2').text(topic);

	function updateTimings() {
		var now = (new Date()).getTime() + dtoffset;
		$facebar.find('.face').each(function() {
			var
				$face = $(this),
				$state = $face.find('.state'),
				email = $face.data('id'),
				idx = stack.uIndexOf(function(el) { return el.email == email; });

			if(idx != -1) {
				var msecs = now - stack[idx].dt + dtoffset;
				$state.text((idx == 0 ? 'redet seit ' : 'wartet seit ') + formatTiming(msecs));
			}
			else {
				$state.text('');
			}
		})
	}
	function scheduleUpdateTimings() {
		updateTimings();
		setTimeout(scheduleUpdateTimings, 500);
	}
	scheduleUpdateTimings();

	socket.on('update', function(freshdata) {
		dtoffset = (new Date()).getTime() - freshdata.dt;
		indexOnStack = freshdata.stack.uIndexOf(function(el) { return el.email == email; });
		console.log('Date/Time offset is now ', dtoffset, 'seconds');

		var $newFacebar = $('<div/>');

		if(freshdata.stack.length > 0 && freshdata.stack[0].email == email) {
			$submit.text('Ich habe fertig').removeClass('onstack');
		}
		else if(indexOnStack != -1) {
			$submit.text('Neee, doch nich’ mehr').addClass('onstack');
		}
		else {
			$submit.text('Ich will reden!').removeClass('onstack');
		}

		for (var i = 0; i < freshdata.stack.length; i++) {
			$newFacebar.append($facetpl.instanciate(freshdata.stack[i]));
		}

		if(freshdata.stack.length > 0)
			$('<div class="divider" data-id="divider"/>').appendTo($newFacebar);

		for (var i = 0; i < freshdata.attendees.length; i++) {
			if(freshdata.stack.uIndexOf(function(el) { return el.email == freshdata.attendees[i].email }) != -1) continue;
			$newFacebar.append($facetpl.instanciate(freshdata.attendees[i]));
		}

		$facebar.quicksand($newFacebar.children(), function() {
			$facebar.css({width: ''});
		});

		stack = freshdata.stack;
		updateTimings();
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
