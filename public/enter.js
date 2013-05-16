$(function() {
	var
		$enterButton = $('.enter button'),
		$enterForm = $('.enter form'),
		$enterTxts = $('.enter input'),
		$topicTxt = $('.enter .topic input'),
		$userTxt = $('.enter .user input'),
		$enterFrame = $('.enter .frame'),
		$enterIcon = $('.enter .frame .icon'),
		cookieOpts = {path: '/', expires: 360};

	$userTxt.val($.cookie('user') || '');
	$topicTxt.val($.cookie('topic') || '');

	var gravatarTimeout;

	$enterTxts.on('keydown keyup', function() {
		var valid = $topicTxt.val().length > 0 && $userTxt.val().length > 0;
		$enterButton.toggleClass('enabled', valid);
		if(!valid) $enterButton.removeClass('hover');

		clearTimeout(gravatarTimeout);
		if($userTxt.val().length == 0) {
			$enterIcon.css('display', 'block');
			$enterFrame.css('background-image', '');
		}
		else {
			gravatarTimeout = setTimeout(function() {
				$.ajax({
					url: '/gravatar',
					data: {
						email: $userTxt.val()
					},
					method: 'GET',
					dataType: 'text',
					success: function(hash) {
						$enterIcon.css('display', 'none');
						$enterFrame.css('background-image', 'url(http://www.gravatar.com/avatar/'+hash+'?s=150&d=identicon&r=x)');
					}
				});
			}, 250);
		}
	}).trigger('keydown');

	$enterButton.on('mouseenter mouseleave', function(e) {
		$enterButton.toggleClass('hover', e.type == 'mouseenter' && $enterButton.hasClass('enabled'));
	});

	$enterForm.on('submit', function(e) {
		$.cookie('user', $userTxt.val(), cookieOpts);
		$.cookie('topic', $topicTxt.val(), cookieOpts);

		window.location.pathname = '/mitreden/bei/'+encodeURI($topicTxt.val());
		e.preventDefault();
	});
});
