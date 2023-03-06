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
        this.list = [];
    }

    add(record, menuList) {
        menuList.forEach((menu) => {
            if (!this.menusByRecord[record]) {
                this.menusByRecord[record] = [];
            }
            this.menusByRecord[record].push(menu);
        });
    }

    initNonSubfileMenus(main) {
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
        if (!main) { return; }

        for (let i = 0, l = Object.keys(this.menusByRecord).length; i < l; i++) {
            const recordName = Object.keys(this.menusByRecord)[i];
            const recordMenus = this.menusByRecord[recordName];
            recordMenus.forEach((menu) => {
                const menuEl = ContextMenu.createMenu(main, recordName, menu);
                if (menuEl) {
                    this.list.push(menuEl);
                }
            });
        }
    }

    static createMenu(main, recordName, menuData) {
        const recordEl = main.querySelector(`div[${AsnaDataAttrName.RECORD}='${recordName}']`);

        if (!recordEl) { return null; }

        const sflRecordsContainer = DdsGrid.findRowSpanDiv(recordName, recordEl);
        const isSubfile = sflRecordsContainer !== null;

        const leftTop = ContextMenu.findRelPosition(isSubfile ? sflRecordsContainer : recordEl, menuData);

        if (!leftTop || !Object.keys(leftTop).length) { return null; }

        const div = document.createElement('div');
        div.classList.add('dds-menu-anchor');
        div.style.position = 'absolute';
        div.style.left = `${leftTop.l}px`;
        div.style.top = `${leftTop.t}px`;

        const button = document.createElement('button');
        const nav = document.createElement('nav');
        const ul = document.createElement('ul');

        button.type = 'button';
        button.className = 'dds-menu-anchor';
        button.innerText = '☰';
        button.addEventListener('click', (e) => {
            const me = e.target;
            const menu = me.parentElement;
            if (menu && menu._row) {
                const row = menu._row;
                const recordsContainer = row.closest('div[data-asna-row]');
                if (recordsContainer) {
                    SubfileController.setCurrentSelection(recordsContainer, menu._row, true);
                }
            }
            ContextMenu.toggleVisibility(me.parentElement.querySelector(MENU_NAV_SELECTOR));
        });

        if (isSubfile) {
            button.addEventListener('mouseover', (e) => {
                const me = e.target;
                const menu = me.parentElement;
                if (menu && menu._row) {
                    menu._row.classList.add(EXPO_SUBFILE_CLASS.CANDIDATE_CURRENT_RECORD);
                }
            });
        }

        nav.className = 'dds-menu';

        div.appendChild(button);
        div.appendChild(nav);

        nav.appendChild(ul);

        menuData.options.forEach((menuOption) => {
            const item = document.createElement('li');
            if (menuOption.text === "--" && menuOption.aidKeyName === "None" ) {
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
                    const me = e.target;
                    const nav = me.closest(MENU_NAV_SELECTOR);
                    if (nav) { nav.style.display = 'none'; }
                    let ancestorEl = nav.parentElement._row;

                    if (!ancestorEl) { ancestorEl = nav.parentElement._record; }

                    if (ancestorEl) {
                        ContextMenu.doActionDescendant(ancestorEl, menuOption);
                    }
                });
            }
            ul.appendChild(item);
        });

        const menu = main.appendChild(div);

        if (isSubfile) {
            const rows = SubfileController.selectAllRowsIncludeTR(sflRecordsContainer);
            rows.forEach((row) => {
                row.addEventListener('mouseover', () => {
                    ContextMenu.collapse(menu);
                    ContextMenu.positionAtRow(menu, row);
                });
            });
        }
        else {
            menu._record = recordEl;
            recordEl.addEventListener('click', () => ContextMenu.collapse(menu) );
        }

        return menu;
    }

    static toggleVisibility(nav) {
        if (!nav) { return; }
        switch (nav.style.display) {
            case '':
            case 'none':
                nav.style.display = 'inline-block';
                break;
            case 'inline-block':
                nav.style.display = 'none';
                break;
        }
    }

    static doActionDescendant(ancestorEl, menuOption) {
        let virtRowCol = menuOption.vRowCol;
        if (menuOption.focusField) {
            const inputs = ancestorEl.querySelectorAll('input[name]:not([type="hidden"])');
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

    static findRelPosition(container, menuData) {
        let result = {};

        const placeHolders = container.querySelectorAll(`div[${AsnaDataAttrName.CONTEXT_MENU}]`);
        if (!placeHolders || !placeHolders.length) { return result; }

        placeHolders.forEach((ph) => {
            if (!Object.keys(result).length) {
                const gridCol = ph.style.gridColumnStart;
                if (gridCol && parseInt(gridCol, 10) === menuData.col) {
                    const rMenu = ph.getBoundingClientRect();
                    result = { l: rMenu.left, t: rMenu.top };
                }
            }
        });

        return result;
    }

    static collapse(menu) {
        const nav = menu.querySelector(MENU_NAV_SELECTOR);
        if (nav) {
            nav.style.display = 'none';
        }
    }

    static positionAtRow(menu, row) {
        const rowRect = row.getBoundingClientRect();
        const lastRow = menu._row;
        menu.style.top = `${rowRect.top}px`;
        menu._row = row;
        if (lastRow) {
            lastRow.classList.remove(EXPO_SUBFILE_CLASS.CANDIDATE_CURRENT_RECORD);
        }
    }
}

const theDropDown = new DropDown();
const theContextMenu = new ContextMenu();
