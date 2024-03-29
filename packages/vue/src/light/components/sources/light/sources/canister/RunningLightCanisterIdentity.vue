<script lang="ts" setup>
import { computed, inject, onBeforeMount, onUnmounted, PropType, Ref, ref, watch } from 'vue';
import { HttpAgent } from '@dfinity/agent';
import {
    ComponentStatus,
    CustomIdentityValueItem,
    isCustomIdentityType,
    RunningLight,
    ValueItem,
} from '@mora-light/core/types/running';
import {
    checkAndExecute,
    DataResult,
    deleteRuntime,
    same,
    StringResult,
} from '@mora-light/core/types/common';
import {
    ActorIdentity,
    IdentitySource,
    ActorIdentityRecord,
    getActorCreatorByAgent,
    getActorCreatorByAnonymous,
    getActorCreatorByPlug,
    PlugInterface,
    readIdentityRuntime,
    assureIdentityRuntime,
    assignIdentityRuntime,
} from '@mora-light/core/types/candid';
import { CanisterIdentity, isCanisterIdentityHasExported } from '@mora-light/core/types/source';
import {
    subscribePlugConnectionUpdate,
    unsubscribePlugConnectionUpdate,
} from '../../../../../../modules/login/login';
import LightLoginVue from '../../../../../../modules/LightLogin.vue';

const calcLastIdentitySource = (
    runtimeResults: (StringResult<ActorIdentityRecord> | undefined)[] | undefined,
): IdentitySource | '' => {
    if (runtimeResults === undefined) return '';
    if (runtimeResults.length === 0) return '';
    const last = runtimeResults[runtimeResults.length - 1];
    if (last === undefined) return '';
    if (last.err !== undefined) return '';
    return last.ok.identity.source;
};

const calcLastIdentityPrincipal = (
    runtimeResults: (StringResult<ActorIdentityRecord> | undefined)[] | undefined,
): string => {
    if (runtimeResults === undefined) return '';
    if (runtimeResults.length === 0) return '';
    const last = runtimeResults[runtimeResults.length - 1];
    if (last === undefined) return '';
    if (last.err !== undefined) return '';
    return last.ok.identity.principal;
};

const calcLastCanisterCallTime = (
    runtimeResults: (StringResult<ActorIdentityRecord> | undefined)[] | undefined,
): number => {
    if (runtimeResults === undefined) return 0;
    if (runtimeResults.length === 0) return 0;
    const last = runtimeResults[runtimeResults.length - 1];
    if (last === undefined) return 0;
    if (last.err !== undefined) return 0;
    const records = last.ok.records;
    if (records.length === 0) return 0;
    return records[records.length - 1].time;
};

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    calling: {
        type: Number,
        required: true,
    },
    innerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported internal variables, so what internal variables have been produced before the current node is introduced
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    initial: {
        type: Object as PropType<CanisterIdentity>,
        required: true,
    },
});

const hostAgent = inject<Ref<HttpAgent | undefined>>('HOST_AGENT')!;

const SUBSCRIBE_ID = props.runningLight.getNextSubscribeId();

const outerNameRef = ref<HTMLElement>();
const exportedOuterNameRef = ref<HTMLElement>();

// If you log in, display the content
const source = ref<IdentitySource | ''>(calcLastIdentitySource(readIdentityRuntime(props.initial)));
const principal = ref<string>(calcLastIdentityPrincipal(readIdentityRuntime(props.initial)));
const last = ref<number>(calcLastCanisterCallTime(readIdentityRuntime(props.initial)));
const loginShow = ref(false);
let plugConnectionUpdateId = 0;
let isPlug = false;
let identifier: number | undefined = undefined;
const outerLoginShow = ref(false);

// The introduced variable name, because it is selected, the content is right
const outerName = ref(props.initial.name ?? '');
// If there is export, then the export variable name
const exportedOuterName = ref(props.initial.exported?.name ?? '');
let lastExportedOuterName = exportedOuterName.value;

const outerIdentityValues = computed<CustomIdentityValueItem[]>(
    () =>
        props.outerValues.filter((value) =>
            isCustomIdentityType(value),
        ) as CustomIdentityValueItem[],
); // Calculate the internal constant that can be selected
const identityValueItem = computed(() =>
    outerIdentityValues.value.find((value) => value.name === outerName.value),
); // The currently selected variable may not be available

