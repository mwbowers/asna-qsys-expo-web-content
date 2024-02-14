/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { ID, ZINDEX, CHAR_MEASURE, TerminalDOM, TerminalToolbar };

import { Labels } from './terminal-labels.js';
import { AidKey, QSN } from './ibm-codes.js';
import { Validate } from './terminal-validate.js';
import { StringExt } from '../string.js';
import { KEYBOARD_STATE } from './terminal-keyboard.js';

const _debug = false;
const _debug2 = false;
const FONT_SIZE_TRY_INCREMENT = 0.01;

// HTML IDs
const ID = {
    CURSOR: 'AsnaTermCursor',
    CANVAS: 'AsnaTermFacade',
    _5250_TEXT: 'AsnaTerm5250',
    STATUSBAR: 'AsnaTermStatusBar',
    SELECTION: 'AsnaTermTextSelection',
    ERROR_SOUND: 'AsnaTermErrorSound',
    MSG_WAITING: 'AsnaTermMessageIndicator',
    ERRMSG: 'AsnaTermErrMsg',
    TERM_BODY: 'AsnaTermBody',
    SETTINGS: 'AsnaTermSettingsDialog',
    IBM_KPAD_CONTAINER: 'AsnaTermIbmKeyPad',
    // IBM_KPAD_USR_POPUP: 'AsnaTermIbmUserDefKeysPopup',
    IBM_KPAD_RANGE_POPUP: 'AsnaTermIbmFKeysPopup',
    IBM_KPAD_ENUM_POPUP: 'AsnaTermIbmSpecialKeysPopup',
    FINGER_GLOW_CANVAS: 'AsnaMonarchGlowCanvas',
    SETTINGS_SLIDER_MODEL: 'AsnaTermSettingsSliderModel',
    SETTINGS_SLIDER: 'AsnaTermSettingsSlider',
    PREF_LKBD: 'AsnaTermPREF_LKBD',
    PREF_LFKHS: 'AsnaTermPREF_LFKHS',
    PREF_LFUBTNS: 'AsnaTermPREF_LFUBTNS',
    PREF_LKIBMSHOW: 'AsnaTermPREF_LKIBMSHOW',
    SETTINGS_KBDCHECKBOX: 'settingsKbdCheckbox',
    SETTINGS_FK_HOTSPOTSCHECKBOX: 'settingsFK_HotSpotsCheckbox',
    SETTINGS_BUTTONSCHECKBOX: 'settingsButtonsCheckbox',
    SETTINGS_IBMKPAD_CHECKBOX: 'settingsIBMKpadCheckbox',
    SETTINGS_COLORS: 'AsnaTermPREF_Colors',
    ENTER_BIG_BUTTON: 'AsnaTermEnterButton',
    RESET_BIG_BUTTON: 'AsnaTermResetButton',
    COLOR_DIALOG: 'dialog-settings-colors',
    COLOR_CLOSE_ICON: 'bterm-settings-colors-close-icon',
    COLOR_WHEEL: 'AsnaTermColorWheelID',
    WHITE_HEXAGON: 'AsnaTermWhiteHexID',
    GRAY_WHEEL: 'AsnaTermGrayWheelID',
    BLACK_HEXAGON: 'AsnaTermBlackHexID',
    COLOR_GREEN: 'AsnaTermCOLOR_GREEN',
    COLOR_BLUE: 'AsnaTermCOLOR_BLUE',
    COLOR_RED: 'AsnaTermCOLOR_RED',
    COLOR_WHITE: 'AsnaTermCOLOR_WHITE',
    COLOR_TURQUOISE: 'AsnaTermCOLOR_TURQUOISE',
    COLOR_YELLOW: 'AsnaTermCOLOR_YELLOW',
    COLOR_PINK: 'AsnaTermCOLOR_PINK',
    COLOR_CURSOR: 'AsnaTermCOLOR_CURSOR',
    COLOR_SEL: 'AsnaTermCOLOR_SEL',
    COLOR_APPLY: 'AsnaTermColorApplyID',
    COLOR_DEFAULTS: 'AsnaTermColorDefaultsID',
    COLOR_LUMINANCE: 'AsnaTermColorLuminanceID',
    COLOR_LUMSLIDER: 'AsnaTermColorLumSliderID',
    COLOR_Attr: 'AsnaTermCOLOR_Attr',
    COLOR_Color: 'AsnaTermCOLOR_Color',
    COLOR_BgColor: 'AsnaTermCOLOR_BkColor',
    COLOR_LGREEN: 'AsnaTermCOLOR_LGREEN',
    COLOR_LBLUE: 'AsnaTermCOLOR_LBLUE',
    COLOR_LRED: 'AsnaTermCOLOR_LRED',
    COLOR_LWHITE: 'AsnaTermCOLOR_LWHITE',
    COLOR_LTURQUOISE: 'AsnaTermCOLOR_LTURQUOISE',
    COLOR_LYELLOW: 'AsnaTermCOLOR_LYELLOW',
    COLOR_LPINK: 'AsnaTermCOLOR_LPINK',
    COLOR_Other: 'AsnaTermCOLOR_Other',
    COLOR_LCURSOR: 'AsnaTermCOLOR_LCURSOR',
    COLOR_LSEL: 'AsnaTermCOLOR_LSEL'
};

