<template>
	<cl-crud ref="Crud">
		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
			<cl-flex1 />
			<!-- 筛选 -->
			<cl-filter :label="$t('状态')">
				<cl-select :options="options.status" prop="status" :width="120" />
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
	name: 'sys-param'
});

import { useCrud, useTable, useUpsert } from '@cool-vue/crud';
import { Document } from '@element-plus/icons-vue';
import { reactive } from 'vue';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';

const { service } = useCool();
const { t } = useI18n();

// 选项
const options = reactive({
	status: [
		{
			label: '启用',
			value: 1
		},
		{
			label: '禁用',
			type: 'danger',
			value: 0
		}
	]
});

// cl-crud
const Crud = useCrud({ service: service.tianqin.type }, app => {
	app.refresh();
});

// cl-table
const Table = useTable({
	contextMenu: ['refresh'],
	columns: [
		{
			type: 'selection',
			width: 60
		},
		{
			label: t('代码'),
			prop: 'code',
			minWidth: 150
		},
		{
			label: t('名称'),
			prop: 'name',
			minWidth: 150
		},
		{
			label: '状态',
			prop: 'status',
			minWidth: 100,
			component: {
				name: 'cl-switch'
			}
		},
		{
			label: t('备注'),
			prop: 'remark',
			minWidth: 200,
			showOverflowTooltip: true
		},
		{
			type: 'op'
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
