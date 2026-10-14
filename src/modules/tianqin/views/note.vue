<template>
	<div class="rn-wrap">
		<!-- 统计 -->
		<div class="rn-stats">
			<div class="rn-stat">
				<b>{{ stats.today }}</b>
				<span>{{ t('今日记录') }}</span>
			</div>
			<div class="rn-stat" :class="{ warn: stats.watch > 0 }">
				<b>{{ stats.watch }}</b>
				<span>{{ t('待观察') }}</span>
			</div>
			<div class="rn-stat">
				<b>{{ stats.symbols }}</b>
				<span>{{ t('涉及品种') }}</span>
			</div>
			<div class="rn-stat">
				<b>{{ list.length }}</b>
				<span>{{ t('累计条目') }}</span>
			</div>
		</div>

		<!-- 筛选 -->
		<div class="rn-filters">
			<el-button type="primary" @click="onAdd">{{ t('新增') }}</el-button>
			<el-select
				v-model="filter.symbol"
				:placeholder="t('全部品种')"
				clearable
				filterable
				style="width: 140px"
			>
				<el-option v-for="s in symbolOptions" :key="s" :label="s" :value="s" />
			</el-select>
			<el-select
				v-model="filter.tag"
				:placeholder="t('全部类型')"
				clearable
				style="width: 120px"
			>
				<el-option v-for="tag in TAGS" :key="tag[0]" :label="t(tag[1])" :value="tag[0]" />
			</el-select>
			<el-select
				v-model="filter.noteStatus"
				:placeholder="t('全部状态')"
				clearable
				style="width: 120px"
			>
				<el-option :label="t('待观察')" value="watch" />
				<el-option :label="t('已验证')" value="ok" />
				<el-option :label="t('已否决')" value="no" />
			</el-select>
			<el-input v-model="filter.q" :placeholder="t('搜索关键词')" style="width: 180px" />
			<el-button @click="onResetFilter">{{ t('重置') }}</el-button>
		</div>

		<!-- 列表 -->
		<div v-loading="loading" class="rn-list">
			<div v-if="filteredItems.length === 0" class="rn-empty">
				<template v-if="list.length">
					<b>{{ t('没有符合条件的记录') }}</b>
					{{ t('试试重置筛选条件') }}
				</template>
				<template v-else>
					<b>{{ t('还没有记录') }}</b>
					{{ t('点击「新增」写一条试试') }}
				</template>
			</div>
			<div v-for="g in groupedItems" :key="g.date" class="rn-day">
				<div class="rn-day-h">
					<span class="d">{{ g.date }}</span>
					<span class="wd">{{ getWeekday(g.date) }}</span>
					<span class="n">{{ g.list.length }} {{ t('条') }}</span>
				</div>
				<div v-for="it in g.list" :key="it.id" class="rn-row" :class="it.noteStatus">
					<div
						class="sym"
						:title="it.symbol || t('未填品种')"
						@click="filter.symbol = it.symbol"
					>
						{{ it.symbol || t('未填') }}
					</div>
					<span class="rn-tag" :class="TAGMAP[it.tag]?.cls">
						{{ TAGMAP[it.tag]?.name || it.tag }}
					</span>
					<div class="rn-body">{{ it.content }}</div>
					<span class="rn-time">{{ it.noteTime }}</span>
					<span class="rn-stx" :class="it.noteStatus">{{
						STNAME[it.noteStatus] || it.noteStatus
					}}</span>
					<span class="rn-acts">
						<el-button
							text
							size="small"
							:title="t('标记为已验证')"
							@click="toggleStatus(it, 'ok')"
							>✓</el-button
						>
						<el-button
							text
							size="small"
							:title="t('标记为已否决')"
							@click="toggleStatus(it, 'no')"
							>✕</el-button
						>
						<el-button text size="small" :title="t('编辑')" @click="onEdit(it)"
							>✎</el-button
						>
						<el-button
							text
							size="small"
							type="danger"
							:title="t('删除')"
							@click="onDelete(it)"
							>×</el-button
						>
					</span>
				</div>
			</div>
		</div>

		<!-- 新增/编辑弹框 -->
		<el-dialog
			v-model="dialogVisible"
			:title="editId ? t('编辑记录') : t('新增记录')"
			width="720px"
			:close-on-click-modal="false"
			@closed="onDialogClosed"
		>
			<div class="rn-compose">
				<div class="rn-crow">
					<el-select
						v-model="form.symbol"
						:placeholder="t('品种，如 螺纹钢')"
						filterable
						allow-create
						clearable
						style="width: 160px"
					>
						<el-option v-for="s in SYMS" :key="s" :label="s" :value="s" />
					</el-select>
					<span class="rn-lab">{{ t('类型') }}</span>
					<div class="rn-pills">
						<button
							v-for="tag in TAGS"
							:key="tag[0]"
							class="rn-pill"
							:class="{ on: form.tag === tag[0] }"
							@click="form.tag = tag[0]"
						>
							{{ t(tag[1]) }}
						</button>
					</div>
					<span style="margin-left: auto" />
					<span class="rn-lab">{{ t('状态') }}</span>
					<el-select v-model="form.noteStatus" style="width: 100px">
						<el-option :label="t('待观察')" value="watch" />
						<el-option :label="t('已验证')" value="ok" />
						<el-option :label="t('已否决')" value="no" />
					</el-select>
				</div>
				<el-input
					ref="textRef"
					v-model="form.content"
					type="textarea"
					:placeholder="
						t(
							'例：TA 回调到 61.8% 但成交量没缩，疑似假信号，等下个 60 分钟 CCI 破位再确认。'
						)
					"
					:rows="5"
					resize="vertical"
					@keydown="onTextKeydown"
				/>
				<div class="rn-cfoot">
					<span class="rn-tip">
						{{ t('Ctrl + Enter 快速保存') }}
					</span>
				</div>
			</div>
			<template #footer>
				<el-button @click="dialogVisible = false">{{ t('取消') }}</el-button>
				<el-button type="primary" :loading="saving" @click="doSave">
					{{ editId ? t('更新') : t('保存') }}
				</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'tianqin-note'
});

