<template>
	<cl-crud ref="Crud">
		<cl-row>
			<el-button type="warning" :loading="tasking" @click="onStartTask">
				<cl-svg name="icon-task" class="mr-[5px]" />
				{{ $t('启动更新任务') }}
			</el-button>
			<el-button type="success" :loading="exporting" @click="onExport">
				<cl-svg name="export" class="mr-[5px]" />
				{{ $t('导出') }}
			</el-button>
			<cl-flex1 />
			<cl-filter :label="$t('周趋势')">
				<cl-select
					v-model="weekTrendDirection"
					:options="options.trendDirection"
					prop="weekTrendDirection"
					:width="120"
				/>
			</cl-filter>
			<cl-filter :label="$t('周状态')">
				<cl-select
					v-model="weekTrendState"
					:options="options.trendState"
					prop="weekTrendState"
					:width="120"
				/>
			</cl-filter>
			<cl-filter :label="$t('日趋势')">
				<cl-select
					v-model="dayTrendDirection"
					:options="options.trendDirection"
					prop="dayTrendDirection"
					:width="120"
				/>
			</cl-filter>
			<cl-filter :label="$t('日状态')">
				<cl-select
					v-model="dayTrendState"
					:options="options.trendState"
					prop="dayTrendState"
					:width="120"
				/>
			</cl-filter>
			<cl-filter :label="$t('小时趋势')">
				<cl-select
					v-model="hourTrendDirection"
					:options="options.trendDirection"
					prop="hourTrendDirection"
					:width="120"
				/>
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

import { ref, reactive, nextTick } from 'vue';
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import {
	statusOptions,
	longShortDict,
	kdjSignalDict,
	trendStateDict,
	useStartTask,
	useAutoRefresh,
	useFilterCache
} from '../utils';

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	trendDirection: longShortDict.map(({ type, ...rest }) => rest),
	trendState: trendStateDict.map(({ type, ...rest }) => rest),
	status: statusOptions
});

// 参数
const weekTrendDirection = ref('');
const weekTrendState = ref('');
const dayTrendDirection = ref('多头');
const dayTrendState = ref('');
const hourTrendDirection = ref('多头');
const status = ref(1);

// 导出
const exporting = ref(false);

async function onExport() {
	if (exporting.value) return;

	exporting.value = true;

	try {
		// 获取列表当前的过滤参数（含分页、搜索关键字、筛选条件、排序等）

		const res = await service.tianqin.data.request({
			url: '/export',
			method: 'POST',
			responseType: 'blob',
			data: {
				weekTrendDirection: '',
				weekTrendState: '主要趋势',
				dayTrendDirection: '',
				dayTrendState: '主要趋势',
				hourTrendDirection: '',
				status: 1
			}
		});

		// 从响应头获取文件名
		const disposition = (res as any)?.headers?.['content-disposition'] || '';
		let filename = `数据 ${dayjs().format('YYYY-MM-DD HH_mm_ss')}.zip`;

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
	service.tianqin.data.request({ url: '/startTask', method: 'POST' })
);

// cl-crud
const Crud = useCrud({
	service: service.tianqin.data,
	onRefresh(params, { next }) {
		next({
			...params,
			weekTrendDirection: weekTrendDirection.value,
			weekTrendState: weekTrendState.value,
			dayTrendDirection: dayTrendDirection.value,
			dayTrendState: dayTrendState.value,
			hourTrendDirection: hourTrendDirection.value,
			status: status.value
		});
	}
});

// 筛选条件缓存：进入页面时先恢复缓存条件，再加载列表数据
useFilterCache(
	'data',
	{
		weekTrendDirection,
		weekTrendState,
		dayTrendDirection,
		dayTrendState,
		hourTrendDirection,
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
			width: 60,
			fixed: true
		},
		{
			label: t('合约代码'),
			prop: 'contractCode',
			minWidth: 120,
			fixed: true
		},
		{
			label: t('合约名称'),
			prop: 'contractName',
			minWidth: 100,
			fixed: true
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
			label: '周趋势',
			prop: 'weekTrendDirection',
			minWidth: 100,
			dict: longShortDict,
			sortable: 'desc'
		},
		{
			label: '周状态',
			prop: 'weekTrendState',
			minWidth: 100,
			dict: trendStateDict,
			sortable: 'desc'
		},
		{
			label: '日趋势',
			prop: 'dayTrendDirection',
			minWidth: 100,
			dict: longShortDict,
			sortable: 'desc'
		},
		{
			label: '日状态',
			prop: 'dayTrendState',
			minWidth: 100,
			dict: trendStateDict,
			sortable: 'desc'
		},
		{
			label: '小时趋势',
			prop: 'hourTrendDirection',
			minWidth: 100,
			dict: longShortDict,
			sortable: 'desc'
		},
		{
			label: '小时CCI',
			prop: 'hourCciValue',
			minWidth: 120,
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
			label: '周KDJ信号',
			prop: 'weekKdjSignal',
			minWidth: 120,
			dict: kdjSignalDict,
			sortable: 'desc'
		},
		{
			label: '周KDJ值',
			prop: 'weekKdjValue',
			minWidth: 120,
			sortable: 'desc'
		},
		{
			label: '日KDJ信号',
			prop: 'dayKdjSignal',
			minWidth: 100,
			dict: kdjSignalDict,
			sortable: 'desc'
		},
		{
			label: '日KDJ值',
			prop: 'dayKdjValue',
			minWidth: 100,
			sortable: 'desc'
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
.data-table .cl-table__op .el-button.is-text {
	--el-button-size: 24px;
	height: var(--el-button-size);
	padding: 5px 11px;
	font-size: 12px;
	border-radius: calc(var(--el-border-radius-base) - 1px);
}
</style>
