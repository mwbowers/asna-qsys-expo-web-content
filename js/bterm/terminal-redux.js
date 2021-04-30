export { CreateStore, StateChangeActionType, StatePropertyInfo, JsonUtil };

const StateChangeActionType = {
    COLOR_CHANGE: 'color-change',
    RESTORE_DEFAULT_COLORS: 'restore-default-colors',
    TOGGLE_SWITCH_STATE_CHANGE: 'toggle-switch-state-change',
    LOCATION_CHANGE: 'location-change'
};

const _debug = false; // true;

class CreateStore {
    constructor(reducer) {
        this.reducer = reducer;
        this.state = reducer(undefined, { type: '' } );

        if (_debug) { this.dumpState('initial'); }
    }

    subscribe(listener) {
        this.listener = listener;
    }

    dispatch(action) {
        const lastState = this.state;
        this.state = this.reducer(lastState, action);

        if (_debug) { this.dumpState(action.type); }

        if (this.listener) {
            this.listener(lastState);
        }
    }

    dumpState(label) {
        console.log(`[${new Date().toLocaleTimeString('en-US')}] State: (${label})`);
        console.log(`${JSON.stringify(this.state) }`);
    }

}

class StatePropertyInfo {
    static didChange(last, current) {
        /*eslint-disable*/
        return last != current;  // Note: use single equal sign!
        /*eslint-enable*/
    }
}

class JsonUtil {
    static duplicateObject(o) {
        const s = JSON.stringify(o);
        return JSON.parse(s);
    }
    static equivalent(a, b) {
        const aS = JSON.stringify(a);
        const bS = JSON.stringify(b);

        return aS === bS;
    }
}