import { createSignal, For, createEffect } from "solid-js";
import { Service } from "./Service";
import { Ingestions } from "./Ingestions";

export interface ServerSpec {
    name: string,
    url: string,
    api_key?: string,
}

export interface ServicesProps {
    services: ServerSpec[],
}

export interface HealthCheckResponse {
    healthy: boolean | null,
    status: [string: string] | null,
    responses: [string: string] | null,
    cardCounts?: [string: number] | null,
    checksPassed: number,
    times?: [string: number] | null,
    timings: [string | null] | null,
}

export const Services = (props: { services: ServerSpec[] }) => {
    const dropdowns = props.services.map((_) => createSignal(false));
    const healthChecks = props.services.map(
        () => createSignal<HealthCheckResponse>({
            healthy: null,
            status: null,
            checksPassed: 0,
            responses: null,
            timings: null
        })
    );

    const collapseAll = () => {
        dropdowns.forEach((dropdown) => {
            dropdown[1](false);
        })
    }
    const expandAll = () => {
        dropdowns.forEach((dropdown) => {
            dropdown[1](true);
        })
    }

    // Fetch health checks every minute
    createEffect(() => {
        checkHealth();
        const interval = setInterval(() => {
            checkHealth();
        }, 60000);
        return () => clearInterval(interval);
    });


    const checkHealth = async () => {
        props.services.forEach((service, i) => {
            fetch("/api/checkhealth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(service)
            }).then((resp) => {
                return resp.json()
            }).then((data) => {
                //@ts-ignore
                console.log(data)
                healthChecks[i][1](data);
            })
        })
    }

    const checkOneHealth = async (i: number) => {
        healthChecks[i][1]({
            healthy: null,
            status: null,
            checksPassed: 0,
            responses: null,
            timings: null
        });
        fetch("/api/checkhealth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(props.services[i])
        }).then((resp) => {
            return resp.json()
        }).then((data) => {
            console.log(data);
            //@ts-ignore
            healthChecks[i][1](data);
        })
    }

    return (
        <div class="flex flex-col space-y-2">
            <div class="flex space-x-2">
                <button onClick={() => { collapseAll() }} class="px-3 py-2 bg-purple-600 w-fit hover:bg-purple-700 rounded-lg">
                    Collapse All
                </button>
                <button onClick={() => { expandAll() }} class="px-3 py-2 border border-purple-600 text-purple-600 hover:bg-purple-600/10 w-fit rounded-lg">
                    Expand All
                </button>
            </div>
            <For each={props.services}>
                {(service: ServerSpec, i) => {
                    return (
                        <Service
                            healthChecks={healthChecks[i()][0]()}
                            refetch={() => { checkOneHealth(i()) }}
                            service={service}
                            dropdown={dropdowns[i()][0]()}
                            setDropdown={dropdowns[i()][1]}
                        />
                    )
                }}
            </For>
            <div>
                <p class="text-2xl">Ingestion Queues</p>
                <Ingestions />
            </div>
        </div>
    )
}
