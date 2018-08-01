# Native pen pressure support in Firefox

## Version 59 onwards

Firefox now supports pen pressure since Firefox 59. On Windows you may need to toggle a browser setting to get pressure
working for you.

Enter "about:config" into your address bar and press enter. Type "w3c" in the search box, then
double click on "dom.w3c_pointer_events_dispatch_by_pointer_messages" to change the "Value" column for it to "true".

Make sure "dom.w3c_pointer_events.enabled" is "true" as well (this is the default for this version of Firefox).

## Versions 41 - 58

Native pen pressure support is disabled in these old versions of Firefox, because enabling it exposes a
[Firefox bug which can cause the browser to crash](https://bugzilla.mozilla.org/show_bug.cgi?id=1181564).
When pressure support is enabled in Firefox, this bug can be triggered by dragging things around. For example, if you click
a link on the page, and then before the page changes, you click on that same link and drag it a little bit, if you
release the mouse button after the new page loads, the browser will crash. This would happen on all webpages (not just
those which have ChickenPaint embedded).

If you're okay with this risk of crashing, you can enable the experimental built-in tablet support in Firefox
by entering "about:config" into your address bar and pressing enter. Type "w3c" in the search box, then
double click on "dom.w3c_pointer_events.enabled" to change the "Value" column for it to "true", and do the
same with "dom.w3c_pointer_events_dispatch_by_pointer_messages". You'll probably need to restart Firefox after that.

ote that if you have a Wacom tablet, have the latest Wacom drivers installed, and are using the 32-bit version of Firefox,
you should have pen pressure support available without having to enable this experimental feature. 

