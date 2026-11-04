import { describe, expect, it, vi } from 'vitest';
import {
	defineUniversalComponent,
	renderLynxFirstScreen,
	universalPlan,
	universalProps,
	universalValue,
	useRef,
	useLazyRef,
	useSnapshot,
} from '../src/main-renderer.js';

describe('Lynx first-screen initialization hooks', () => {
	it('renders a snapshot and lazy ref while leaving ordinary function values untouched', () => {
		const factory = vi.fn(() => 'ready');
		const callback = vi.fn();
		const read = vi.fn(() => 'initial');
		const plan = universalPlan('lynx', {
			kind: 'host',
			type: 'text',
			propsSlot: 0,
			children: [{ kind: 'text', slot: 1 }],
		});
		const Scene = defineUniversalComponent('lynx', () => {
			const value = useLazyRef(factory);
			const initial = useSnapshot(read);
			const ordinary = useRef(callback);
			return universalValue(plan, [
				universalProps([]),
				`${initial}:${value.current}:${ordinary.current === callback}`,
			]);
		});
		const result = renderLynxFirstScreen(Scene, {});
		expect(result.batch.commands).toContainEqual({
			op: 'create',
			id: 2,
			type: '#text',
			props: { value: 'initial:ready:true' },
		});
		expect(factory).toHaveBeenCalledTimes(1);
		expect(read).toHaveBeenCalledTimes(1);
		expect(callback).not.toHaveBeenCalled();
	});
});
