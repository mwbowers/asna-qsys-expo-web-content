/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { SubfileController, Subfile, EXPO_SUBFILE_CLASS, Storage, Compat };

import { SubfilePagingStore, SubfileState, InputState } from './paging-store.js';
import { PositionCursor } from '../page-position-cursor.js';
import { DdsGrid } from '../dds-grid.js';
import { Base64 } from '../base-64.js';
import { AsnaDataAttrName, JsonAttr } from '../asna-data-attr.js';
import { FeedbackArea } from '../feedback-area.js';
import { ContextMenu } from '../dropdown.js';

const HIDDEN_NAME_FOLD_LINES_PER_RECORD = 'fold-lines-per-record';

const EXPO_CLASS = {
    GRID_ROW: 'dds-grid-row',
    GRID_EMPTY_ROW: 'dds-grid-empty-row',
    GRID_ROW_NO_GAP: 'dds-row-no-gap',
    GRID_ROW_SPAN: 'dds-grid-row-span'
};

const EXPO_SUBFILE_CLASS = {
    CANDIDATE_CURRENT_RECORD: 'dds-subfile-candidate-current-record',
    CURRENT_RECORD: 'dds-subfile-current-record'
};

const ICON_NAME_MORE = 'download';
const ICON_NAME_NO_MORE = 'ban-circle';

let LastSubfileClicked = {
    x: 0,
    y: 1
}

const STORAGE_NS = {
    SFLCNTRL: 'ASNA.SflCntl' // Don't use dds-window STORAGE_NS names like: 'ASNA.DisplayFile'
}

let debug = false;

class SubfileController {

    static init(mainDiv, sflEndClickAsPushKeyHandling) {
        let sflIcons = [];
        if (mainDiv) {
            const elements = mainDiv.querySelectorAll(`div[${AsnaDataAttrName.SFLC}]`);

            for (let i = 0, l = elements.length; i < l; i++) {
                const sflcDiv = elements[i];

                const initEncodedData = sflcDiv.getAttribute(AsnaDataAttrName.SFLC);

                if (initEncodedData) {
                    try {
                        const encInitData = Base64.decode(initEncodedData);
                        const initData = JSON.parse(encInitData);
                        if (typeof initData.sflRecords.allowsAjax === 'undefined' ) {
                            initData.sflRecords.allowsAjax = true;
                        }
                        if (initData.menu && initData.menu.list) { ContextMenu.add(initData.name, initData.menu.list); }
                        const sflCtrlStore = SubfilePagingStore.register(initData);
                        if (!SubfileController.hasNestedSflController(sflcDiv)) {
                            let recordsContainer = DdsGrid.findRowSpanDiv(initData.name, sflcDiv);

                            if (recordsContainer) {
                                const tBody = recordsContainer.querySelector('tbody');
                                if (tBody) {
                                    recordsContainer = tBody;
                                }

                                sflCtrlStore.initialPageState = SubfileState.rememberPageState(recordsContainer);
                                const withGridCol = SubfileController.selectAllWithGridColumns(recordsContainer);
                                const sflColRange = SubfileController.calcSflMinMaxColRange(withGridCol);

                                SubfileController.addMouseCueEvents(recordsContainer, initData.inputBehaviour);
                                SubfileController.removeRowGap(recordsContainer);
                                sflCtrlStore.fldDrop.foldLinesPerRecord = SubfileController.querySubfileFoldLinesPerRecord(recordsContainer);

                                if (sflCtrlStore.sflEnd.showSubfileEnd) {
                                    // According to IBM here https://www.ibm.com/docs/en/i/7.5?topic=80-sflend-subfile-end-keyword-display-files
                                    //   The IBM® i operating system displays the plus sign as long as there are more records in the subfile to be displayed,
                                    //   no matter how the option indicator is set.
                                    //   When the last page of the subfile is displayed, the operating system displays the plus sign, if the indicator is off. 
                                    //   It does not display the plus sign, if the indicator is on.
                                    const showAtBottom = Compat.boolIsTrue(sflCtrlStore.sflRecords.isLastPage) ? sflCtrlStore.sflEnd.isSufileEnd : false;

                                    const icon = SubfileController.addSubfileEndCue(
                                        recordsContainer,
                                        showAtBottom,
                                        showAtBottom ? sflCtrlStore.sflEnd.textOn : sflCtrlStore.sflEnd.textOff,
                                        sflColRange,
                                        sflEndClickAsPushKeyHandling
                                    );
                                    if (icon && icon.el && icon.iconParms && icon.iconParms.title) {
                                        sflIcons.push(icon);
                                    }
                                }
                            }
                        }
                    }
                    catch (syntaxErr) {
                        console.warn(syntaxErr.message);
                    }

                    sflcDiv.removeAttribute(AsnaDataAttrName.SFLC);
                }
            }
        }

        return sflIcons;
    }

