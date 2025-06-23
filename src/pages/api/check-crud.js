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

    const resp = await fetch(`${url}/api/chunk`, {
	method: "POST",
	headers: {
	    "Content-Type": 'application/json',
	    "Authorization": api_key,
	    "TR-organization-id": organization_id,
	    "TR-dataset-id": dataset_id
	}
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const resp2 = await fetch(`${url}/api/chunk/${resp.id}`, {
	method: "DELETE",
	headers: {
	    "Content-Type": 'application/json',
	    "Authorization": api_key,
	    "TR-Organization": organization_id,
	    "TR-Dataset": dataset_id
	},
	body: JSON.stringify({
	    "traking_id": resp.tracking_id
	})
    });

    return new Response(JSON.stringify({
	"ok": true
    }));
}
