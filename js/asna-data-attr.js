/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { AsnaDataAttrName, JsonAttr };

const AsnaDataAttrName = {
    // 'Div' identification
    ROW: 'data-asna-row',
    RECORD: 'data-asna-record',
    WINDOW: 'data-asna-window',
    EXCLUDE_EMPTY_ROWS: 'data-asna-x-rows',

    // Subfile initialization 
    SFLC: 'data-asna-sflc',

    // Element's click parameters.
    ONCLICK_PUSHKEY: 'data-asna-onclick-pushkey',

    POSITION_CURSOR: 'data-asna-position-cursor',

    // Feeback reporting
    ROWCOL: 'data-asna-rowcol',
    ALIAS: 'data-asna-alias',

    // Dropdown
    VALUES: 'data-asna-values',
    VALUES_TEXT: 'data-asna-values-text',

    // Font/Color manipulation
    STRETCH_ME: 'data-asna-stretch-me',
    REVERSE_IMAGE: 'data-asna-reverse-image',
    UNDERLINE: 'data-asna-underline',

    // Calendar
    CALENDAR_NAMES: 'data-asna-calendar-names',
    CALENDAR_OPTIONS: 'data-asna-calendar-options',
    CALENDAR_INPUT_RANGE_CONSTRAINT: 'data-asna-calendar-range-constraint', // internal

    // Decimal Date (date whose value is a decimal)
    DEC_DATE_OPTIONS: 'data-asna-decdate-options',

    // Menus
    ACTIVEKEY_LOCATION: 'data-asna-activekey-location',

    // Icons
    ICON_ID: 'data-asna-icon-id',
    ICON_INTERNAL_COLOR: 'data-asna-icon-color', // (internal and volatile)
    ICON_INTERNAL_TITLE: 'data-asna-icon-title', // (internal and volatile)

    // Checkboxes
    CHECKBOX_OPTIONS: 'data-asna-checkbox-options',

    // Radio Button group
    RADIO_BUTTON_GROUP_OPTIONS: 'data-asna-radio-group-options',

    // Signature
    SIGNATURE_OPTIONS: 'data-asna-aignature-options',
    SIGNATURE_INTERNAL_NAME: 'data-asna-signature-name', // (internal and volatile)

    // Message related
    VOLATILE_MSG: 'data-asna-volatile-msg',

    // Context menus
    RECORD_CONTEXT_MENUS: 'data-asna-context-menus',    // Excludes subfile controller record.
    CONTEXT_MENU: 'data-asna-content-menu',

    // DecRangeField
    DEC_RANGE_OPTIONS: 'data-asna-decrange-options',

    // Barcode fields
    DETECT_BARCODE: 'data-asna-barcode',

    // Misc
    AUTO_POSTBACK: 'data-asna-autopostback',
    CHECK_MANDATORY: 'data-asna-check-mandatory',
    LEFT_PAD: 'data-asna-leftpad',
    GRID_PANEL_SPAN_STYLE_COL_SPAN: 'data-asna-grid-panel-col-span',
    SFL_END_ADDED_ROW: 'data-asna-sfl-added-row',
    RECORD_ROLLCAP: 'data-asna-roll-capabilities'
}

class JsonAttr {
    static tryParse(jsonStr) {
        let result = {};

        if (jsonStr && typeof jsonStr === 'string') {
            try {
                result = JSON.parse(jsonStr);
            } catch (e) {
                return result;
            }
        }

        return result;
    }
}


