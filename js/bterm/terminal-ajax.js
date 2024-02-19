/*
 * Copyright (c) ASNA, Inc. and its affiliates.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { AjaxRequest };

import { Fetch } from '../ajax/ajax-fetch.js';

const AJAX_RESPONSE_TIMEOUT = 5 * 60 * 1000; // Milliseconds
const SESSION_EXPIRED_PAGE_REL_HREF = '../../Monarch/ExpiredSession';

let _ajaxError = false;

class AjaxRequest {
    static sendRequest(aidKey, encRequest, telnetFlags, dupFields, handleAjaxResponseEvent) {

        const data = {
            action: 'get5250',
            recordName: '',
            requestorAidKey: aidKey,
            from: 0,
            to: 0,
            mode: '',
            encodedRequest: encRequest,
            telnetFlags: telnetFlags,
            dupFields: dupFields,

        };

        Fetch.fetchWithTimeout(decodeURI(document.URL), data, AJAX_RESPONSE_TIMEOUT)
            .then((response) => {
                response.json().then(function (jsonStr) {
                    handleAjaxResponseEvent(jsonStr);
                }).catch(function (err) {
                    console.error(`JSON decode error:${err}`);
                    _ajaxError = true;
                    window.location = SESSION_EXPIRED_PAGE_REL_HREF;
                });
            }).catch(function (err) {
                console.error(`Fetch failed error:${err}`);
            }
        );
    }

    static isAjaxError() {
        return _ajaxError;
    }
}


