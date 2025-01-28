

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
     
    const res = await client.query(`
        SELECT 
        organizations.id as organization_id,
        organizations.name as organization_name,
        COUNT(users) as users_count,
        organizations.created_at,
        MAX(stripe_plans.name) as plan,
        ARRAY_AGG(users.email) as emails,
        ARRAY_AGG(users.name) as user_names
        from organizations
        INNER JOIN user_organizations on user_organizations.organization_id = organizations.id
        INNER JOIN users on user_organizations.user_id = users.id
        left JOIN stripe_subscriptions on stripe_subscriptions.organization_id = organizations.id
        left join stripe_plans on stripe_subscriptions.plan_id = stripe_plans.id
        group by organizations.id
        ORDER BY organizations.created_at DESC
    `)

    console.log(res.rows) // Hello world!
    await client.end()

    let texts = "organization_id, organization_name, users_count, created_at, plan, emails, user_names\n";
    for (let i = 0; i < res.rows.length; i++) {
        let row = res.rows[i];

        texts += `${row.organization_id}, ${row.organization_name}, ${row.users_count}, ${row.created_at}, ${row.plan}, ${row.emails}, ${row.user_names}\n`
    }

    return new Response(texts);
}