// The exported variable name cannot be conflict with the previous export name
// Whether the name contains the current input does not include without it, it returns True
const validateExportedOuterName = computed<boolean>(
    () =>
        !props.outerValues
            .map((value) => value.name)
            .includes(
                exportedOuterName.value.trim(), // Remove the head and tail space
            ),
);

let initialed = false;
onBeforeMount(() => {
    init();
    plugConnectionUpdateId = subscribePlugConnectionUpdate(onPlugConnectionUpdated);
});
watch(
    () => [props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    // Initialize the load value
    initIdentity().then(() => {
        subscribeExport(); // If there is an export variable, you need to subscribe to the monitoring

        subscribeImport(); // If it is imported variables, you need to subscribe to supervision

        refresh();

        initialed = true;

        changed();
    });
};

const refresh = () => {
    source.value = calcLastIdentitySource(readIdentityRuntime(props.initial)); // Update the current type
    principal.value = calcLastIdentityPrincipal(readIdentityRuntime(props.initial)); // Update the current identity
    last.value = calcLastCanisterCallTime(readIdentityRuntime(props.initial)); // Update the latest call time
};

// Initialization
const initIdentity = async () => {
    const agent: HttpAgent | undefined = hostAgent.value;
    const setHost = async () => {
        assureIdentityRuntime(props.initial, []);
        let identity: ActorIdentity | undefined = undefined;
        if (agent !== undefined) {
            const principal = (await agent.getPrincipal()).toText();
            identity = {
                source: 'host',
                principal: principal,
                create: getActorCreatorByAgent(agent),
            };
            const identityRecord: ActorIdentityRecord = {
                identity,
                records: [],
            };
            readIdentityRuntime(props.initial)!.push({ ok: identityRecord }); // Set directly host
        } else {
            readIdentityRuntime(props.initial)!.push({ err: 'Host identity is missing.' });
        }
        onPulse(identity !== undefined ? { ok: identity } : undefined);
    };
    switch (props.initial.from) {
        case 'anonymous':
            if ((readIdentityRuntime(props.initial)?.length ?? 0) < 1) {
                assignIdentityRuntime(props.initial, [
                    {
                        ok: {
                            identity: {
                                source: 'anonymous',
                                principal: '2vxsx-fae', // Anonymous call Principal ID
                                create: getActorCreatorByAnonymous(),
                            },
                            records: [],
                        },
                    },
                ]);
            }
            break;
        case 'host':
            await setHost();
            break;
        case 'login':
            // No settings
            break;
        case 'host-login':
            if (readIdentityRuntime(props.initial)?.length ?? 0 === 0) {
                await setHost(); // If the initialization is not performed, the settings
            }
            break;
        case 'inner':
            // Wait
            break;
        case 'outer':
            // Wait
            break;
    }
};

// If there is an export variable, you need to monitor the modification of other import positions, so you need to subscribe
const subscribeExport = () => {
    props.runningLight.identityPool.subscribe(SUBSCRIBE_ID, onIdentityChanged);
};

// If you import variables, you need to monitor
const subscribeImport = () => {
    switch (props.initial.from) {
        case 'inner':
            props.runningLight.innerPool.unsubscribe(SUBSCRIBE_ID);
            props.runningLight.innerPool.subscribe(
                props.initial.name,
                SUBSCRIBE_ID,
                onInnerRuntimeChanged,
            );
            onInnerRuntimeChanged(); // Take the initiative
            break;
        case 'outer':
            props.runningLight.outerPool.unsubscribe(SUBSCRIBE_ID);
            props.runningLight.outerPool.subscribe(
                outerName.value,
                SUBSCRIBE_ID,
                onOuterRuntimeChanged,
            );
            onOuterRuntimeChanged(); // Take the initiative
            break;
    }
};

onUnmounted(() => {
    unsubscribePlugConnectionUpdate(plugConnectionUpdateId);
    props.runningLight.identityPool.unsubscribe(SUBSCRIBE_ID);
    props.runningLight.outerPool.unsubscribe(SUBSCRIBE_ID);
    props.runningLight.innerPool.unsubscribe(SUBSCRIBE_ID);
});

const onIdentityChanged = (
    identity: ActorIdentity | undefined,
    type: IdentitySource | undefined,
) => {
    console.error('onIdentityChanged', identity, type);

    assignIdentityRuntime(props.initial, []);

    switch (props.initial.from) {
        case 'anonymous': // Anonymous will not be triggered
            break;
        case 'host': // host Will not trigger
            break;
        case 'login':
            if (identity !== undefined) {
                const identityRecord = { identity: identity, records: [] };
                readIdentityRuntime(props.initial)!.push({ ok: identityRecord }); // Set directly
            } else {
                readIdentityRuntime(props.initial)!.push(undefined);
            }
            onPulse(identity !== undefined ? { ok: identity } : undefined);
            break;
        case 'host-login':
            if (identity !== undefined) {
                const identityRecord = { identity: identity, records: [] };
                readIdentityRuntime(props.initial)!.push({ ok: identityRecord }); // Set directly
            } else {
                readIdentityRuntime(props.initial)!.push(undefined);
            }
            onPulse(identity !== undefined ? { ok: identity } : undefined);
            break;
        case 'inner': // The introduction of internal variables will not be triggered
            break;
        case 'outer': // The introduction of external variables will not be triggered
            break;
    }

    refresh();

    isPlug = identity !== undefined && type === 'plug'; // Whether the record is from Plug's identity

    changed();
};

// If the object of monitoring
const onInnerRuntimeChanged = () => {
    if (!props.initial.name) return;

    // console.error("onInnerRuntimeChanged", props.initial.name, props.runningLight);

    const identityResult = props.runningLight.innerPool.findValue(
        props.initial.name,
    ) as StringResult<ActorIdentity>;

    identifier = props.runningLight.innerPool.findIdentifier(props.initial.name);

    assureIdentityRuntime(props.initial, []);

    if (identityResult?.ok !== undefined) {
        const identity = identityResult.ok;
        principal.value = identity.principal;
        const runtime = readIdentityRuntime(props.initial) ?? [];
        const recordResult = { ok: { identity, records: [] } };
        runtime.push(recordResult);
        assignIdentityRuntime(props.initial, runtime);
    } else if (identityResult?.err !== undefined) {
        const err = identityResult.err;
        const runtime = readIdentityRuntime(props.initial) ?? [];
        const recordResult = { err };
        runtime.push(recordResult); // ? Fill in the data in one breath. Will the array become long?
        assignIdentityRuntime(props.initial, runtime);
    } else {
        if (readIdentityRuntime(props.initial) === undefined) {
            deleteRuntime(props.initial); // Delete the running variable when there are errors
        } else {
            readIdentityRuntime(props.initial)!.push(undefined);
        }
    }

    onPulse(identityResult);

    refresh();

    changed();
};
const onOuterRuntimeChanged = () => {
    if (!outerName.value) return;

    // console.error("onOuterRuntimeChanged", outerName.value, props.runningLight);

    const identityResult = props.runningLight.outerPool.findValue(
        outerName.value,
    ) as StringResult<ActorIdentity>;

    identifier = props.runningLight.outerPool.findIdentifier(outerName.value);

    // console.error("identityResult", identityResult, identifier);

    assureIdentityRuntime(props.initial, []);

    if (identityResult?.ok !== undefined) {
        const identity = identityResult.ok;
        principal.value = identity.principal;
        const runtime = readIdentityRuntime(props.initial) ?? [];
        const recordResult = { ok: { identity, records: [] } };
        runtime.push(recordResult);
        assignIdentityRuntime(props.initial, runtime);
    } else if (identityResult?.err !== undefined) {
        const err = identityResult.err;
        const runtime = readIdentityRuntime(props.initial) ?? [];
        const recordResult = { err };
        runtime.push(recordResult); // ? Fill in the data in one breath. Will the array become long?
        assignIdentityRuntime(props.initial, runtime);
    } else {
        if (readIdentityRuntime(props.initial) === undefined) {
            deleteRuntime(props.initial); // Delete the running variable when there are errors
        } else {
            readIdentityRuntime(props.initial)!.push(undefined);
        }
    }

    onPulse(identityResult);

    refresh();

    changed();
};

const onPulse = (identityResult: StringResult<ActorIdentity> | undefined) => {
    switch (props.initial.exported?.target) {
        case 'inner':
            // console.error(
            //     "using wrapped source pulse inner",
            //     props.initial.exported.name,
            //     SUBSCRIBE_ID,
            // );
            props.runningLight.innerPool.pulse(
                props.initial.exported.name,
                identityResult,
                identifier ?? SUBSCRIBE_ID,
            );
            break;
        case 'outer':
            // console.error(
            //     "using wrapped source pulse outer",
            //     props.initial.exported.name,
            //     SUBSCRIBE_ID,
            // );
            props.runningLight.outerPool.pulse(
                props.initial.exported.name,
                identityResult,
                identifier ?? SUBSCRIBE_ID,
            );
            break;
    }
};

const onPlugConnectionUpdated = () => {
    const plug = (window as any).ic?.plug as PlugInterface;

    if (plug === undefined) throw new Error('plug can not be undefined');

    switch (props.initial.from) {
        case 'login':
        case 'host-login':
            if (isPlug) {
                new Promise(async (resolve) => {
                    const timeout = setTimeout(() => resolve(false), 233);
                    const connected = await plug.isConnected();
                    clearTimeout(timeout);
                    resolve(connected);
                }).then((isConnected) => {
                    if (isConnected) {
                        const agent = plug.sessionManager.sessionData.agent;
                        if (agent) {
                            plug.sessionManager.sessionData.agent.getPrincipal().then((p) => {
                                const principal = p.toText();
                                const createActor = getActorCreatorByPlug(plug);
                                const actorIdentity: ActorIdentity = {
                                    source: 'plug',
                                    principal,
                                    create: createActor,
                                };
                                onIdentityChanged(actorIdentity, 'plug');
                            });
                        }
                    }
                });
            }
    }
};

// If the call logo is changed, the update time
watch(
    () => props.calling,
    () => refresh(),
);

// The changes in the introduction of variable names need to be re -subscribed to
watch(
    () => outerName.value,
    () => subscribeImport(),
);

watch(
    () => hostAgent.value,
    () => {
        // console.error("store agent", hostAgent.value); // Supervision Host identity changes
        if (props.initial.from === 'host') onHost();
    },
);

const onHost = async () => {
    const agent: HttpAgent | undefined = hostAgent.value;

    assureIdentityRuntime(props.initial, []);

    let identity: ActorIdentity | undefined = undefined;
    if (agent !== undefined) {
        const principal = (await agent.getPrincipal()).toText();
        identity = {
            source: 'host',
            principal: principal,
            create: getActorCreatorByAgent(agent),
        };
        const identityRecord: ActorIdentityRecord = {
            identity,
            records: [],
        };
        readIdentityRuntime(props.initial)!.push({ ok: identityRecord }); // Set directly host
    } else {
        readIdentityRuntime(props.initial)!.push({ err: 'Host identity is missing.' });
    }

    onPulse(identity !== undefined ? { ok: identity } : undefined);

    refresh();

    changed();
};

const onLogin = () => (loginShow.value = true);
const onLogout = () => onIdentityChanged(undefined, undefined);

const onOuterLogin = () => (outerLoginShow.value = true);
const onOuterIdentityChanged = (
    identity: ActorIdentity | undefined,
    type: IdentitySource | undefined,
) => {
    console.error('onOuterIdentityChanged', identity, type, identifier);
    if (identifier === undefined) return;
    props.runningLight.identityPool.pulse(identifier, identity, type);
};
const onOuterLogout = () => onOuterIdentityChanged(undefined, undefined);
const onOuterHost = async () => {
    const agent: HttpAgent | undefined = hostAgent.value;

    if (agent === undefined) return;

    const principal = (await agent.getPrincipal()).toText();
    const identity: ActorIdentity = {
        source: 'host',
        principal: principal,
        create: getActorCreatorByAgent(agent),
    };

    onOuterIdentityChanged(identity, 'host');
};

// Import variable name change
const onOuterNameChanged = () => {
    const item = outerIdentityValues.value.find((value) => value.name === outerName.value);

    if (item) {
        outerName.value = item.name;
        onOuterRuntimeChanged();
    } else {
        outerName.value = '';
        deleteRuntime(props.initial); // Delete the running variable when there are errors
        changed();
    }
};

// Export variable name change
const onExportedOuterNameChanged = () => {
    const value = exportedOuterName.value.trim();

    if (value === '') exportedOuterName.value = value; // Remove the head and tail space
    else if (validateExportedOuterName.value) {
        props.runningLight.outerPool.move(value, lastExportedOuterName, identifier ?? SUBSCRIBE_ID);

        const identityRecordResults = readIdentityRuntime(props.initial) ?? [];

        const identityResult =
            identityRecordResults.length &&
            identityRecordResults[identityRecordResults.length - 1]?.ok
                ? { ok: identityRecordResults[identityRecordResults.length - 1]!.ok!.identity }
                : undefined;
        setTimeout(() => onPulse(identityResult), 133);
    }

    lastExportedOuterName = value;

    changed();
};

const produce = (): DataResult<CanisterIdentity> => {
    if (!initialed)
        return { err: { message: `${props.status} outer source has not been initial.` } };

    const ok: CanisterIdentity = props.initial;

    if (ok.from === 'outer') {
        // Must require introduced variables
        if (!outerName.value || !identityValueItem.value)
            return { err: { message: `outer variable must has name`, el: outerNameRef.value } };
        ok.name = outerName.value;
        ok.detail = identityValueItem.value.detail;
    }

    if (isCanisterIdentityHasExported(ok.from) && ok.exported) {
        // If you have a name, insert it
        const exportedName = exportedOuterName.value.trim();
        if (exportedName) {
            if (!validateExportedOuterName.value) {
                // The export name is invalid
                return {
                    err: {
                        message: 'outer variable name is not valid.',
                        el: exportedOuterNameRef.value,
                    },
                };
            }
            ok.exported.name = exportedName;
        } else {
            delete ok.exported.name;
        }
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<CanisterIdentity>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' ||
            ((props.initial.from !== 'outer' || !!outerNameRef.value) &&
                (!isCanisterIdentityHasExported(props.initial.from) ||
                    props.initial.exported?.target !== 'outer' ||
                    !!exportedOuterNameRef.value)),
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div
        class="running-light-canister-identity-content"
        :class="{ 'padding-top': props.status === 'using' || last }"
    >
        <span v-if="props.status === 'using'">Canister Calling identity</span>
        <div class="identity-content">
            <div class="main-identity">
                <template v-if="props.initial.from === 'anonymous'">
                    <div class="anonymous" v-if="props.status === 'using' || last">
                        <div class="left">
                            <div class="principal" :class="{ 'margin-bottom': last }">
                                {{
                                    `${
                                        source === 'anonymous' ? 'Anonymous' : ''
                                    } identity: ${principal}`
                                }}
                            </div>
                            <div class="last" v-if="last">
                                {{ `Last call time: ${new Date(last)}` }}
                            </div>
                        </div>
                        <div class="right">
                            <span class="dashed">Anonymous identity call</span>
                        </div>
                    </div>
                </template>
                <template v-if="props.initial.from === 'host'">
                    <div class="host">
                        <div class="left">
                            <div class="principal" :class="{ 'margin-bottom': last }">
                                {{
                                    `${source === 'host' ? 'Host' : ''} identity: ${
                                        principal ? principal : '--'
                                    }`
                                }}
                            </div>
                            <div class="last" v-if="last">
                                {{ `Last call time: ${new Date(last)}` }}
                            </div>
                        </div>
                        <div class="right">
                            <span class="dashed">
                                {{ principal ? 'Host identity' : 'please sign in Host' }}
                            </span>
                        </div>
                    </div>
                </template>
                <template v-else-if="props.initial.from === 'login'">
                    <div class="login">
                        <div class="left">
                            <div
                                class="principal"
                                :class="{ error: !principal, 'margin-bottom': last }"
                            >
                                {{
                                    `${source === 'host' ? 'Host' : 'Login'} identity: ${
                                        principal ? principal : 'Not logged in'
                                    }`
                                }}
                            </div>
                            <div class="last" v-if="last">
                                {{ `Last call time: ${new Date(last)}` }}
                            </div>
                        </div>
                        <div class="right">
                            <span class="button login" v-if="!principal" @click="onLogin">
                                Login
                            </span>
                            <span class="button logout" v-else @click="onLogout">Logout</span>
                        </div>
                    </div>
                </template>
                <template v-else-if="props.initial.from === 'host-login'">
                    <div class="host-login">
                        <div class="left">
                            <div
                                class="principal"
                                :class="{ error: !principal, 'margin-bottom': last }"
                            >
                                {{
                                    `${source === 'host' ? 'Host' : 'Log in'} identity: ${
                                        principal ? principal : 'Not logged in'
                                    }`
                                }}
                            </div>
                            <div class="last" v-if="last">
                                {{ `Last call time: ${new Date(last)}` }}
                            </div>
                        </div>
                        <div class="right">
                            <template v-if="source === 'host'">
                                <span class="button login" @click="onLogin"> Switch </span>
                            </template>
                            <template v-else-if="principal">
                                <span class="button login" @click="onHost" v-if="hostAgent">
                                    Use Host identity
                                </span>
                                <span class="button logout" @click="onLogout">Logout</span>
                            </template>
                            <template v-else>
                                <span class="button login" @click="onHost" v-if="hostAgent">
                                    Use Host identity
                                </span>
                                <span class="button login" @click="onLogin"> Login </span>
                            </template>
                        </div>
                    </div>
                </template>
                <template v-else-if="props.initial.from === 'inner'">
                    <div class="inner">
                        <div class="left">
                            <div
                                class="principal"
                                :class="{ error: !principal, 'margin-bottom': last }"
                            >
                                {{
                                    `${source === 'host' ? 'Host' : 'Login'} identity: ${
                                        principal ? principal : 'Not logged in'
                                    }`
                                }}
                            </div>
                            <div class="last" v-if="last">
                                {{ `Last call time: ${new Date(last)}` }}
                            </div>
                        </div>
                        <div class="right">
                            <span class="dashed" v-if="props.status === 'using'"
                                >Use internal identity</span
                            >
                        </div>
                    </div>
                </template>
                <template v-else-if="props.initial.from === 'outer'">
                    <div class="outer">
                        <div class="left">
                            <div
                                class="principal"
                                :class="{ error: !principal, 'margin-bottom': last }"
                            >
                                {{
                                    `${source === 'host' ? 'Host' : 'Login'} identity: ${
                                        principal ? principal : 'Not logged in'
                                    }`
                                }}
                            </div>
                            <div class="last" v-if="last">
                                {{ `Last call time: ${new Date(last)}` }}
                            </div>
                        </div>
                        <div class="right">
                            <template v-if="props.initial.detail === 'login'">
                                <span class="button login" v-if="!principal" @click="onOuterLogin">
                                    Login
                                </span>
                                <span class="button logout" v-else @click="onOuterLogout">
                                    Logout
                                </span>
                            </template>
                            <template v-else-if="props.initial.detail === 'host-login'">
                                <template v-if="source === 'host'">
                                    <span class="button login" @click="onOuterLogin"> Switch </span>
                                </template>
                                <template v-else-if="principal">
                                    <span
                                        class="button login"
                                        @click="onOuterHost"
                                        v-if="hostAgent"
                                    >
                                        Use Host identity
                                    </span>
                                    <span class="button logout" @click="onOuterLogout">Logout</span>
                                </template>
                                <template v-else>
                                    <span
                                        class="button login"
                                        @click="onOuterHost"
                                        v-if="hostAgent"
                                    >
                                        Use Host identity
                                    </span>
                                    <span class="button login" @click="onOuterLogin"> Log in </span>
                                </template>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
            <div
                class="right"
                v-if="props.status === 'using' && props.initial.from !== 'anonymous'"
            >
                <div
                    class="blank"
                    v-if="
                        !['login', 'host-login', 'inner'].includes(props.initial.from) ||
                        props.initial.exported?.target === 'outer'
                    "
                ></div>
                <!-- If it is imported, then external variables must be specified -->
                <template v-if="props.initial.from === 'outer'">
                    <div class="input">
                        <span>Choose to call identity</span>
                        <div class="select">
                            <select
                                v-model="outerName"
                                @change="onOuterNameChanged"
                                ref="outerNameRef"
                            >
                                <option
                                    v-for="item in outerIdentityValues"
                                    :key="item.name"
                                    :value="item.name"
                                >
                                    {{ item.name }}
                                </option>
                            </select>
                        </div>
                        <span class="outer-name-error" v-if="!outerName">
                            {{
                                `Please select the internal, length: ${outerIdentityValues.length}`
                            }}
                        </span>
                    </div>
                </template>
                <!-- If you have an export identity, you can enter the export variable name -->
                <template
                    v-if="
                        ['login', 'host-login', 'inner'].includes(props.initial.from) &&
                        props.initial.exported?.target === 'outer'
                    "
                >
                    <div class="input">
                        <span>{{ props.initial.exported.tip }}</span>
                        <input
                            class="outer-name-input"
                            v-model="exportedOuterName"
                            placeholder="Export variable name"
                            maxlength="32"
                            @input="onExportedOuterNameChanged"
                            ref="exportedOuterNameRef"
                        />
                        <span
                            class="outer-name-error"
                            v-if="exportedOuterName.trim() && !validateExportedOuterName"
                        >
                            {{ 'Variable name repeat' }}
                        </span>
                    </div>
                </template>
            </div>
        </div>
        <LightLoginVue :show="loginShow" @close="loginShow = false" @identity="onIdentityChanged" />
        <LightLoginVue
            :show="outerLoginShow"
            @close="outerLoginShow = false"
            @identity="onOuterIdentityChanged"
        />
    </div>
</template>

<style lang="less" scoped>
.running-light-canister-identity-content {
    @apply w-full;
    &.padding-top {
        @apply pt-1;
    }
    > span {
        @apply text-xs opacity-50;
    }
    > .identity-content {
        @apply w-full flex justify-between flex-row items-start;
        > .main-identity {
            @apply w-full;
            > div {
                border-top: 1px solid #ccc5;
                width: 100%;
                padding-top: 5px;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
                > .left {
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: flex-start;
                    > .principal {
                        font-size: 14px;
                        &.margin-bottom {
                            margin-bottom: 4px;
                        }
                    }
                    > .last {
                        font-size: 10px;
                    }
                    > .error {
                        color: red;
                        opacity: 0.9;
                    }
                }
                > .right {
                    display: flex;
                    flex-direction: row;
                    justify-content: flex-end;
                    align-items: center;
                    padding: 8px 0;
                    > span {
                        margin-left: 5px;
                        flex-shrink: 0;
                    }
                    > .dashed {
                        border: 1px dashed #ccc;
                        border-radius: 5px;
                        padding: 5px 10px;
                    }
                    > .login,
                    > .logout {
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        padding: 5px 10px;
                    }
                    > .button {
                        user-select: none;
                        cursor: pointer;
                    }
                }
                &.anonymous {
                    > .left {
                        > .principal {
                            display: none;
                            opacity: 0;
                        }
                    }
                }
            }
        }
        > .right {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            padding-bottom: 10px;
            > .blank {
                width: 10px;
                height: 100%;
            }
            > .input {
                width: 220px;
                flex-shrink: 0;
                border-left: 1px solid #ccc;
                padding-left: 10px;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
                > .select {
                    margin-top: 5px;
                    width: 100%;
                    height: 28px;
                    > select {
                        width: 100%;
                        height: 100%;
                        border: 1px solid #77777755;
                        padding-left: 5px;
                    }
                }
                > .outer-name-input {
                    margin-top: 5px;
                    width: 100%;
                    height: 28px;
                    border: 1px solid #77777755;
                    padding: 0 5px;
                }
                > .outer-name-error {
                    margin-top: 5px;
                    flex-shrink: 0;
                    font-size: 14px;
                    color: #880000;
                }
            }
        }
    }
}
</style>
