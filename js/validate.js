/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { Validate };

import { PageAlert } from './page-alert.js';
import { AsnaDataAttrName } from './asna-data-attr.js';
import { AidKeyHelper } from './kbd.js';
import { Base64, UnicodeToUTF8 } from './base-64.js';
import { IbmDate } from './calendar/ibm-date.js';

const OK_TEXT = 'Ok';
const MANDATORY_FAILED_MSG = {
    Enter: 'Field is Mandatory. Please enter data into field.',
    Fill: 'Each position in the field must have a character entered in it.'
};

const DATE_OUT_RANGE_MSG = 'Date out of range!';

class Validate {
    static setupMandatory(form) { // Note: data-* attribute is NOT removed
        const sel = form.querySelectorAll(`[${AsnaDataAttrName.CHECK_MANDATORY}]`);
        const l = sel ? sel.length : 0;

        if (!l) { return }

        for (let i = 0; i < l; i++) {
            const mandatoryEl = sel[i];

            // Events to cover, SELECT, checkbox and text input
            mandatoryEl.addEventListener('input', (e) => { Validate.setDirty(e); });
            mandatoryEl.addEventListener('change', (e) => { Validate.setDirty(e); });
            mandatoryEl.addEventListener('keypress', (e) => { Validate.setDirty(e); });
        }
    }

    static validateMandatory(form, aidKey, aidKeyBitmap) {
        const sel = form.querySelectorAll(`[${AsnaDataAttrName.CHECK_MANDATORY}]`);
        const l = sel ? sel.length : 0;

        if (!l) { return true; }

        let firstFailedEl = null;
        let errMsg = '';

        for (let i = 0; i < l; i++) {
            const el = sel[i];
            const data = Validate.getMandatoryData(el);
            if (!data) continue;

            if (data.isEnter) {
                if (!data._dirty) {
                    firstFailedEl = el;
                    errMsg = MANDATORY_FAILED_MSG.Enter;
                    break;
                }
            }

            if (data.isFill) {
                if (data._dirty && el.value) {
                    let lenCmp = el.getAttribute('maxlength');
                    if (!lenCmp)
                        lenCmp = data.maxFieldLength;
                    if (lenCmp) {
                        if (typeof lenCmp === 'string') {
                            lenCmp = parseInt(lenCmp, 10);
                        }
                        const value = el.value;
                        let valid = typeof value === 'string' && value.length === lenCmp;

                        if (!valid && typeof value === 'number') {
                            const textVal = '' + value;
                            valid = textVal === lenCmp;
                        }

                        if (!valid) {
                            firstFailedEl = el;
                            errMsg = MANDATORY_FAILED_MSG.Fill;
                            break;
                        }
                    }
                }
            }
        }

        if (!firstFailedEl) { return true; }

        const aidKeyHelper = new AidKeyHelper(aidKeyBitmap);

        // Missing Alt, Ctrl keyboard modifiers ???
        const bypass = aidKeyHelper.isAttention(AidKeyHelper.keyToMapIndex(aidKey));

        if (bypass) { return true; }

        PageAlert.show(errMsg, OK_TEXT, firstFailedEl);
        return false;
    }

    static validateDateConstraint(form) {
        const dates = form.querySelectorAll(`[${AsnaDataAttrName.CALENDAR_INPUT_RANGE_CONSTRAINT}]`);

        for (let i = 0, l = dates.length; i < l; i++) {
            const input = dates[i];
            const minIsoDate = input.getAttribute('min');
            const maxIsoDate = input.getAttribute('max');

            if (!(minIsoDate || maxIsoDate)) { continue; } // unexpected (why did it have CALENDAR_INPUT_RANGE_CONSTRAINT?)

            const jsonOptions = input.getAttribute(AsnaDataAttrName.CALENDAR_INPUT_RANGE_CONSTRAINT);
            try {
                const options = JSON.parse(jsonOptions);
                const errorMsg = options.title ? options.title : DATE_OUT_RANGE_MSG;
                const date = IbmDate.textToDate(options.dateFormat, input.value);
                if (minIsoDate) {
                    const minDate = new Date(minIsoDate + 'T00:00:00');
                    if (date < minDate) {
                        input.setCustomValidity(errorMsg);
                        continue;
                    }
                }
                if (maxIsoDate) {
                    const maxDate = new Date(maxIsoDate + 'T00:00:00');
                    if (date > maxDate) {
                        input.setCustomValidity(errorMsg);
                        continue;
                    }
                }
            } catch { }
        }
    }

    static setDirty(event) {
        const el = event.target;
        if (!el) { return; }

        const data = Validate.getMandatoryData(el);
        if (!data) { return; }
        if (data._dirty) { return; } // Already set, no need to do it again.
        data._dirty = true;
        Validate.updateMandatoryData(el, data);
    }

    static getMandatoryData(el) {
        const attr = el.getAttribute(AsnaDataAttrName.CHECK_MANDATORY);
        if (!attr) { return null; }
        const jsonVal = Base64.decode(attr);
        return JSON.parse(jsonVal);
    }

    static updateMandatoryData(el, newData) {
        const encData = Base64.encode(UnicodeToUTF8.getArray(JSON.stringify(newData)));
        el.setAttribute(AsnaDataAttrName.CHECK_MANDATORY, encData);
    }

    static reportFormValidity(form) {
        const inputs = form.querySelectorAll('input,select,textarea:not([type="hidden"])');
        for (let i = 0, l = inputs.length; i < l; i++) {
            const input = inputs[i];

            if (typeof (input.reportValidity) === 'function' && ! input.reportValidity()) {
                return false;
            }
        }
        return true;
    }
}
