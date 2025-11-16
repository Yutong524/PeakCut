import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';

export async function getCurrentSession() {
    return getServerSession(authOptions);
}

export async function requireUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
    }
    return session.user;
}
