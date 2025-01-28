import pg from 'pg'
import { auth, databaseURI } from '../../services.json';
const {username, password} = auth;

export const GET = async ({ request, url }) => {
    let params = url.searchParams;
    if (params.get("username") != username || params.get("password") != password) {
        return new Response("")
    }

    const client = new pg.Client({
      connectionString: databaseURI,
    })

    await client.connect()
     
    const res = await client.query('SELECT * from users ORDER BY CREATED_AT DESC')
    console.log(res.rows) // Hello world!
    await client.end()

    let texts = "email, name, created_at \n";
    for (let i = 0; i < res.rows.length; i++) {
        let row = res.rows[i];

        texts += `${row.email}, ${row.name}, ${row.created_at}\n`
    }

    return new Response(texts);
}
