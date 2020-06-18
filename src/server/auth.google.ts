import Authenticator from './auth';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = '938003961167-i6pfeu8n7acup9h26sk3mik23bm3q9ok.apps.googleusercontent.com';

export default class GoogleAuth implements Authenticator {
    private client: OAuth2Client;

    constructor() {
        this.client = new OAuth2Client(CLIENT_ID);
    }

    async authenticateForEmailName(token: string): Promise<{ email: string; name: string; }> {
        const ticket = await this.client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        const payload = ticket.getPayload();
        
        if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload['iss'])) {
            throw new Error('Wrong issuer');
        }
        return {email: payload.email!, name: payload.name!};
    }
}