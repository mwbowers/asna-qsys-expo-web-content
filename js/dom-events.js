/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { theDomEvents as DomEvents, Unique, theUnits as Units };

let uniqueID = 0;

class Unique {

    static getUniqueID() {
        return `unique${uniqueID++}`;
    }
}

class DomEvents {
    cancelEvent(event) {
        if (event && typeof (event.stopPropagation) === 'function') { // Modern browsers. Note: On IE10 e is not window.event
            event.stopPropagation();

            if (typeof (event.preventDefault) === 'function') {
                event.preventDefault(); // On IE9+,  preventDefault() also sets window.event.returnValue to false
            }

            // IE 9+
            if (typeof (event.cancelBubble) === 'boolean') {
                event.cancelBubble = true;
            }
        }
        else if (window.event) { // IE < 9
            window.event.cancelBubble = true;
            window.event.returnValue = false;
            /*eslint-disable */
            try {
                window.event.keyCode = 0; // May be read-only (handle exception)
            }
            catch (ex) {
            }
            /*eslint-enable */
        }
    }
}

class Units {
    constructor() {
        this.oneRem = 0;
    }

    toPixels(sUnits, parent) {
        const qty = parseFloat(sUnits);
        if (sUnits.endsWith('px') ) { 
            return qty;
        }

        if (sUnits.endsWith('rem')) {
            if (!this.oneRem) {
                this.oneRem = Units.calcHeightPix('1rem', document.body);
            }
            return qty * this.oneRem;
        }

        if (sUnits.endsWith('em')) {
            const em = Units.calcHeightPix('1em', parent);
            return qty * em;
        }

        throw new Error(`Units.toPixels failed for ${sUnits}`);
    }

    static calcHeightPix(qty, parent) {
        const div = document.createElement('div');
        div.style = 'height:0;width:0;outline:none;border:none;padding:none;margin:none;box-sizing:content-box;';
        div.style.height = qty;

        parent.appendChild(div);
        const result = div.offsetHeight;
        parent.removeChild(div);

        return result;
    }
}

const theDomEvents = new DomEvents();
const theUnits = new Units();