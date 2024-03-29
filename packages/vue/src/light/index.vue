<script lang="ts" setup>
import {
    PropType,
    ref,
    reactive,
    watch,
    computed,
    onBeforeMount,
    provide,
    readonly,
    nextTick,
} from 'vue';
import {
    CallingState,
    CanisterManager,
    ComponentStatus,
    IdentityPool,
    LightsRunning,
    SourcesManager,
    ValueItem,
    ValuePool,
    checkDataSource,
} from '@mora-light/core/types/running';
import {
    LightCore,
    LightStatusInfo,
    parseLightCandidType,
    getLightStatusInfo,
} from '@mora-light/core/types';
import { DataSource } from '@mora-light/core/types/source';
import { DataTransmit } from '@mora-light/core/types/transmit';
import { DataResult, StringResult, checkAndExecute, same } from '@mora-light/core/types/common';
import {
    checkTransmit,
    RunningLight,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
} from '@mora-light/core/types/running';
import { TriggerMode } from '@mora-light/core/types/trigger';
import { CandidType, CandidValue } from '@mora-light/core/types/candid';
import RunningWrappedSourcesVue from './components/sources/RunningWrappedSources.vue';
import RunningWrappedTriggersVue from './components/triggers/RunningWrappedTriggers.vue';
import RunningWrappedTransmitsVue from './components/transmits/RunningWrappedTransmits.vue';
import { getImagesUrl, dealPid } from '../utils/index';

const parseDataResult = (
    data: DataSource[],
    transmits: DataTransmit[],
    values: { outerValues: ValueItem[]; propValues: ValueItem[] },
    dataEl?: HTMLElement,
    transmitsEl?: HTMLElement,
): {
    sourcesResult: DataResult<DataSource[]>;
    transmitsResult: DataResult<DataTransmit[]>;
} => {
    let outerValues = [...values.outerValues];
    let propValues = [...values.propValues];
    let innerValues: ValueItem[] = [];

    let sourcesResult: DataResult<DataSource> | undefined = undefined;

    for (let i = 0; i < data.length; i++) {
        const check = checkDataSource(
            data[i],
            true,
            { outerValues, propValues, innerValues },
            dataEl,
        );
        if (check.result.err !== undefined) sourcesResult = check.result;
        outerValues = check.values.outerValues!;
        innerValues = check.values.innerValues;
    }

    const from = parseLightCandidType(data, { propValues }).result;

    let transmitsResult: DataResult<DataTransmit> | undefined = undefined;

    for (let i = 0; i < transmits.length; i++) {
        const check = checkTransmit(
            transmits[i],
            from,
            { outerValues, propValues, innerValues },
            transmitsEl,
        );
        if (check.result.err !== undefined) transmitsResult = check.result;
        outerValues = check.values.outerValues!;
        innerValues = check.values.innerValues;
    }

    return {
        sourcesResult:
            sourcesResult && !sourcesResult.ok ? { err: sourcesResult.err } : { ok: data },
        transmitsResult:
            transmitsResult && !transmitsResult.ok
                ? { err: transmitsResult.err }
                : { ok: transmits },
    };
};

const parseInitTrigger = (trigger: TriggerMode | undefined): string => {
    if (trigger === undefined) return '';
    switch (trigger.type) {
        case 'button':
            return 'Click Button';
        case 'clock':
            return `Schedule (${trigger.sleep / 1000}s)`;
    }
    return '';
};
const props = defineProps({
    hostAgent: {
        required: true,
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true,
    },
    running: {
        type: Object as PropType<LightsRunning>,
        required: true,
    },
    index: {
        type: Number,
        required: true,
    },
});

const hostAgent = ref(props.hostAgent);
provide('HOST_AGENT', readonly(hostAgent));
watch(
    () => props.hostAgent,
    () => (hostAgent.value = props.hostAgent),
);

const info = computed<{
    name: string;
    cover: string;
    thumbnail: string;
    categories: string[];
    tags: string[];
    runnable_planet: any;
    instruction: string;
}>(() => JSON.parse(props.running.getLightCoreData(props.index)!.info_json));
const author = computed(() => props.running.getLightCoreData(props.index)!.creator);
const lightId = computed(() => props.running.getLightCoreData(props.index)!.id);