const ZINDEX = {
    TERMINAL_5250_TEXT: 100,
    TERMINAL_TEXT_SELECTION: 200,
    TERMINAL_STATUSBAR: 550, // More than TERMINAL_HOTSPOT & less than ENTER_RESET_BUTTONS
    TERMINAL_SETTINGS: 550,
    TERMINAL_CURSOR_HIDDEN: -200,
    TERMINAL_CURSOR_VISIBLE: 200, // Less than TOUCHABLE_INPUT
    MULTITOUCH_FINGERGLOW: 700,
    TOOLTIP: 800,
    IBM_KPAD_KEYPAD: 600,        // More than TOUCHABLE_INPUT & TERMINAL_HOTSPOT
    IBM_KPAD_POPUP: 600,         // More than TOUCHABLE_INPUT & TERMINAL_HOTSPOT
    TERMINAL_HOTSPOT_POPUP: 600, // More than TOUCHABLE_INPUT & TERMINAL_HOTSPOT 
    TOUCHABLE_INPUT: 500,
    TERMINAL_HOTSPOT: 500,
    ENTER_RESET_BUTTONS: 600
};

const CHAR_MEASURE = {
    UNDERLINE_HEIGHT: 1,
    UNDERSCORE_CHAR_HEIGHT: 1
};

const MAX_COORD_STR = '99,999';

class TerminalDOM {

    static resetBoxStyle(style) {
        style.margin = '0px';
        style.padding = '0px';
        style.border = '0px';
    }

    static makeUnselectable(el) { // Note: document.body.onselectstart is set to return false
        el.unselectable = 'on'; // IE, Opera
        el.style.MozUserSelect = 'none'; // Firefox
        el.style.WebkitUserSelect = 'none'; // Chrome
    }

    static measureHtmlPreSectionText(fontHeight, text) {
        const measureDiv = document.createElement('pre');
        measureDiv.type = 'text';
        measureDiv.class = 'bterm-render-section';

        measureDiv.style.fontSize = fontHeight + 'px';
        measureDiv.style.position = 'absolute';
        measureDiv.style.visibility = 'hidden';
        measureDiv.style.width = 'auto';
        measureDiv.style.height = 'auto';
        measureDiv.style.overflow = 'visible';
        measureDiv.style.border = 0;

        measureDiv.innerHTML = text;
        document.body.appendChild(measureDiv);

        const height = measureDiv.clientHeight;
        const width = measureDiv.clientWidth;

        document.body.removeChild(measureDiv);

        return { w: width, h: height };
    }

