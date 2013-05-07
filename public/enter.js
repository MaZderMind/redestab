$(function() {
	var
		$enterButton = $('.enter button'),
		$enterForm = $('.enter form'),
		$enterTxts = $('.enter input'),
		$topicTxt = $('.enter .topic input'),
		$userTxt = $('.enter .user input'),
		$enterFrame = $('.enter .frame'),
		$enterIcon = $('.enter .frame .icon'),
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
/*				$.ajax({
					url: 'http://www.gravatar.com/'+hash+'.json',
					method: 'GET',
					dataType: 'jsonp',
					success: function(info) {
						console.log(info);
					}
				});
*/
				$enterIcon.css('display', 'none');
				$enterFrame.css('background-image', 'url(http://www.gravatar.com/avatar/'+hash+'?s=150&d=identicon&r=x)');
			}
		});
	}).trigger('change').trigger('keydown');

	$enterButton.on('mouseenter mouseleave', function(e) {
		$enterButton.toggleClass('hover', e.type == 'mouseenter' && $enterButton.hasClass('enabled'));
	});

	$enterForm.on('submit', function(e) {
		window.location.pathname = '/mitreden/bei/'+encodeURI($topicTxt.val());
		e.preventDefault();
	});
});