    static selectAllWithGridColumns(recordsContainer) {
        const withGridColList = recordsContainer.querySelectorAll('[style*="grid-column"]');
        const withGridAreaList = recordsContainer.querySelectorAll('[style*="grid-area"]');
        let result = [];

        withGridColList.forEach(el => result.push(el));
        withGridAreaList.forEach(el => result.push(el));

        return result;
    }

    static calcSflMinMaxColRange(withGridCol) {
        let minCol = 999;
        let maxCol = 1;
        for (let i = 0, l = withGridCol.length; i < l; i++) {
            const colSpan = DdsGrid.getGridColStartEnd(withGridCol[i]);
            if (!isNaN(colSpan.start)) {
                minCol = Math.min(colSpan.start, minCol);
            }

            if (!isNaN(colSpan.end)) {
                maxCol = Math.max(colSpan.end, maxCol);
            }
        }

        return maxCol > minCol ? { min: minCol, max: maxCol } : {};
    }

    static selectAllRows(recordsContainer) {
        return recordsContainer.querySelectorAll(`div[class~="${EXPO_CLASS.GRID_ROW}"], div[class~="${EXPO_CLASS.GRID_EMPTY_ROW}"]`);
    }

    static selectTableRows(recordsContainer) { // Note excludes table headers (th)
        const nonHeaderTd = recordsContainer.querySelectorAll('tr td');
        if (nonHeaderTd.length == 0) { return nonHeaderTd; }

        let result = [];

        for (let i = 0, l = nonHeaderTd.length; i < l; i++) {
            const td = nonHeaderTd[i];
            const tr = td.parentElement;
            if (tr && !result.find((e) => e === tr)) {
                result.push(tr);
            }
        }
        return result;
    }

    static resetLastClickedSubfileValues() {
        LastSubfileClicked.x = 0;
        LastSubfileClicked.y = 0;
    }

    static lastClickedSflRecord() {
        if (LastSubfileClicked.x > 0 && LastSubfileClicked.y > 0) {
            return document.elementFromPoint(LastSubfileClicked.x, LastSubfileClicked.y);
        }

        return null;
    }

    static resetLastClickedSubfile(el) {
        const closestRecord = SubfileController.getClosestToElementRecord(el);
        if (!closestRecord) { return; }

        const recordName = closestRecord.getAttribute(AsnaDataAttrName.RECORD);
        if (!recordName) { return; }

        if (SubfilePagingStore.getSflCtlStore(recordName)) {
            return; // In a subfile, don't care.
        }

        // Element in a non-subfile record, check to see if ROLL capabilities exist.
        const rollCaps = closestRecord.getAttribute(AsnaDataAttrName.RECORD_ROLLCAP);
        const enabledRoll = JsonAttr.tryParse(rollCaps);

        if (enabledRoll.pgdn || enabledRoll.pgup) {
            SubfileController.resetLastClickedSubfileValues();
        }
    }

    static getClosestSubfileCtrlName(el) {
        if (!el) { return ''; }

        const sflSelectedRecord = SubfileController.lastClickedSflRecord();
        if (sflSelectedRecord) {
            el = sflSelectedRecord;
        }
        else if (window.asnaExpo.page.lastFocus) {
            el = window.asnaExpo.page.lastFocus;
        }

        const closestRecord = SubfileController.getClosestToElementRecord(el);
        if (!closestRecord) { return ''; }

        const recordName = closestRecord.getAttribute(AsnaDataAttrName.RECORD);
        if (!recordName) { return ''; }

        const store = SubfilePagingStore.getSflCtlStore(recordName);
        if (store) {
            return store.name;
        }
        return '';
    }

    static getClosestToElementRecord(el) {
        const row = el.closest(`[${AsnaDataAttrName.ROW}]`);
        if (!row) { return null; }

        return row.closest(`[${AsnaDataAttrName.RECORD}]`);
    }

