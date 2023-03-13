/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { theDropDown as DropDown };
export { theContextMenu as ContextMenu };

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
                }

                ContextMenu.hidePopupMenus(row);
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
        let row = ph.parentElement;
        if (row.tagName === 'TD') {
            row = row.closest('tr');
        }
        return row;
    }

    static getClosestRecordContainer(row) {
        let container;
        if (row.tagName === 'TR') {
            container = row.closest('tbody');
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

const theDropDown = new DropDown();
const theContextMenu = new ContextMenu();
