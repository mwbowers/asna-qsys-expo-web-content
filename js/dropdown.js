/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { theDropDown as DropDown };
export { theContextMenu as ContextMenu };
export { theDecRange as DecRange };

import { AsnaDataAttrName } from './asna-data-attr.js';
import { StringExt } from './string.js';
import { DdsGrid } from './dds-grid.js';
import { EXPO_SUBFILE_CLASS, SubfileController, Subfile } from './subfile-paging/dom-init.js';
import { Base64 } from './base-64.js';

class DropDown {
    initBoxes() {
        const elements = document.querySelectorAll(`input[${AsnaDataAttrName.VALUES}]`);

        for (let i = 0, l = elements.length; i < l; i++) {
            const input = elements[i];

            const values = input.getAttribute(AsnaDataAttrName.VALUES);
            const valuesText = input.getAttribute(AsnaDataAttrName.VALUES_TEXT);
            this.replaceInputWithSelect(input, this.parseAttribute(values), this.parseAttribute(valuesText));
            // Note: no need to remove AsnaDataAttrName.VALUES, AsnaDataAttrName.VALUES_TEXT, etc. (input was replaced).
        }
    }

    parseAttribute(values) {
        if (!values)
            return [];

        let vals = [];
        let state = 'initial';
        let iLexeme = 0;
        let hasEmbbededQuotes = false;
        let valuesEos = values + '\0';

        for (let i = 0, l = valuesEos.length; i < l; i++) {
            const ch = valuesEos[i];

            switch (state) {
                case 'initial':
                    {
                        iLexeme = i;
                        if (ch === '\'')
                            state = 'in-quote';
                        else if (ch !== ' ')
                            state = 'unquoted';
                        break;
                    }
                case 'in-quote':
                    {
                        if (ch === '\'')
                            state = 'second-quote';
                        break;
                    }
                case 'second-quote':
                    {
                        if (ch !== '\'') {
                            state = 'end-quoted';
                        }
                        else {
                            state = 'in-quote';
                            hasEmbbededQuotes = true;
                        }
                        break;
                    }
                case 'unquoted':
                    {
                        if (ch === ',')
                            state = 'end-un-quoted';
                        break;
                    }
            }

            switch (state) {
                case 'end-quoted':
                    {
                        let lexeme = valuesEos.substring(iLexeme + 1, i - 1);
                        if (hasEmbbededQuotes)
                            lexeme = lexeme.Replace("''", "'");
                        vals.push(lexeme);
                        state = 'initial';
                        break;
                    }
                case 'end-end-unquoted':
                    {
                        vals.push(valuesEos.substring(iLexeme, i));
                        state = 'initial';
                        break;
                    }
            }
        }

        if (state === 'unquoted')
            vals.push(valuesEos.substring(iLexeme, i));

        return vals;
    }