    static getFirstSubfileCtrlName() {
        const sflCtrlNames = SubfilePagingStore.getSflCtlStoreNames();
        if (sflCtrlNames && sflCtrlNames.length) {
            return sflCtrlNames[0];
        }
        return null;
    }

    static addMouseCueEvents(recordsContainer, inputBehaviour) {
        if (!inputBehaviour || !inputBehaviour.dblClick && !inputBehaviour.clickSetsCurrentRecord ) {
            return false;
        }

        const rows = SubfileController.selectAllRowsIncludeTR(recordsContainer);

        for (let i = 0, l = rows.length; i < l; i++) {
            const row = rows[i];

            if (inputBehaviour.cueCurrentRecord) {
                row.addEventListener('mouseout', () => {
                    row.classList.remove(EXPO_SUBFILE_CLASS.CANDIDATE_CURRENT_RECORD);
                });
                row.addEventListener('mouseover', () => {
                    row.classList.add(EXPO_SUBFILE_CLASS.CANDIDATE_CURRENT_RECORD);
                });
            }

            const cueCurrentRecord = inputBehaviour.clickSetsCurrentRecord;
            row.addEventListener('click', (evt) => {
                SubfileController.resetLastClickedSubfileValues();

                SubfileController.setCurrentSelection(recordsContainer, row, cueCurrentRecord);
                const targetTagName = evt.target.tagName;
                if (evt.target === row || (targetTagName !== 'INPUT' && targetTagName !== 'SELECT' && targetTagName !== 'TEXTAREA' && targetTagName !== 'BUTTON')) {
                    if (!PositionCursor.toFirstInputInSubfileRow(row)) {
                        LastSubfileClicked.x = evt.clientX;
                        LastSubfileClicked.y = evt.clientY;
                        if (debug) {
                            console.log(`Click at x:${LastSubfileClicked.x} y:${LastSubfileClicked.y}`);
                        }
                    }
                }
            });

            if (inputBehaviour.dblClick.aidKey || inputBehaviour.dblClick.targetField) {
                row.addEventListener('dblclick', () => {
                    SubfileController.executeDblClick(row, inputBehaviour.dblClick.targetField, inputBehaviour.dblClick.targetValue, inputBehaviour.dblClick.aidKey);
                });
            }
        }

        return true;
    }

    static selectAllRowsIncludeTR(recordsContainer) {
        const gridRows = SubfileController.selectAllRows(recordsContainer);
        let gridTableRows = [];

        if (recordsContainer.classList.contains(EXPO_CLASS.GRID_ROW_SPAN) || recordsContainer.tagName === 'TBODY') {
            gridTableRows = SubfileController.selectTableRows(recordsContainer);
        }

        let rows = [...gridRows, ...gridTableRows];
        return rows;
    }

    static removeRowGap(recordsContainer) {
        const gridRows = SubfileController.selectAllRows(recordsContainer);
        gridRows.forEach((row) => { row.classList.add(EXPO_CLASS.GRID_ROW_NO_GAP); });
    }

    static querySubfileFoldLinesPerRecord(recordsContainer) {
        const hiddenElements = recordsContainer.querySelectorAll(`input[type="hidden"][name="${HIDDEN_NAME_FOLD_LINES_PER_RECORD}"]`);
        if (!hiddenElements || hiddenElements.length === 0) { return 1; }
        return hiddenElements[0].value; 
    }

    static setCurrentSelection(recordsContainer, row, cueCurrentRecord) {
        if (cueCurrentRecord) {
            const rows = SubfileController.selectAllRowsIncludeTR(recordsContainer);

            for (let i = 0, l = rows.length; i < l; i++) {
                rows[i].classList.remove(EXPO_SUBFILE_CLASS.CURRENT_RECORD);
            }

            row.classList.add(EXPO_SUBFILE_CLASS.CURRENT_RECORD);
        }

        if (FeedbackArea.updateSubfileCursorRrnFromRow(row)) {
            FeedbackArea.updateSubfileCursorLocation(row);
        }
        // Subfile.setMousePos(row, lastMousePos); TO-DO
    }

