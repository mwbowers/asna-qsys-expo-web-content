/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { theKbd as Kbd, FoldDrop, AidKeyHelper, AidKeyMapIndex };

import { PageAlert } from '../js/page-alert.js';
import { SubfileController } from '../js/subfile-paging/dom-init.js';
import { SubfilePagingStore } from '../js/subfile-paging/paging-store.js';
import { AsnaDataAttrName, JsonAttr } from '../js/asna-data-attr.js';

// const KEY_CODE_TAB       =  9;
const KEY_CODE_ESCAPE    = 27;
const KEY_CODE_ENTER     = 13;
const KEY_CODE_PAGE_UP   = 33;
const KEY_CODE_PAGE_DOWN = 34;

const KEY_CODE_F1 = 112;
const KEY_CODE_F12 = KEY_CODE_F1 + 12 - 1;

const AidKeyMapIndex = { // Must match ASNA.Qsys.Expo.Model.AidKey enumeration
    // F1 : 0 ... 
    // F24: 23
    Clear : 24,
    Help : 25,
    PageUp : 26,        // RollDown
    PageDown : 27,      // RollUp
    Print : 28,
    Home : 29,          // AKA Record Backspace
    Enter : 30,
    Attn : 31,
    Reset : 32
};

const OK_TEXT = 'Ok';
const KEY_NOT_VALID_MSG = {
    PgUp_PgDown: 'Roll up or down past the first or last record in file.',
    FunctionKey: 'Function key ${keyName} not allowed'
};

class Kbd {
    processKeyDown(event, aidKeyBitmap) {
        const keyDetail = Kbd.parseKey(event);

        if (!keyDetail.keyCode) {
            return { ignore: true };
        }

        if (keyDetail.keyCode === KEY_CODE_ESCAPE) {
            return { ignore: true, removeVolatileMsgs: true };
        }

        return this.processKeyDetail(keyDetail, aidKeyBitmap);
    }

    convertKeyNameToKeyDetail(candidateKeyName) {
        let keyCode = '';
        let shiftKey =  false;
        switch (candidateKeyName) {
            case 'Enter': keyCode = KEY_CODE_ENTER; break;
            case 'PgUp': keyCode = KEY_CODE_PAGE_UP; break;
            case 'PgDn': keyCode = KEY_CODE_PAGE_DOWN; break;
            case 'F13': keyCode = KEY_CODE_F1; shiftKey = true; break;
            case 'F14': keyCode = KEY_CODE_F1 + 1; shiftKey = true; break;
            case 'F15': keyCode = KEY_CODE_F1 + 2; shiftKey = true; break;
            case 'F16': keyCode = KEY_CODE_F1 + 3; shiftKey = true; break;
            case 'F17': keyCode = KEY_CODE_F1 + 4; shiftKey = true; break;
            case 'F18': keyCode = KEY_CODE_F1 + 5; shiftKey = true; break;
            case 'F19': keyCode = KEY_CODE_F1 + 6; shiftKey = true; break;
            case 'F20': keyCode = KEY_CODE_F1 + 7; shiftKey = true; break;
            case 'F21': keyCode = KEY_CODE_F1 + 8; shiftKey = true; break;
            case 'F22': keyCode = KEY_CODE_F1 + 9; shiftKey = true; break;
            case 'F23': keyCode = KEY_CODE_F1 + 10; shiftKey = true; break;
            case 'F24': keyCode = KEY_CODE_F1 + 11; shiftKey = true; break;

            default: {
                const fKeyCand = Kbd.isFuncKey(candidateKeyName);
                if (fKeyCand) {
                    keyCode = KEY_CODE_F1 + fKeyCand.functionNumber - 1;
                }
                break;
            }
        }

        return { keyCode: keyCode, shiftKey: shiftKey };
    }

    processKeyDetail(keyDetail, aidKeyBitmap) {
        const aidKeyHelper = new AidKeyHelper(aidKeyBitmap);

        if ((Kbd.isFKey(keyDetail) || keyDetail.keyCode === KEY_CODE_ENTER || keyDetail.keyCode === KEY_CODE_PAGE_UP || keyDetail.keyCode === KEY_CODE_PAGE_DOWN) && !keyDetail.altKey && !keyDetail.ctrlKey) {
            switch (keyDetail.keyCode) {
                case KEY_CODE_ENTER:
                    if (keyDetail.target && Kbd.isTextArea(keyDetail.target)) {
                        return { returnBooleanValue: true }; // On a text area, <enter> should be handled by the element (in this case to possibly insert a page-break)
                    }
                    else {
                        return { aidKeyToPush: 'Enter', shouldCancel: true };
                    }

                case KEY_CODE_PAGE_UP:
                    return Kbd.processRollKey('PgUp', keyDetail.target);

                case KEY_CODE_PAGE_DOWN:
                    return Kbd.processRollKey('PgDn', keyDetail.target);

                default: {
                    let functionNumber = Kbd.keyCodeToMapIndex(keyDetail);
                    let keyName = `F${functionNumber}`;
                    if (aidKeyHelper.isEnabled(functionNumber - 1)) {
                        const sflFoldDropAction = FoldDrop.processCadidateKey(keyName, keyDetail.target);
                        if (sflFoldDropAction) {
                            return sflFoldDropAction;
                        }

                        return { aidKeyToPush: keyName, shouldCancel: true };
                    }
                    else {
                        const errorMsg = KEY_NOT_VALID_MSG.FunctionKey.replace('${keyName}', keyName);
                        if (!PageAlert.prependPanelMsg(errorMsg)) {
                            PageAlert.show(errorMsg, OK_TEXT);
                        }
                        return { returnBooleanValue: false, shouldCancel: true };
                    }
                }
            }
        }

        return { ignore: true };
    }

