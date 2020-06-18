import { writable } from 'svelte/store';
import { get as httpGet } from '../transport';

export const state = writable({
    me: undefined
}, (set) => {
    httpGet('/api/me')
        .then(me => {
            set({ me });
        })
        .catch(err => {});
});