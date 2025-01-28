import pg from 'pg'
import { auth, databaseURI } from '../../services.json';
const {username, password} = auth;

export const GET = async ({ url }) => {
    let params = url.searchParams;

    if (params.get("username") != username || params.get("password") != password) {
        return new Response("")
    }

    const client = new pg.Client({
        connectionString: databaseURI,
    })

    await client.connect()

    const res = await client.query('SELECT count(*) from users')
    await client.end()

    return new Response(JSON.stringify(
        res.rows[0]
    ));
}