    replaceInputWithSelect(input, optionsValues, optionTexts) {
        if (optionsValues.length !== optionTexts.length) {
            window.alert(`${input.name} field define ${optionsValues.length} Values and ${optionTexts.length} ValuesText. Collection size must match!`);
            return;
        }

        const select = document.createElement('select');
        DropDown.copyNonValuesAttributes(select, input);

        for (let i = 0, l = optionsValues.length; i < l; i++) {
            const optValue = optionsValues[i];
            const optText = optionTexts[i];
            if (optText.length > 0) { // Skip when empty.
                const option = document.createElement('option');
                option.value = optValue;
                if (DropDown.allZeroes(optValue) && optText === '0') {
                    option.innerText = ' ';
                }
                else
                    option.innerText = optText;

                select.appendChild(option);
            }
        }

        const value = input.value ? input.value : null;
        input.parentNode.replaceChild(select, input); // Note: input will be destroyed during DOM's garbage collection.
        if (value) {
            for (let i = 0, l = select.options.length; i < l; i++) {
                if ( DropDown.isSameOptionValue(select.options[i].value, value)) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }
    }

    static copyNonValuesAttributes(target, source) {
        if (!source.attributes) { return; }

        for (let i = 0, l = source.attributes.length; i < l; i++) {
            const attr = source.attributes[i];
            if (!attr.name || attr.name === AsnaDataAttrName.VALUES || attr.name === AsnaDataAttrName.VALUES_TEXT) {
                continue;
            }

            target.setAttribute(attr.name, attr.value);
        }
    }

    static allZeroes(test) {
        if (!test) {
            return false;
        }

        for (let i = 0, l = test.length; i < l; i++) {
            if (test[i] !== '0') {
                return false;
            }
        }

        return true;
    }

    static isSameOptionValue(optVal, val) {
        if (typeof optVal === 'string' && typeof optVal === typeof val) {
            return StringExt.trim(optVal) == StringExt.trim(val);
        }
        else if (typeof optVal === typeof val) {
            return optVal == val;
        }

        if (typeof optVal === 'string' && typeof val === 'number') {
            const optNumVal = parseInt(StringExt.trim(optVal), 10);
            return optNumVal === val;
        }
        return false; // Don't know
    }
}

const MENU_NAV_SELECTOR = 'nav.dds-menu';

class ContextMenu {
    constructor() {
        this.menusByRecord = [];
        this.count = 0;
    }

    add(record, menuList) {
        menuList.forEach((menu) => {
            if (!this.menusByRecord[record]) {
                this.menusByRecord[record] = [];
            }
            this.menusByRecord[record].push(menu);
            this.count++;
        });
    }

    initNonSubfileMenus(main) {
        if (!main) { return; }
        const recordMenus = main.querySelectorAll(`div[${AsnaDataAttrName.RECORD_CONTEXT_MENUS}]`);
        if (recordMenus && recordMenus.length) {
            recordMenus.forEach((record) => {
                const recordName = record.getAttribute(AsnaDataAttrName.RECORD);
                const menuEncodedData = record.getAttribute(AsnaDataAttrName.RECORD_CONTEXT_MENUS);
                const menuInitData = Base64.decode(menuEncodedData);
                const initData = JSON.parse(menuInitData);

                this.add(recordName, initData);
            });
        }
    }

    prepare(main) {
        if (!main) { return 0; }
        for (let i = 0, l = Object.keys(this.menusByRecord).length; i < l; i++) {
            const recordName = Object.keys(this.menusByRecord)[i];
            const recordMenus = this.menusByRecord[recordName];
            recordMenus.forEach((menu) => {
                ContextMenu.preparePlaceHolder(main, recordName, menu);
            });
        }

        return this.count;
    }

    hideMenus(root) {
        if (this.count) {
            ContextMenu.hidePopupMenus(root);
        }
    }

    static preparePlaceHolder(main, recordName, menuData) {
        const recordEl = main.querySelector(`div[${AsnaDataAttrName.RECORD}='${recordName}']`);

        if (!recordEl) { return null; }

        const sflRecordsContainer = DdsGrid.findRowSpanDiv(recordName, recordEl);
        const isSubfile = sflRecordsContainer !== null;

        const ph = ContextMenu.findPlaceholder(isSubfile ? sflRecordsContainer : recordEl, menuData);
        if (!ph) { return; }

        ContextMenu.appendMenuButton(ph, menuData);
        menuData._ph = ph;

        if (isSubfile) {
            const rows = SubfileController.selectAllRowsIncludeTR(sflRecordsContainer);
            rows.forEach((row) => {
                row.addEventListener('mouseover', () => {
                    ContextMenu.moveToSflRow(row, menuData._ph);
                });
            });
        }
    }

