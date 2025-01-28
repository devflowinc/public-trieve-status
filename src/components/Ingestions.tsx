import { For, Show, createEffect, createSignal } from "solid-js";
import { ingest, refresh } from '../services.json';

export const Ingestions = () => {
    const queueLengths = ingest.map((_) => createSignal(0))
    const diffs = ingest.map((_) => createSignal(0));
    const rates = ingest.map((_) => createSignal(0));
    const timer = refresh.ingest ?? 1000;

    const numAverages = ingest.map((_) => createSignal(0));
    const totalOfDiffs = ingest.map((_) => createSignal(0));

    const [fetching, setFetching] = createSignal(false);

    const checkIngest = () => {

        ingest.forEach((q, i) => {
            fetch("/api/checkingest", {
                method: "POST",
                body: JSON.stringify(q)
            }).then((resp) => {
                return resp.json()
            }).then((data) => {

                numAverages[i][1]((prev) => prev + 1);

                const previous = queueLengths[i][0]();
                const current = data.length;
                const diff = current - previous;
                if (previous == 0) {
                    totalOfDiffs[i][1](0);
                } else {
                    console.log("diff", diff)
                    totalOfDiffs[i][1]((prev) => diff + prev);
                }

                queueLengths[i][1](data.length);
                diffs[i][1](diff);
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
                        <div class="flex items-center w-full space-x-2">
                            <div class="text-sm fotn-medium">
                                Backlog:
                            </div>
                            <div class="text-sm font-normal">{Number(queueLengths[i()][0]()).toLocaleString()} </div>
                            <div class="text-sm font-light">
                                Batches
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