import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';

const { service } = useCool();
const { t } = useI18n();

// ---- 常量 ----
const TAGS: [string, string, string][] = [
	['signal', '信号', 't-signal'],
	['idea', '想法', 't-idea'],
	['quest', '疑问', 't-quest'],
	['review', '复盘', 't-review'],
	['lesson', '教训', 't-lesson']
];

const TAGMAP: Record<string, { name: string; cls: string }> = Object.fromEntries(
	TAGS.map(tg => [tg[0], { name: tg[1], cls: tg[2] }])
);

const STNAME: Record<string, string> = {
	watch: '待观察',
	ok: '已验证',
	no: '已否决'
};

const SYMS = [
	'铁矿石',
	'螺纹钢',
	'热卷',
	'不锈钢',
	'硅铁',
	'锰硅',
	'沪金',
	'沪银',
	'铂',
	'钯',
	'沪铜',
	'沪铝',
	'沪锡',
	'沪锌',
	'沪铅',
	'沪镍',
	'氧化铝',
	'工业硅',
	'多晶硅',
	'碳酸锂',
	'豆一',
	'豆二',
	'豆油',
	'豆粕',
	'菜油',
	'棕榈油',
	'玉米',
	'玉米淀粉',
	'鸡蛋',
	'棉花',
	'白糖',
	'苹果',
	'红枣',
	'花生仁',
	'生猪',
	'原油',
	'燃料油',
	'LPG',
	'低硫燃料油',
	'沥青',
	'甲醇',
	'乙二醇',
	'塑料',
	'PTA',
	'对二甲苯',
	'PVC',
	'聚丙烯',
	'苯乙烯',
	'纯苯',
	'纯碱',
	'烧碱',
	'玻璃',
	'尿素',
	'橡胶',
	'丁二烯橡胶',
	'20号胶',
	'纸浆',
	'原木',
	'短纤',
	'焦煤'
];

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// ---- 类型 ----
interface NoteItem {
	id: number;
	symbol: string;
	tag: string;
	noteStatus: string;
	content: string;
	noteDate: string;
	noteTime: string;
}