    static doActionDescendant(ancestorEl, menuOption) {
        if (!ancestorEl) { return; }
        let virtRowCol = menuOption.vRowCol;
        if (menuOption.focusField) {
            const inputs = ancestorEl.querySelectorAll('input[name],select[name],textarea[name]:not([type="hidden"])');
            if (inputs) {
                let inputName = '';
                inputs.forEach((input) => {
                    const name = input.getAttribute('name');
                    if (Subfile.matchRowFieldName(name, menuOption.focusField)) {
                        inputName = name;
                        if (!virtRowCol) {
                            virtRowCol = input.getAttribute(AsnaDataAttrName.ROWCOL);
                        }
                    }
                });
                if (inputName) {
                    setTimeout(() => {
                        asnaExpo.page.pushKey(menuOption.aidKeyName, inputName, menuOption.fieldValue, virtRowCol);
                    }, 1);
                }
            }
        }
        else if (menuOption.aidKeyName !== "None") {
            setTimeout(() => {
                asnaExpo.page.pushKey(menuOption.aidKeyName, "", "", virtRowCol);
            }, 1);
        }
    }

    static findPlaceholder(container, menuData) {
        let result = null;

        const placeHolders = container.querySelectorAll(`div[${AsnaDataAttrName.CONTEXT_MENU}]`);
        if (!placeHolders || !placeHolders.length) { return result; }

        placeHolders.forEach((ph) => {
            if (!result) {
                const menuID = ph.getAttribute(AsnaDataAttrName.CONTEXT_MENU);
                if (menuID === menuData.uniqueName) {
                    result = ph;
                }
            }
        });

        return result;
    }

    static appendMenuButton(ph, menuData) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dds-menu-anchor-button';
        button.innerText = '☰';

        button._menu = menuData;

        button.addEventListener('click', (e) => {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            if (button._menu && button._menu._ph) {
                const menuData = button._menu;
                const ph = menuData._ph;
                const row = ContextMenu.getClosestRow(ph);

                if (row) {
                    button._row = row;
                    const recordsContainer = ContextMenu.getClosestRecordContainer(row);
                    if (recordsContainer) {
                        SubfileController.setCurrentSelection(recordsContainer, row, true);
                    }
                    ContextMenu.hidePopupMenus(row);
                }

                const menuPopup = button.querySelector('div.dds-menu-popup');
                if (!menuPopup) {
                    const rect = ph.getBoundingClientRect();
                    ContextMenu.createPopup(button, rect.left + window.scrollX, rect.top + window.scrollY, menuData);
                }
                else {
                    const nav = button.querySelector(MENU_NAV_SELECTOR);
                    if (nav) {
                        nav.style.display = 'block';
                    }
                }
            }
        });

        ph.appendChild(button);
    }

    static getClosestRow(ph) {
        let rowCandidate = ph.parentElement;
        if (rowCandidate.tagName === 'TD') {
            rowCandidate = rowCandidate.closest('tr');
        }
        if (!rowCandidate) { return null; }

        const container = ContextMenu.getClosestRecordContainer(rowCandidate);
        if (container) {
            const range = DdsGrid.getRowRange(container);
            if (range && range.length === 2) {
                return rowCandidate;
            }
        }

        return null;
    }

    static getClosestRecordContainer(row) {
        let container;
        if (row.tagName === 'TR') {
            const tbody = row.closest('tbody');
            if (!tbody) { return null; }
            const table = tbody.parentElement;
            if (!table || table.tagName !== 'TABLE') { return null; }
            container = table.closest('div[data-asna-row]');
        }
        else {
            container = row.closest('div[data-asna-row]');
        }
        return container;
    }

