/*
    ChickenPaint
    
    ChickenPaint is a translation of ChibiPaint from Java to JavaScript
    by Nicholas Sherlock / Chicken Smoothie.
    
    ChibiPaint is Copyright (c) 2006-2008 Marc Schefer

    ChickenPaint is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    ChickenPaint is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with ChickenPaint. If not, see <http://www.gnu.org/licenses/>.
*/

import $ from "jquery";

export default function CPAboutDialog(parent) {
    var
        dialog = 
            $(`<div class="modal fade chickenpaint-about-dialog" tabindex="-1" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">About ChickenPaint v2</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <a class="chickenpaint-on-github" target="_blank" href="https://github.com/thenickdude/chickenpaint"><span class="fab fa-github"></span> ChickenPaint on GitHub</a>
                            
                            <p>
                                ChickenPaint is a translation of <a href="https://github.com/thenickdude/chibipaint" target="_blank">ChibiPaint</a>
                                from Java to JavaScript by Nicholas Sherlock / Chicken Smoothie
                            </p>
                            <p>
                                ChibiPaint is Copyright (c) 2006-2008 Marc Schefer. All Rights Reserved
                            </p>
                            <p>
                                ChickenPaint is free software: you can redistribute it and/or modify
                                it under the terms of the GNU General Public License as published by
                                the Free Software Foundation, either version 3 of the License, or
                                (at your option) any later version.
                            </p>
        
                            <p>
                                ChickenPaint is distributed in the hope that it will be useful,
                                but WITHOUT ANY WARRANTY; without even the implied warranty of
                                MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
                                <a target="_blank" href="https://www.gnu.org/licenses/">GNU General Public License</a> for more details.
                            </p>
        
                            <pre class="pre-scrollable chickenpaint-third-party-licenses">Toolbar icons designed by <a target="_blank" href="https://github.com/Anteira">Miglena Lapavicheva (Anteira)</a>
    These icons are dual-licensed under <a target="_blank" href="https://spdx.org/licenses/GPL-3.0-or-later.html">GPL-3.0-or-later</a> and <a target="_blank" href="https://creativecommons.org/licenses/by/3.0/">CC-BY-3.0</a>

Includes icons from the <a target="_blank" href="https://extensions.libreoffice.org/en/extensions/show/tango-icon-theme-for-libreoffice">Tango Icon Theme for LibreOffice</a>:
    All artwork is licensed under the Creative Commons Attribution-Share Alike 3.0
    United States License. To view a copy of this licence, visit
    https://creativecommons.org/licenses/by-sa/3.0/ or send a letter to Creative
    Commons, 171 Second Street, Suite 300, San Francisco, California 94105, USA.
    
    Credit for icons imported from git://git.gnome.org/gnome-icon-theme or derivatives
    of these goes to the GNOME project (https://www.gnome.org)
    Derivatives and new icons were created by Alexander Wilms &lt;f.alexander.wilms@gmail.com> 
    and Miroslav Mazel &lt;mazelm@gmail.com>
    
Includes these MIT-licensed libraries:

    Includes the <a target="_blank" href="https://github.com/eligrey/FileSaver.js">FileSaver.js library</a>
    FileSaver.js Copyright © 2015 <a target="_blank" href="https://eligrey.com/">Eli Grey</a>

    Includes the <a target="_blank" href="https://github.com/nodeca/pako">Pako zlib compression library</a>
    Copyright (C) 2014-2015 by Vitaly Puzrin
    
    Includes the <a target="_blank" href="https://github.com/madrobby/keymaster">keymaster.js</a> keyboard library
    Copyright (c) 2011-2013 Thomas Fuchs

    Includes the <a target="_blank" href="https://github.com/stefanpenner/es6-promise">es6-promise</a> library
    Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors

    Includes the <a target="_blank" href="https://benalman.com/projects/jquery-throttle-debounce-plugin/">jQuery throttle-debounce</a> library
    Copyright (c) 2010 "Cowboy" Ben Alman

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or
    sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

Includes the <a href="https://www.jquery.com/" target="_blank">jQuery library</a> 
Copyright <a href="https://jquery.org/" target="_blank">jQuery Foundation and other contributors</a>
    
    This software consists of voluntary contributions made by many
    individuals. For exact contribution history, see the revision 
    history available at https://github.com/jquery/jquery
    
    The following license applies to all parts of this software 
    except as documented below:
    
    Permission is hereby granted, free of charge, to any person 
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use, 
    copy, modify, merge, publish, distribute, sublicense, and/or
    sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:
    
    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

Includes the <a href="https://github.com/jquery/PEP/" target="_blank">jQuery PEP library</a>
Copyright jQuery Foundation and other contributors, https://jquery.org/
    
    This software consists of voluntary contributions made by many
    individuals. For exact contribution history, see the revision 
    history available at https://github.com/jquery/PEP
    
    The following license applies to all parts of this software 
    except as documented below:
    
    Permission is hereby granted, free of charge, to any person 
    obtaining a copy of this software and associated documentation 
    files (the "Software"), to deal in the Software without 
    restriction, including without limitation the rights to use, 
    copy, modify, merge, publish, distribute, sublicense, and/or 
    sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following 
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
    OTHER DEALINGS IN THE SOFTWARE.

Includes Font Awesome by Dave Gandy - <a href="https://fontawesome.io" target="_blank">https://fontawesome.io</a>
                    </pre>
                </div>
            </div>
        </div>
    `);
    
    // Destroy the modal upon close
    dialog.on("hidden.bs.modal", function(e) {
        dialog.remove();
    });
    
    dialog.modal({
        show: false
    });
    
    // Fix the backdrop location in the DOM by reparenting it to the chickenpaint container
    dialog.data("bs.modal").$body = $(parent);
    
    parent.appendChild(dialog[0]);

    this.show = function() {
        dialog.modal("show");
    };
}