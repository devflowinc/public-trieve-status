import { createClient } from 'redis';

export const POST = async ({ request }) => {
    const requestJSON = await request.json();

    const client = await createClient({
      url: requestJSON.uri
    })
    .connect();

    let length = -1;

    if (requestJSON.command && requestJSON.command === "scard") {
        length = await client.SCARD(requestJSON.queue);
    } else {
        length = await client.LLEN(requestJSON.queue);
    }

    await client.disconnect();

    return new Response(JSON.stringify({
        length: length
    }));
}