    static createPopup(button,left, top, menuData) {
        const div = document.createElement('div');
        div.classList.add('dds-menu-popup');
        div.style.left = `${left}px`;
        div.style.top = `${top}px`;

        const nav = document.createElement('nav');
        const ul = document.createElement('ul');

        nav.className = 'dds-menu';

        div.appendChild(nav);

        nav.appendChild(ul);

        menuData.options.forEach((menuOption) => {
            const item = document.createElement('li');
            if (menuOption.text === '--' && menuOption.aidKeyName === 'None') {
                item.className = 'dds-menu-divider';
                const hRule = document.createElement('hr');
                item.appendChild(hRule);
            }
            else {
                const menuButton = document.createElement('button');
                menuButton.type = 'button';
                item.appendChild(menuButton);

                menuButton.innerText = menuOption.text;
                menuButton.addEventListener('click', (e) => {
                    if (e.stopPropagation) {
                        e.stopPropagation();
                    }

                    const me = e.target;
                    const nav = me.closest(MENU_NAV_SELECTOR);
                    if (nav) { nav.style.display = 'none'; }

                    if (button._row) {
                        ContextMenu.doActionDescendant(button._row, menuOption);
                    }
                    else {
                        const nonSubfileRow = nav.closest('div[data-asna-row]');
                        ContextMenu.doActionDescendant(nonSubfileRow, menuOption);
                    }
                });
            }
            ul.appendChild(item);
        });

        button.appendChild(div);
    }

    static moveToSflRow(row, lastPh) {
        const lastRow = ContextMenu.getClosestRow(lastPh);
        if (!lastRow || lastRow === row) { return; }

        lastRow.classList.remove(EXPO_SUBFILE_CLASS.CANDIDATE_CURRENT_RECORD);

        const lastButton = lastPh.querySelector('button.dds-menu-anchor-button');
        if (!lastButton || ! lastButton._menu) { return; }

        const menu = lastButton._menu;
        const ph = ContextMenu.findPlaceholder(row, menu);

        if (!ph) {
            return;
        }

        lastPh.removeChild(lastButton);
        ContextMenu.appendMenuButton(ph, menu);
        menu._ph = ph;
    }

    static hidePopupMenus(root) {
        const openMenus = root.querySelectorAll(MENU_NAV_SELECTOR);
        openMenus.forEach((popup) => { popup.style.display = 'none'; });
    }
}

class DecRange {
    init(form) {
        const elements = form.querySelectorAll(`input[${AsnaDataAttrName.DEC_RANGE_OPTIONS}]`);

        for (let i = 0, l = elements.length; i < l; i++) {
            const input = elements[i];
            const encOptions = input.getAttribute(AsnaDataAttrName.DEC_RANGE_OPTIONS);
            try {
                const options = JSON.parse(Base64.decode(encOptions));
                input.removeAttribute(AsnaDataAttrName.DEC_RANGE_OPTIONS);
                DecRange.createComponent(input, options);
            }
            catch (ex) {
                // alert(ex);
            }
        }
    }

    static createComponent(input, options) {
        if (options.type === 'b') {
            DecRange.createButtons(input, options);
        }
        else if (options.type === 's') {
            DecRange.createSlider(input, options);
        }
    }

    static createButtons(input, options) {
        const div = document.createElement('div');
        DecRange.copyNonInputAttributes(div, input);
        div.className = 'dds-dec-range-container';

        const btnMinus = document.createElement('button');
        btnMinus.innerText = '-';
        DecRange.initBtn(btnMinus, options.readOnly);

        const inputDecField = document.createElement('input');
        inputDecField.type = 'text';
        inputDecField.className = 'dds-dec-range-button-input';
        if (options.name) {
            inputDecField.setAttribute('name', options.name);
        }

        if (options.numericValue) {
            inputDecField.value = options.numericValue;
        }


        const btnPlus = document.createElement('button');
        btnPlus.innerText = '+';
        DecRange.initBtn(btnPlus, options.readOnly);

        if (options.readOnly) {
            inputDecField.setAttribute('disabled', true);
        }
        else {
            if (options.max > options.min) {
                inputDecField.setAttribute("min", options.min);
                inputDecField.setAttribute("max", options.max);
            }

            btnMinus._asna = { input: inputDecField, dir: -1, step: options.step };
            btnPlus._asna = { input: inputDecField, dir: +1, step: options.step };

            btnMinus.addEventListener('click', DecRange.handleChangeInputButtonClick);
            btnPlus.addEventListener('click', DecRange.handleChangeInputButtonClick);
        }

        div.appendChild(btnMinus);
        div.appendChild(inputDecField);
        div.appendChild(btnPlus);

        input.parentNode.replaceChild(div, input); // Note: input will be destroyed during DOM's garbage collection.
    }

