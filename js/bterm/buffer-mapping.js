/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { BufferMapping };

import { TerminalDOM } from './terminal-dom.js';
import { DBCS } from './terminal-dbcs.js';

class BufferMapping {
    constructor(_5250cols, hasChinese) {
        this._5250cols = _5250cols;
        this.hasChinese = hasChinese;
    }
    coordToPos(row, col) {
        return col + row * this._5250cols;
    }

    rowFromPos(pos) {
        return pos / this._5250cols >> 0;  // Integer division  
    }

    colFromPos(pos, regBuffer) {
        if (!this.hasChinese || !regBuffer) {
            return pos % this._5250cols >> 0; // Integer modulo
        }

        const initialPos = this.rowFromPos(pos) * this._5250cols;
        let col = 0;
        for (let i = initialPos; i < pos && i < regBuffer.length; i++) {
            col += DBCS.isChinese(regBuffer[i]) ? 2 : 1;
        }

        return col;
    }
    static rowToPixel(row, termLayout) {
        return row * parseFloat(TerminalDOM.getGlobalVarValue('--term-row-height'));
    }
    static colToPixel(col, termLayout) {
        return col * parseFloat(TerminalDOM.getGlobalVarValue('--term-col-width'));
    }
}

