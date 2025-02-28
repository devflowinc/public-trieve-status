import { For, Show, createEffect, createSignal } from "solid-js";
import { ingest, refresh } from '../services.json';
import type { IngestResponse } from "../pages/api/checkingest";

export type DatasetInfo = {
    dataset_length: number;
    dataset_id: string;
}

export const Ingestions = () => {
    const queueLengths = ingest.map((_) => createSignal(0))
    const diffs = ingest.map((_) => createSignal(0));
    const timer = refresh.ingest ?? 1000;

    const numAverages = ingest.map((_) => createSignal(0));
    const totalOfDiffs = ingest.map((_) => createSignal(0));

    const datasetInfo = ingest.map((_) => createSignal<null | DatasetInfo[]>(null));


    const checkIngest = () => {

        ingest.forEach((q, i) => {
            fetch("/api/checkingest", {
                method: "POST",
                body: JSON.stringify(q)
            }).then((resp) => {
                return resp.json()
            }).then((data: IngestResponse) => {
                numAverages[i][1]((prev) => prev + 1);

                const previous = queueLengths[i][0]();
                const current = data.length;
                const diff = current - previous;
                if (previous == 0) {
                    totalOfDiffs[i][1](0);
                } else {
                    totalOfDiffs[i][1]((prev) => diff + prev);
                }

                queueLengths[i][1](data.length);
                diffs[i][1](diff);

                if (data.dataset_info) {
                    datasetInfo[i][1](data.dataset_info);
                }
            })
        });
    }

    createEffect(() => {
        checkIngest();
        const interval = setInterval(() => {
            checkIngest();
        }, timer);
        return () => clearInterval(interval);
    });


    return (
        <For each={ingest}>
            {(q, i) => {
                return (<div class="px-4 py-3 my-3 bg-[rgb(28,25,31)] items-center text-alabaster rounded-lg">
                    <div class="text-lg flex justify-end">
                        <div class="flex items-center w-full space-x-2 space-y-4">
                            <div class="flex flex-col items-center w-full">
                                <Show when={datasetInfo[i()][0]()?.length}>
                                    <div class="w-full">
                                        Fair Queue with {datasetInfo[i()][0]()?.length} Dataset(s): 
                                    </div>
                                </Show>
                                <div class="flex w-full space-x-1">
                                    <div class="text-sm font-medium">
                                        Backlog: 
                                    </div>
                                    <div class="text-sm font-normal">{Number(queueLengths[i()][0]()).toLocaleString()} {" "}</div>
                                    <div class="text-sm font-light">
                                        Batches
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="text-small font-normal w-full"> {q.name} </div>
                    </div>
                    <div class="flex space-x-4 items-baseline">
                        <div classList={{
                            "text-[rgb(147,51,234)]": diffs[i()][0]() > 0,
                            "text-red-500": diffs[i()][0]() < 0,
                            "text-xs": true
                        }}>
                            <Show when={diffs[i()][0]() > 0}>
                                +
                            </Show>
                            {Number(diffs[i()][0]()).toLocaleString()}
                        </div>
                        <div classList={{
                            "bg-[rgb(147,51,234)]": totalOfDiffs[i()][0]() / (numAverages[i()][0]() - 1) > 0,
                            "text-red-500": totalOfDiffs[i()][0]() / (numAverages[i()][0]() - 1) < 0,
                            "text-xl": true
                        }}>
                            <Show when={totalOfDiffs[i()][0]() / (numAverages[i()][0]() - 1) > 0}>
                                +
                            </Show>
                            {Number(totalOfDiffs[i()][0]() / (numAverages[i()][0]() - 1)).toLocaleString()}{" "}/ {timer} <span class="text-sm"> msec </span>
                        </div>
                    </div>
                    <div class="w-full bg-shark-300 rounded-md">
                        <div class="h-2 bg-[rgb(147,51,234)] rounded-md" style={{ width: `${Math.min(queueLengths[i()][0]() / q.max * 100, 100)}%` }}>
                        </div>
                    </div>
                </div>);
            }}
        </For>
    )
}