    // TODO: Make obsolete ...
    static htmlMeasureText(fontHeight, fontFamily, text) {
        const measureDiv = document.createElement('div');
        // const isIE_7 = navigator.appVersion.indexOf('MSIE 7.') > 0;

        if (!fontFamily) {
            console.log(`Assert: htmlMeasureText fontFamily is ${fontFamily} !`);
        }

        measureDiv.type = 'text';
        measureDiv.style.fontFamily = fontFamily;
        measureDiv.style.fontSize = fontHeight + 'px';
        measureDiv.style.position = 'absolute';
        measureDiv.style.visibility = 'hidden';
        measureDiv.style.width = 'auto';
        measureDiv.style.height = 'auto';
        measureDiv.style.overflow = 'visible';

        TerminalDOM.resetBoxStyle(measureDiv.style);

        measureDiv.style.whiteSpace = 'pre';
        measureDiv.innerHTML = text;

        document.body.appendChild(measureDiv);

        const height = /*isIE_7 ? fontHeight : */ measureDiv.clientHeight;
        const width = measureDiv.clientWidth;

        document.body.removeChild(measureDiv);

        return { w: width, h: height };
    }

    static cssSelectorExists(selText) {
        if (!document.styleSheets) { return false; }

        for (let i = 0; i < document.styleSheets.length; i++) {
            const ss = document.styleSheets[i];
            if (!ss.cssRules)
                continue;
            for (let j = 0; j < ss.cssRules.length; j++) {
                if (ss.cssRules[j].selectorText === selText) {
                    return true;
                }
            }
        }

        return false;
    }

    static cssApplyAndGetAttr(el, className, attrName) {
        el.className = className;
        return TerminalDOM.getComputedStyle(el, attrName);
    }

    static getComputedStyle(el, propName) {
        if (window.getComputedStyle) {
            return window.getComputedStyle(el, null).getPropertyValue(propName);
        }
        else if (el.currentStyle) {
            return el.currentStyle[propName];
        }
        return '';
    }

    static fontSizeForHeight(height) {
        let reduction = 0.6;
        if (false /*is_iPad*/) {
            reduction = 0.5;
        }
        return Math.ceil(height * reduction); // Note: pixels.
    }

    static getCharWidth(char, termLayout, fontFamily) {
        const fontSize = parseFloat(TerminalDOM.getGlobalVarValue('--term-font-size'));
        return TerminalDOM.htmlMeasureText(fontSize, fontFamily, char).w;
    }

    static alignInputText(input, height, fSize) {
        let top = 0;
        let bottom = 0;
        let lead = 0;

        if (height > fSize) {
            lead = height - fSize;
            top = 0;
            bottom = lead;
        }

        input.style.paddingTop = top + 'px';
        input.style.paddingBottom = bottom + 'px';
    }

