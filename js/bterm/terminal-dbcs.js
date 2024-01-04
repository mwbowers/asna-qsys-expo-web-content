/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { DBCS, DBCS_TYPES };

import { TerminalDOM } from './terminal-dom.js';
import { Validate } from './terminal-validate.js';

const DBCS_TYPES = {
    A:'A',
    E:'E',
    G:'G',
    H:'H',
    J:'J',
    O:'O'
};

const IDEOGRAPHIC_SPACE = '\u3000';


class DBCS {
    static formatFieldValue(fldVal, dbcsType) {
        if (dbcsType === 'G') {
            return ''; // This is Unicode, no need to fix
        }
        if (dbcsType === 'O' || Validate.isNulls(fldVal)) {
            return fldVal;
        }
        let allDBCS = true;
        if (dbcsType === 'E') {
            if (!DBCS.isChinese(fldVal[0])) { // content is not DBCS
                allDBCS = false;
            }
        }
        if (allDBCS) {
            const maxLen = (fldVal.length - 2) / 2;
            for (i = 0; i < maxLen; i++) {
                result += fldVal[i] === '\0' ? IDEOGRAPHIC_SPACE : fldVal[i];
            }
        }

        return result;
    }

    static isChinese(char) {
        return char.codePointAt(0) >= 0x4e00 && char.codePointAt(0) <= 0x9fa5;
    }

    static hasChinese(text) {
        for (let i = 0, l = text.length; i < l; i++) {
            if (DBCS.isChinese(text[i])) { return true; }
        }
        return false;
    }

    static calcDisplayLength(text) {
        let len = 0;
        for (let i = 0, l = text.length; i < l; i++) {
            len += DBCS.isChinese(text[i]) ? 2 : 1;
        }
        return len;
    }
}