// ---- 工具函数 ----
function today(): string {
	return dayjs().format('YYYY-MM-DD');
}

function nowHM(): string {
	return dayjs().format('HH:mm');
}

function getWeekday(date: string): string {
	const d = new Date(date + 'T00:00:00');
	return WEEK[d.getDay()];
}

// ---- 数据 ----
const list = ref<NoteItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const editId = ref<number | null>(null);
const dialogVisible = ref(false);

const form = reactive({
	symbol: '',
	tag: 'idea',
	noteStatus: 'watch',
	content: ''
});

const textRef = ref();

async function loadList() {
	loading.value = true;
	try {
		const res = await service.tianqin.note.list({});
		list.value = (res || []).map((o: any) => ({
			id: o.id,
			symbol: o.symbol || '',
			tag: TAGMAP[o.tag] ? o.tag : 'idea',
			noteStatus: STNAME[o.noteStatus] ? o.noteStatus : 'watch',
			content: o.content || '',
			noteDate: /^\d{4}-\d{2}-\d{2}$/.test(o.noteDate) ? o.noteDate : today(),
			noteTime: /^\d{2}:\d{2}$/.test(o.noteTime) ? o.noteTime : nowHM()
		}));
	} catch {
		ElMessage.error(t('加载失败'));
	} finally {
		loading.value = false;
	}
}

// ---- 录入弹框 ----
function resetForm() {
	form.symbol = '';
	form.tag = 'idea';
	form.noteStatus = 'watch';
	form.content = '';
	editId.value = null;
}

function onAdd() {
	resetForm();
	dialogVisible.value = true;
	nextTick(() => textRef.value?.focus());
}

function onDialogClosed() {
	resetForm();
}

async function doSave() {
	const content = form.content.trim();
	if (!content) {
		textRef.value?.focus();
		ElMessage.warning(t('内容不能为空'));
		return;
	}

	saving.value = true;
	try {
		const payload = {
			symbol: form.symbol.trim(),
			tag: form.tag,
			noteStatus: form.noteStatus,
			content,
			noteDate: today(),
			noteTime: nowHM()
		};

		if (editId.value) {
			await service.tianqin.note.update({ id: editId.value, ...payload });
		} else {
			await service.tianqin.note.add(payload);
		}
		await loadList();
		dialogVisible.value = false;
		ElMessage.success(t('已记录'));
	} catch {
		ElMessage.error(t('保存失败'));
	} finally {
		saving.value = false;
	}
}

function onTextKeydown(e: KeyboardEvent | Event) {
	const ke = e as KeyboardEvent;
	if ((ke.ctrlKey || ke.metaKey) && ke.key === 'Enter') {
		e.preventDefault();
		doSave();
	}
}

onMounted(() => {
	loadList();
});

// ---- 统计 ----
const stats = computed(() => {
	const td = today();
	return {
		today: list.value.filter(i => i.noteDate === td).length,
		watch: list.value.filter(i => i.noteStatus === 'watch').length,
		symbols: new Set(list.value.map(i => i.symbol).filter(Boolean)).size
	};
});

// ---- 筛选 ----
const filter = reactive({
	symbol: '',
	tag: '',
	noteStatus: '',
	q: ''
});

const symbolOptions = computed(() => {
	return [...new Set(list.value.map(i => i.symbol).filter(Boolean))].sort((a, b) =>
		a.localeCompare(b, 'zh')
	);
});

