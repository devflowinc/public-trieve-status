
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
        datasets.id as dataset_id,
        datasets.name as dataset_name,
        organizations.name as organization_name,
        MAX(dataset_usage_counts.chunk_count) as chunk_count,
        MAX(dataset_group_counts.group_count) as group_count,
        COUNT(dataset_tags) as tag_count,
        datasets.created_at as dataset_created,
        datasets.updated_at as dataset_updated
        FROM datasets
        INNER JOIN dataset_tags on dataset_tags.dataset_id = datasets.id
        INNER JOIN organizations on organizations.id = datasets.organization_id
        INNER JOIN dataset_usage_counts on datasets.id = dataset_usage_counts.dataset_id
        INNER JOIN dataset_group_counts on dataset_group_counts.dataset_id = datasets.id
        GROUP BY datasets.id, organizations.id
        ORDER by dataset_updated ASC, chunk_count DESC
    `)

    console.log(res.rows) // Hello world!
    await client.end()

    let texts = "dataset_id, dataset_name, organization_name, chunk_count, group_count, tag_count, dataset_created, dataset_updated \n";
    for (let i = 0; i < res.rows.length; i++) {
        let row = res.rows[i];

        texts += `${row.dataset_id}, ${row.dataset_name}, ${row.organization_name}, ${row.chunk_count}, ${row.group_count}, ${row.tag_count}, ${row.dataset_created}, ${row.dataset_updated}\n`
    }

    return new Response(texts);
}
