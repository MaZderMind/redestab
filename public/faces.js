var
	path = window.location.pathname,
	topic = decodeURI(path.split('/')[3]),
	email = $.cookie('user'),
	indexOnStack = -1,
	lastdata,
	max_reconnects = 30,
	socket = io.connect(window.location.protocol+'//'+window.location.host, {
		'reconnection limit': 5000,
		'max reconnection attempts': max_reconnects,
		'sync disconnect on unload': true
	});

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
	else return 'zu lang...';
}



$(function() {
	var
		$facebar = $('.facebar'),
		$facetpl = $facebar.find('.face').first().remove(),
		$submit = $('body > button'),
		$disconnected = $('.disconnected'),
		$connecting = $('.connecting'),
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
				thisEmail = $face.data('id'),
				idx = lastdata.stack.indexOf(thisEmail);

			if(idx != -1) {
				var msecs = now - lastdata.attendees[lastdata.stack[idx]].dt + dtoffset;
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
		indexOnStack = freshdata.stack.indexOf(email);
		console.log('Date/Time offset is now ', dtoffset / 1000, 'seconds');

		var $newFacebar = $('<div/>');

		if(indexOnStack == 0) {
			$submit.text('Ich habe fertig').removeClass('onstack');
		}
		else if(indexOnStack != -1) {
			$submit.text('Neee, doch nich’ mehr').addClass('onstack');
		}
		else {
			$submit.text('Ich will reden!').removeClass('onstack');
		}

		for (var i = 0; i < freshdata.stack.length; i++) {
			$newFacebar.append($facetpl.instanciate(freshdata.attendees[freshdata.stack[i]]));
		}

		if(freshdata.stack.length > 0)
			$('<div class="divider" data-id="divider"/>').appendTo($newFacebar);

		for(var thisEmail in freshdata.attendees) {
			if(freshdata.stack.indexOf(thisEmail) != -1)
				continue;

			$newFacebar.append($facetpl.instanciate(freshdata.attendees[thisEmail]));
		}

		$facebar.quicksand($newFacebar.children(), function() {
			$facebar.css({width: ''});
		});

		lastdata = freshdata;
		updateTimings();
	});

	var retrycnt = 0
	socket.on('connect', function() {
		retrycnt = 0;
		$disconnected.css('display', 'none');
		$connecting.css('display', 'none');
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

	$connecting.css('display', 'block');
});