const dataRef = ref<HTMLElement>();
const transmitsRef = ref<HTMLElement>();

const sourceCount = ref(0);
const sourcesRefresh = ref(0);
const triggerRefresh = ref(0);
const callingRefresh = ref(0);
const clockTriggerRemindSeconds = ref(new Date().getTime());
const clockExecuting = ref(true);

provide(
    'SET_CLOCK_TRIGGER_REMIND_SECONDS',
    (seconds: number) => (clockTriggerRemindSeconds.value = seconds),
);

const setClockExecuting = (executing: boolean) => {
    clockExecuting.value = executing;
};

const timestampRecords = ref<[string, number][]>([]);
provide('TIMESTAMP_RECORDS_CLEAN', () => (timestampRecords.value = []));
provide('TIMESTAMP_RECORDS_PUSH', (tip: string) =>
    timestampRecords.value.push([tip, new Date().getTime()]),
);
const timestampRecordsLog = () => {
    if (!timestampRecords.value[0][0].startsWith('trigger -> start')) return;
    console.error(
        'time spend',
        `${
            timestampRecords.value[timestampRecords.value.length - 1][1] -
            timestampRecords.value[0][1]
        }ms`,
        JSON.parse(JSON.stringify(timestampRecords.value)),
    );
};

const propPool = ref<ValuePool>(props.running.getPropPool(props.index)!);
const outerPool = ref<ValuePool>(props.running.getOuterPool());
const innerPool = ref<ValuePool>(props.running.getInnerPool(props.index)!);
const identityPool = ref<IdentityPool>(props.running.getIdentityPool());
const propValues = computed<ValueItem[]>(() => propPool.value.values()); // outer values
const outerValues = ref<ValueItem[]>(props.running.getOuterValues(props.index)!); // outer values

const light = ref<LightCore>(props.running.getLightCore(props.index)!); // light core data

const calling = ref(0); // count canister call

let { sourcesResult: dataSourcesResult, transmitsResult: dataTransmitsResult } = parseDataResult(
    light.value.data,
    light.value.transmits,
    {
        outerValues: [...outerValues.value],
        propValues: props.running.getPropPool(props.index)!.values(),
    },
    dataRef.value,
    transmitsRef.value,
);
const getNextSubscribeId = (): number => {
    return props.running.getNextSubscribeId();
};
const nextSourceId = (): number => {
    sourceCount.value = sourceCount.value + 1;
    return sourceCount.value;
};

const doSourcesRefresh = () => {
    // console.error("do refresh source", JSON.stringify(runningLight.value.source));
    sourcesRefresh.value = sourcesRefresh.value + 1;
};
const doTriggerRefresh = () => {
    // console.error("do refresh trigger");
    triggerRefresh.value = triggerRefresh.value + 1;
};
const doCallingRefresh = () => {
    // console.error("do refresh calling");
    callingRefresh.value = callingRefresh.value + 1;
};

const runningLight = reactive<RunningLight>({
    getNextSubscribeId: () => getNextSubscribeId(),
    propPool: propPool.value as ValuePool,
    outerPool: outerPool.value as ValuePool,
    innerPool: innerPool.value as ValuePool,
    identityPool: identityPool.value as IdentityPool,
    getNextSourceId: () => nextSourceId(),
    sources: new SourcesManager(),
    refreshSources: () => doSourcesRefresh(),
    canisters: new CanisterManager(),
    trigger: parseInitTrigger(light.value.trigger),
    refreshTrigger: () => doTriggerRefresh(),
    calling: calling.value,
    callingStates: {},
    refreshCalling: () => doCallingRefresh(),
    finalOuterValue: props.running.getFinalOuterValues(),
});

const callingDuration = computed(() => !!calling.value || !!runningLight.canisters.triggers());

