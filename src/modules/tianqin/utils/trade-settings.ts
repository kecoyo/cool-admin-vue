/**
 * 品种设置 - 交易操作工作台
 * 参考「交易操作工作台.html」的三步流程：定方向 → 等回调 → 找机会入场
 */

// 日线信号定义 [key, 名称, 做多文案]
export const SIGNALS = [
	['structure', '结构', '低点不再创新低'],
	['kline', 'K线', '下影线 / 锤子线 / 阳线企稳'],
	['mtm', 'MTM', '底背离 + 上穿 MTMMA'],
	['wobv', 'WOBV', '底背离 + 上穿 SSMA'],
	['rsi', 'RSI', '从 30 以下回升'],
	['volume', '量能', '缩量回调后放量上涨'],
	['macd', 'MACD', '绿柱缩短 + DIF 拐头']
] as const;

// 做空信号文案
export const SHORT_TEXT: Record<string, string> = {
	structure: '高点不再创新高',
	kline: '上影线 / 射击之星 / 阴线转弱',
	mtm: '顶背离 + 下穿 MTMMA',
	wobv: '顶背离 + 下穿 SSMA',
	rsi: '从 70 以上回落',
	volume: '缩量反弹后放量下跌',
	macd: '红柱缩短 + DIF 拐头'
};

// 做多信号文案
export const LONG_TEXT: Record<string, string> = Object.fromEntries(SIGNALS.map(s => [s[0], s[2]]));

// 随方向变化的界面文案
export const INBAND_TEXT = {
	long: '价格已回到 EMA60 ± 2% 带',
	short: '价格已反弹到 EMA60 ± 2% 带',
	neutral: '价格已回到 EMA60 ± 2% 带'
};

export const T60BREAK_TEXT = {
	long: '突破回调波段内部小高点',
	short: '跌破反弹波段内部小低点',
	neutral: '突破回调波段内部小高点'
};

export const T60CONFIRM_TEXT = {
	long: 'WOBV 金叉上穿 SSMA60',
	short: 'WOBV 死叉跌破 SSMA60',
	neutral: 'WOBV 金叉 / 死叉穿越 SSMA60'
};

export const CCI60_TEXT = {
	long: '60分钟 CCI(60) 下穿 −100',
	short: '60分钟 CCI(60) 上穿 +100',
	neutral: '60分钟 CCI(60) 穿越 −100 / +100'
};

export const CCI60_MIN = {
	long: 'CCI(60) 下穿 −100',
	short: 'CCI(60) 上穿 +100',
	neutral: 'CCI(60) 穿越 ±100'
};

export function byDir(map: Record<string, string>, dir: string): string {
	return map[dir] || map.neutral;
}

// EMA60 方向选项
export const emaOptions = [
	{ label: 'EMA60 向上 → 只做多', value: 'up' },
	{ label: 'EMA60 向下 → 只做空', value: 'down' },
	{ label: 'EMA60 走平 → 空仓', value: 'flat' }
];

// 创建空白品种设置
export function blankTradeSettings() {
	return {
		ema: '',
		inBand: false,
		retrace: '',
		cci60: false,
		signals: {
			structure: false,
			kline: false,
			mtm: false,
			wobv: false,
			rsi: false,
			volume: false,
			macd: false
		},
		t60break: false,
		t60wobv: false,
		pos: 0,
		entryDate: '',
		note: ''
	};
}

// 规范化品种设置（兼容旧数据）
export function normalizeTradeSettings(o: any) {
	const b = blankTradeSettings();
	if (o) {
		if (o.ema === 'up' || o.ema === 'down' || o.ema === 'flat') b.ema = o.ema;
		b.inBand = !!o.inBand;
		b.retrace = o.retrace == null ? '' : String(o.retrace);
		b.cci60 = !!o.cci60;
		if (o.signals) {
			SIGNALS.forEach(g => {
				if (o.signals[g[0]] != null) b.signals[g[0]] = !!o.signals[g[0]];
			});
		}
		b.t60break = !!o.t60break;
		b.t60wobv = !!o.t60wobv;
		b.pos = o.pos ? 1 : 0;
		b.entryDate = o.entryDate == null ? '' : String(o.entryDate);
		b.note = o.note == null ? '' : String(o.note);
	}
	return b;
}

function dirOf(it: TradeSettings): string {
	return it.ema === 'up' ? 'long' : it.ema === 'down' ? 'short' : '';
}

function sigText(key: string, dir: string): string {
	return dir === 'short' ? SHORT_TEXT[key] : LONG_TEXT[key];
}

function activeSigs(it: TradeSettings): string[] {
	return SIGNALS.filter(s => it.signals[s[0]]).map(s => s[1]);
}

export interface TradeSettings {
	ema: string;
	inBand: boolean;
	retrace: string;
	cci60: boolean;
	signals: {
		structure: boolean;
		kline: boolean;
		mtm: boolean;
		wobv: boolean;
		rsi: boolean;
		volume: boolean;
		macd: boolean;
	};
	t60break: boolean;
	t60wobv: boolean;
	pos: number;
	entryDate: string;
	note: string;
}