    static addSubfileEndCue(recordsContainer, isAtBottom, tooltipText, sflColRange, sflEndClickAsPushKeyHandling) {
        const iconName = isAtBottom ? ICON_NAME_NO_MORE : ICON_NAME_MORE;
        const span = document.createElement('span');
        span.className = 'dds-cells-suitable-for-icons';
        span.classList.add(isAtBottom ? 'sflend-bottom' : 'sflend-more');

        if (recordsContainer.tagName === 'TBODY') {
            const table = recordsContainer.parentElement;
            const oldFooter = table.querySelector('tfoot');
            if (oldFooter) {
                table.removeChild(oldFooter);
            }
            const iconRow = document.createElement('tr');
            const iconTD = document.createElement('td');
            iconTD.classList.add('sflend-icon-table-data');
            iconTD.appendChild(span);
            iconRow.append(iconTD);

            const subfile = recordsContainer.closest(`[${AsnaDataAttrName.ROW}]`);
            if (subfile) {
                const rowRange = DdsGrid.getRowRange(subfile);
                if (rowRange && rowRange.length == 2) {
                    const fromRow = parseInt(rowRange[0], 10);
                    const toRow = parseInt(rowRange[1], 10);
                    const sflRowCount = (toRow - fromRow) + 1;
                    const trows = recordsContainer.querySelectorAll('tr');
                    const tdsTr = trows.length && trows.length > 0 ? trows[trows.length - 1].querySelectorAll('td') : [];
                    const nonEmptyRowCount = SubfileController.countNonEmpty(trows);
                    if (tdsTr.length > 1 && sflRowCount > nonEmptyRowCount ) {
                        if (tdsTr.length) {
                            for (let i = 0, l = sflRowCount - nonEmptyRowCount; i < l; i++) {
                                const tr = document.createElement('tr');
                                for (let j = 0; j < tdsTr.length; j++) {
                                    const td = document.createElement('td');
                                    td.innerHTML = '&nbsp;';
                                    tr.appendChild(td);
                                }
                                recordsContainer.appendChild(tr);
                            }
                        }
                    }
                    if (tdsTr.length > 1) {
                        iconTD.setAttribute('colSpan', tdsTr.length);
                    }
                }
                const tfoot = document.createElement('tfoot');
                tfoot.appendChild(iconRow);
                recordsContainer.parentElement.appendChild(tfoot);
            }
        }
        else {
            let iconCol = 0; 
            span.style.gridRow = '1';
            if (sflColRange.max && sflColRange.min && sflColRange.max > sflColRange.min) {
                iconCol = (sflColRange.max - sflColRange.min) - 1;
                span.style.gridArea = `1 / ${iconCol} / auto`;
            }

            const iconRow = document.createElement('div');
            iconRow.className = `${EXPO_CLASS.GRID_ROW} ${EXPO_CLASS.GRID_ROW_NO_GAP}`;
            if (iconCol > 1) {
                iconRow.style.gridTemplateColumns = `repeat(${iconCol - 1}, var(--dds-grid-col-width)) auto`; // override dds-grid-row to define less fixed columns, making the one used by icon 'auto' column.
            }
            iconRow.appendChild(span);
            iconRow.setAttribute(AsnaDataAttrName.SFL_END_ADDED_ROW, '');
            recordsContainer.appendChild(iconRow);
        }

        if (!isAtBottom) {
            span.addEventListener('click', (event) => {
                LastSubfileClicked.x = event.clientX;
                LastSubfileClicked.y = event.clientY;
                sflEndClickAsPushKeyHandling(event, 'PgDn');
            });
        }

        return { el: span, iconParms: { awesomeFontId: iconName, color: '*class', title: tooltipText ? tooltipText: '' } };
    }

    static countNonEmpty(nodeList) {
        let count = 0;
        nodeList.forEach((node) => {
            if (node.innerHTML !== '') { count++; }
        });
        return count;
    }

    static nextAll(el) {
        let result = [];
        if (el.nextElementSibling == null) { return result; }

        do {
            el = el.nextElementSibling;
            if (el) {
                result.push(el);
            }
        } while (el);

        return result;
    }

    static moveEmptyRowsBeforeSflEndRow(form) {
        const sflIconRow = form.querySelector(`div[${AsnaDataAttrName.SFL_END_ADDED_ROW}]`);
        // For TBODY we don't need to do anything.

        if (!sflIconRow ) { return; }

        const recordsContainter = sflIconRow.parentElement;
        const allNextSiblings = SubfileController.nextAll(sflIconRow);
        allNextSiblings.forEach((emptyRow) => {
            const removed = recordsContainter.removeChild(emptyRow);
            recordsContainter.insertBefore(removed, sflIconRow);
        });
    }