const reload = () => {
    propPool.value = props.running.getPropPool(props.index)!;
    outerPool.value = props.running.getOuterPool();
    innerPool.value = props.running.getInnerPool(props.index)!;
    identityPool.value = props.running.getIdentityPool();
    outerValues.value = props.running.getOuterValues(props.index)!;
    light.value = props.running.getLightCore(props.index)!;

    const r = parseDataResult(
        light.value.data,
        light.value.transmits,
        {
            outerValues: [...outerValues.value],
            propValues: props.running.getPropPool(props.index)!.values(),
        },
        dataRef.value,
        transmitsRef.value,
    );
    dataSourcesResult = r.sourcesResult;
    dataTransmitsResult = r.transmitsResult;

    runningLight.propPool = propPool.value;
    runningLight.outerPool = outerPool.value;
    runningLight.innerPool = innerPool.value;
    runningLight.identityPool = identityPool.value;

    runningLight.finalOuterValue = props.running.getFinalOuterValues();
};

const callingStates = ref<CallingState[]>([]);

watch(
    () => callingRefresh.value,
    () => (calling.value = runningLight.calling),
);

watch(
    () => calling.value,
    () => {
        callingStates.value = [];
        const keys = Object.keys(runningLight.callingStates);
        for (let key of keys) {
            callingStates.value.push(runningLight.callingStates[key]);
        }
    },
);

const lightCandidType = computed<{
    result: CandidType;
    runtime?: StringResult<CandidValue>;
}>(() => parseLightCandidType(light.value.data, { propValues: propPool.value.values() }));

const statusInfo = computed<LightStatusInfo>(() => getLightStatusInfo(light.value));

