/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { theLetterSpacing as LetterSpacing };

class LetterSpacing {
    computeForElement(el, gridColWidth) {
        let measureEl = document.createElement(el.tagName);

        measureEl.style.position = 'absolute';
        measureEl.style.visibility = 'hidden';
        measureEl.style.width = 'auto';
        measureEl.style.height = 'auto';
        measureEl.style.overflow = 'visible';
        measureEl.style.margin = '0px';
        measureEl.style.padding = '0px';
        measureEl.style.border = '0px';
        measureEl.style.fontWeight = getComputedStyle(el).getPropertyValue('font-weight');
        measureEl.style.fontFamily = getComputedStyle(el).getPropertyValue('font-family');

        let text = el.textContent; // .innerText;
        let textLen = text.length;

        text = text.replace(/'\u00A0'/g, ' ');

        measureEl.innerHTML = text;

        document.body.appendChild(measureEl);

        let width = measureEl.getBoundingClientRect().width + 2;

        document.body.removeChild(measureEl);

        let additionalSpacing = textLen * gridColWidth - Math.trunc(width);
        if (additionalSpacing < 0) {
            return 0;
        }

        return (1 + (additionalSpacing / textLen)) + 'px';
    }
}

const theLetterSpacing = new LetterSpacing();

