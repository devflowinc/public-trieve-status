const statusCodeResponseTypes = {
    400: "400 Bad Request",
    401: "401 Unauthorized",
    405: "405 Method Not Allowed",
    500: "500 Internal Server Error",
    502: "502 Bad Gateway",
    503: "503 Service Unavailable",
    408: "408 Request Timeout",
    200: "200 OK",
}

export const POST = async ({ request }) => {
    let api_key;
    let dataset_id;
    let organization_id;

    try {
        const requestJSON = await request.json();
        let url = requestJSON.url;
        if (request && requestJSON.api_key) {
            api_key = requestJSON.api_key;
        };
        if (request && requestJSON.organization_id) {
            organization_id = requestJSON.organization_id;
        };
        if (request && requestJSON.dataset_id) {
            dataset_id = requestJSON.dataset_id;
        }

        const resp = await fetch(`${url}/chunk`, {
            method: "POST",
            headers: {
                "Content-Type": 'application/json',
                "Authorization": "Bearer " + api_key,
                "TR-organization": organization_id,
                "TR-dataset": dataset_id
            },
            body: JSON.stringify({
                "chunk_html": "Hi there bro"
            })
        });

        if (resp.status !== 200) {
            console.log(resp);
            return new Response(JSON.stringify({
                error: statusCodeResponseTypes[resp.status] || `${resp.status} Error`
            }), {
                status: resp.status,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        const chunkData = await resp.json();
        console.log(chunkData);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const resp2 = await fetch(`${url}/chunk/${chunkData.chunk_metadata.id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": 'application/json',
                "Authorization": api_key,
                "TR-Organization": organization_id,
                "TR-Dataset": dataset_id
            },
        });

        if (resp2.status !== 204) {
            return new Response(JSON.stringify({
                error: statusCodeResponseTypes[resp2.status] || `${resp2.status} Error`,
            }), {
                status: resp2.status,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        return new Response(JSON.stringify({
            "ok": true
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: "500 Internal Server Error",
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