const outerValuesForShowComponent = computed(() => {
    const innerValues: ValueItem[] = [];
    const propValues: ValueItem[] = propPool.value.values();
    let last: ValueItem[] = [...outerValues.value];

    for (let i = 1; i < light.value.data.length; i++) {
        const source = light.value.data[i - 1];

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByDataSource(source, { propValues }, innerValues);
        findOuterValueItemsByDataSource(source, { propValues, innerValues }, valueItems);

        last = valueItems;
    }

    return last;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [
        props.running,
        props.running.getPropPool(props.index),
        props.running.getOuterValues(props.index),
        props.running.getLightCore(props.index),
    ],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newPropValues = props.running.getPropPool(props.index)!.values();
    const newOuterValues = props.running.getOuterValues(props.index);
    const newLight = props.running.getLightCore(props.index);

    if (!newPropValues || !newOuterValues || !newLight) {
        // console.error("light running init error", props.using, props.index);
        return;
    }

    const { sourcesResult: newDataSourcesResult, transmitsResult: newDataTransmitsResult } =
        parseDataResult(
            newLight.data,
            newLight.transmits,
            {
                outerValues: [...newOuterValues],
                propValues: newPropValues,
            },
            dataRef.value,
            transmitsRef.value,
        );

    if (
        initialed &&
        same(dataSourcesResult, newDataSourcesResult) &&
        same(dataTransmitsResult, newDataTransmitsResult)
    ) {
        return;
    }

    dataSourcesResult = newDataSourcesResult;
    dataTransmitsResult = newDataTransmitsResult;

    initialed = true;

    changed();
};

let resetTriggerId = 0;
const resetTrigger = () => {
    runningLight.trigger = parseInitTrigger(light.value.trigger);
    // console.error('reset trigger');
    doCallingRefresh();
    timestampRecords.value.push(['trigger -> end', new Date().getTime()]);
    timestampRecordsLog();
    timestampRecords.value = [];
};

const onDataSourcesChanged = (r: DataResult<DataSource[]>) => {
    dataSourcesResult = r;

    // console.error("light running onDataSourcesChanged", JSON.stringify(r));

    if (r.ok !== undefined) {
        reload();

        light.value.data = r.ok;

        props.running
            .pulse(
                props.index,
                runningLight.canisters.canisters(),
                runningLight.trigger,
                ['preview', 'running'].includes(props.status),
            )
            .then((err) => {
                if (err === '') {
                    if (runningLight.canisters.triggers() === 0 && !calling.value) {
                        clearTimeout(resetTriggerId);
                        resetTriggerId = Number(setTimeout(resetTrigger, 13));
                    }
                    return;
                }

                if (err.startsWith('same with last time')) {
                    if (runningLight.canisters.triggers() === 0 && !calling.value) {
                        clearTimeout(resetTriggerId);
                        resetTriggerId = Number(setTimeout(resetTrigger, 13));
                    }
                    return;
                }

                console.error('light running produce pulse error -> ', err);
            });
    }

    changed();
};

watch(
    () => runningLight.trigger,
    (nv) => {
        if (!nv) {
            onDataSourcesChanged(dataSourcesResult);
        }
    },
);

const onDataTransmitsChanged = (r: DataResult<DataTransmit[]>) => {
    dataTransmitsResult = r;

    if (r.ok !== undefined) light.value.transmits = r.ok;

    changed();
};

// should produce prop on using status
const produce = (): DataResult<LightCore> => {
    if (!initialed) return { err: { message: `light running has not been initial.` } };

    // console.error("light running produce", props.using);

    if (dataSourcesResult.err !== undefined) return { err: dataSourcesResult.err };
    if (dataTransmitsResult.err !== undefined) return { err: dataTransmitsResult.err };

    return { ok: light.value };
};

const emit = defineEmits<{
    changed: [DataResult<LightCore>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' ||
            ((!statusInfo.value.hasDataComponent || !!dataRef.value) &&
                (!statusInfo.value.hasShowComponent || !!transmitsRef.value)),
        () => emit('changed', produce()),
        changed,
    );

const isLineClamp = ref(false);
const executed = ref(false);
const hasResult = ref(false);
watch(
    () => triggerRefresh.value,
    () => {
        executed.value = true;
        hasResult.value = true;
    },
);

const isFull = ref(false);
</script>

<template>
    <div class="mora-light-content">
        <i
            class="background"
            :style="{ backgroundImage: `url(${getImagesUrl(info.thumbnail)})` }"
        />

        <div class="inner">
            <div class="light-id">
                <i class="iconfont icon-plugin-light"></i>
                <p>{{ `Light ID: ` + lightId }}</p>
            </div>
            <div class="ibox" :class="{ full: isFull }">
                <div class="info">
                    <div class="info-header">
                        <img class="light-thumbnail" :src="getImagesUrl(info.thumbnail)" />
                    </div>
                    <div class="light-name">{{ info.name }}</div>
                    <div class="light-instruction light-scrollbar">
                        <p v-if="info.instruction.length < 180">
                            {{ info.instruction }}
                        </p>
                        <p v-else-if="!isLineClamp">
                            {{ info.instruction.substring(0, 180) }}...
                            <i
                                v-if="info.instruction.length > 180"
                                @click="isLineClamp = !isLineClamp"
                            >
                                More
                            </i>
                        </p>
                        <p v-else>
                            {{ info.instruction }}
                            <i
                                v-if="info.instruction.length > 180"
                                @click="isLineClamp = !isLineClamp"
                            >
                                Fold
                            </i>
                        </p>
                    </div>
                    <div class="light-author">
                        <i class="iconfont icon-author"></i>
                        <span>@{{ dealPid(author.toText()) }}</span>
                    </div>
                </div>
                <div
                    class="triggerMode"
                    v-if="light.trigger && light.trigger.type === 'clock' && light.trigger.sleep"
                >
                    <i class="iconfont icon-time"></i>
                    <p>
                        Trigger after
                        <i>{{ clockTriggerRemindSeconds }}</i>
                        seconds
                    </p>
                    <span @click="setClockExecuting(false)" v-if="clockExecuting">
                        <i class="iconfont icon-pause"></i>
                    </span>
                    <span @click="setClockExecuting(true)" v-else>
                        <i class="iconfont icon-start"></i>
                    </span>
                </div>
            </div>
            <div class="content">
                <div class="core-content light-scrollbar">
                    <!-- data sources -->
                    <div
                        v-show="!callingDuration && !executed"
                        class="data"
                        :class="{
                            'has-content': statusInfo.hasDataComponent || props.status === 'using',
                        }"
                    >
                        <RunningWrappedSourcesVue
                            :status="props.status"
                            :runningLight="(runningLight as any)"
                            :values="{
                                outerValues,
                                propValues,
                            }"
                            :calling="calling"
                            :initial="light.data"
                            :triggerRefresh="triggerRefresh"
                            @changed="onDataSourcesChanged"
                            ref="dataRef"
                        />
                    </div>
                    <!-- trigger -->
                    <div
                        v-show="!callingDuration && !executed"
                        class="trigger"
                        v-if="statusInfo.hasTriggerComponent"
                        :class="{
                            'has-content': statusInfo.hasTriggerComponent,
                            'show-dashed-border':
                                (statusInfo.hasDataComponent && statusInfo.hasTriggerComponent) ||
                                props.status === 'using',
                        }"
                    >
                        <RunningWrappedTriggersVue
                            :status="props.status"
                            :runningLight="(runningLight as any)"
                            :calling="calling"
                            :initial="light.trigger ?? { type: 'loading' }"
                            :sourcesRefresh="sourcesRefresh"
                            :callingRefresh="callingRefresh"
                            :executing="clockExecuting"
                        />
                        <i @click="executed = true" class="iconfont icon-go" v-if="hasResult"></i>
                    </div>
                    <!-- shows -->
                    <template v-if="callingDuration">
                        <div
                            class="calling-wrapped-transmits-content has-content"
                            :class="{
                                'show-dashed-border':
                                    ((statusInfo.hasDataComponent ||
                                        statusInfo.hasTriggerComponent) &&
                                        statusInfo.hasShowComponent) ||
                                    props.status === 'using' ||
                                    calling,
                            }"
                        >
                            <div class="loading-animation"></div>
                            <p>Data acquisition, please wait...</p>
                            <!-- <template v-if="callingStates.length === 0">
                                    <span>Data acquisition, please wait...</span>
                                </template>
                                <template v-else>
                                    <template v-for="state in callingStates" :key="state.id">
                                        <span>
                                            {{ `Canister(${state.canisterId}) => ${state.method}` }}
                                        </span>
                                    </template>
                                </template> -->
                        </div>
                    </template>

                    <div
                        v-show="!callingDuration && executed"
                        class="transmits"
                        :class="{
                            'has-content': statusInfo.hasShowComponent || props.status === 'using',
                            'show-dashed-border':
                                ((statusInfo.hasDataComponent || statusInfo.hasTriggerComponent) &&
                                    statusInfo.hasShowComponent) ||
                                props.status === 'using',
                        }"
                    >
                        <i
                            @click="
                                executed = false;
                                isFull = false;
                            "
                            v-if="
                                executed === true &&
                                light.trigger &&
                                light.trigger.type === 'button'
                            "
                            class="iconfont icon-back-left"
                        ></i>
                        <i
                            @click="isFull = !isFull"
                            class="iconfont"
                            :class="{
                                'icon-plugin-fullscreen': !isFull,
                                'icon-plugin-zoomout': isFull,
                            }"
                        ></i>
                        <RunningWrappedTransmitsVue
                            :status="props.status"
                            :initial="light.transmits"
                            :outerValues="outerValuesForShowComponent"
                            :callingRefresh="callingRefresh"
                            :dataType="lightCandidType.result"
                            :defaultValue="lightCandidType.runtime"
                            :transform="light.transform"
                            :triggerMode="light.trigger ?? { type: 'loading' }"
                            :clockTriggerRemindSeconds="clockTriggerRemindSeconds"
                            :executing="clockExecuting"
                            @changed="onDataTransmitsChanged"
                            ref="transmitsRef"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
