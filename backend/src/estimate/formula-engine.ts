type Vars = Record<string, number>;

export function evalFormula(formula: string, vars: Vars): number {
  if (!formula || !formula.trim()) return 0;
  const tokens = tokenize(formula);
  const rpn = toRPN(tokens);
  return evalRPN(rpn, vars);
}

type Token = {
  type: 'num' | 'var' | 'op' | 'lp' | 'rp' | 'func' | 'comma';
  value: string;
};

// поддерживаемые функции
const FUNCS = new Set(['ceil', 'floor', 'round', 'min', 'max', 'abs']);

function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if ((c >= '0' && c <= '9') || c === '.') {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      tokens.push({ type: 'num', value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let name = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) name += s[i++];
      // если сразу после имени идёт '(' — это функция
      if (FUNCS.has(name.toLowerCase())) {
        tokens.push({ type: 'func', value: name.toLowerCase() });
      } else {
        tokens.push({ type: 'var', value: name });
      }
      continue;
    }
    if ('+-*/'.includes(c)) { tokens.push({ type: 'op', value: c }); i++; continue; }
    if (c === '(') { tokens.push({ type: 'lp', value: c }); i++; continue; }
    if (c === ')') { tokens.push({ type: 'rp', value: c }); i++; continue; }
    if (c === ',') { tokens.push({ type: 'comma', value: c }); i++; continue; }
    throw new Error(`Недопустимый символ в формуле: "${c}"`);
  }
  return tokens;
}

const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const ops: Token[] = [];
  for (const t of tokens) {
    if (t.type === 'num' || t.type === 'var') out.push(t);
    else if (t.type === 'func') ops.push(t);
    else if (t.type === 'comma') {
      // выталкиваем до открывающей скобки
      while (ops.length && ops[ops.length - 1].type !== 'lp') out.push(ops.pop()!);
      if (!ops.length) throw new Error('Непарные скобки/запятая в формуле');
    } else if (t.type === 'op') {
      while (
        ops.length &&
        ops[ops.length - 1].type === 'op' &&
        prec[ops[ops.length - 1].value] >= prec[t.value]
      ) out.push(ops.pop()!);
      ops.push(t);
    } else if (t.type === 'lp') ops.push(t);
    else if (t.type === 'rp') {
      while (ops.length && ops[ops.length - 1].type !== 'lp') out.push(ops.pop()!);
      if (!ops.length) throw new Error('Непарные скобки в формуле');
      ops.pop(); // убираем lp
      // если под скобкой была функция — выталкиваем её
      if (ops.length && ops[ops.length - 1].type === 'func') out.push(ops.pop()!);
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op.type === 'lp') throw new Error('Непарные скобки в формуле');
    out.push(op);
  }
  return out;
}

function applyFunc(name: string, args: number[]): number {
  switch (name) {
    case 'ceil': return Math.ceil(args[0] ?? 0);
    case 'floor': return Math.floor(args[0] ?? 0);
    case 'round': return Math.round(args[0] ?? 0);
    case 'abs': return Math.abs(args[0] ?? 0);
    case 'min': return args.length ? Math.min(...args) : 0;
    case 'max': return args.length ? Math.max(...args) : 0;
    default: return 0;
  }
}

// сколько аргументов забирать (для min/max берём всё что накопилось до этого,
// но для простоты — унарные функции берут 1, min/max берут 2)
const FUNC_ARITY: Record<string, number> = {
  ceil: 1, floor: 1, round: 1, abs: 1, min: 2, max: 2,
};

function evalRPN(rpn: Token[], vars: Vars): number {
  const st: number[] = [];
  for (const t of rpn) {
    if (t.type === 'num') st.push(parseFloat(t.value));
    else if (t.type === 'var') {
      const v = vars[t.value];
      st.push(typeof v === 'number' && isFinite(v) ? v : 0);
    } else if (t.type === 'func') {
      const arity = FUNC_ARITY[t.value] ?? 1;
      const args: number[] = [];
      for (let k = 0; k < arity; k++) args.unshift(st.pop() ?? 0);
      st.push(applyFunc(t.value, args));
    } else {
      const b = st.pop() ?? 0;
      const a = st.pop() ?? 0;
      switch (t.value) {
        case '+': st.push(a + b); break;
        case '-': st.push(a - b); break;
        case '*': st.push(a * b); break;
        case '/': st.push(b === 0 ? 0 : a / b); break;
      }
    }
  }
  const r = st.pop() ?? 0;
  return isFinite(r) ? r : 0;
}