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

export default class CPUndo {
    /**
     * Attempt to merge the given undo into this one, and return true if successful.
     *
     * @param undo
     * @returns {boolean}
     */
    merge(undo) {
        return false;
    };
    
    /**
     * Return true if this undo didn't modify the document.
     *
     * @returns {boolean}
     */
    noChange() {
        return false;
    };
    
    /**
     * Return the number of bytes of memory used by this undo, or 0 if it cannot be estimated.
     *
     * @param undone
     * @param param
     * @returns {number}
     */
    getMemoryUsed(undone, param) {
        return 0;
    };
    
    /**
     * Call when this undo is no longer on the top of the stack, so it can optimize its memory usage.
     */
    compact() {
    }
}