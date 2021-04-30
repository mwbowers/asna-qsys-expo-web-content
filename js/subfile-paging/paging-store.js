/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { theSubfilePagingStore as SubfilePagingStore, SubfileState, InputState };

import { Subfile } from './dom-init.js';

const CLASS_GRID_ROW = 'dds-grid-row';
const CLASS_GRID_EMPTY_ROW = 'dds-grid-empty-row';

class SubfilePagingStore {
    constructor() {
        this.sflCtrlStorage = [];
    }

    register(sflCtrlInitData) {
        if (sflCtrlInitData.name) {
            sflCtrlInitData.current = { topRrn: sflCtrlInitData.sflRecords.from }; // Augment init data with current top-rrn
            return this.sflCtrlStorage[sflCtrlInitData.name] = sflCtrlInitData; // Note: JSON defined in ASNA.QSys.Expo.Tags.DdsSubfileControlTagHelper.ClientInitData class
        }
    }


    getSflCtlStore(name) {
        return this.sflCtrlStorage[name]
    }

    getSflCtlStoreNames() {
        let names = [];

        for (let key in this.sflCtrlStorage) {
            names.push(key);
        }

        return names;
    }
}

class InputState {
    constructor(isCheckbox, val, checked) {
        this.isCheckbox = isCheckbox;
        if (this.isCheckbox) {
            this.checked = checked;
        } else {
            this.value = val;
        }
    }
}

class SubfileState {

    static getInputStateChange(newStateHash, key, initial, current) {
        let initialInputState = initial[key];
        let currentInputState = current[key];

        if (!(currentInputState instanceof InputState) || !(initialInputState instanceof InputState)) {
            return;
        }

        if (currentInputState.isCheckbox) {
            if (currentInputState.checked !== initialInputState.checked) {
                newStateHash[key] = currentInputState;
            }
        }
        else if (currentInputState.value !== initialInputState.value) {
            newStateHash[key] = currentInputState;
        }
    }

    static getPageInputStateChanges(initialPageState, currentPageState) {
        let result = [];

        if (initialPageState.length !== currentPageState.length) { return result;  }

        // Note: row hiddenState is not compared.
        for (let row = 0, l = initialPageState.length; row < l; row++) {
            const initialRowState = initialPageState[row];
            const currentRowState = currentPageState[row];
            let rowChanges = [];
            for (let key in initialRowState.state) {
                SubfileState.getInputStateChange(rowChanges, key, initialRowState.state, currentRowState.state);
            }
            if (Object.keys(rowChanges).length>0) {
                result.push({ hiddenState: initialRowState.hiddenState, state: rowChanges });
            }
        }

        return result;
    }

    static mergeInputState(sflEdits, newEdits) {
        let mergedEdits = [];
        let usedKeys = [];

        for (let i = 0, l = sflEdits.length; i < l; i++) {
            const currentRow = sflEdits[i];
            const mergedRow = { hiddenState: currentRow.hiddenState, state: []};

            for (let key in currentRow.state) {
                if (newEdits[key] instanceof InputState) {
                    SubfileState.getInputStateChange(mergedRow.state, key, currentRow.state, newEdits);
                }
                else {
                    mergedRow.state[key] = currentRow.state[key];
                }

                usedKeys[key] = true;
            }

            mergedEdits.push(mergedRow);
        }

        for (let i = 0, l = newEdits.length; i < l; i++) {
            const newEditRow = newEdits[i];
            for (let key in newEditRow.state) {
                if (!usedKeys[key]) {
                    mergedEdits.push(newEditRow);
                }
            }
        }

        return mergedEdits;
    }

    static rememberPageState(sflEl) {
        if (!sflEl) { return []; }
        const gridRows = sflEl.querySelectorAll(`div[class~="${CLASS_GRID_ROW}"]`);
        if (gridRows.length === 0) { return []; }

        const sflState = [];
        for (let row = 0, l = gridRows.length; row < l; row++) {
            const divRow = gridRows[row];
            const rowState = { hiddenState: [], state: [] };
            if (divRow.parentElement) {
                const hiddenList = divRow.parentElement.querySelectorAll('input[type="hidden"]');
                for (let h = 0, lh = hiddenList.length; h < lh; h++) {
                    Subfile.addInputState(rowState.hiddenState, hiddenList[h]);
                }
            }

            const notHiddenInput = divRow.querySelectorAll('input:not([type="hidden"])');

            for (let i = 0, li = notHiddenInput.length; i < li; i++) {
                Subfile.addInputState(rowState.state, notHiddenInput[i]);
            }

            sflState.push(rowState);
        }

        return sflState;
    }

    static RestoreInputChanges(sflEl, edits) {
        for (let i = 0, l = edits.length; i < l; i++) {
            for (let key in edits[i].state) {
                Subfile.restoreEdit(sflEl, key, edits[i].state[key]);
            }
        }
    }
}

const theSubfilePagingStore = new SubfilePagingStore();
