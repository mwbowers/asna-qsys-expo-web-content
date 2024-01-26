/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { TerminalRender, DATA_ATTR };

import { Screen, ScreenAttr, Field  } from './terminal-screen.js';
import { BufferMapping } from './buffer-mapping.js'
import { CHAR_MEASURE } from './terminal-dom.js';
import { StringExt } from '../string.js';
import { DBCS } from './terminal-dbcs.js';
import { TerminalDOM } from './terminal-dom.js';
import { FKeyHotspot } from './terminal-fkey-hotspot.js';

const DBYTE_LETTER_SPACING_TRY_INCREMENT = 0.1;

const State = {
    NO_SECTION: 'n',
    SWITCH_ATTR: '+a',
    COUNT_SAME_ATTR: '=a',
    SWITCH_CHARSET: '+d',
    COUNT_SAME_CHARSET: '=d'
}

const DATA_ATTR = {
    REGEN: 'data-asna-regen'
}

class TerminalRender {
    constructor(termLayout, termColors, preFontFamily, regScr, dataSet, term5250ParentElement) {
        this.termLayout = termLayout;
        this.termColors = termColors;
        this.preFontFamily = preFontFamily;
        this.regScr = regScr;
        this.dataSet = dataSet;
        this.term5250ParentElement = term5250ParentElement;
        this.hasChinese = false;
    }

    render() {
        const fragment = document.createDocumentFragment();
        let state = State.NO_SECTION;
        let ch = '\0';
        let n = 0;
        let attr = new ScreenAttr('g', false, false, false, false, false);
        const validLength = this.termLayout._5250.rows * this.termLayout._5250.cols;
        let elRowCol = [];
        let pos;

        for (pos = 0; pos < validLength; pos++) {
            const nextChar = this.regScr.buffer[pos];
            const nextAttr = this.regScr.attrMap[pos].screenAttr;
            if (DBCS.isChinese(nextChar)) { this.hasChinese = true; }
            const newState = this.getCanvasSectState(ch, attr, nextChar, nextAttr, state);

            if (newState === State.NO_SECTION) {
                if (n > 0) {
                    this.createCanvasSectGroup(fragment, pos - n, pos - 1, elRowCol, true);
                }
                n = 0;
                state = newState;
            }
            else if (newState === State.SWITCH_ATTR) {
                if (n > 0) {
                    this.createCanvasSectGroup(fragment, pos - n, pos - 1, elRowCol, true);
                }
                n = 0;
                state = State.COUNT_SAME_ATTR;
            }
            else if (newState === State.COUNT_SAME_ATTR || newState === State.COUNT_SAME_CHARSET) {
                n = n + 1;
                state = newState;
            }
            else if (newState === State.SWITCH_CHARSET) {
                if (n > 0) {
                    this.createCanvasSectGroup(fragment, pos - n, pos - 1, elRowCol, true);
                }
                n = 1;
                state = State.COUNT_SAME_CHARSET;
            }

            ch = this.regScr.buffer[pos];
            attr = this.regScr.attrMap[pos].screenAttr;

            if (DBCS.isChinese(ch)) { this.hasChinese = true; }
        }

        if (n > 0) {
            this.createCanvasSectGroup(fragment, pos - n, pos - 1, elRowCol, true);
        }

        this.completeEmptyFieldCanvasSections(fragment, elRowCol);

        this.term5250ParentElement.appendChild(fragment);

        if (this.hasChinese) {
            this.adjustDblByteLetterSpacing();
        }
    }

    getCanvasSectState(ch, attr, newCh, newAttr, currentState) {
        const chChanged = ch !== newCh;
        const attrChanged = !TerminalRender.isEqualAttr(attr, newAttr);
        const charSetChanged = !TerminalRender.isEqualCharSet(ch, newCh);

        if (currentState === State.COUNT_SAME_ATTR && attrChanged) {
            if (newCh === '\0' && this.isNormalColorAndAttr(newAttr)) {
                return State.NO_SECTION;
            }
            return State.SWITCH_ATTR;
        }
        else if ((currentState === State.COUNT_SAME_CHARSET || currentState === State.COUNT_SAME_ATTR) && charSetChanged) {
            if (newCh === '\0' && this.isNormalColorAndAttr(newAttr)) {
                return State.NO_SECTION;
            }
            return State.SWITCH_CHARSET;
        }

        if (chChanged && newCh === '\0' && this.isNormalColorAndAttr(newAttr)) {
            return State.NO_SECTION;
        }
        else if (chChanged && !attrChanged && !charSetChanged) {
            return State.COUNT_SAME_ATTR;
        }
        else if (!chChanged && attrChanged) {
            if (currentState === State.COUNT_SAME_ATTR) {
                if (this.isNormalColorAndAttr(newAttr)) {
                    return State.NO_SECTION;
                }
                return State.SWITCH_ATTR;
            }

            return State.COUNT_SAME_ATTR;
        }
        else if (chChanged) {
            if (!charSetChanged) {
                return State.COUNT_SAME_ATTR;
            }
            return State.COUNT_SAME_CHARSET;
        }

        return currentState;
    }

