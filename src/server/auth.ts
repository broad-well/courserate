export default interface Authenticator {
    authenticateForEmailName(token: string): Promise<{email: string, name: string}>;
}