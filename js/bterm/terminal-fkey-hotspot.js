/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { FKeyHotspot };

import { Validate } from './terminal-validate.js';

const MIN_FKEY_LABEL = 2;

class FKeyHotspot {
    static identify(text, refPos) {
        const error = [];

        if (!text || text.length < 6 || !text.startsWith || !text.startsWith('F')) {
            return error;
        }
        const eqSign = text.indexOf('=');
        if (!(eqSign === 2 || eqSign === 3) || (text.length - eqSign) < MIN_FKEY_LABEL) {
            return error;
        }

        const fkeyStr = text.substring(0, eqSign);
        const fkeyLabel = text.substring(eqSign);
        const fNum = FKeyHotspot.parseFkeyNum(fkeyStr);
        if (isNaN(fNum) || fNum < 1 || fNum > 24) {
            return error;
        }

        return { pos: refPos, fkey: fkeyStr, fNum: fNum, label: fkeyLabel };
    }

    static parseFkeyNum(fkeyStr) {
        let result = '';
        const l = fkeyStr.length;
        for (let i = 1; i < l; i++) {
            const ch = fkeyStr[i];
            if (ch === '=') { break; }
            if (!Validate.digitsOnly(ch)) {
                return error;
            }
            result += ch;
        }

        return parseInt(result, 10);
    }

    static enableClickEvent(term, fExecute) {
        const fkeys = term.querySelectorAll(`pre[class~=bterm-hotkey]`);
        const l = fkeys.length;
        for (let i = 0; i < l; i++) {
            fkeys[i].addEventListener('mouseup', (event) => {
                const target = event.target;
                const fNum = FKeyHotspot.parseFkeyNum(target.innerText)

                if (!isNaN(fNum) && fNum >= 1 && fNum <= 24) {
                    fExecute('', `F${fNum}`)
                }
            });
        }
    }

    static splitFkeyParts(text) {
        let result = [];
        const l = text.length;
        let partLength = l;
        for (let i = l - 1; i >= 0; i--) {
            if (partLength == i) { continue; }
            const subText = text.substring(i, i+(partLength-i));
            const subFkey = FKeyHotspot.identify(subText, i);
            if (subFkey.fNum) {
                result.push(subFkey);
                partLength = i;
            }
        }

        return result.reverse();
    }
}

// const theFKeyHotspot = new FKeyHotspot();