    createCanvasSection(frag, regScr, fromPos, toPos, row, col, bkColor, attr, maybeHotKey) {
        let len = toPos - fromPos + 1;
        let cols = len; // used to define grid-cols (may be adjusted for Chinese chars)
        let text = Screen.copyPositionsFromBuffer(regScr, fromPos, toPos);

        text = TerminalRender.normalizeBlanks(text);
        let isChinese = DBCS.hasChinese(text);

        if (isChinese) {
            cols = DBCS.calcDisplayLength(text)
        }

        let className = isChinese ? 'bterm-render-section-dbyte' : 'bterm-render-section';

        let fkeyParts = [];
        if (maybeHotKey && FKeyHotspot.identify(text,0).fNum) {
            className += ' bterm-hotkey';

            fkeyParts = FKeyHotspot.splitFkeyParts(text);
            if (fkeyParts.length > 0) {
                text = fkeyParts[0].fkey; // Can't be Chinese
                len = text.length
                cols = text.length;
            }
        }

        this.createPreElement(frag, row, col, cols, fromPos, len, className, text, bkColor, attr );

        if (fkeyParts.length > 0) {
            text = fkeyParts[0].label; // First FKey label
            len = text.length;
            cols = len;
            text = TerminalRender.normalizeBlanks(text);
            isChinese = DBCS.hasChinese(text);
            if (isChinese) {
                cols = DBCS.calcDisplayLength(text)
            }

            col     += fkeyParts[0].fkey.length;
            fromPos += fkeyParts[0].fkey.length;
            className = isChinese ? 'bterm-render-section-dbyte' : 'bterm-render-section';
            this.createPreElement(frag, row, col, cols, fromPos, len, className, text, bkColor, attr );

            col += len;
            fromPos += len;

            const l = fkeyParts.length;
            for (let i = 1; i < l; i++) { // Rest of Fkey+Label in the same row.
                text = fkeyParts[i].fkey; // Can't be Chinese
                len = text.length;
                cols = len;

                this.createPreElement(frag, row, col, cols, fromPos, len, 'bterm-render-section bterm-hotkey', text, bkColor, attr);
                col += len;
                fromPos += len;

                text = fkeyParts[i].label;
                text = TerminalRender.normalizeBlanks(text);
                len = text.length;
                cols = len;
                isChinese = DBCS.hasChinese(text);
                if (isChinese) {
                    cols = DBCS.calcDisplayLength(text)
                }
                className = isChinese ? 'bterm-render-section-dbyte' : 'bterm-render-section';

                this.createPreElement( frag, row, col, cols, fromPos, len, className, text, bkColor, attr );
                col += len;
                fromPos += len;
            }
        }
    }

    createPreElement(frag, row, col, cols, regenpos, len, className, text, bkColor, attr) {
        const section = document.createElement('pre');
        section.className = className;
        section.style.gridColumnStart = col + 1;
        section.style.gridColumnEnd = col + 1 + cols;
        section.style.gridRowStart = row + 1;
        section.style.gridRowEnd = row + 1;
        section.setAttribute(`${DATA_ATTR.REGEN}`, `${regenpos},${len}`);

        section.style.borderBottomWidth = CHAR_MEASURE.UNDERLINE_HEIGHT + 'px'; // ???

        this.setCanvasSectionTextAnd5250Attr(section, text, bkColor, attr.color, attr.reverse, attr.underscore);
        frag.appendChild(section);
    }

