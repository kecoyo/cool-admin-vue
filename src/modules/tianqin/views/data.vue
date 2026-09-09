<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-flex1 />
			<!-- 筛选 -->
			<cl-filter :label="$t('日期时间')">
				<cl-select v-model="time" :options="options.time" prop="time" :width="200" />
			</cl-filter>
			<cl-filter :label="$t('趋势方向')">
				<cl-select v-model="trend" :options="options.trend" prop="trend" :width="120" />
			</cl-filter>
			<cl-filter :label="$t('当前运行')">
				<cl-select v-model="band" :options="options.band" prop="band" :width="120" />
			</cl-filter>
			<cl-search-key :placeholder="$t('搜索名称、keyName')" />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
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

import { ref, reactive } from 'vue';
import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	time: [] as { label: string; value: string }[],
	trend: [
		{
			label: '多头',
			value: '多头'
		},
		{
			label: '空头',
			value: '空头'
		}
	],
	band: [
		{
			label: '主要趋势',
			value: '主要趋势'
		},
		{
			label: '次级折返',
			value: '次级折返'
		}
	]
});

// 参数
const time = ref('');
const trend = ref('多头');
const band = ref('次级折返');

// cl-crud
const Crud = useCrud(
	{
		service: service.tianqin.data,
		onRefresh(params, { next }) {
			next({
				...params,
				createTime: time.value,
				trend: trend.value,
				band: band.value,
				size: 100
			});
		}
	},
	app => {
		// 先加载日期时间列表，再加载表格数据
		service.tianqin.data
			.request({
				url: '/times',
				method: 'GET'
			})
			.then((res: string[]) => {
				options.time = (res || []).map(item => ({
					label: item,
					value: item
				}));

				// 取第一个日期时间作为参数
				if (options.time.length > 0) {
					time.value = options.time[0].value;
				}

				// 加载表格数据
				app.refresh();
			});
	}
);

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
			prop: 'code',
			minWidth: 100
		},
		{
			label: t('合约名称'),
			prop: 'name',
			minWidth: 100
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
				{
					label: '多头',
					value: '多头',
					type: 'danger'
				},
				{
					label: '空头',
					value: '空头',
					type: 'success'
				}
			]
		},
		{
			label: '当前运行',
			prop: 'band',
			minWidth: 100,
			dict: [
				{
					label: '主要趋势',
					value: '主要趋势',
					type: 'primary'
				},
				{
					label: '次级折返',
					value: '次级折返',
					type: 'warning'
				}
			]
		},
		{
			label: 'KDJ信号',
			prop: 'kdjSignal',
			minWidth: 100,
			dict: [
				{
					label: '金叉',
					value: '金叉',
					type: 'danger'
				},
				{
					label: '死叉',
					value: '死叉',
					type: 'success'
				}
			]
		},
		{
			label: 'KDJ值',
			prop: 'kdjValue',
			minWidth: 100
		},
		{
			label: 'CCI值',
			prop: 'cciValue',
			minWidth: 100
		},
		{
			label: '小时趋势方向',
			prop: 'hourTrend',
			minWidth: 100,
			dict: [
				{
					label: '多头',
					value: '多头',
					type: 'danger'
				},
				{
					label: '空头',
					value: '空头',
					type: 'success'
				}
			]
		},
		{
			label: '小时CCI值',
			prop: 'hourCciValue',
			minWidth: 100
		},
		{
			label: t('备注'),
			prop: 'remark',
			minWidth: 200,
			showOverflowTooltip: true
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
				name: 'el-input'
			}
		},
		{
			prop: 'name',
			label: t('名称'),
			span: 12,
			required: true,
			component: {
				name: 'el-input'
			}
		},
		{
			prop: 'remark',
			label: t('备注'),
			component: {
				name: 'el-input',
				props: {
					placeholder: t('请输入备注'),
					rows: 3,
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
	],

	onOpened(data) {
		data[`data_${data.dataType}`] = data.data;
	},

	onSubmit(data, { next }) {
		next({
			...data,
			data: data[`data_${data.dataType}`],
			data_0: undefined,
			data_1: undefined,
			data_2: undefined
		});
	}
});
</script>
