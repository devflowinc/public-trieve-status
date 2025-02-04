import { createClient } from 'redis';

export const POST = async ({ request }) => {
    const requestJSON = await request.json();

    const client = await createClient({
      url: requestJSON.uri
    })
    .connect();

    let length = -1;
    let dataset_info = null;

    if (requestJSON.command && requestJSON.command === "fair") {
        dataset_info = []
        let keys_global = `${requestJSON.queue}_*_queue`;
        if ("processing" in requestJSON.queue) {
            keys_global = `${requestJSON.queue}_*_processing`;
        }
        if ("dead_letters" in requestJSON.queue) {
            keys_global = `${requestJSON.queue}_*_failed`;
        }
        const dataset_keys = await client.KEYS(keys_global);
        for (let dataset of dataset_keys) {
            const dataset_length = await client.ZCARD(dataset);
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