    createCanvasSectGroup(frag, fromPos, toPos, rowColJsonArray, maybeHotKey) {
        let len = toPos - fromPos + 1;
        const attr = this.regScr.attrMap[fromPos].screenAttr;

        if (attr.nonDisplay) {
            return;
        }

        const map = new BufferMapping(this.termLayout._5250.cols, this.hasChinese);

        let row = map.rowFromPos(fromPos);
        let col = map.colFromPos(fromPos, this.regScr.buffer);

        if (this.regScr.attrMap[fromPos].usage !== 'o') {
            const inputField = this.regScr.attrMap[fromPos].field;
            if (inputField && len < inputField.len) { // There is an input field at that position, adjust the length (i.e. field may have '\0', and getCanvasSectState logic may have detemined len of 1)
                len = inputField.len;
                toPos = fromPos + len - 1;
            }
        }

        if (col + len <= this.termLayout._5250.cols) {
            rowColJsonArray.push({ row: row, col: col });
            this.createCanvasSection(frag, this.regScr, fromPos, toPos, row, col, 'bkgd', attr, maybeHotKey ); // No blink nor colSep
            return;
        }
        else {
            const temp = len;
            len = this.termLayout._5250.cols - col;
            let remLen = temp - len;

            while (len > 0) {
                toPos = fromPos + len - 1;
                rowColJsonArray.push({ row: row, col: col });
                this.createCanvasSection(frag, this.regScr, fromPos, toPos, row, col, 'bkgd', attr, maybeHotKey); // No blink nor colSep            

                fromPos = fromPos + len;
                col = 0;
                row = row + 1;

                len = Math.min(this.termLayout._5250.cols, remLen);
                remLen = remLen - len;
            }
        }
    }

    setCanvasSectionTextAnd5250Attr(section, text, bkColor, color, reverse, underscore, instTesting) {
        if (!reverse) {
            if (bkColor !== 'bkgd') {
                section.style.backgroundColor = this.getWebColor(bkColor);
            }
            section.style.color = this.getWebColor(color);
        }
        else {
            if (color !== 'bkgd') {
                section.style.backgroundColor = this.getWebColor(color);
            }
            section.style.color = this.getWebColor(bkColor);
        }

        if (underscore) {
            section.style.borderBottomStyle = 'groove'; // IE ignores, uses 'solid' but Firefox/Chrome use a 3D effect.
            section.style.borderBottomColor = section.style.color;
        }
        else {
            section.style.borderBottomWidth = '0px';
        }
        section.textContent = text;
    }

    completeEmptyFieldCanvasSections (frag, elRowCol) {
        let missing = [];
        const formatTable = this.dataSet.formatTable;
        if (!formatTable) { return; }

        for (let i = 0; i < this.dataSet.fieldCount; i++) {
            const fld = formatTable[i];
            let found = false;
            for (let j = 0, l = elRowCol.length; j < l; j++) {
                const rowCol = elRowCol[j];
                if (fld.row === rowCol.row && fld.col === rowCol.col) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                missing.push({ row: fld.row, col: fld.col });
            }
        }
        if (!missing.length) {
            return;
        }

        const map = new BufferMapping(this.termLayout._5250.cols, this.hasChinese);

        for (let i = 0, l = missing.length; i < l; i++) {
            const rowCol = missing[i];
            const pos = map.coordToPos(rowCol.row, rowCol.col);
            const fld = TerminalRender.lookupFieldWithPosition(pos, this.termLayout, this.dataSet, this.hasChinese);
            if (!fld) { continue; /* should never happen */ }
            this.createCanvasSectGroup(frag, pos, pos + fld.len - 1, [], false);
        }
    }