    static processRollKey(aidKey, inputEl) {
        const selectedSflCtrlName = SubfileController.getClosestSubfileCtrlName(inputEl);
        let action = {};

        if (selectedSflCtrlName) {
            const sflCtrlStore = SubfilePagingStore.getSflCtlStore(selectedSflCtrlName);
            if (sflCtrlStore) {
                action = Kbd.handleRoll(aidKey, sflCtrlStore);
                if (action.aidKeyToPush) {
                    return action;
                }
            }
        }
        else if (window.asnaExpo.page.lastFocus) { // Non-subfile record, and input element has focus.
            const nonSflRecord = window.asnaExpo.page.lastFocus.closest(`[${AsnaDataAttrName.RECORD}]`);
            if (nonSflRecord) {
                const rollCaps = nonSflRecord.getAttribute(AsnaDataAttrName.RECORD_ROLLCAP);
                if (rollCaps) {
                    action = Kbd.handleRoll(aidKey, '', nonSflRecord);
                    if (action.aidKeyToPush) {
                        return action;
                    }
                }
            }
            const firstSflCtrlName = SubfileController.getFirstSubfileCtrlName();
            if (firstSflCtrlName) {
                const firstCtrlStore = SubfilePagingStore.getSflCtlStore(firstSflCtrlName);
                if (firstCtrlStore) {
                    action = Kbd.handleRoll(aidKey, sflCtrlStore);
                }
            }

            if (action.aidKeyToPush) {
                return action;
            }
        }
        else { // Not in subfile and non-subfile record not selected (input focus)
            return { aidKeyToPush: aidKey, shouldCancel: true };
        }

        if (action.showAlert) {
            Kbd._showInvalidRollAlert();
        }
        return { returnBooleanValue: false, shouldCancel: true };
    }

    static handleRoll(aidKey, sflCtrlStore, nonSflRecord) {
        if (sflCtrlStore) { // Subfile selected
            if (sflCtrlStore.sflRecords.isExpandable) {
                if (aidKey === "PgUp") {
                    if (sflCtrlStore.current && sflCtrlStore.current.topRrn === 0) {
                        if (sflCtrlStore.sflRecords.pgUpEnabled) { // Submit PgUp
                            return { aidKeyToPush: aidKey, shouldCancel: true };
                        }
                    }
                    else { // Not in top-record do AJAX
                        return { aidKeyToPush: aidKey, shouldCancel: true, useAjax: true, sflCtlStore: sflCtrlStore };
                    }

                    return { showAlert: true };
                }
                else { // aidKey === "PgDn"
                    if (sflCtrlStore.sflRecords.isLastPage) {
                        if (sflCtrlStore.sflRecords.pgDnEnabled) { // Submit PgDn
                            return { aidKeyToPush: aidKey, shouldCancel: true };
                        }
                    }
                    else { // Not in last-page do AJAX
                        return { aidKeyToPush: aidKey, shouldCancel: true, useAjax: true, sflCtlStore: sflCtrlStore };
                    }

                    return { showAlert: true };
                }
            }
            else { // Fixed subfile
                if (aidKey === "PgUp" && sflCtrlStore.sflRecords.pgUpEnabled ||
                    aidKey === "PgDn" && sflCtrlStore.sflRecords.pgDnEnabled) { // Submit AidKey
                    return { aidKeyToPush: aidKey, shouldCancel: true };
                }
                else {
                    const firstSflCtrlName = SubfileController.getFirstSubfileCtrlName();

                    if (firstSflCtrlName && sflCtrlStore.name !== firstSflCtrlName) {
                        const firstCtrlStore = SubfilePagingStore.getSflCtlStore(firstSflCtrlName);
                        if (firstCtrlStore) {
                            return Kbd.handleRoll(aidKey, firstCtrlStore);
                        }
                    }
                }
            }
        }
        else if (nonSflRecord) {
            const rollCaps = nonSflRecord.getAttribute(AsnaDataAttrName.RECORD_ROLLCAP);
            const enabledRoll = JsonAttr.tryParse(rollCaps);
            if (aidKey === 'PgDn' && enabledRoll.pgdn || aidKey === 'PgUp' && enabledRoll.pgup) {
                return { aidKeyToPush: aidKey, shouldCancel: true };
            }
            else {
                const firstSflCtrlName = SubfileController.getFirstSubfileCtrlName();
                const firstCtrlStore = SubfilePagingStore.getSflCtlStore(firstSflCtrlName);
                if (firstCtrlStore) {
                    const recordAction = Kbd.handleRoll(aidKey, firstCtrlStore);
                    if (recordAction.aidKeyToPush) {
                        return recordAction;
                    }
                }
            }

        }
        return { aidKeyToPush: aidKey, shouldCancel: true };
    }