    static moveCaretPos(el, pos) {
        if (el.createTextRange) { // IE 
            range = el.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
        else if (el.setSelectionRange) { // Chrome, Firefox
            el.setSelectionRange(pos, pos);
        }
    }

    static cancelEvent(e) {
        if (e && typeof (e.stopPropagation) === 'function') { // Modern browsers. Note: On IE10 e is not window.event
            e.stopPropagation();

            if (typeof (e.preventDefault) === 'function') {
                e.preventDefault(); // On IE9+,  preventDefault() also sets window.event.returnValue to false
            }

            // IE 9+
            if (typeof (e.cancelBubble) === 'boolean') {
                e.cancelBubble = true;
            }
        }
        else if (window.event) { // IE < 9
            window.event.cancelBubble = true;
            window.event.returnValue = false;
            try {
                window.event.keyCode = 0; // May be read-only (handle exception)
            }
            catch (ex) {
            }
        }
    }

    static getViewportDim(landscape) {
        let w = window.screen.availWidth;
        let h = window.screen.availHeight;

        if (false /*_isMobile() || is_Win8Touch*/) {
            if (typeof (window.innerWidth) === 'number') {
                w = window.innerWidth;
            }
            if (typeof (window.innerHeight) === 'number') {
                h = window.innerHeight;
            }

            if (isNaN(landscapeDevHeight)) {
                landscapeDevHeight = Math.min(window.screen.width, window.screen.height);
            }
        }

        if (landscape) {
            const tw = w;
            const th = h;
            w = Math.max(tw, th);
            h = Math.min(tw, th);

            if (false /* is_Win8Touch && (window.innerHeight === window.screen.height)*/ ) { // When Surface Metro mode, reduce Terminal height to allow touching on status bar for settings.
                h -= 32;
            }
        }

        return { w: w, h: h };
    }

    static setAttrDisplayOnClass(className, val) {
        const selector = document.querySelectorAll('.' + className);

        for (let i = 0, selCount = selector.length; i < selCount; i++) {
            selector[i].style.display = val;
        }
    }

    static removeElClass(className) {
        const selector = document.querySelectorAll('.' + className);

        for (let i = 0, selCount = selector.length; i < selCount; i++) {
            const child = selector[i];
            const parent = child.parentElement;
            if (parent) {
                parent.removeChild(child);
            }
        }
    }

    static getLocation(el) {
        let lPropVal = typeof el.style !== 'undefined' ? el.style.left : null;
        let tPropVal = typeof el.style !== 'undefined' ? el.style.top : null;

        if (!lPropVal) {
            lPropVal = TerminalDOM.getComputedStyle(el, 'left');
        }

        if (!tPropVal) {
            tPropVal = TerminalDOM.getComputedStyle(el, 'top');
        }
        return { l: parseFloat(lPropVal), t: parseFloat(tPropVal) };
    }

    static getDimensions(el) {
        let wPropVal = typeof el.style !== 'undefined' ? el.style.width : null;
        let hPropVal = typeof el.style !== 'undefined' ? el.style.height : null;

        if (!wPropVal) {
            wPropVal = TerminalDOM.getComputedStyle(el, 'width');
        }

        if (!hPropVal) {
            hPropVal = TerminalDOM.getComputedStyle(el, 'height');
        }
        return { w: parseFloat(wPropVal), h: parseFloat(hPropVal) };
    }

    static setInnerHTML(elID, text) {
        const el = document.getElementById(elID);
        if (el && el.innerHTML && text) {
            el.innerHTML = text;
        }
    }

    static setElValue(elID, val) {
        const el = document.getElementById(elID);
        if (el) {
            el.value = val;
        }
    }

    static setStyleTransform(el, f) {
        if (!el || !el.style) {
            return;
        }
        if (typeof el.style.webkitTransform !== 'undefined') {
            el.style.webkitTransform = f;
        }
        else if (typeof el.style.msTransform !== 'undefined') {
            el.style.msTransform = f;
        }
        else if (typeof el.style.MozTransform !== 'undefined') {
            el.style.MozTransform = f;
        }
    }

    static addClass(el, value) {
        if (el.classList && el.classList.add) {
            el.classList.add(value);
            return;
        }

        const classNames = (value || '').split(/\s+/);

        if (el.nodeType === 1) {
            if (!el.className) {
                el.className = value;

            } else {
                const className = ' ' + el.className + ' ';
                let setClass = el.className;

                for (let c = 0, cl = classNames.length; c < cl; c++) {
                    if (className.indexOf(' ' + classNames[c] + ' ') < 0) {
                        setClass += ' ' + classNames[c];
                    }
                }
                el.className = StringExt.trim(setClass);
            }
        }
    }

    static removeClass(el, value) {
        if (el.classList && el.classList.remove) {
            el.classList.remove(value);
            return;
        }

        const classNames = (value || '').split(rspace);

        if (el.nodeType === 1 && el.className) {
            if (value) {
                let className = (' ' + el.className + ' ').replace(rclass, ' ');
                for (let c = 0, cl = classNames.length; c < cl; c++) {
                    className = className.replace(' ' + classNames[c] + ' ', ' ');
                }
                el.className = StringExt.trim(className);

            } else {
                el.className = '';
            }
        }
    }

    static changeClassByAppending(el, appendName) {
        el.className = el.className + appendName;
    }

    static replaceClass(className, replacementClassName) {
        const sel = document.querySelectorAll(`.${className}`);

        for (let i = 0, l = sel.length; i < l; i++) {
            sel[i].className = replacementClassName;
        }
    }

    static getAbsPosition(el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    static disableAutoCorrect(el) {
        el.setAttribute('autocomplete', 'off');
        el.setAttribute('autocorrect', 'off');
        el.setAttribute('autocapitalize', 'off');
        el.setAttribute('spellcheck', false);
    }

    isValidMonospace(fontFamily) {
        return TerminalDOM.htmlMeasureText(10, fontFamily, 'M').w === TerminalDOM.htmlMeasureText(10, fontFamily, 'i').w;
    }

    static setGlobalVar(varname, varvalue) {
        const cssVarRoot = document.documentElement.style;
        if (cssVarRoot) {
            cssVarRoot.setProperty(varname, varvalue);
        }
        let found = cssVarCache[varname] != null;
        cssVarCache[varname] = varvalue;
        if (!found) { cssVarCache.length++; }
    }

    static getGlobalVarValue(varname) {
        if (cssVarCache[varname]) {
            return cssVarCache[varname];
        }
        const cssVarRoot = window.getComputedStyle(document.body);
        if (cssVarRoot) {
            return cssVarRoot.getPropertyValue(varname);
        }
    }

    static getElementByName(name) {
        const elements = document.getElementsByName(name);
        return elements.length > 0 ? elements[0] : null; // Note: if name not unique, the first matching is returned.
    }

    getHiddenValue(id) {
        const element = document.getElementById(id);

        if (!element) {
            return null;
        }

        return element.value;
    }

    replaceAll(str, oldChar, newChar) {
        let i = -1;

        if (typeof str !== 'string') {
            return str;
        }

        while ((i = str.indexOf(oldChar, i >= 0 ? i + newChar.length : 0)) !== -1) {
            str = str.substring(0, i) + newChar + str.substring(i + oldChar.length);
        }

        return str;
    }

    setTerminalFont() {
        const gridColWidth = parseFloat(TerminalDOM.getGlobalVarValue('--term-col-width'));
        const t5250 = document.getElementById('AsnaTerm5250');

        if (t5250 && !isNaN(gridColWidth) && gridColWidth > 0.0) {
            const fontFamily = TerminalDOM.getGlobalVarValue('--term-font-family');
            const cachedFontSize = theFontSizeCache.get(fontFamily, gridColWidth);

            if (cachedFontSize) {
                TerminalDOM.setGlobalVar('--term-font-size', `${cachedFontSize}px`);
            }
            else {
                return new Promise((resolve) => {
                    t5250.style.cursor = 'wait';

                    TerminalDOM.setGlobalVar('--term-row-vert-padding', '0px');

                    let fontSize = parseFloat(TerminalDOM.getGlobalVarValue('--term-font-size'));

                    const a = document.createElement('pre');
                    a.className = 'bterm-render-section';
                    a.style.gridColumnStart = 79;               
                    a.style.gridColumnEnd = 80;
                    a.textContent = 'M';
                    t5250.appendChild(a);

                    const leftPadM = ' '.repeat(78) + 'M';
                    let mb = TerminalDOM.measureHtmlPreSectionText(fontSize, leftPadM);
                    let ra = TerminalDOM.getGridElementClientRight(a);

                    if (mb.h > fontSize) { // The CSS value is too small ...
                        fontSize = mb.h;
                        TerminalDOM.setGlobalVar('--term-font-size', `${fontSize}px`);
                        mb = TerminalDOM.measureHtmlPreSectionText(fontSize, leftPadM);
                        ra = TerminalDOM.getGridElementClientRight(a);
                    }

                    const t0 = performance.now();
                    let t1 = t0;
                    let iterations = 0;

                    while (mb.w > ra && fontSize > 5.0 && (t1 - t0) < (10 * 1000)) {
                        fontSize -= FONT_SIZE_TRY_INCREMENT;
                        TerminalDOM.setGlobalVar('--term-font-size', `${fontSize}px`);
                        ra = TerminalDOM.getGridElementClientRight(a);
                        mb = TerminalDOM.measureHtmlPreSectionText(fontSize, leftPadM);
                        t1 = performance.now();
                        iterations++;
                    }

                    const rowH = parseFloat(TerminalDOM.getGlobalVarValue('--term-row-height'));
                    const hA = TerminalDOM.getGridElementClientHeight(a);

                    if (rowH > hA) {
                        TerminalDOM.setGlobalVar('--term-row-vert-padding', `${(rowH-hA)/2}px`);
                    }

                    t5250.removeChild(a);
                    theFontSizeCache.save(fontFamily, gridColWidth, fontSize);
                    t5250.style.cursor = 'auto';

                    resolve();
                    if (_debug2) { console.log(`iterations:${iterations}`); }
                });
            }
        }
    }

    static getGridElementClientRight(gridEl) {
        const rect = gridEl.getBoundingClientRect();
        return rect.right;
    }
    static getGridElementClientHeight(gridEl) {
        const rect = gridEl.getBoundingClientRect();
        return rect.height;
    }

    static getOutputElement(name) {
        const result = document.forms[0][name];
        if (result) {
            return result;
        }

        const newHiddenInput = document.createElement('input');
        newHiddenInput.setAttribute('name', name);
        newHiddenInput.setAttribute('type', 'hidden');
        document.forms[0].appendChild(newHiddenInput);
        return newHiddenInput;
    }
}

const TOOLBAR_ID = {
    CURSOR_POS: 'MonarchTerminalSBarCursorPos',
    INSERT_MODE: 'MonarchTerminalSBarInsertMode',
    ACT_FKEY: 'MonarchTerminalSBarActFKey',
    INDICATORS: 'MonarchTerminalSBarIndicators',
    ERRMSG: 'AsnaTermErrMsg'
};

class TerminalToolbar {
    constructor() {
        this.statusBar = null;
        this.sBarCursorPosEl = null;
        this.sBarInsertModeEl = null;
        this.sBarActFKeyEl = null;
        this.sBarIndEl = null;
        this.sBarErrMsgEl = null;

        this.toolbarFontSizePix = 0;
        this.designTimeStatusbarHtml = '';
    }

    create(termLayout, fontFamily, termColors) {
        this.toolbarFontSizePix = TerminalDOM.fontSizeForHeight(termLayout.status.h);

        this.statusBar = document.getElementById(ID.STATUSBAR);
        if (!statusbar) { return; }

        this.designTimeStatusbarHtml = this.statusBar.innerHTML;

        const oneChar = 'M';
        const gapToolbarItemsWidth = TerminalDOM.htmlMeasureText(this.toolbarFontSizePix, fontFamily, oneChar).w;

        this.statusBar.style.left = '0px';
        this.statusBar.style.top = termLayout.status.t + 'px';
        this.statusBar.style.height = (termLayout.status.h + 1) + 'px'; // Width is 100% (CSS)
        this.statusBar.style.fontFamily = fontFamily;
        this.statusBar.style.fontSize = this.toolbarFontSizePix + 'px';
        this.statusBar.style.overflow = 'hidden';
        this.statusBar.style.display = 'block';
        this.statusBar.style.zIndex = ZINDEX.TERMINAL_STATUSBAR;
        TerminalDOM.makeUnselectable(this.statusBar);
        TerminalDOM.resetBoxStyle(this.statusBar.style);
        this.statusBar.style.color = termColors.statBarColor;
        this.statusBar.style.backgroundColor = termColors.statBarBkgdColor;

        const insertStrWidth = TerminalDOM.htmlMeasureText(this.toolbarFontSizePix, fontFamily, Labels.get('InsertMode')).w;
        const maxCoordStrWidth = TerminalDOM.htmlMeasureText(this.toolbarFontSizePix, fontFamily, MAX_COORD_STR).w;
        const maxActFKeyStrWidth = TerminalDOM.htmlMeasureText(this.toolbarFontSizePix, fontFamily, AidKey.ToString(QSN.ENTER)).w;
        const maxIndicatorStrWidth = TerminalDOM.htmlMeasureText(this.toolbarFontSizePix, fontFamily, Labels.get('KbdLocked')).w;

        // Status bar window segments (right aligned)
        this.sBarCursorPosEl = this.addToolbarChild(this.statusBar, TOOLBAR_ID.CURSOR_POS, 0, termLayout.w - maxCoordStrWidth, maxCoordStrWidth, termLayout.status.h, fontFamily);
        let offsetFromRight = maxCoordStrWidth + gapToolbarItemsWidth;

        this.sBarInsertModeEl = this.addToolbarChild(this.statusBar, TOOLBAR_ID.INSERT_MODE, 0, termLayout.w - offsetFromRight - insertStrWidth, insertStrWidth, termLayout.status.h, fontFamily);
        offsetFromRight += insertStrWidth + gapToolbarItemsWidth;

        this.sBarActFKeyEl = this.addToolbarChild(this.statusBar, TOOLBAR_ID.ACT_FKEY, 0, termLayout.w - offsetFromRight - maxActFKeyStrWidth, maxActFKeyStrWidth, termLayout.status.h, fontFamily);
        offsetFromRight += maxActFKeyStrWidth + gapToolbarItemsWidth;

        const lastRightAlignedPos = termLayout.w - offsetFromRight - maxIndicatorStrWidth;
        this.sBarIndEl = this.addToolbarChild(this.statusBar, TOOLBAR_ID.INDICATORS, 0, lastRightAlignedPos, maxIndicatorStrWidth, termLayout.status.h, fontFamily);

        // Status bar window segments (left aligned)
        const msgIndIconWidth = termLayout.status.h + gapToolbarItemsWidth / 2;
        if (lastRightAlignedPos > msgIndIconWidth) {
            this.sBarErrMsgEl = this.addToolbarChild(this.statusBar, TOOLBAR_ID.ERRMSG, 0, msgIndIconWidth, lastRightAlignedPos - msgIndIconWidth, termLayout.status.h, '');
        }
    }

    render(cursor, editMode, activeFKey, kbdState, kbdAhead, preHelpErrorCode, resetBigButton) {
        // Render from right to left (right-aligned)
        this.renderSbarCursorPos(cursor);
        this.renderSbarInsertMode(editMode);
        this.renderSbarActFKey(activeFKey);
        this.renderSbarIndicators(kbdState, kbdAhead, preHelpErrorCode, resetBigButton );
        this.renderSbarErrMsg(preHelpErrorCode);
    }

    renderSbarCursorPos(cursor) {
        if (!this.sBarCursorPosEl) { return; }

        const strCoord = (cursor.row + 1) + ',' + (cursor.col + 1);
        this.sBarCursorPosEl.innerHTML = strCoord;
    }

    renderSbarInsertMode(editMode) {
        if (!this.sBarInsertModeEl) { return; }

        if (editMode === 'insert') {
            this.sBarInsertModeEl.innerHTML = Labels.get('InsertMode');
        }
        else {
            this.sBarInsertModeEl.innerHTML = '';
        }
    }

    renderSbarActFKey(activeFKey) {
        if (!this.sBarActFKeyEl) { return; }

        if (activeFKey) {
            this.sBarActFKeyEl.innerHTML = activeFKey;
        }
        else {
            this.sBarActFKeyEl.innerHTML = '';
        }
    }

    renderSbarIndicators(kbdState, kbdAhead, preHelpErrorCode, resetBigButton) {
        if (!this.sBarIndEl) { return; }

        if (kbdState === KEYBOARD_STATE.AJAX_WAIT) {
            if (kbdAhead.length) {
                this.sBarIndEl.innerHTML = '[' + kbdAhead.length + ']';
            }
            else {
                this.sBarIndEl.innerHTML = Labels.get('KbdLocked');
            }
        }
        else if (kbdState === KEYBOARD_STATE.ERROR || preHelpErrorCode ) {
            this.sBarIndEl.innerHTML = Labels.get('KbdLocked');
            this.sBarIndEl.title = Labels.get('LockedRecoveryText') + '.';

            if (resetBigButton) {
                resetBigButton.showIfEnabled();
            }
        }
        else {
            this.sBarIndEl.innerHTML = '';
            this.sBarIndEl.title = '';
            if (resetBigButton) {
                resetBigButton.hide();
            }
        }
    }

    renderSbarErrMsg(preHelpErrorCode) {
        if (!this.sBarErrMsgEl) { return; }

        if (preHelpErrorCode) {
            this.sBarErrMsgEl.innerHTML = Labels.get( 'Error' + preHelpErrorCode + 'Text');
            this.sBarErrMsgEl.title = Labels.get('Error' + preHelpErrorCode + 'Recovery');
        }
        else {
            this.sBarErrMsgEl.innerHTML = '';
            this.sBarErrMsgEl.title = '';
        }
    }

    addToolbarChild(parent, id, top, left, width, height, fontFamily) {
        let child = document.createElement('div');

        if (typeof left === 'number' || Validate.digitsOnly(left)) {
            left = left + 'px';
        }

        if (typeof top === 'number' || Validate.digitsOnly(top)) {
            top = top + 'px';
        }

        if (typeof width === 'number' || Validate.digitsOnly(width)) {
            width = width + 'px';
        }

        if (typeof height === 'number' || Validate.digitsOnly(width)) {
            height = height + 'px';
        }

        child = document.createElement('div');

        child.type = 'text';
        child.id = id;
        child.style.position = 'absolute';
        child.style.left = left;
        child.style.top = top;
        child.style.width = width;
        child.style.height = height;
        child.style.fontSize = this.toolbarFontSizePix + 'px';
        child.style.overflow = 'hidden';
        child.style.backgroundColor = 'transparent';
        child.style.verticalAlign = 'middle';

        if (fontFamily) {
            child.style.fontFamily = fontFamily;
        }

        TerminalDOM.makeUnselectable(child);
        TerminalDOM.resetBoxStyle(child.style);

        parent.appendChild(child);

        return child;
    }

    removeToolbars() {
        if (this.statusBar) {
            this.statusBar.innerHTML = this.designTimeStatusbarHtml;
            this.statusBar.style.display = 'none';
        }
    }
}

class FontSizeCache {
    constructor() {
        this.byFontFamily = [];
    }

    save(fontFamily, gridColWidth, fontSize) {
        let byWidth = [];
        const key = FontSizeCache.keyHash(fontFamily);
        if (!this.byFontFamily[key]) {
            this.byFontFamily[key] = byWidth;
            this.byFontFamily.length++;
        }
        else {
            byWidth = this.byFontFamily[key];
        }

        const widthHash = FontSizeCache.fixFloat(gridColWidth);
        const found = byWidth[widthHash] != null;
        byWidth[widthHash] = fontSize;
        if (!found) { byWidth.length++; }
    }

    get(fontFamily, gridColWidth) {
        const fontFamilyKey = FontSizeCache.keyHash(fontFamily);
        const colWidthKey = FontSizeCache.fixFloat(gridColWidth);

        if (_debug) {
            console.log(`Req fontSize for: ${fontFamilyKey} colW:${colWidthKey}`);
        }

        if (!this.byFontFamily[fontFamilyKey]) {
            if (_debug) { console.log('** Empty cache!');  }
            return null;
        }

        const result = this.byFontFamily[fontFamilyKey][colWidthKey];

        if (_debug) {
            if (result) {
                console.log(`Found ${result} for: ${fontFamilyKey} colW:${colWidthKey}`);
            }
            //else {
            //    console.log('Cache Dump:');
            //    console.log(this.byFontFamily[fontFamilyKey]);
            //}
        }

        return result;
    }

    static keyHash(fontFamily) {
        let noCommas = fontFamily.replaceAll(',', '_');
        let noSpaces = noCommas.replaceAll(' ', '_');
        return noSpaces;
    }

    static fixFloat(num) {
        return num.toFixed(4);
    }
}

let landscapeDevHeight = NaN;
let cssVarCache = [];

const theFontSizeCache = new FontSizeCache();