    static createSlider(input, options) {
        const div = document.createElement('div');
        DecRange.copyNonInputAttributes(div, input);
        div.className = 'dds-dec-range-container';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'dds-dec-range-slider';

        if (options.readOnly) {
            slider.setAttribute('disabled', true);
        }

        if (options.numericValue) {
            slider.value = options.numericValue;
        }

        if (options.max > options.min) {
            slider.setAttribute("min", options.min);
            slider.setAttribute("max", options.max);
        }

        if (options.showValue && options.showValue === 'l' || options.showValue === 'r') {
            const inputDecField = document.createElement('input');
            inputDecField.type = 'text';
            inputDecField.className = 'dds-dec-range-slider-input';

            if (options.name) {
                inputDecField.setAttribute('name', options.name);
            }

            if (options.numericValue) {
                inputDecField.value = options.numericValue;
            }

            if (options.readOnly) {
                inputDecField.setAttribute('disabled', true);
            }
            else {
                if (options.max > options.min) {
                    inputDecField.setAttribute("min", options.min);
                    inputDecField.setAttribute("max", options.max);
                }

                inputDecField._asna = { slider: slider };
                inputDecField.addEventListener('input', DecRange.handleSliderStyleValueChange);
                inputDecField.addEventListener('change', DecRange.handleSliderStyleValueChange);

                slider._asna = { input: inputDecField };
                slider.addEventListener('change', DecRange.handleSliderStylePositionChange);
            }

            if (options.showValue === 'l') {
                div.appendChild(inputDecField);
                div.appendChild(slider);
            }
            else {
                div.appendChild(slider);
                div.appendChild(inputDecField);
            }
        }
        else {
            if (options.name) {
                slider.setAttribute('name', options.name);
            }
            div.appendChild(slider);
        }

        input.parentNode.replaceChild(div, input); // Note: input will be destroyed during DOM's garbage collection.
    }

    static copyNonInputAttributes(target, source) {
        if (!source.attributes) { return; }

        for (let i = 0, l = source.attributes.length; i < l; i++) {
            const attr = source.attributes[i];
            if (attr.name && (attr.name === 'name' || attr.name === 'value') ) {
                continue;
            }

            target.setAttribute(attr.name, attr.value);
        }
    }

    static initBtn(btn, readOnly) {
        btn.className = 'dds-dec-range-button';
        btn.type = 'button';

        if (readOnly) {
            btn.setAttribute('disabled', true);
        }
    }

    static handleChangeInputButtonClick(e) {
        let btn = e.target, err;

        if (!btn || !btn._asna || !btn._asna.input) { return };

        let  input = btn._asna.input;
        let  dir = btn._asna.dir ? btn._asna.dir : 1;
        const step = btn._asna.step;

        if (!step || !input) { return; }

        try {
            const min = input.getAttribute('min');
            const max = input.getAttribute('max');
            const amount = parseFloat(step);

            let current = parseFloat(input.value);
            let newVal = current + (dir > 0 ? step : -step);

            if (min) {
                newVal = Math.max(newVal, parseFloat(min));
            }

            if (max) {
                newVal = Math.min(newVal, parseFloat(max));
            }

            input.value = newVal;
        }
        catch (err) { }
    }

    static handleSliderStyleValueChange(e) {
        const input = e.target;

        if (!input || !input._asna || !input._asna.slider) { return; }

        const slider = input._asna.slider;
        slider.value = input.value;
    }

    static handleSliderStylePositionChange(e) {
        const slider = e.target;

        if (!slider || !slider._asna || !slider._asna.input) { return; }

        const inputDecField = slider._asna.input;
        inputDecField.value = slider.value;
    }
}

const theDropDown = new DropDown();
const theContextMenu = new ContextMenu();
const theDecRange = new DecRange();