export interface EvaluateResult {
	level: string;
	label: string;
	dir: string;
	notes: [string, string][];
}

const num = (v: any) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

/**
 * 核心判定逻辑 - 根据品种设置生成操作建议
 */
export function evaluate(it: TradeSettings): EvaluateResult {
	const r: EvaluateResult = { level: 'idle', label: '待设置', dir: dirOf(it), notes: [] };

	// 持仓中：最高优先级
	if (it.pos) {
		r.level = 'hold';
		r.label = '★ 持仓中';
		r.notes.push([
			'ok',
			'已标记入场' +
				(it.entryDate ? `（${it.entryDate}）` : '') +
				' → 仓位 / 止损 / 出场交给量化软件'
		]);
		r.notes.push(['', '离场后点「标记已离场（复位）」，重新等下一次回调']);
		return r;
	}

	// 第1步 方向
	if (!it.ema) {
		r.notes.push(['', '请先选择 EMA60 状态']);
		return r;
	}
	if (it.ema === 'flat') {
		r.level = 'stop';
		r.label = '空仓';
		r.notes.push(['bad', 'EMA60 走平 → 不交易']);
		return r;
	}

	const dir = dirOf(it);
	const isLong = dir === 'long';
	r.dir = dir;

	// 第2步 回调到位
	if (!it.inBand && !it.cci60) {
		r.level = 'wait';
		r.label = '等待回调';
		r.notes.push(['', '① 未回到 EMA60 ± 2% 带、② 60分钟 CCI(60) 未触发 → 继续等，不追']);
		return r;
	}
	if (it.inBand) r.notes.push(['ok', '回调到位 ①：' + byDir(INBAND_TEXT, dir)]);
	if (it.cci60) r.notes.push(['ok', '回调到位 ②：60分钟 ' + byDir(CCI60_MIN, dir)]);

	const ret = num(it.retrace);
	if (ret != null) {
		if (ret > 61.8) {
			r.level = 'stop';
			r.label = '放弃';
			r.notes.push(['bad', `回撤 ${ret}% ＞ 61.8%，趋势可能已破坏，不是良性回调`]);
			return r;
		}
		if (ret < 20) {
			r.level = 'wait';
			r.label = '回调偏浅';
			r.notes.push(['warn', `回撤仅 ${ret}%，回调太浅，容易继续跌`]);
			return r;
		}
		if (ret >= 38.2 && ret <= 50) {
			r.notes.push(['ok', `回撤 ${ret}% 落在最佳区间 38.2%~50%`]);
		} else {
			r.notes.push(['', `回撤 ${ret}%（可接受区 20%~61.8%）`]);
		}
	} else {
		r.notes.push(['warn', '未填回撤比例（建议 38.2%~50% 最佳）']);
	}

	// 信号池
	const sigs = activeSigs(it);
	if (sigs.length < 2) {
		r.level = 'wait';
		r.label = '等待信号';
		r.notes.push([
			'warn',
			`信号仅 ${sigs.length} 项，需 ≥2 项（结构/K线/MTM/WOBV/RSI/量能/MACD）`
		]);
		return r;
	}
	r.notes.push(['ok', `信号 ${sigs.length} 项：${sigs.join('、')}`]);

	// 第3步 60分钟扳机
	if (!it.t60break) {
		r.level = 'wait';
		r.label = '等待扳机';
		r.notes.push(['warn', `60分钟尚未${byDir(T60BREAK_TEXT, dir)} → 等收盘确认`]);
		return r;
	}
	r.notes.push(['ok', `60分钟已${byDir(T60BREAK_TEXT, dir)}（扳机成立）`]);

	if (!it.t60wobv) {
		r.level = 'wait';
		r.label = '等待扳机确认';
		r.notes.push(['warn', `60分钟 ${byDir(T60CONFIRM_TEXT, dir)} 尚未出现 → 等确认`]);
		return r;
	}
	r.notes.push(['ok', `60分钟已 ${byDir(T60CONFIRM_TEXT, dir)}（确认成立）`]);

	r.level = 'go';
	r.label = isLong ? '可以买入' : '可以卖出';
	r.notes.push(['ok', '入场条件齐备 → 一次性进场（仓位 / 止损由量化软件管理）']);
	return r;
}

/**
 * 将操作建议结果格式化为文本（存入 remark 字段）
 */
export function formatAdvice(it: TradeSettings): string {
	const r = evaluate(it);
	let text = r.label;
	if (r.dir) {
		text += `（${r.dir === 'long' ? '做多' : '做空'}）`;
	}
	text += '\n';
	r.notes.forEach(x => {
		if (x[1]) text += `· ${x[1]}\n`;
	});
	if (r.level === 'go') {
		text += '执行：一次性进场，仓位/止损/出场由量化软件管理\n';
	} else if (r.level === 'hold') {
		text += '状态：持仓中，仓位/止损/出场由量化软件管理\n';
	}
	return text.trim();
}
