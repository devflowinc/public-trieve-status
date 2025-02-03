import { createClient } from 'redis';

export const POST = async ({ request }) => {
    const requestJSON = await request.json();

    const client = await createClient({
      url: requestJSON.uri
    })
    .connect();

    let length = -1;
    let numberDatasets = null;
    let dataset_info = null;

    if (requestJSON.command && requestJSON.command === "fair") {
        dataset_info = []
        const datasets = await client.SMEMBERS(`${requestJSON.queue}_fairness_set`);
        numberDatasets = datasets.length;
        for (let dataset of datasets) {
            const dataset_length = await client.ZCARD(`${requestJSON.queue}_${dataset}_queue`);
            length += dataset_length;
            dataset_info.push({
                dataset_length: dataset_length,
                dataset_id: dataset
            });
        }
    } else if (requestJSON.command && requestJSON.command === "scard") {
        length = await client.SCARD(requestJSON.queue);
    } else {
        length = await client.LLEN(requestJSON.queue);
    }

    await client.disconnect();

    return new Response(JSON.stringify({
        length: length,
        dataset_info: dataset_info
    }));
}