    static executeDblClick(row, targetField, targetValue, aidKey) {
        if (!targetField) { return; }
        
        const fieldsInRow = row.querySelectorAll('[name]');
        let field = null;
        let fieldName = '';
        const re = new RegExp(targetField, 'gi');

        for (let i = 0, il = fieldsInRow.length; i < il; i++) {
            const name = fieldsInRow[i].getAttribute('name');
            if (!name) { continue; }
            if (re.exec(name)) {
                field = fieldsInRow[i];
                fieldName = name;
                break;
            }
        }

        if (field && typeof field.value !== 'undefined') {
            if (targetValue) {
                field.value = targetValue;
            }
            if (field.type === 'checkbox' && el.value === el.defaultValue) {
                field.checked = true;
            }
            if (typeof field.focus === 'function') {
                field.focus();
            }
        }

        if (aidKey) {
            window.asnaExpo.page.pushKey(aidKey, fieldName, targetValue);
        }
    }

    static hasNestedSflController(sflcDiv) {
        const children = sflcDiv.children;
        for (let i = 0, l = children.length; i < l; i++ ) {
            const child = children[i];
            if (child.getAttribute(AsnaDataAttrName.SFLC)) {
                return true;
            }
        }
        return false;
    }

    static saveLastSubfileClicked(pagePathname) {
        if (debug) {
            console.log(`[Save] LastSubfileClicked for Page:${pagePathname}, x:${LastSubfileClicked.x} y:${LastSubfileClicked.y}`);
        }

        const storageKey = `${STORAGE_NS.SFLCNTRL}${pagePathname}.lastSflClick`;
        Storage.serailize(storageKey, LastSubfileClicked);
    }
    
    static restoreLastSubfileClicked(pagePathname) {
        const storageKey = `${STORAGE_NS.SFLCNTRL}${pagePathname}.lastSflClick`;
        const obj = Storage.deserialize(storageKey);

        LastSubfileClicked.x = 0;
        LastSubfileClicked.y = 0;

        if (obj) {
            LastSubfileClicked = obj;
        }

        if (debug) {
            console.log(`[Restore] LastSubfileClicked for Page:${pagePathname}, x:${LastSubfileClicked.x} y:${LastSubfileClicked.y}`);
        }
    }
}

class Subfile {
    static addInputState(state, inputEl) {
        if (!inputEl.name) { return; }  

        let value = Subfile.createInputState(inputEl);
        if (value) {  // DOM elements with value property are input.
            state[inputEl.name] = value;
        }
    }

    static createInputState(inputEl) {
        let state = null;

        if (typeof inputEl.type !== 'undefined' && inputEl.type === 'checkbox') {
            state = new InputState(true, null, inputEl.checked);
        }
        else if (typeof (inputEl.value) !== 'undefined') {
            state = new InputState(false, inputEl.value);
        }

        return state;
    }

    static restoreEdit(recordsContainer, inputName, inputState) {
        if (!(inputState instanceof InputState)) { return; }

        const input = Subfile.findFieldInDOM(recordsContainer, inputName);

        if (input) {
            if (typeof input.type !== 'undefined' && input.type === 'checkbox') {
                input.checked = inputState.checked;
            }
            else if (typeof input.value !== 'undefined') {
                input.value = inputState.value;
            }
        }
    }

