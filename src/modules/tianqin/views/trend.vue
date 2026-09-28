<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<el-button type="warning" :loading="tasking" @click="onStartTask">
				<cl-svg name="icon-task" class="mr-[5px]" />
				{{ $t('启动更新任务') }}
			</el-button>
			<el-button type="success" :loading="exporting" @click="onExport">
				<cl-svg name="export" class="mr-[5px]" />
				{{ $t('导出') }}
			</el-button>
			<cl-flex1 />
			<cl-filter :label="$t('趋势方向')">
				<cl-select
					v-model="trendDirection"
					:options="options.trendDirection"
					prop="trendDirection"
					:width="120"
				/>
			</cl-filter>
			<cl-filter :label="$t('当前运行')">
				<cl-select
					v-model="trendState"
					:options="options.trendState"
					prop="trendState"
					:width="120"
				/>
			</cl-filter>
			<cl-filter :label="$t('状态')">
				<cl-select v-model="status" :options="options.status" prop="status" :width="120" />
			</cl-filter>
			<cl-search-key :placeholder="$t('搜索名称、keyName')" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" class="trend-table" />
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
	name: 'tianqin-trend'
});

import { ref, reactive, nextTick } from 'vue';
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import { statusOptions, useStartTask, useAutoRefresh, useFilterCache } from '../utils';

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	trendDirection: [
		{ label: '上涨趋势', value: '上涨趋势' },
		{ label: '下跌趋势', value: '下跌趋势' },
		{ label: '震荡', value: '震荡' }
	],
	trendState: [
		{ label: '主趋势', value: '主趋势' },
		{ label: '浅回调', value: '浅回调' },
		{ label: '深回调', value: '深回调' },
		{ label: '浅回调企稳', value: '浅回调企稳' },
		{ label: '深回调企稳', value: '深回调企稳' },
		{ label: '浅反弹', value: '浅反弹' },
		{ label: '深反弹', value: '深反弹' },
		{ label: '浅反弹企稳', value: '浅反弹企稳' },
		{ label: '深反弹企稳', value: '深反弹企稳' },
		{ label: '震荡偏上', value: '震荡偏上' },
		{ label: '震荡偏下', value: '震荡偏下' },
		{ label: '震荡中位', value: '震荡中位' }
	],
	status: statusOptions
});

// 参数
const trendDirection = ref('');
const trendState = ref('主趋势');
const status = ref(1);

// 导出
const exporting = ref(false);

async function onExport() {
	if (exporting.value) return;

	exporting.value = true;

	try {
		// 获取列表当前的过滤参数（含分页、搜索关键字、筛选条件、排序等）
		const params = Crud.value?.getParams() || {};

		const res = await service.tianqin.trend.request({
			url: '/export',
			method: 'POST',
			responseType: 'blob',
			data: {
				trendDirection: trendDirection.value,
				trendState: trendState.value,
				status: status.value
			}
		});

		// 从响应头获取文件名
		const disposition = (res as any)?.headers?.['content-disposition'] || '';
		let filename = `趋势数据 ${dayjs().format('YYYY-MM-DD HH_mm_ss')}.zip`;

		if (disposition) {
			const match = disposition.match(/filename\*?=(?:UTF-8'')?(["']?)([^;"'\n]+)\1/i);
			if (match) {
				filename = decodeURIComponent(match[2]);
			}
		}

		// 创建下载链接
		const blob = res instanceof Blob ? res : new Blob([res as any]);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);

		ElMessage.success(t('导出成功'));
	} catch (err: any) {
		// 处理blob类型的错误响应
		if (err instanceof Blob) {
			const text = await err.text();
			try {
				const json = JSON.parse(text);
				ElMessage.error(json.message || t('导出失败'));
			} catch {
				ElMessage.error(t('导出失败'));
			}
		} else {
			ElMessage.error(err?.message || t('导出失败'));
		}
	} finally {
		exporting.value = false;
	}
}

// 启动更新任务
const { tasking, onStartTask } = useStartTask(() =>
	service.tianqin.trend.request({ url: '/startTask', method: 'POST' })
);

// cl-crud
const Crud = useCrud(
	{
		service: service.tianqin.trend,
		onRefresh(params, { next }) {
			next({
				...params,
				trendDirection: trendDirection.value,
				trendState: trendState.value,
				status: status.value
			});
		}
	}
);

// 筛选条件缓存：进入页面时先恢复缓存条件，再加载列表数据
useFilterCache(
	'trend',
	{
		trendDirection,
		trendState,
		status
	},
	() => {
		nextTick(() => Crud.value?.refresh({ size: 100 }));
	}
);

// 自动刷新（每5分钟）
useAutoRefresh(() => Crud.value?.refresh());

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
			prop: 'contractCode',
			minWidth: 120
		},
		{
			label: t('合约名称'),
			prop: 'contractName',
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
			prop: 'trendDirection',
			minWidth: 100,
			sortable: 'asc',
			dict: [
				{ label: '上涨趋势', value: '上涨趋势', type: 'danger' },
				{ label: '下跌趋势', value: '下跌趋势', type: 'success' },
				{ label: '震荡', value: '震荡', type: 'info' }
			]
		},
		{
			label: '当前状态',
			prop: 'trendState',
			minWidth: 100,
			sortable: 'desc',
			dict: [
				{ label: '主趋势', value: '主趋势', type: 'primary' },
				{ label: '浅回调', value: '浅回调', type: 'warning' },
				{ label: '深回调', value: '深回调', type: 'warning' },
				{ label: '浅回调企稳', value: '浅回调企稳', type: 'info' },
				{ label: '深回调企稳', value: '深回调企稳', type: 'info' },
				{ label: '浅反弹', value: '浅反弹', type: 'success' },
				{ label: '深反弹', value: '深反弹', type: 'success' },
				{ label: '浅反弹企稳', value: '浅反弹企稳', type: 'info' },
				{ label: '深反弹企稳', value: '深反弹企稳', type: 'info' },
				{ label: '震荡偏上', value: '震荡偏上', type: 'info' },
				{ label: '震荡偏下', value: '震荡偏下', type: 'info' },
				{ label: '震荡中位', value: '震荡中位', type: 'info' }
			]
		},
		{
			label: '趋势强度',
			prop: 'trendStrength',
			minWidth: 100,
			sortable: 'desc',
			formatter: (row: any) => {
				return row.trendStrength != null ? `${row.trendStrength}%` : '-';
			}
		},
		{
			label: '操作建议',
			prop: 'action',
			minWidth: 100,
			sortable: 'desc'
		},
		{
			label: t('操作详情'),
			prop: 'actionDetail',
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
			prop: 'contractCode',
			label: '合约代码',
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
			prop: 'contractName',
			label: t('合约名称'),
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
.trend-table .cl-table__op .el-button.is-text {
	--el-button-size: 24px;
	height: var(--el-button-size);
	padding: 5px 11px;
	font-size: 12px;
	border-radius: calc(var(--el-border-radius-base) - 1px);
}
</style>