    adjustDblByteLetterSpacing() {
        const dbyteCollection = this.term5250ParentElement.querySelectorAll('pre[class~=bterm-render-section-dbyte]');
        if (!dbyteCollection) { return; }
        let max = 0;
        let maxEl = null;
        for (let i = 0, l = dbyteCollection.length; i < l; i++) {
            const el = dbyteCollection[i];
            const text = StringExt.trim(el.innerText);
            const len = text.length;
            if ( len > max ) {
                maxEl = el;
            }
            max = Math.max(max, len);
        }
        if (!max || max === 1 || !maxEl) { return; }

        let letterSpacing = 0; // Start with no-spacing as well known value.
        TerminalDOM.setGlobalVar('--term-dbyte-letter-spacing', `${letterSpacing}px`);

        const saveCssPosition = maxEl.style.position;
        const saveCssWidth = maxEl.style.width;

        // Use "maxEl" to test 'natural' metrics.
        maxEl.style.position = 'absolute';
        maxEl.style.width = 'auto';

        const text = StringExt.trim(maxEl.innerText);
        const expectedWidth = text.length * (2 * parseFloat(TerminalDOM.getGlobalVarValue('--term-col-width')));
        const t0 = performance.now();

        while (maxEl.clientWidth < expectedWidth) {
            letterSpacing += DBYTE_LETTER_SPACING_TRY_INCREMENT;
            TerminalDOM.setGlobalVar('--term-dbyte-letter-spacing', `${letterSpacing}px`);

            if (performance.now() - t0 > 10 * 1000) {
                break;
            }
        }

        // Restore Grid layout for "maxEl" element.
        maxEl.style.position = saveCssPosition;
        maxEl.style.width = saveCssWidth;
    }

    renderInputCanvasSections(termSectionsParent, fromPos, toPos) {
        const sections = termSectionsParent.querySelectorAll(`pre[${DATA_ATTR.REGEN}]`);
        if (!sections || !sections.length) {
            return;
        }

        let dirtyInputSections = [];
        let i;
        const l = sections.length;
        for (i = 0; i < l; i++) {
            const section = sections[i];
            const regenData = TerminalRender.parseRegenDataAttr(section.getAttribute(DATA_ATTR.REGEN));
            if (regenData.pos && regenData.len ) {
                if (TerminalRender.isIntersect(fromPos, toPos, regenData.pos, regenData.pos + regenData.len )) {
                    dirtyInputSections.push(section);
                }
            }
        }

        // Refresh the text, by getting content from regeneration buffer.
        // Note: unfortunately, some of the attributes are part of the HTML text, such as underline.
        const lDirty = dirtyInputSections.length;
        for (i = 0; i < lDirty; i++) {
            const section = dirtyInputSections[i];
            const regenData = TerminalRender.parseRegenDataAttr(section.getAttribute(DATA_ATTR.REGEN));
            if (!regenData.len) { continue; }

            const color = this.regScr.attrMap[regenData.pos].screenAttr.color;
            const reverse = this.regScr.attrMap[regenData.pos].screenAttr.reverse;
            const underscore = this.regScr.attrMap[regenData.pos].screenAttr.underscore;
            const nonDisplay = this.regScr.attrMap[regenData.pos].screenAttr.nonDisp;

            if (nonDisplay) { // This should not happen. We do not create 'non-display' canvas sections.
                continue;
            }

            const text = Screen.copyPositionsFromBuffer(this.regScr, regenData.pos, regenData.pos + regenData.len);
            this.setCanvasSectionTextAnd5250Attr(section, text, 'bkgd', color, reverse, underscore);
        }
    }

    renderFieldFromCursorPos(row, col) {
        const fromPos = this.regScr.coordToPos(row, col);
        const eofRowCol = this.regScr.peekEndOfFieldPos(fromPos);

        if (!eofRowCol) {
            return;
        }

        const toPos = this.regScr.coordToPos(eofRowCol.row, eofRowCol.col);

        if (fromPos <= toPos) {
            this.renderInputArea(fromPos, toPos);
        }
    }

    renderInputArea(fromPos, toPos) {
        this.renderInputCanvasSections(this.term5250ParentElement, fromPos, toPos);
        if (this.hasChinese) {
            this.adjustDblByteLetterSpacing();
        }
    }

    static isEqualAttr(attr, newAttr) {
        if (!attr && newAttr || attr && !newAttr) {
            return false;
        }
        return attr.color === newAttr.color &&
            attr.reverse === newAttr.reverse &&
            attr.underscore === newAttr.underscore &&
            attr.blink === newAttr.blink &&
            attr.nonDisp === newAttr.nonDisp &&
            attr.colSep === newAttr.colSep;
    }

    static isEqualCharSet(ch, newCh) {
        if (ch === newCh || ch === '\0' || newCh === '\0') {
            return true;
        }
        const a = DBCS.isChinese(ch) && DBCS.isChinese(newCh);
        const b = !DBCS.isChinese(ch) && !DBCS.isChinese(newCh);

        return  a || b;
    }