    static escapeName(name) {
        return name.replace(/["\\]/g, '\\$&');
    }

    static findFieldInDOM(recordsContainer, fieldname) {
        const fieldnameEscaped = Subfile.escapeName(fieldname);
        const input = recordsContainer.querySelector(`input[name="${fieldnameEscaped}"]`);
        return input;
    }

    static cloneDOM_Element(fieldName, inputState) { 
        const newInput = document.createElement('input');
        newInput.name = fieldName;

        if (inputState.isCheckbox && inputState.checked) {
            newInput.type = 'checkbox'; // Colud be 'radio' important think is that it can be 'ckecked'
            newInput.setAttribute("checked", true);

            console.log(`Created ${fieldName} checked`);
        }
        else { // Note: we don't really care about specific type, the server will get value 
            newInput.type = 'text';
            newInput.setAttribute("value", inputState.value );

            console.log(`Created ${fieldName} value:${newInput.value}`);
        }

        newInput.style.display = 'none'; // avoid disrupting view

        return newInput;
    }

    static cloneDOM_HiddenElement(fieldName, inputState) {
        const newInput = document.createElement('input');
        newInput.name = fieldName;
        newInput.type = 'hidden';

        newInput.setAttribute("value", inputState.value);
        newInput.style.display = 'none'; // avoid disrupting view

        return newInput;
    }

    static findHiddenRrn(recordsContainer, sflInputFieldName) {
        const fldNamespace = Subfile.getFieldNamespace(sflInputFieldName);
        if (!fldNamespace) {
            return -1;
        }
        return PositionCursor.findInput(recordsContainer, `${fldNamespace}._RecordNumber`, true);
    }

    static getFieldNamespace(fieldName) {
        let lastDot = fieldName.lastIndexOf(".");
        if (lastDot < 0) {
            return null;
        }
        return fieldName.substr(0, lastDot);
    }

    static makeFieldName(sflFldName, rrn) {
        const iBracket = sflFldName.indexOf('[');
        const iEndBracket = sflFldName.indexOf(']');

        if (!(iBracket >= 0 && iEndBracket > iBracket)) {
            return ''; // unexpected.
        }

        return `${sflFldName.substr(0, iBracket)}[${rrn}]${sflFldName.substr(iEndBracket + 1)}`;
    }

    static isSubfileInput(inputCandidate) {
        const name = inputCandidate.getAttribute('name');
        if (!name) {
            return false;
        }

        if (!inputCandidate.getAttribute(AsnaDataAttrName.ROWCOL)){
            return false;
        }

        if (!(inputCandidate.getAttribute('value') !== null || inputCandidate.getAttribute('checked') !== null)) {
            return false;
        }

        const parts = name.split('.');
        if (parts.length !== 3) {
            return false;
        }

        const openBracket = name.match(/\[/g);
        const closedBracket = name.match(/\]/g);

        if (!(openBracket.length === 1 && closedBracket.length === 1)) {
            return false;
        }

        if (typeof name.endsWidth === 'function' && !name.endsWidth(']')) {
            return false;
        }

        return true;
    }

    static getSubfileName(inputCandidate) {
        if (!Subfile.isSubfileInput(inputCandidate)) { return ''; }

        const name = inputCandidate.getAttribute('name');
        const parts = name.split('.');
        if (parts.length !== 3) {
            return '';
        }

        const eos = parts[1].indexOf('[');
        if (eos > 0) {
            return parts[1].substr(0, eos);
        }
    }

    static matchRowFieldName(fieldName, rowfieldNameCand) {
        if (!fieldName) { return false; }
        const iStart = fieldName.indexOf("[");
        const iEnd = fieldName.indexOf("]");
        if (iStart < 0 || iEnd < 0 || !(iStart < iEnd) || !(fieldName.length > iEnd + 1) ) {
            return fieldName === rowfieldNameCand;
        }
        const ciStart = rowfieldNameCand.indexOf("[");
        const ciEnd = rowfieldNameCand.indexOf("]");
        if (ciStart < 0 || ciEnd < 0 || !(ciStart < ciEnd) || !(rowfieldNameCand.length > ciEnd + 1)) {
            return false;
        }

        return fieldName.substr(0, iStart) === rowfieldNameCand.substr(0, ciStart) && 
            fieldName.substr(iEnd+1) === rowfieldNameCand.substr(ciEnd+1);
    }

    static findAncesorRow(el) {
        return el.closest(`div[class~="${EXPO_CLASS.GRID_ROW}"]`);
    }
}

class Compat { // Compatibility with older releases.
    static boolIsTrue(item) {
        if (typeof item === 'string') {
            return item === 'true';
        }
        return item !== false;
    }
}


class Storage {
    static serailize(storageKey, obj) {
        const value = JSON.stringify(obj);
        sessionStorage.setItem(storageKey, value);
    }

    static deserialize(storageKey) {
        const storeVal = sessionStorage.getItem(storageKey);

        if (storeVal) {
            try {
                return JSON.parse(storeVal);
            }
            catch { }
        }
        return null;
    }
}