function onResetFilter() {
	filter.symbol = '';
	filter.tag = '';
	filter.noteStatus = '';
	filter.q = '';
}

const filteredItems = computed(() => {
	const q = filter.q.trim().toLowerCase();
	return list.value
		.filter(it => {
			if (filter.symbol && it.symbol !== filter.symbol) return false;
			if (filter.tag && it.tag !== filter.tag) return false;
			if (filter.noteStatus && it.noteStatus !== filter.noteStatus) return false;
			if (q && (it.symbol + ' ' + it.content).toLowerCase().indexOf(q) < 0) return false;
			return true;
		})
		.sort((a, b) =>
			a.noteDate === b.noteDate
				? a.noteTime.localeCompare(b.noteTime)
				: a.noteDate.localeCompare(b.noteDate)
		);
});

const groupedItems = computed(() => {
	const groups: { date: string; list: NoteItem[] }[] = [];
	filteredItems.value.forEach(it => {
		const last = groups[groups.length - 1];
		if (last && last.date === it.noteDate) last.list.push(it);
		else groups.push({ date: it.noteDate, list: [it] });
	});
	groups.forEach(g => g.list.reverse());
	groups.reverse();
	return groups;
});

// ---- 列表操作 ----
async function toggleStatus(it: NoteItem, st: 'ok' | 'no') {
	const newSt = it.noteStatus === st ? 'watch' : st;
	try {
		await service.tianqin.note.update({ id: it.id, noteStatus: newSt });
		it.noteStatus = newSt;
	} catch {
		ElMessage.error(t('更新失败'));
	}
}

function onEdit(it: NoteItem) {
	editId.value = it.id;
	form.symbol = it.symbol;
	form.tag = it.tag;
	form.noteStatus = it.noteStatus;
	form.content = it.content;
	dialogVisible.value = true;
	nextTick(() => textRef.value?.focus());
}

async function onDelete(it: NoteItem) {
	try {
		await ElMessageBox.confirm(t('删除这条记录？'), t('提示'), { type: 'warning' });
		await service.tianqin.note.delete({ ids: [it.id] });
		await loadList();
		if (editId.value === it.id) dialogVisible.value = false;
	} catch {}
}
</script>

<style lang="css" scoped>
.rn-wrap {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	margin: 0 auto;
	padding: 22px 18px 0;
	overflow: hidden;
}

/* 录入弹框 */
.rn-compose {
	background: var(--el-fill-color-light);
	border-radius: 10px;
	padding: 14px 16px;
}

.rn-crow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
}

.rn-lab {
	font-size: 12.5px;
	color: var(--el-text-color-secondary);
}