    static normalizeBlanks(text) {
        let result = '';
        const l = text.length;
        for (let i = 0; i < l; i++) {
            const ch = text[i];
            result += ch === '\0'? ' ' : ch;
        }
        return result;
    }

    static isIntersect(fromPos, toPos, fromPos2, toPos2 ) {
        for (let pos = fromPos; pos <= toPos; pos++) {
            for (let pos2 = fromPos2; pos2 < toPos2; pos2++ ) {
                if (pos === pos2) {
                    return true;
                }
            }
        }

        return false;
    }

    static parseRegenDataAttr(regenData) {
        if (!regenData) { return {}; }
        const parts = regenData.split(',');
        if (parts.length === 2) {
            return { pos: parseInt(parts[0], 10), len: parseInt(parts[1], 10) };
        }
        return {};
    }

    isNormalColorAndAttr(attr) {
        return attr && attr.color === 'g' && this.isNormalAttr(attr);
    }

    isNormalAttr(attr) {
        return attr && !attr.reverse && !attr.underscore && !attr.blink && !attr.nonDisp && !attr.colSep;
    }

    getWebColor(c) {
        if (c === 'g') {
            return this.termColors.green;
        }
        if (c === 'b') {
            return this.termColors.blue;
        }
        if (c === 'r') {
            return this.termColors.red;
        }
        if (c === 'w') {
            return this.termColors.white;
        }
        if (c === 't') {
            return this.termColors.turquoise;
        }
        if (c === 'y') {
            return this.termColors.yellow;
        }
        if (c === 'p') {
            return this.termColors.pink;
        }
        if (c === 'bkgd') {
            return this.termColors.bkgd;
        }

        return this.termColors.green; // i.e.  Non-display
    }

    static setDivText(divEl, text, preFontFamily, instTesting) {
        const pre = document.createElement('pre');
        if (instTesting) {
            pre.id = 'cl'; // instrument command-line ID for automation-testing
        }
        pre.style.margin = '0px';
        pre.style.padding = '0px';
        pre.style.border = '0px';
        pre.style.fontFamily = preFontFamily;
        pre.textContent = text; // No need to escape 'pre' elements

        divEl.innerHTML = '';
        divEl.appendChild(pre);
    }

    static lookupFieldWithPosition(pos, termLayout, dataSet, hasChinese) {
        const map = new BufferMapping(termLayout._5250.cols, hasChinese);
        const formatTable = dataSet.formatTable;

        if (!formatTable) {
            return null;
        }

        for (let i = 0; i < dataSet.fieldCount; i++) {
            const candidateField = formatTable[i];
            const fromPos = map.coordToPos(candidateField.row, candidateField.col);
            const toPos = fromPos + candidateField.len;

            if (pos >= fromPos && pos <= toPos) {
                return candidateField;
            }
        }

        return null;
    }

    static htmlEscape(text) {
        const findReplace = [
            [/&/g, "&amp;"],
            [/</g, "&lt;"],
            [/>/g, "&gt;"],
            [/"/g, "&quot;"]
        ];

        for (let item in findReplace) {
            text = text.replace(findReplace[item][0], findReplace[item][1]);
        }

        return text;
    }

    static clearCanvas(termSectionsParent) {
        if (!termSectionsParent) {
            console.log('TerminalRender.clearCanvas error!');
            return;
        }

        const sections = termSectionsParent.querySelectorAll(`pre[${DATA_ATTR.REGEN}]`);
        if (!sections || !sections.length) {
            return;
        }

        let i;
        const l = sections.length;
        for (i = 0; i < l; i++) {
            termSectionsParent.removeChild(sections[i]);
        }
    }

    static is5250TextElement(term5250ParentElement, candidate) {
        if (!candidate || candidate.tagName.toUpperCase() !== 'PRE') {
            return false;
        }
        return candidate.parentElement === term5250ParentElement;
    }

    static getTextfromBuffer(regScr, row, pos) {
        const startRowPos = regScr.coordToPos(row, 0);
        let text = '';
        if (pos < startRowPos) {
            return null;
        }

        for (let currPos = startRowPos; currPos <= pos; currPos++) {
            text += regScr.buffer[currPos] !== '\0' ? regScr.buffer[currPos] : ' ';
        }
        return { startPos: startRowPos, text: text };
    }
}