    static parseKey(event) {
        if (window.event) { // IE specific
            return { keyCode: window.event.keyCode, target: window.event.srcElement, ctrlKey: window.event.ctrlKey, altKey: window.event.altKey, shiftKey: window.event.shiftKey }
        }
        else {
            if (!event) {
                return { keyCode: '', target: null, ctrlKey: null, altKey: null, shiftKey: null };
            }

            return { keyCode: event.which, target: event.target, ctrlKey: event.ctrlKey, altKey: event.altKey, shiftKey: event.shiftKey };
        }
    }

    static isFKey(keyDetail) {
        return keyDetail.keyCode >= KEY_CODE_F1 && keyDetail.keyCode <= KEY_CODE_F12;
    }

    static isFuncKey(keyName) {
        const fKeys = [];
        for (let i = 0; i < 24; i++) {
            fKeys.push(`F${i + 1}`);
        }

        const index = fKeys.indexOf(keyName);

        if (index >= 0) {
            return { functionNumber: index + 1 };
        }

        return null;
    }

    isPgUp(keyCode) {
        return keyCode === KEY_CODE_PAGE_UP;
    }

    isPgDn(keyCode) {
        return keyCode === KEY_CODE_PAGE_DOWN;
    }
    
    showInvalidRollAlert() {
        Kbd._showInvalidRollAlert();
    }

    static _showInvalidRollAlert() {
        const errorMsg = KEY_NOT_VALID_MSG.PgUp_PgDown;
        if (!PageAlert.prependPanelMsg(errorMsg)) {
            PageAlert.show(errorMsg, OK_TEXT);
        }
    }

    static isTextArea(el) {
        return el && el.tagName && el.tagName.toLowerCase() === 'textarea';
    }

    static keyCodeToMapIndex(keyDetail) {
        return keyDetail.shiftKey ? keyDetail.keyCode - 99 : keyDetail.keyCode - 111;
    }
}

class FoldDrop {
    static processCadidateKey(aidKey, eventSrcEl) {
        let subfileControlName = SubfileController.getClosestSubfileCtrlName(eventSrcEl);

        if (!subfileControlName) { // No subfile has been selected ... look for first one.
            subfileControlName = SubfileController.getFirstSubfileCtrlName();
        }

        if (subfileControlName) {
            const sflCtlStore = SubfilePagingStore.getSflCtlStore(subfileControlName);
            if (sflCtlStore && aidKey === sflCtlStore.fldDrop.aidKey) {
                return { aidKeyToPush: aidKey, shouldCancel: true, useAjax: true, sflCtlStore: sflCtlStore };
            }
        }

        return null;
    }
}

const AID_KEY_MAP_CODE = {
    Disabled: '0',
    Attention: 'A',
    Function: 'F'
};

class AidKeyHelper {
    constructor(map) {
        this.map = map;
    }

    decode(mapIndex) {
        if (mapIndex >= this.map.length) {
            return '';
        }
        const code = this.map.substr(mapIndex, 1); 
        return code;
    }

    isEnabled(mapIndex) {
        if (mapIndex < 0)    { return false; }
        if (mapIndex === AidKeyMapIndex.Enter) { return true;  } // Always enabled.
        return this.isAttention(mapIndex) || this.isFunction(mapIndex);
    }

    isAttention(mapIndex) {
        return this.decode(mapIndex) === AID_KEY_MAP_CODE.Attention;
    }

    isFunction(mapIndex) {
        return this.decode(mapIndex) === AID_KEY_MAP_CODE.Function;
    }

    static keyToMapIndex(key) { 
        switch (key.toUpperCase()) {
            case 'CLEAR': return AidKeyMapIndex.Clear;
            case 'HELP': return AidKeyMapIndex.Help;
            case 'PAGEUP': return AidKeyMapIndex.PageUp;
            case 'PAGEDOWN': return AidKeyMapIndex.PageDown;
            case 'PRINT': return AidKeyMapIndex.Print;
            case 'HOME': return AidKeyMapIndex.Home;
            case 'ENTER': return AidKeyMapIndex.Enter;
            case 'ATTN': return AidKeyMapIndex.Attn;
            case 'RESET': return AidKeyMapIndex.Reset;

            default: {
                if (key.match(/F\d{1,3}/)) {
                    const num = parseInt(key.substr(1), 10);
                    return num - 1;
                }
            }
                break;
        }
        return -1;
    }
}

const theKbd = new Kbd();
