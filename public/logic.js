$(function() {
	var
		$enter = $('#enter'),
		$faces = $('#faces'),
		$enterButton = $enter.find('button'),
		$enterTxts = $enter.find('input'),
		$topicTxt = $enter.find('.topic input'),
		$userTxt = $enter.find('.user input'),
		$enterFrame = $enter.find('.frame'),
		$enterIcon = $enterFrame.find('.icon'),
		cookieOpts = {path: '/'};

	$userTxt.val($.cookie('user') || '');
	$topicTxt.val($.cookie('topic') || '');

	$enterTxts.on('keydown keyup', function() {
		var valid = $topicTxt.val().length > 0 && $userTxt.val().length > 0;
		$enterButton.toggleClass('enabled', valid);
		if(!valid) $enterButton.removeClass('hover');
	}).on('change', function() {
		if($userTxt.val().length == 0) return;

		$.cookie('user', $userTxt.val(), cookieOpts);
		$.cookie('topic', $topicTxt.val(), cookieOpts);

		$.ajax({
			url: '/gravatar',
			data: {
				email: $userTxt.val()
			},
			method: 'GET',
			dataType: 'text',
			success: function(hash) {
				$.ajax({
					url: 'http://www.gravatar.com/'+hash+'.json',
					method: 'GET',
					dataType: 'jsonp',
					success: function(info) {
						console.log(info);
					}
				});

				$enterIcon.css('display', 'none');
				$enterFrame.css('background-image', 'url(http://www.gravatar.com/avatar/'+hash+'?s=150&d=identicon&r=x)');
			}
		});
	}).trigger('change').trigger('keydown');

	$enterButton.on('mouseenter mouseleave', function(e) {
		$enterButton.toggleClass('hover', e.type == 'mouseenter' && $enterButton.hasClass('enabled'));
	}).on('click', function() {
		$enter.animate({
			opacity: 0
		}, {
			complete: function() {
				$(this).css('display', 'none');
				$faces.css({'display': 'block', 'opacity': 0}).animate({
					'opacity': 1
				});
			}
		})
	});
});
