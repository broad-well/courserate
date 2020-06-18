async function handleError(response) {
    if (!response.ok) {
        const message = (await response.json())['message'];
        alert(message);
        throw new Error(message);
    }
    return await response.json();
}

const defaultFetchOptions = {
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json'
    }
};

export async function post(endpoint, data) {
    return fetch(endpoint, {...defaultFetchOptions, body: JSON.stringify(data), method: 'POST'})
        .then(handleError);
}

export async function get(endpoint, params) {
    const paramString = params == undefined ? '' : Object.keys(params)
        .map(key => [key, params[key]].map(encodeURIComponent).join('='))
        .join('&');
    
    return fetch(`${endpoint}?${paramString}`, {...defaultFetchOptions}).then(handleError);
}