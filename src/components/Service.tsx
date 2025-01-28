import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { SLOS } from '../services.json';
import type { HealthCheckResponse, ServerSpec } from "./Services";
import { FiChevronDown, FiChevronUp, FiRefreshCw } from "solid-icons/fi";

interface ServiceProps {
    service: ServerSpec,
    healthChecks: HealthCheckResponse,
    dropdown: boolean,
    refetch: () => void,
    setDropdown: (value: boolean) => void
}

export const Service = (props: ServiceProps) => {
    let totalCards = createMemo(() => {
        return props.healthChecks.cardCounts != null ? Object.values(props.healthChecks.cardCounts).reduce((a, b) => a + b, 0) : 0
    });

    return (
        <div>
            <div class="flex justify-between px-4 py-3 items-center text-alabaster bg-[rgb(28,25,31)] rounded-lg">
                <div class="flex justify-between items-center space-x-3">
                    <div classList={{
                        "rounded-full w-3 h-3": true,
                        "bg-[rgb(147,51,234)] animate-pulse": props.healthChecks.healthy == true,
                        "bg-neutral-300 animate-ping": props.healthChecks.healthy == null,
                        "bg-red-500 animate-ping": props.healthChecks.healthy == false,
                    }}>
                    </div>
                    <div>
                        <div class="text-xs font-light text-zinc-400"> {props.service.url} </div>
                        <div class="flex items-baseline space-x-2">
                            <p class="text-lg font-medium"> {props.service.name} </p>
                            <p class="text-xs">
                                Checks passed {props.healthChecks.checksPassed} / 4
                            </p>
                        </div>
                    </div>
                    <Show when={props.healthChecks.healthy == false}>
                        ❗❗❗
                    </Show>
                </div>
                <div class="flex items-center space-x-2">
                    <FiRefreshCw onClick={() => { props.refetch() }} class="text-purple-400 w-6 h-6" />
                    <Show when={props.dropdown}>
                        <FiChevronUp onClick={
                            () => {
                                console.log("click")
                                props.setDropdown(!props.dropdown)
                            }

                        }
                            class="text-shark-100 w-6 h-6" />
                    </Show>
                    <Show when={!props.dropdown}>
                        <FiChevronDown onClick={
                            () => {
                                console.log("click")
                                props.setDropdown(!props.dropdown)
                            }

                        }
                            class="text-shark-100 w-6 h-6" />
                    </Show>
                </div>
            </div>
            <Show when={props.dropdown}>
                <div class="flex flex-col space-y-1 mt-1">
                    <Show when={props.healthChecks.status != null}>
                        <For each={Object.keys(props.healthChecks.status!)}>
                            {(status) => {
                                return (
                                    <div class="overflow-hidden justify-between px-4 py-3 ml-10 items-center text-alabaster bg-zinc-900 rounded-lg"
                                        classList={{
                                            "transform scale-y-100 opacity-100 max-h-[1000px]": props.dropdown,
                                            "transform scale-y-0 opacity-0 max-h-0": !props.dropdown
                                        }}
                                    >
                                        <div class="flex items-baseline justify-between">
                                            <div class="text-lg font-normal">
                                                {status}
                                            </div>
                                            <div classList={{
                                                "text-sm text-zinc-400": true,
                                                "text-bold text-red-400": SLOS[status] < props.healthChecks.times![status]
                                            }}>
                                                <Show when={SLOS[status] < props.healthChecks.times![status]}>
                                                    ❗
                                                </Show>
                                                {props.healthChecks.times![status]} milliseconds
                                                <Show when={SLOS[status] < props.healthChecks.times![status]}>
                                                    ❗
                                                </Show>
                                            </div>
                                        </div>
                                        <div class="text-sm text-purple-300">
                                            {props.healthChecks.status![status]}
                                        </div>
                                        <Show when={props.healthChecks.responses != null}>
                                            <div class="text-sm">
                                                {props.healthChecks.responses[status]}
                                            </div>
                                        </Show>
                                        <div class="text-xs text-purple-400">
                                            {
                                                ...props.healthChecks.timings![status]?.split(",").map((s) => s.split(";dur=")).map((arr) => { return `${arr[0]} ${arr[1]} ms` }).map((a) => {
                                                    return (<div>
                                                        {a}
                                                    </div>)
                                                }
                                                )
                                            }
                                        </div>
                                    </div>
                                );
                            }}
                        </For>
                    </Show>
                </div>
            </Show>
        </div>
    )
}
