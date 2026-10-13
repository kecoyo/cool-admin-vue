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

<script lang="tsx" setup>
defineOptions({
	name: 'tianqin-data'
});

import { ref, reactive, nextTick, defineComponent, computed, watch } from 'vue';
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
import {
	SIGNALS,
	emaOptions,
	blankTradeSettings,
	normalizeTradeSettings,
	evaluate,
	formatAdvice,
	byDir,
	INBAND_TEXT,
	T60BREAK_TEXT,
	T60CONFIRM_TEXT,
	CCI60_TEXT,
	T60CCI_TEXT,
	SHORT_TEXT,
	type TradeSettings
} from '../utils/trade-settings';

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
		const params = Crud.value?.getParams() || {};

		// 导出主要趋势数据
		const res = await service.tianqin.data.request({
			url: '/export',
			method: 'POST',
			responseType: 'blob',
			data: {
				weekTrendDirection: weekTrendDirection.value,
				weekTrendState: weekTrendState.value,
				dayTrendDirection: dayTrendDirection.value,
				dayTrendState: dayTrendState.value,
				hourTrendDirection: hourTrendDirection.value,
				status: status.value
			}
		});

		// 从响应头获取文件名
		const disposition = (res as any)?.headers?.['content-disposition'] || '';
		let filename = `${t('数据')} ${dayjs().format('YYYY-MM-DD HH_mm_ss')}.zip`;

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
			label: t('周趋势'),
			prop: 'weekTrendDirection',
			minWidth: 100,
			dict: longShortDict,
			sortable: 'desc'
		},
		{
			label: t('周状态'),
			prop: 'weekTrendState',
			minWidth: 100,
			dict: trendStateDict,
			sortable: 'desc'
		},
		{
			label: t('日趋势'),
			prop: 'dayTrendDirection',
			minWidth: 100,
			dict: longShortDict,
			sortable: 'desc'
		},
		{
			label: t('日状态'),
			prop: 'dayTrendState',
			minWidth: 100,
			dict: trendStateDict,
			sortable: 'desc'
		},
		{
			label: t('小时趋势'),
			prop: 'hourTrendDirection',
			minWidth: 100,
			dict: longShortDict,
			sortable: 'desc'
		},
		{
			label: t('小时CCI'),
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
			},
			sortable: 'desc'
		},
		{
			label: t('周KDJ信号'),
			prop: 'weekKdjSignal',
			minWidth: 120,
			dict: kdjSignalDict,
			sortable: 'desc'
		},
		{
			label: t('周KDJ值'),
			prop: 'weekKdjValue',
			minWidth: 120,
			sortable: 'desc'
		},
		{
			label: t('日KDJ信号'),
			prop: 'dayKdjSignal',
			minWidth: 100,
			dict: kdjSignalDict,
			sortable: 'desc'
		},
		{
			label: t('日KDJ值'),
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

// 品种设置面板组件
const TradeSettingsPanel = defineComponent({
	name: 'trade-settings-panel',
	props: {
		modelValue: { type: String, default: '' }
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		const settings = reactive<TradeSettings>(blankTradeSettings());

		// 从 JSON 字符串恢复
		function restore(json: string) {
			try {
				const parsed = json ? JSON.parse(json) : {};
				Object.assign(settings, normalizeTradeSettings(parsed));
			} catch {
				Object.assign(settings, blankTradeSettings());
			}
		}

		// 保存为 JSON 字符串
		function save() {
			emit('update:modelValue', JSON.stringify(settings));
		}

		// 监听外部 modelValue 变化（打开编辑时恢复数据）
		watch(
			() => props.modelValue,
			val => {
				if (val && val !== JSON.stringify(settings)) {
					restore(val);
				} else if (!val) {
					Object.assign(settings, blankTradeSettings());
				}
			},
			{ immediate: true }
		);

		// 监听内部变化，自动保存
		let skipWatch = false;
		watch(
			settings,
			() => {
				if (skipWatch) return;
				save();
			},
			{ deep: true }
		);

		const dir = computed(() => {
			if (settings.ema === 'up') return 'long';
			if (settings.ema === 'down') return 'short';
			return '';
		});

		const evalResult = computed(() => evaluate(settings));

		const levelClass = computed(() => {
			const lv = `lv-${evalResult.value.level}`;
			const d = dir.value ? ` dir-${dir.value}` : '';
			return lv + d;
		});

		return () => (
			<div class="trade-settings-panel">
				<div class="ts-steps">
					{/* 第1步 定方向 */}
					<div class="ts-step">
						<h3>
							<i>1</i>定方向
						</h3>
						{emaOptions.map(o => (
							<label class="ts-opt">
								<el-radio
									v-model={settings.ema}
									value={o.value}
									onChange={() => save()}
								/>
								<span>{o.label}</span>
							</label>
						))}
						<p class="ts-hint">趋势由 EMA60 斜率单独决定；±2% 是「假破位容忍带」。</p>
					</div>

					{/* 第2步 等回调 */}
					<div class="ts-step">
						<h3>
							<i>2</i>等回调
						</h3>
						<div class="ts-sub-label">回调到位：① 或 ② 满足任一即可</div>
						<label class="ts-opt">
							<el-checkbox v-model={settings.inBand} />
							<span>① {byDir(INBAND_TEXT, dir.value)}</span>
						</label>
						<div class="ts-field">
							<label>回撤比例</label>
							<el-input
								v-model={settings.retrace}
								type="number"
								step="0.1"
								min="0"
								max="100"
								placeholder="38.2"
							/>
						</div>
						<label class="ts-opt">
							<el-checkbox v-model={settings.cci60} />
							<span>② {byDir(CCI60_TEXT, dir.value)}</span>
						</label>
						<p class="ts-hint">
							① 或 ② 满足任一 → 回调到位；回撤是质量校验（20%~61.8% 可接受，38.2%~50%
							最佳）。
						</p>
					</div>

					{/* 第3步 找机会入场 */}
					<div class="ts-step">
						<h3>
							<i>3</i>找机会入场
						</h3>
						<div class="ts-sub-label">① 信号池（≥2 项）</div>
						{SIGNALS.map(s => (
							<label class="ts-opt">
								<el-checkbox v-model={settings.signals[s[0]]} />
								<span>
									<b>{s[1]}</b>{' '}
									<span class="ts-tick">
										{dir.value === 'short' ? (SHORT_TEXT as any)[s[0]] : s[2]}
									</span>
								</span>
							</label>
						))}
						<div class="ts-sub-label">② 60分钟扳机</div>
						<label class="ts-opt">
							<el-checkbox v-model={settings.t60break} />
							<span>{byDir(T60BREAK_TEXT, dir.value)}</span>
						</label>
						<label class="ts-opt">
							<el-checkbox v-model={settings.t60wobv} />
							<span>{byDir(T60CONFIRM_TEXT, dir.value)}</span>
						</label>
						<label class="ts-opt">
							<el-checkbox v-model={settings.t60cci} />
							<span>{byDir(T60CCI_TEXT, dir.value)}</span>
						</label>
						<p class="ts-hint">
							三条都满足，入场时机才算成立；等 60分钟K线收盘确认，不盘中抢跑。
						</p>
					</div>
				</div>

				{/* 操作建议预览 */}
				<div class={`ts-advice ${levelClass.value}`}>
					<div class="ts-adv-head">
						<span class="ts-dot"></span>
						<span>{evalResult.value.label}</span>
						{dir.value && (
							<span class="ts-dir-tag">
								{dir.value === 'long' ? '做多 · 红' : '做空 · 绿'}
							</span>
						)}
					</div>
					<ul class="ts-adv-notes">
						{evalResult.value.notes.map((x, i) => (
							<li class={x[0] || ''} key={i}>
								{x[0] === 'ok'
									? '✔ '
									: x[0] === 'warn'
										? '⚠ '
										: x[0] === 'bad'
											? '✕ '
											: '· '}
								{x[1]}
							</li>
						))}
					</ul>
				</div>

				{/* 备注 */}
				<div class="ts-noterow">
					<el-input
						v-model={settings.note}
						placeholder="备注：今天为什么这么判 / 执行情况 / 持仓量（OI）变化…"
						type="textarea"
						rows={2}
					/>
				</div>

				{/* 清空按钮 */}
				<div class="ts-actions">
					<el-button
						size="small"
						type="danger"
						plain
						onClick={() => {
							skipWatch = true;
							Object.assign(settings, blankTradeSettings());
							emit('update:modelValue', '');
							nextTick(() => {
								skipWatch = false;
							});
						}}
					>
						清空品种设置
					</el-button>
				</div>
			</div>
		);
	}
});

// cl-upsert
const Upsert = useUpsert({
	dialog: {
		width: '1000px'
	},

	onOpened(data) {
		// 在标题栏显示合约代码和合约名称
		const code = data?.contractCode || '';
		const name = data?.contractName || '';
		if (code || name) {
			const title = name && code ? `${name}（${code}）` : name || code;
			Upsert.value?.setConfig('dialog.title', title);
		}
	},

	items: [
		{
			prop: 'tradeSettings',
			label: t('品种设置'),
			component: {
				vm: TradeSettingsPanel
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

	// 编辑时：直接传给表单，TradeSettingsPanel 会通过 modelValue 恢复
	onInfo(data, { done }) {
		done(data);
	},

	// 保存时：从 tradeSettings JSON 生成操作建议文本，存入 remark
	onSubmit(data, { next }) {
		// 没有 tradeSettings 时清空 remark
		if (!data.tradeSettings) {
			data.remark = '';
			next(data);
			return;
		}

		// 从 tradeSettings JSON 生成操作建议
		let remark = '';
		try {
			const settings = JSON.parse(data.tradeSettings);
			if (settings) {
				remark = formatAdvice(settings as TradeSettings);
			}
		} catch {
			// ignore
		}
		data.remark = remark;

		next(data);
	}
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

/* 品种设置面板 */
.trade-settings-panel {
	border: 1px solid var(--el-border-color);
	border-radius: 12px;
	overflow: hidden;
}

.ts-steps {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(246px, 1fr));
	gap: 0;
}

.ts-step {
	padding: 14px 16px;
	border-right: 1px solid var(--el-border-color);
	border-bottom: 1px solid var(--el-border-color);
}

.ts-step:last-child {
	border-right: 0;
}

.ts-step h3 {
	font-size: 12.5px;
	font-weight: 600;
	margin: 0 0 10px;
	display: flex;
	align-items: center;
	gap: 7px;
}

.ts-step h3 i {
	font-style: normal;
	width: 18px;
	height: 18px;
	border-radius: 6px;
	background: var(--el-fill-color-light);
	border: 1px solid var(--el-border-color);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-size: 11px;
	color: var(--el-text-color-secondary);
	flex: 0 0 auto;
}

.ts-opt {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 3px 0;
	font-size: 13px;
	cursor: pointer;
}

.ts-opt .el-checkbox {
	margin-right: 0;
}

.ts-opt .el-radio {
	margin-right: 0;
}

.ts-opt span {
	color: var(--el-text-color-primary);
}

.ts-opt .ts-tick {
	color: var(--el-text-color-secondary);
	font-size: 11.5px;
}

.ts-field {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 6px 0;
	font-size: 13px;
}

.ts-field label {
	color: var(--el-text-color-secondary);
	flex: 0 0 auto;
}

.ts-field .el-input {
	flex: 1;
	min-width: 0;
}

.ts-hint {
	color: var(--el-text-color-placeholder);
	font-size: 11.5px;
	margin: 6px 0 0;
	line-height: 1.5;
}

.ts-sub-label {
	font-size: 12px;
	color: var(--el-text-color-placeholder);
	margin-bottom: 4px;
}

/* 操作建议 */
.ts-advice {
	padding: 14px 16px 16px;
	background: var(--el-fill-color-lighter);
	border-top: 1px solid var(--el-border-color);
}

.ts-adv-head {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 14px;
	font-weight: 600;
	margin-bottom: 12px;
}

.ts-adv-head .ts-dot {
	width: 9px;
	height: 9px;
	border-radius: 50%;
	flex: 0 0 auto;
	background: #8a94a3;
}

/* 圆点：做多红、做空绿 */
.ts-advice.dir-long .ts-dot {
	background: #d92c2c;
}
.ts-advice.dir-short .ts-dot {
	background: #159a5b;
}

.ts-dir-tag {
	font-size: 11.5px;
	font-weight: 500;
	padding: 2px 9px;
	border-radius: 999px;
}

/* 方向标签：做多红、做空绿 */
.dir-long .ts-dir-tag {
	background: rgba(217, 44, 44, 0.12);
	color: #d92c2c;
}

.dir-short .ts-dir-tag {
	background: rgba(21, 154, 91, 0.14);
	color: #159a5b;
}

@media (prefers-color-scheme: dark) {
	.ts-adv-head .ts-dot {
		background: #8f98a6;
	}
	.ts-advice.dir-long .ts-dot {
		background: #f0565b;
	}
	.ts-advice.dir-short .ts-dot {
		background: #3cbf7e;
	}
	.dir-long .ts-dir-tag {
		background: rgba(240, 86, 91, 0.12);
		color: #f0565b;
	}
	.dir-short .ts-dir-tag {
		background: rgba(60, 191, 126, 0.14);
		color: #3cbf7e;
	}
}

.ts-adv-notes {
	margin: 0;
	padding: 0;
	list-style: none;
	font-size: 12.5px;
}

.ts-adv-notes li {
	padding: 2px 0;
	color: var(--el-text-color-secondary);
}

.ts-adv-notes li.ok {
	color: var(--el-color-success);
}

.ts-adv-notes li.warn {
	color: var(--el-color-warning);
}

.ts-adv-notes li.bad {
	color: var(--el-color-danger);
}

/* 备注 */
.ts-noterow {
	padding: 10px 16px;
	border-top: 1px solid var(--el-border-color);
}

.ts-actions {
	display: flex;
	justify-content: flex-end;
	padding: 0 16px 14px;
}
</style>
