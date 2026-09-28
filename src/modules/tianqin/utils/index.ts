import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

// 通用选项
export const statusOptions = [
	{ label: '启用', value: 1 },
	{ label: '禁用', value: 0 }
];

// 通用 dict（多头/空头）
export const longShortDict = [
	{ label: '多头', value: '多头', type: 'danger' },
	{ label: '空头', value: '空头', type: 'success' }
];

// 通用 dict（金叉/死叉）
export const kdjSignalDict = [
	{ label: '金叉', value: '金叉', type: 'danger' },
	{ label: '死叉', value: '死叉', type: 'success' }
];

// 启动后台任务
export function useStartTask(serviceRequest: () => Promise<any>) {
	const { t } = useI18n();
	const tasking = ref(false);

	async function onStartTask() {
		if (tasking.value) return;

		tasking.value = true;

		try {
			const res = await serviceRequest();
			ElMessage.success(res?.message || t('任务已启动'));
		} catch (err: any) {
			ElMessage.error(err?.message || t('启动失败'));
		} finally {
			tasking.value = false;
		}
	}

	return { tasking, onStartTask };
}

// 自动刷新定时器
export function useAutoRefresh(refresh: () => void, interval = 5 * 60 * 1000) {
	let timer: ReturnType<typeof setInterval> | null = null;

	onMounted(() => {
		timer = setInterval(refresh, interval);
	});

	onUnmounted(() => {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	});
}

// 筛选条件本地缓存
// cacheKey: 缓存键名（建议用页面名称）
// filterRefs: 需要缓存的筛选 ref 对象映射 { key: ref }
// onRestore: 恢复缓存后的回调（如触发列表刷新）
export function useFilterCache(
	cacheKey: string,
	filterRefs: Record<string, Ref<any>>,
	onRestore?: () => void
) {
	const storageKey = `tianqin:filter:${cacheKey}`;
	let restored = false;

	// 恢复缓存
	function restore() {
		try {
			const cached = localStorage.getItem(storageKey);
			if (cached) {
				const data = JSON.parse(cached);
				for (const [key, r] of Object.entries(filterRefs)) {
					if (key in data) {
						r.value = data[key];
					}
				}
			}
		} catch {
			// ignore parse error
		}
	}

	// 保存缓存
	function save() {
		const data: Record<string, any> = {};
		for (const [key, r] of Object.entries(filterRefs)) {
			data[key] = r.value;
		}
		localStorage.setItem(storageKey, JSON.stringify(data));
	}

	// 页面加载时先恢复缓存，再触发回调
	onMounted(() => {
		restore();
		restored = true;
		onRestore?.();
	});

	// 监听筛选条件变化，变化时保存缓存
	const stops: (() => void)[] = [];
	for (const r of Object.values(filterRefs)) {
		const stop = watch(
			() => r.value,
			() => {
				if (restored) save();
			}
		);
		stops.push(stop);
	}

	onUnmounted(() => {
		stops.forEach(stop => stop());
	});
}