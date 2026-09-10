<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-flex1 />
			<cl-filter :label="$t('趋势方向')">
				<cl-select v-model="trend" :options="options.trend" prop="trend" :width="120" />
			</cl-filter>
			<cl-filter :label="$t('当前运行')">
				<cl-select v-model="band" :options="options.band" prop="band" :width="120" />
			</cl-filter>
			<cl-filter :label="$t('状态')">
				<cl-select v-model="status" :options="options.status" prop="status" :width="120" />
			</cl-filter>
			<cl-search-key :placeholder="$t('搜索名称、keyName')" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" class="data-table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<cl-upsert ref="Upsert" />
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'tianqin-data'
});

import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	trend: [
		{ label: '多头', value: '多头' },
		{ label: '空头', value: '空头' }
	],
	band: [
		{ label: '主要趋势', value: '主要趋势' },
		{ label: '次级折返', value: '次级折返' }
	],
	status: [
		{ label: '启用', value: 1 },
		{ label: '禁用', value: 0 }
	]
});

// 参数
const trend = ref('多头');
const band = ref('次级折返');
const status = ref(1);

// cl-crud
const Crud = useCrud(
	{
		service: service.tianqin.data,
		onRefresh(params, { next }) {
			next({
				...params,
				trend: trend.value,
				band: band.value,
				status: status.value
			});
		}
	},
	app => {
		// 加载表格数据
		app.refresh({
			size: 100
		});
	}
);

// 自动刷新（每5分钟）
let refreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
	refreshTimer = setInterval(
		() => {
			Crud.value?.refresh();
		},
		5 * 60 * 1000
	);
});

onUnmounted(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}
});

// cl-table
const Table = useTable({
	contextMenu: ['refresh'],
	columns: [
		{
			type: 'index',
			label: '#',
			width: 60
		},
		{
			label: t('合约代码'),
			prop: 'mainSymbol',
			minWidth: 120
		},
		{
			label: t('合约名称'),
			prop: 'name',
			minWidth: 100
		},
		{
			label: t('更新时间'),
			prop: 'updateTime',
			minWidth: 160
		},
		{
			label: t('当前价格'),
			prop: 'price',
			minWidth: 100
		},
		{
			label: '趋势方向',
			prop: 'trend',
			minWidth: 100,
			dict: [
				{ label: '多头', value: '多头', type: 'danger' },
				{ label: '空头', value: '空头', type: 'success' }
			]
		},
		{
			label: '当前运行',
			prop: 'band',
			minWidth: 100,
			dict: [
				{ label: '主要趋势', value: '主要趋势', type: 'primary' },
				{ label: '次级折返', value: '次级折返', type: 'warning' }
			]
		},
		{
			label: 'KDJ信号',
			prop: 'kdjSignal',
			minWidth: 100,
			dict: [
				{ label: '金叉', value: '金叉', type: 'danger' },
				{ label: '死叉', value: '死叉', type: 'success' }
			],
			sortable: 'desc'
		},
		{
			label: 'KDJ值',
			prop: 'kdjValue',
			minWidth: 100,
			sortable: 'desc'
		},
		{
			label: 'CCI值',
			prop: 'cciValue',
			minWidth: 100,
			sortable: 'desc'
		},
		{
			label: '小时趋势方向',
			prop: 'hourTrend',
			minWidth: 100,
			dict: [
				{ label: '多头', value: '多头', type: 'danger' },
				{ label: '空头', value: '空头', type: 'success' }
			],
			sortable: 'desc'
		},
		{
			label: '小时CCI值',
			prop: 'hourCciValue',
			minWidth: 100,
			sortable: 'desc'
		},
		{
			label: t('备注'),
			prop: 'remark',
			minWidth: 200,
			component: {
				name: 'cl-code-json',
				props: {
					popover: true
				}
			}
		},
		{
			type: 'op',
			width: 100,
			buttons: ['edit']
		}
	]
});

// cl-upsert
const Upsert = useUpsert({
	dialog: {
		width: '1000px'
	},

	items: [
		{
			prop: 'code',
			label: '代码',
			span: 12,
			required: true,
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			prop: 'name',
			label: t('名称'),
			span: 12,
			required: true,
			component: {
				name: 'el-input',
				props: {
					disabled: true
				}
			}
		},
		{
			prop: 'remark',
			label: t('备注'),
			component: {
				name: 'el-input',
				props: {
					placeholder: t('请输入备注'),
					rows: 10,
					type: 'textarea'
				}
			}
		},
		{
			prop: 'status',
			label: t('状态'),
			value: 1,
			component: {
				name: 'el-radio-group',
				options: [
					{
						label: t('启用'),
						value: 1
					},
					{
						label: t('禁用'),
						value: 0
					}
				]
			}
		}
	]
});
</script>
<style lang="css">
.data-table .cl-table__op .el-button.is-text {
	--el-button-size: 24px;
	height: var(--el-button-size);
	padding: 5px 11px;
	font-size: 12px;
	border-radius: calc(var(--el-border-radius-base) - 1px);
}
</style>
