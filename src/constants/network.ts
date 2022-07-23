export const API_HOST: 'localhost' = 'localhost';
export const API_PORT: 4009 = 4009;
export const API_PASSWORD: string = 'change_me'; //Set to empty string ('') to disable endpoints that require a private key (i.e: sending a payment)

//Do not change anything below this comment
export const API_PROTOCOL: 'http' | 'https' = "http";
export const API_URL: string = `${API_PROTOCOL}://${API_HOST}:${API_PORT}/api`;