.rn-pills {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.rn-pill {
	font: inherit;
	font-size: 12.5px;
	padding: 5px 12px;
	border-radius: 999px;
	cursor: pointer;
	border: 1px solid var(--el-border-color);
	background: var(--el-fill-color-light);
	color: var(--el-text-color-secondary);
	transition: 0.12s;
}

.rn-pill:hover {
	border-color: var(--el-text-color-placeholder);
	color: var(--el-text-color-primary);
}

.rn-pill.on {
	background: var(--el-color-primary);
	border-color: var(--el-color-primary);
	color: #fff;
	font-weight: 500;
}

.rn-cfoot {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-top: 10px;
}

.rn-cfoot .rn-tip {
	color: var(--el-text-color-placeholder);
	font-size: 11.5px;
	line-height: 1.5;
}

/* 统计 */
.rn-stats {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-bottom: 12px;
}

.rn-stat {
	flex: 1 1 120px;
	background: var(--el-bg-color);
	border: 1px solid var(--el-border-color);
	border-radius: 10px;
	padding: 9px 13px;
}

.rn-stat b {
	display: block;
	font-size: 20px;
	line-height: 1.3;
}

.rn-stat span {
	color: var(--el-text-color-secondary);
	font-size: 12px;
}

.rn-stat.warn b {
	color: var(--el-color-warning);
}

/* 筛选 */
.rn-filters {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	margin-bottom: 18px;
}

/* 列表 */
.rn-list {
	flex: 1;
	overflow-y: auto;
	padding-bottom: 70px;
}

.rn-day {
	margin-bottom: 20px;
}

.rn-day-h {
	display: flex;
	align-items: baseline;
	gap: 10px;
	padding: 0 2px 8px;
}

.rn-day-h .d {
	font-size: 13.5px;
	font-weight: 600;
}

.rn-day-h .wd {
	font-size: 12px;
	color: var(--el-text-color-placeholder);
}

.rn-day-h .n {
	font-size: 12px;
	color: var(--el-text-color-placeholder);
	margin-left: auto;
}

.rn-row {
	display: flex;
	align-items: flex-start;
	gap: 11px;
	background: var(--el-bg-color);
	border: 1px solid var(--el-border-color);
	border-radius: 10px;
	padding: 10px 12px;
	margin-bottom: 7px;
}

.rn-row.watch {
	border-left: 3px solid var(--el-color-warning);
}

.rn-row.ok {
	border-left: 3px solid var(--el-color-success);
}

.rn-row.no {
	border-left: 3px solid var(--el-text-color-placeholder);
	opacity: 0.62;
}

.rn-row .sym {
	flex: 0 0 78px;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	border-radius: 6px;
	padding: 2px 4px;
	margin: -2px -4px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rn-row .sym:hover {
	background: var(--el-fill-color-light);
	color: var(--el-color-primary);
}

.rn-tag {
	flex: 0 0 auto;
	font-size: 11.5px;
	font-weight: 500;
	padding: 2px 9px;
	border-radius: 999px;
	background: var(--el-fill-color-light);
	color: var(--el-text-color-secondary);
	border: 1px solid var(--el-border-color);
}

.rn-tag.t-signal {
	background: #e8effc;
	color: #1f4fa0;
	border-color: transparent;
}

.rn-tag.t-idea {
	background: #eceef1;
	color: #5c6673;
	border-color: transparent;
}

.rn-tag.t-quest {
	background: #fdf3e0;
	color: #8a5a00;
	border-color: transparent;
}

.rn-tag.t-review {
	background: #e6f6ee;
	color: #0f6b3f;
	border-color: transparent;
}

.rn-tag.t-lesson {
	background: #fdecec;
	color: #9b1c1c;
	border-color: transparent;
}

.rn-row .rn-body {
	flex: 1;
	min-width: 0;
	font-size: 13.5px;
	line-height: 1.65;
	white-space: pre-wrap;
	word-break: break-word;
}

.rn-row .rn-time {
	flex: 0 0 auto;
	font-size: 11.5px;
	color: var(--el-text-color-placeholder);
	padding-top: 3px;
}

.rn-row .rn-acts {
	flex: 0 0 auto;
	display: flex;
	gap: 3px;
	opacity: 0.35;
	transition: 0.12s;
}

.rn-row:hover .rn-acts {
	opacity: 1;
}

.rn-stx {
	font-size: 11.5px;
	padding: 2px 8px;
	border-radius: 999px;
	flex: 0 0 auto;
	align-self: center;
}

.rn-stx.watch {
	background: #fdf3e0;
	color: #8a5a00;
}

.rn-stx.ok {
	background: #e6f6ee;
	color: #0f6b3f;
}

.rn-stx.no {
	background: #eceef1;
	color: #5c6673;
}

.rn-empty {
	background: var(--el-bg-color);
	border: 1px dashed var(--el-border-color);
	border-radius: 10px;
	padding: 34px 16px;
	text-align: center;
	color: var(--el-text-color-placeholder);
	font-size: 13px;
	line-height: 1.9;
}

.rn-empty b {
	display: block;
	color: var(--el-text-color-secondary);
	font-size: 13.5px;
	margin-bottom: 3px;
}
</style>