@import '../assets/less/main.less';

.mora-light-content {
    @apply max-w-192 w-full h-117 rounded-2xl border-3 border-green-400 relative overflow-hidden transition duration-300 <sm:(h-auto);
    &.full {
        @apply w-full transition duration-300;
    }
    .background {
        @apply absolute left-0 top-0 bottom-0 w-full z-1 object-cover;
        background-size: 100% auto;
    }
    > .inner {
        @apply bg-light-50/96 backdrop-blur-lg w-full flex justify-between relative z-2 p-6 pb-0 dark:(bg-dark-600) <sm:(flex-col p-4 pb-0);

        .light-id {
            @apply flex justify-end items-center absolute right-6 top-5;

            i {
                @apply text-green-500 text-lg;
            }

            p {
                @apply font-medium text-sm text-black pl-2 dark:(text-light-900/80);
            }
        }

        .ibox {
            @apply flex flex-col justify-between w-50 flex-shrink-0 mr-10 <sm:(w-full mr-0);
            transition: 0.3s;

            &.full {
                @apply w-0 h-0 mr-0 overflow-hidden;
                transition: 0.3s;
            }

            .info {
                @apply flex flex-col w-full;
                .info-header {
                    @apply w-full text-left;
                    .light-thumbnail {
                        @apply w-16 h-16 rounded-xl !ml-0;
                    }
                }

                .light-name {
                    @apply w-full block font-bold text-xl text-black text-left pt-3 pb-1 dark:(text-light-900);
                }

                .light-author {
                    @apply w-full mt-5 text-left <sm:(mt-1);
                    i {
                        @apply mr-1 text-sm text-gray-400;
                    }
                    span {
                        @apply text-sm text-gray-500 dark:(text-light-900/80);
                    }
                }

                .light-instruction {
                    @apply text-sm text-dark-500 mt-2 text-left relative max-h-50 overflow-y-auto dark:(text-light-900/60);

                    i {
                        @apply items-center justify-center cursor-pointer text-green-500 ml-5px font-bold relative;
                    }

                    p {
                        @apply mb-0;
                    }
                }
            }
            .triggerMode {
                @apply w-full flex items-center mb-5 <sm:(mb-0 mt-3);
                .icon-pause {
                    @apply text-gray-400 ml-2 cursor-pointer;
                }

                .icon-start {
                    @apply text-green-500 ml-2 cursor-pointer;
                }

                > i {
                    @apply text-sm text-gray-400 mr-1 relative;
                }

                p {
                    @apply flex items-center text-sm text-gray-600 text-center whitespace-nowrap dark:(text-light-900/60);
                    i {
                        @apply bg-gray-200 rounded-md w-6 h-6 flex justify-center items-center my-0 mx-1 not-italic text-black font-medium dark:(bg-dark-100 text-light-900);
                    }
                }
            }
        }
        > .content {
            @apply flex-1;
            > .core-content {
                @apply w-full flex flex-col bg-white rounded-tl-2xl rounded-tr-2xl px-5 py-6 relative mt-10 h-100 max-h-110 overflow-y-auto dark:(bg-dark-300 shadow-black) <sm:(mt-4 px-4 py-5 max-h-100);
                box-shadow: 0px -5px 15px rgba(0, 0, 0, 0.06);
                max-width: none;
                transition: 0.3s;

                &.fullLoading {
                    max-width: 474px;
                    transition: 0.3s;
                }

                .transmits {
                    @apply min-h-54;
                    .icon-back-left {
                        @apply absolute left-5 top-5 text-base text-black cursor-pointer dark:(text-light-900/80);
                        z-index: 2;
                    }
                    .icon-plugin-fullscreen,
                    .icon-plugin-zoomout {
                        @apply absolute right-5 top-5 text-base text-black cursor-pointer dark:(text-light-900/80);
                        z-index: 2;
                    }
                    .icon-plugin-fullscreen {
                        @apply <sm:(hidden);
                    }
                }

                .trigger {
                    @apply flex items-center mt-2;
                    .icon-go {
                        @apply text-base text-black flex justify-center items-center ml-4 cursor-pointer dark:(text-light-900/80);
                    }
                }

                .calling-wrapped-transmits-content {
                    @apply w-full h-full flex flex-col justify-center items-center <sm:(py-5);
                    p {
                        @apply mt-5 font-medium text-base text-gray-500 dark:(text-light-900/80);
                    }
                }
            }
        }
    }
}
.light-scrollbar {
    &::-webkit-scrollbar {
        @apply w-6px h-6px bg-transparent;
    }
    &::-webkit-scrollbar-thumb {
        @apply rounded-md bg-gray-300 hover: (bg-gray-400 dark:(!bg-light-900/30)) dark: (bg-dark-50);
    }
}
</style>
