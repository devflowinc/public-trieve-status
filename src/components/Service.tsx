import { For, Show } from "solid-js";
import { SLOS } from "../services.json";
import type { ServerSpec } from "./Services";
import { FiChevronDown, FiChevronUp, FiRefreshCw } from "solid-icons/fi";
import type { HealthCheckResponse, SearchResult } from "../pages/api/checkhealth";

interface ServiceProps {
  service: ServerSpec;
  healthChecks: HealthCheckResponse;
  dropdown: boolean;
  refetch: () => void;
  setDropdown: (value: boolean) => void;
}

export const Service = (props: ServiceProps) => {
  // Helper function to determine overall health status
  const isHealthy = () => {
    if (!props.healthChecks) return null;
    
    const results = [
      props.healthChecks.semantic?.healthy,
      props.healthChecks.fulltext?.healthy,
      props.healthChecks.hybrid?.healthy,
      props.healthChecks.groupSearch?.healthy
    ].filter(status => status !== undefined);
    
    if (results.length === 0) return null;
    return results.every(status => status === true);
  };
  
  // Count passed checks
  const checksPassed = () => {
    if (!props.healthChecks) return 0;
    
    return [
      props.healthChecks.semantic?.healthy,
      props.healthChecks.fulltext?.healthy,
      props.healthChecks.hybrid?.healthy,
      props.healthChecks.groupSearch?.healthy
    ].filter(status => status === true).length;
  };
  
  // Get total checks attempted
  const totalChecks = () => {
    if (!props.healthChecks) return 0;
    
    return [
      props.healthChecks.semantic,
      props.healthChecks.fulltext,
      props.healthChecks.hybrid,
      props.healthChecks.groupSearch
    ].filter(result => result !== undefined).length;
  };
  
  // Get search types that were checked
  const getSearchTypes = () => {
    const types = [];
    if (props.healthChecks.semantic) types.push("Semantic");
    if (props.healthChecks.fulltext) types.push("Full Text");
    if (props.healthChecks.hybrid) types.push("Hybrid");
    if (props.healthChecks.groupSearch) types.push("Group Oriented Search");
    return types;
  };
  
  // Get result for a specific search type
  const getResult = (type: string): SearchResult | undefined => {
    switch (type) {
      case "Semantic": return props.healthChecks.semantic;
      case "Full Text": return props.healthChecks.fulltext;
      case "Hybrid": return props.healthChecks.hybrid;
      case "Group Oriented Search": return props.healthChecks.groupSearch;
      default: return undefined;
    }
  };

  return (
    <div>
      <div class="flex justify-between px-4 py-3 items-center text-alabaster bg-[rgb(28,25,31)] rounded-lg">
        <div class="flex justify-between items-center space-x-3">
          <div
            classList={{
              "rounded-full w-3 h-3": true,
              "bg-[rgb(147,51,234)] animate-pulse": isHealthy() === true,
              "bg-neutral-300 animate-ping": isHealthy() === null,
              "bg-red-500 animate-ping": isHealthy() === false,
            }}></div>
          <div>
            <div class="text-xs font-light text-zinc-400">
              {" "}
              {props.service.url}{" "}
            </div>
            <div class="flex items-baseline space-x-2">
              <p class="text-lg font-medium"> {props.service.name} </p>
              <p class="text-xs">
                Checks passed {checksPassed()} / {totalChecks()}
              </p>
            </div>
          </div>
          <Show when={isHealthy() === false}>❗❗❗</Show>
        </div>
        <div class="flex items-center space-x-2">
          <FiRefreshCw
            onClick={() => {
              props.refetch();
            }}
            class="text-purple-400 w-6 h-6"
          />
          <Show when={props.dropdown}>
            <FiChevronUp
              onClick={() => {
                console.log("click");
                props.setDropdown(!props.dropdown);
              }}
              class="text-shark-100 w-6 h-6"
            />
          </Show>
          <Show when={!props.dropdown}>
            <FiChevronDown
              onClick={() => {
                console.log("click");
                props.setDropdown(!props.dropdown);
              }}
              class="text-shark-100 w-6 h-6"
            />
          </Show>
        </div>
      </div>
      <Show when={props.dropdown}>
        <div class="flex flex-col space-y-1 mt-1">
          <For each={getSearchTypes()}>
            {(searchType) => {
              const result = getResult(searchType);
              if (!result) return null;
              
              return (
                <div
                  class="overflow-hidden justify-between px-4 py-3 ml-10 items-center text-alabaster bg-zinc-900 rounded-lg"
                  classList={{
                    "transform scale-y-100 opacity-100 max-h-[1000px]":
                      props.dropdown,
                    "transform scale-y-0 opacity-0 max-h-0": !props.dropdown,
                  }}>
                  <div class="flex items-baseline justify-between">
                    <div class="text-lg font-normal">{searchType}</div>
                    <div
                      classList={{
                        "text-sm text-zinc-400": true,
                        "text-bold text-red-400":
                          result.time !== undefined && SLOS[searchType as keyof typeof SLOS] < result.time ? true : false,
                      }}>
                      <Show
                        when={result.time !== undefined && SLOS[searchType as keyof typeof SLOS] < result.time}>
                        ❗
                      </Show>
                      {result.time} milliseconds
                      <Show
                        when={result.time && SLOS[searchType as keyof typeof SLOS] < result.time}>
                        ❗
                      </Show>
                    </div>
                  </div>
                  <div class="text-sm text-purple-300">
                    {result.status}
                  </div>
                  <Show when={result.response}>
                    <div class="text-sm">
                      {result.response}
                    </div>
                  </Show>
                  <Show when={result.timing}>
                    <div class="text-xs text-purple-400">
                      {result.timing?.split(",")
                        .map((s: string) => s.split(";dur="))
                        .map((arr: string[]) => {
                          return `${arr[0]} ${arr[1]} ms`;
                        })
                        .map((a: string, index: number) => {
                          return <div key={index}>{a}</div>;
                        })}
                    </div>
                  </Show>
                  <Show when={result.cardCount !== undefined}>
                    <div class="text-sm text-zinc-400">
                      Cards found: {result.cardCount}
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};
