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
    let only_fulltext = false;

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
    if (request && requestJSON.only_fulltext) {
	only_fulltext = requestJSON.only_fulltext;
    }
    let searchTerm = request.searchTerm;
    if (!searchTerm) {
        searchTerm = "The man";
    }

    // SearchCardQueryResponseBody
    // {
    //    "score_cards": [
    //       {
    //          "metadata": [
    //             "card_html": "string",
    //             "content": "string",
    //             ...
    //          ]
    //          "score": 0.0,
    //       }
    //    ],
    //    "total_card_pages": 0
    //  }
    //
    // SearchCardData
    let full_url = `${url}/card/search/1`;
    if (url.includes("trieve")) {
        full_url = `${url}/chunk/search`;
    }
    let times = {}
    let timings = {}

    let semantic_search, fulltextsearch, hybrid_search, group_search;
    if (!only_fulltext) {
	    try {
		const start = Date.now();
		semantic_search = await fetch(full_url, {
		    method: 'POST',
		    headers: {
			"Content-Type": 'application/json',
			"Authorization": api_key,
			"TR-Dataset": dataset_id,
			"TR-Organization": organization_id,
		    },
		    credentials: 'include',
		    body: JSON.stringify({
			"query": searchTerm,
			"search_type": "semantic",
		    })
		});
		times["Semantic"] = (Date.now() - start)
	    } catch (e) {
		semantic_search = null;
	    }
    }

    try {
        const start = Date.now();
        fulltextsearch = await fetch(full_url, {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
                "Authorization": api_key,
                "TR-Dataset": dataset_id,
		"TR-Organization": organization_id,
            },
            credentials: 'include',
            body: JSON.stringify({
                "query": searchTerm,
                "search_type": "fulltext",
            })
        });
        times["Full Text"] = (Date.now() - start)
    } catch (e) {
        fulltextsearch = null;
    }

    if (!only_fulltext) {
	    try {
		const start = Date.now();
		hybrid_search = await fetch(full_url, {
		    method: 'POST',
		    headers: {
			"Content-Type": 'application/json',
			"Authorization": api_key,
			"TR-Dataset": dataset_id,
		        "TR-Organization": organization_id,
		    },
		    credentials: 'include',
		    body: JSON.stringify({
			"query": searchTerm,
			"search_type": "hybrid",
		    })
		})
		times["Hybrid"] = (Date.now() - start)
	    } catch (e) {
		hybrid_search = null;
	    }
    }

    try {
        const start = Date.now();
        group_search = await fetch(`${url}/chunk_group/group_oriented_search`, {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
                "Authorization": api_key,
                "TR-Dataset": dataset_id,
		"TR-Organization": organization_id,
            },
            credentials: 'include',
            body: JSON.stringify({
                "query": searchTerm,
                "search_type": "fulltext",
            })
        });
        times["Group Oriented Search"] = (Date.now() - start)
    } catch (e) {
        group_search = null;
    }
    let healthy = true;

    let results = {
        "Semantic": semantic_search,
        "Full Text": fulltextsearch,
        "Hybrid": hybrid_search,
        "Group Oriented Search": group_search,
    }

    let status = {
        "Semantic": "Fetch failed",
        "Full Text": "Fetch failed",
        "Hybrid": "Fetch failed",
        "Group Oriented Search": "Fetch failed"
    }

    let responses = {
    }

    let cardCounts = {
    };
    let checksPassed = 0;
    for (let [key, value] of Object.entries(results)) {
	if (key == "Semantic" && only_fulltext) {
	    continue;
	}
	if (key == "Hybrid" && only_fulltext) {
	    continue;
	}
        if (!value) {
            healthy = false;
            continue;
        }
        if (value.status !== 200) {
            healthy = false;
            status[key] = statusCodeResponseTypes[value.status];
            if (value.status === 400) {
                responses[key] = await value.text();
            }
            continue;
        }

        status[key] = statusCodeResponseTypes[value.status];
        timings[key] = value.headers.get("Server-Timing")
        let json = await value.json();
        if (!json) continue;
        responses[key] = json;
        if (json.results) {
            cardCounts[key] = json.results.length;
        } else if (json.chunks) {
            cardCounts[key] = json.chunks.length;
        }

        if (cardCounts[key] === 0) {
            healthy = false;
            status[key] = "No cards found"
            continue;
        };
        checksPassed++;
        responses[key] = null;
    }

    return new Response(JSON.stringify({
        "healthy": healthy,
        "times": times,
        "checksPassed": checksPassed,
        "status": status,
        "cardCounts": cardCounts,
        "responses": responses,
        "timings": timings
    }));
}
