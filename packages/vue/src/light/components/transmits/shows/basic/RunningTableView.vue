<script lang="ts" setup>
import { computed, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    TableUI,
    TableViewConstraint,
    TableViewSupportedType,
} from '@mora-light/core/types/transmit';
import { StringResult } from '@mora-light/core/types/common';
import { exportTableAsXLSX } from '../../../../../utils/index';
import { ElTable, ElTableColumn } from 'element-plus';

type SupportedCandidValue1 = {
    header: string[];
    rows: string[][];
};

type SupportedCandidValue = SupportedCandidValue1;

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    from: {
        type: Object as PropType<TableViewSupportedType>,
        required: true, // The running result type of the light also needs to be used
    },
    constraint: {
        type: Object as PropType<TableViewConstraint>,
        required: true,
    },
    runtime: {
        type: Object as PropType<StringResult<SupportedCandidValue>>,
        required: false,
    },
    callingRefresh: {
        type: Number,
        required: true,
    },
});

const error = ref<string | undefined>(props.runtime?.err);
const runtime = ref<SupportedCandidValue | undefined>(props.runtime?.ok);

const value = computed<{ headers: string[]; data: Record<string, string>[] } | undefined>(() => {
    const value = runtime.value;
    if (value === undefined) return undefined;

    const data: Record<string, string>[] = [];
    for (let i = 0; i < value.rows.length; i++) {
        const row: Record<string, string> = {};
        for (let j = 0; j < value.header.length; j++) {
            row[value.header[j]] = value.rows[i][j];
        }
        data.push(row);
    }

    return { headers: value.header, data };
});

watch(
    () => [props.status, props.from, props.constraint, props.runtime, props.callingRefresh],
    () => {
        error.value = props.runtime?.err;
        runtime.value = props.runtime?.ok;
    },
);

const ui = computed<TableUI | undefined>(() => props.constraint.ui);

const customLabel = computed<string>(() => ui.value?.customLabel ?? '');

const customBorder = computed<boolean>(() => ui.value?.customBorder ?? true);

const customFixedHeader = computed<boolean>(() => ui.value?.customFixedHeader ?? true);
</script>

<template>
    <div class="running-table-view-content">
        <div class="error" v-if="error !== undefined">
            <i class="iconfont icon-plugin-error"></i>
            <p>{{ error }}</p>
        </div>
        <template v-else>
            <div class="label" v-if="customLabel">
                {{ customLabel }}
            </div>
            <div class="table-content" v-if="value !== undefined">
                <div class="export" @click="exportTableAsXLSX('el-table', customLabel)">
                    <i class="iconfont icon-export"></i>Export
                </div>
                <el-table
                    style="width: 100%"
                    :data="value.data"
                    :border="customBorder"
                    id="el-table"
                >
                    <template v-for="(name, i) in value!.headers" :key="i">
                        <template v-if="i === 0">
                            <el-table-column
                                :fixed="customFixedHeader"
                                :prop="name"
                                :label="name"
                            />
                        </template>
                        <template v-else>
                            <el-table-column :prop="name" :label="name" />
                        </template>
                    </template>
                </el-table>
                <div class="tip">
                    <p>{{ value.data.length }} records are found</p>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-table-view-content {
    @apply w-full absolute;
    .label {
        @apply flex w-full font-bold text-lg items-end justify-center dark:(text-light-900);
    }

    .error {
        @apply flex flex-col mt-25;

        i {
            @apply text-6xl text-gray-300 dark:(text-light-900/30);
        }

        p {
            @apply mt-3 text-sm text-gray-400 dark:(text-light-900/40);
        }
    }

    > .table-content {
        @apply w-full mt-6 pb-3 relative;

        :deep(.el-table) {
            th.el-table__cell {
                @apply bg-gray-200 text-black dark:(bg-dark-600 text-light-900/80);
            }
            td.el-table__cell {
                @apply text-sm dark:(!border-dark-300 bg-dark-400 text-light-900/60);
            }
            thead {
                @apply dark:(border-light-100);
            }
            .el-table__inner-wrapper {
                .el-table__header-wrapper {
                    table {
                        @apply !my-0;
                    }
                }
            }
            .el-table__body-wrapper {
                .el-scrollbar {
                    .el-scrollbar__wrap {
                        .el-scrollbar__view {
                            table {
                                @apply !my-0;
                            }
                        }
                    }
                }
                table {
                    @apply !my-0;
                }
            }
        }

        .export {
            @apply text-sm text-right text-green-500 cursor-pointer absolute right-0 -top-6;

            i {
                @apply text-sm mr-1;
            }
        }

        .tip {
            display: flex;
            justify-content: flex-end;
            margin-top: 5px;
            color: #666666;
            font-size: 12px;
            width: 100%;
            text-align: right;
            font-weight: 400;
            align-items: center;

            p {
                font-size: 12px;
                color: #666666;
                line-height: 12px;
            }
        }
    }
}
.dark {
    .running-table-view-content {
        > .table-content {
            :deep(.el-table) {
                --el-table-border-color: #333;
            }
        }
    }
}
</style>
