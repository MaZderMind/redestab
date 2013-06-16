redestab
========

Der Redestab - ein Experiment zur Förderung der Gesprächskultur in verteilten Poscasts.


Motivation
----------

Während des [Podlove Podcaster Workshops am 4./6. Mai 2013](http://metaebene.me/blog/2013/03/15/podlove-podcaster-workshop/) wurde am Rande über das Problem der Gesprächskultur in (räumlich) verteilten Pocasts gesprochen. Was bei Dialogen noch kein Problem ist, kann bei mehr als zwei Sprechern schnell zum Problem werden, wenn einer der drei nicht so extrovertiert ist, wie die anderen beiden.

Oft ist es eine dumme Idee, soziale Probleme mit Technik lösen zu wollen, aber anyway, ich bin nunmal Techniker - und ich hatte grade lust, mich mal wieder mit [NodeJS](http://nodejs.org/) und [Socket.IO](http://socket.io/) zu beschäftigen und so hab’ ich hier mal meine Implementierung eines digitalen [Redestabs](http://de.wikipedia.org/wiki/Redestab) zusammengetragen.


Umsetzung
---------

Der Redestab-Dienst funktioniert wie das Handheben im Klassenzimmer - nur gerechter. Durch das besuchen einer URL oder das eintippen eines Gesprächsnames sowie ggf. der eigenen E-Mail-Adresse gelangt man in den Gesprächsraum, in dem man auch alle anderen Anwesenden sehen kann. Ein großer Knopf lädt dazu ein, etwas zu sagen: "Ich will reden!"

Durch betätigen dieses Knopfes (nicht zu verfehlen - es ist der einzige auf der Seite), stellt man sich hinten an der Redner-Warteschlange an. Die Reihenfolge der Redner wird durch die Reihenfolge der Namen und Avatar-Symbole (es wird [Gravatar](http://de.gravatar.com/) verwendet) visuell dar gestellt. Eine Zeitanzeige gibt auskunft darüber, wie lange bereits gesprochen oder gewartet wurde. Ein verlassen des (virtuellen) Rednerpultes oder der Warteschlange ist jederzeit möglich.


Warum nur deutsch?
------------------
Weil isso. Erstmal. Das Konzept ist noch nicht ganz fertig und eventuell werden noch einige Texte geändert oder hinzugefügt. Außerdem gibt es viel zu wenig Software in deutsch und die deutsche Podcast-Kultur ist eh cooler und so.


Plan
----
Mit Plänen ist's so eine Sache, aber folgende Punkte gedenke ich in jedem Fall noch zu erledigen:
 - [x] Bei [Heroku](https://www.heroku.com/) unterbringen und mit ’ner Domain beglücken (http://der-redestab.de/ und für die englische Version dann http://the-talkingstick.net/)
 - [x] Gestaltung von jemandem™ überarbeiten lassen
 - [ ] englische Sprache hinzufügen


Kontakt
-------
Man kann mich unter github@mazdermind.de direkt anmailen oder mir beim [RadioOSM](http://podcast.openstreetmap.de) zuhören
