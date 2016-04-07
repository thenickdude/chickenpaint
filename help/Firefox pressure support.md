# Native pen pressure support in Firefox

Native pen pressure support is currently disabled in Firefox, because enabling it exposes a
[Firefox bug which can cause the browser to crash](https://bugzilla.mozilla.org/show_bug.cgi?id=1181564).
When pressure support is enabled in Firefox, this bug can be triggered by dragging things around. For example, if you click
a link on the page, and then before the page changes, you click on that same link and drag it a little bit, if you
release the mouse button after the new page loads, the browser will crash. This would happen on all webpages (not just
those which have ChickenPaint embedded).

If you're okay with this risk of crashing, you can enable the experimental built-in tablet support in Firefox
by entering "about:config" into your address bar and pressing enter. Type "pointer" in the search box, then
double click on "dom.w3c_pointer_events.enabled" to change the "Value" column for it to "true". You'll probably need to
restart Firefox after that.

Hopefully Firefox fixes this bug soon so native pressure support can move out of experimental for everybody to use!

Note that if you have a Wacom tablet, have the latest Wacom drivers installed, and are using the 32-bit version of Firefox,
you should have pen pressure support available without having to enable this experimental feature.