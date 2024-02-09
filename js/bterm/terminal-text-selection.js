/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { TextSelect, TEXT_SELECT_MODES, Point };

import { TerminalRender, DATA_ATTR } from './terminal-render.js';
import { BufferMapping } from './buffer-mapping.js'


const TEXT_SELECT_MODES = {
    PASSIVE: '',
    POTENTIAL_SELECTION: 'potential-selection',
    IN_PROGRESS: 'in-progress',
    COMPLETE: 'complete'
};

const _debug = false;
const _debug2 = false;

class TextSelect {
    constructor(selectionElement) {
        this.selectionElement = selectionElement;
        this.reset();
        this.map = null;
    }

    clientPt(termParentEl, devPointerEvent) {
        const clientRect = termParentEl.getBoundingClientRect();
        const clientPoint = new Point(devPointerEvent.clientX - clientRect.left, devPointerEvent.clientY - clientRect.top);
        const target = devPointerEvent.target;
        if (target) {
            const dataRegen = TerminalRender.parseRegenDataAttr(target.getAttribute(DATA_ATTR.REGEN));
            if (dataRegen.len) {
                const sectionRect = target.getBoundingClientRect();
                const textW = sectionRect.width / dataRegen.len;
                const textHitPos = dataRegen.pos + Math.trunc((clientPoint.x - sectionRect.left) / textW);
                return { pt: clientPoint, textHit: true, textW: textW, textHitPos: textHitPos };
            }
        }
        return { pt: clientPoint };
    }

    reset(callerMsg) {
        this.mode = TEXT_SELECT_MODES.PASSIVE;
        this.anchor = null;
        this.selectedCoordRect = null;
        this.hide();
        if (_debug) {
            if (callerMsg) {
                console.log(`TextSelect.Reset .selectedRect = null -- ${callerMsg}`);
            }
            else {
                console.log('TextSelect.Reset .selectedRect = null');
            }
        }
    }

    positionElement(rect, color) {
        if (!this.selectionElement) { return; }

        this.selectionElement.style.position = 'absolute';
        this.selectionElement.style.left = `${rect.l}px`;
        this.selectionElement.style.top = `${rect.t}px`;
        this.selectionElement.style.width = `${rect.w}px`;
        this.selectionElement.style.height = `${rect.h}px`;
        this.selectionElement.style.backgroundColor = color;
    }

    show() {
        if (this.selectionElement && this.selectionElement.style && this.selectionElement.style.display !== 'block') {
            this.selectionElement.style.display = 'block';
        }
    }
    hide() {
        if (this.selectionElement && this.selectionElement.style && this.selectionElement.style.display !== 'none') {
            this.selectionElement.style.display = 'none';
        }
    }

    setPotentialSelection(textPt, _5250cols, hasChinese) {
        this.anchor = textPt;
        this.mode = TEXT_SELECT_MODES.POTENTIAL_SELECTION;
        this.map = new BufferMapping(_5250cols, hasChinese);

        if (_debug) { console.log('TextSelect.setPotentialSelection this.anchor = textPt'); }
    }

    setInProgress() {
        this.mode = TEXT_SELECT_MODES.IN_PROGRESS;
        if (_debug) { console.log('TextSelect.setInProgress'); }
    }
    setComplete() {
        this.mode = TEXT_SELECT_MODES.COMPLETE;
        if (_debug) { console.log('TextSelect.setComplete'); }
    }

    calcRect(clientPt, textCell, regScr) {
        this.selectedCoordRect = this.normalizeCoordRect(this.anchor, clientPt, textCell, regScr);
        return this.selectedCoordRect;
    }

    static meetsMinMovementToStart(textCell, dx, dy) {
        return dx > (textCell.w / 2) || dy > (textCell.h/2);
    }

    normalizeCoordRect(clientPt1, clientPt2, textCell, regScr) {
        const row = TextSelect.pixelToRow(textCell, Math.min(clientPt1.pt.y, clientPt2.pt.y));
        const row2 = TextSelect.pixelToRow(textCell, Math.max(clientPt1.pt.y, clientPt2.pt.y));
        const rows = row2 - row + 1;

        const col = clientPt1.textHit ?
            this.map.colFromPos(clientPt1.textHitPos, regScr.buffer) :
            TextSelect.pixelToCol(textCell, clientPt1.pt.x);
        const col2 = clientPt2.textHit ?
            this.map.colFromPos(clientPt2.textHitPos + 1, regScr.buffer) : // Note: col2 has been incremented by one.
            TextSelect.pixelToCol(textCell, clientPt2.pt.x) + 1;
       
        const fromCol = Math.min(col, col2);
        const toCol = Math.max(col, col2);

        return new CoordRect(row, fromCol, rows, toCol - fromCol);
    }

    static pixelToRow(cursorDim, pixels) {
        return (pixels / cursorDim.h) >> 0; // Integer division
    }

    static pixelToCol(cursorDim, pixels) {
        return (pixels / cursorDim.w) >> 0; // Integer division
    }

    static getRowColFromPixel(cursorDim, point) {
        return {
            row: TextSelect.pixelToRow(cursorDim, point.y),
            col: TextSelect.pixelToCol(cursorDim, point.x)
        };
    }

    static log(s) {
        if (!_debug) { return; }
        console.log(s);
    }

    currentModeString() {
        switch(this.mode)
        {
            case TEXT_SELECT_MODES.PASSIVE:
                return 'PASSIVE';
            case TEXT_SELECT_MODES.POTENTIAL_SELECTION:
                return 'POTENTIAL_SELECTION';
            case TEXT_SELECT_MODES.IN_PROGRESS:
                return 'IN_PROGRESS';
            case TEXT_SELECT_MODES.COMPLETE:
                return 'COMPLETE';
        }

        return 'Undefined!!!';
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class CoordRect {
    constructor(row,col,rows,cols) {
        this.row = row;
        this.col = col;
        this.rows = rows;
        this.cols = cols;
    }
}