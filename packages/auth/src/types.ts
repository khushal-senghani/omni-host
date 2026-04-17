export interface TokenPayload {
    id: string;
    email: string;
    role: 'owner';
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}