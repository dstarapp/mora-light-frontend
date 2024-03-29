<script lang="ts" setup>
import { ref } from 'vue';
import { HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { AuthClientStorage } from '@dfinity/auth-client/lib/cjs/storage';
import { IC } from '@astrox/sdk-web';
import { AbstractedClientStorage } from '@astrox/sdk-core';
import {
    ActorIdentity,
    PlugInterface,
    getActorCreatorByAgent,
    getActorCreatorByIC,
    getActorCreatorByPlug,
} from '@mora-light/core/types/candid';
import { getDerivationOrigin, onPlugConnectionUpdate } from './login';

// Temporary memory in the component, lose if you leave
class MemoryStorage implements AuthClientStorage, AbstractedClientStorage {
    private data: Record<string, string> = {};
    get(key: string): Promise<string | null> {
        return new Promise((resolve) => {
            resolve(this.data[key] ?? null);
        });
    }
    set(key: string, value: string): Promise<void> {
        return new Promise((resolve) => {
            this.data[key] = value;
            resolve();
        });
    }
    remove(key: string): Promise<void> {
        return new Promise((resolve) => {
            delete this.data[key];
            resolve();
        });
    }
}

const props = defineProps({
    show: {
        type: Boolean,
        default: false,
    },
});

const hasPlug = ref((window as any).ic?.plug !== undefined);

const emit = defineEmits(['close', 'identity']);

const onClose = () => emit('close');

const onTouchMove = (e: any) => e.preventDefault();

const onInternetIdentity = async (e: any) => {
    e.stopPropagation();
    console.error('onInternetIdentity');

    const client = await AuthClient.create({
        storage: new MemoryStorage(),
        // storage: new LocalStorage('internet-identity-2:'), // You can specify the prefixes and save it in the localStorage
    });

    if (client === undefined) throw new Error('client can not be undefined');

    const afterLogin = async () => {
        const identity = client.getIdentity();
        const principal = identity.getPrincipal().toText();
        const agent = new HttpAgent({
            host: 'https://boundary.ic0.app/', // Cross the line interface by default
            identity,
        });
        const createActor = getActorCreatorByAgent(agent);
        const actorIdentity: ActorIdentity = {
            source: 'internet-identity',
            principal,
            create: createActor,
        };
        emit('identity', actorIdentity, 'internet-identity');
        emit('close');
    };

    const isAuthenticated = await client.isAuthenticated();
    if (isAuthenticated) {
        afterLogin();
        return;
    }

    client.login({
        identityProvider: 'https://identity.ic0.app', // This is defaults
        maxTimeToLive: BigInt('3600000000000'), // 8 hours by default, changed to 1 hour
        // Open the window
        windowOpenerFeatures:
            'toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100',
        derivationOrigin: getDerivationOrigin(),
        onSuccess: () => {
            console.log('Internet Identity Login Successful!');
            afterLogin();
        },
        onError: (error) => {
            console.error('Internet Identity Login Failed:', error);
        },
    });
};

const onPlug = async (e: any) => {
    e.stopPropagation();
    console.error('onPlug');

    const plug = (window as any).ic?.plug as PlugInterface;

    if (plug === undefined) throw new Error('plug can not be undefined');

    const afterLogin = async (plug: PlugInterface) => {
        const principal = (await plug.sessionManager.sessionData.agent.getPrincipal()).toText();
        const createActor = getActorCreatorByPlug(plug);
        const actorIdentity: ActorIdentity = {
            source: 'plug',
            principal,
            create: createActor,
        };
        emit('identity', actorIdentity, 'plug');
        emit('close');
    };

    if (!plug.sessionManager.onConnectionUpdate)
        plug.sessionManager.onConnectionUpdate = onPlugConnectionUpdate;

    const isConnected = await new Promise(async (resolve) => {
        const timeout = setTimeout(() => resolve(false), 233);
        const connected = await plug.isConnected();
        clearTimeout(timeout);
        resolve(connected);
    });
    if (isConnected) {
        const agent = plug.sessionManager.sessionData.agent;
        if (agent) {
            afterLogin(plug);
            return;
        }
    }

    const whitelist: string[] = [];

    plug.requestConnect({
        whitelist,
        // onConnectionUpdate: onPlugConnectionUpdate,
        timeout: 60000, // The default is 2 minutes
    })
        .then((r: any) => {
            const agent = plug.agent;
            if (!agent) throw new Error('agent must be valid.');
            console.error('Plug Login Successful!');
            if (!plug.sessionManager.onConnectionUpdate)
                plug.sessionManager.onConnectionUpdate = onPlugConnectionUpdate;
            afterLogin(plug);
        })
        .catch((e: any) => {
            // Error: The agent creation was rejected. // Click directly to return this
            console.error('Plug Login Failed:', `${e}`);
        });
};

const onAstrox = async (e: any) => {
    e.stopPropagation();
    console.error('onAstrox');

    const afterLogin = (instance: any) => {
        const principal = instance.principal.toText();
        const createActor = getActorCreatorByIC(instance);
        const actorIdentity: ActorIdentity = {
            source: 'astrox-me',
            principal,
            create: createActor,
        };
        emit('identity', actorIdentity, 'astrox-me');
        emit('close');
    };

    const storage = new MemoryStorage();

    const instance = await IC.create({
        storage,
        useFrame: document.body.clientWidth > 768 ? true : undefined,
        onAuthenticated: async (ic: any) => {
            console.error('Astrox ME onAuthenticated ic', ic);
            afterLogin(instance);
        },
    });

    instance.isAuthenticated().then((authenticated) => {
        if (authenticated) return;
        instance.connect({
            storage,
            useFrame: !(window.innerWidth < 768),
            signerProviderUrl: 'https://63k2f-nyaaa-aaaah-aakla-cai.raw.ic0.app/signer',
            // walletProviderUrl: '',
            identityProvider: 'https://63k2f-nyaaa-aaaah-aakla-cai.raw.ic0.app/login#authorize',
            delegationTargets: [],
            customDomain: getDerivationOrigin(),
            onAuthenticated: async (ic: any) => {
                console.error('Astrox ME connect onAuthenticated ic', ic);
                afterLogin(ic);
            },
        });
    });
};
</script>

<template>
    <transition name="el-fade-in-linear">
        <div
            class="plugin-login-content"
            v-if="show"
            @click="onClose"
            @touchmove="onTouchMove"
            @scroll="onTouchMove"
        >
            <div class="plugin-login-box">
                <div class="plugin-login-close">
                    <i class="iconfont icon-close"></i>
                </div>
                <div class="plugin-login-title">
                    <h2>Connect Web3 Identity</h2>
                    <p>You need to connect a IC Identity</p>
                </div>
                <div class="plugin-login-list">
                    <div @click="onInternetIdentity">
                        <span>Internet Identity</span>
                        <img class="ic-icon" src="../../assets/svg/logo-ic.svg" alt="" />
                    </div>
                    <div @click="onPlug" v-if="hasPlug">
                        <span>Plug</span>
                        <img class="plug-icon" src="../../assets/svg/logo-plug.png" alt="" />
                    </div>
                    <div @click="onAstrox">
                        <span>Astrox ME</span>
                        <img class="me-icon" src="../../assets/svg/logo-astrox.svg" alt="" />
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<style lang="less" scoped>
.plugin-login-content {
    @apply w-full h-full flex justify-center items-center fixed top-0 left-0 right-0 bottom-0 z-10001 backdrop-filter backdrop-blur-md bg-dark-900/20 overflow-hidden;

    .plugin-login-box {
        @apply w-149 rounded-20px absolute px-13 py-10 flex flex-col bg-white dark:(bg-dark-600 border border-dark-200) <sm:(w-9/10 px-5 py-6);

        .plugin-login-close {
            @apply absolute top-0 -right-8 cursor-pointer <sm:(right-0 -mt-9);

            i {
                @apply text-white text-lg dark:(text-light-900/60);
            }
        }

        .plugin-login-title {
            @apply w-full text-left;

            h2 {
                @apply block font-bold text-3xl text-black mb-1 dark:(text-light-900) <sm:(text-2xl);
            }

            p {
                @apply block text-base text-gray-500 dark:(text-light-900/50);
            }
        }

        .plugin-login-list {
            @apply flex flex-col;

            div {
                @apply w-full flex justify-between items-center bg-transparent border border-gray-200 rounded-xl mt-6 w-full h-55px cursor-auto transition duration-300 dark:(border-dark-100);
                
                span {
                    @apply inline-block ml-6 text-base text-black font-medium dark:(text-light-900/80);
                }

                img {
                    @apply mr-6;
                    &.ic-icon {
                        @apply w-11;
                    }

                    &.plug-icon {
                        @apply w-6;
                    }

                    &.me-icon {
                        @apply w-8;
                    }
                }

                &:hover {
                    @apply bg-gray-100 transition duration-300 cursor-pointer dark:(bg-dark-300);
                }
            }
        }
    }
}
</style>
