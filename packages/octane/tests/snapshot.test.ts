import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'octane/server';
import { flushSync, hydrateRoot } from '../src/index.js';
import * as Universal from '../src/universal.js';
import { mount } from './_helpers';
import { loadCompiledFixtureSource, loadPlainHookFixtureSource } from './_server-fixture.js';

const source = `
'use strong';
import * as Octane from 'octane';

export function Snapshot(props) @{
	const initial = Octane.useSnapshot(() => props.create(props.label));
	<span>{String(initial) + ':' + props.label}</span>
}
`;
const id = '/src/Snapshot.tsrx';
const compileOptions = { hmr: false, dev: process.env.OCTANE_TEST_COMPILE_MODE !== 'prod' };

describe('useSnapshot', () => {
	it.each([
		['a value', (label: string) => label],
		['undefined', () => undefined],
	] as const)('captures %s until remount', (_, makeValue) => {
		const { Snapshot } = loadCompiledFixtureSource(source, { id, mode: 'client', compileOptions });
		const create = vi.fn(makeValue);
		const view = mount(Snapshot, { label: 'first', create });
		expect(view.find('span').textContent).toBe(`${makeValue('first')}:first`);
		view.update(Snapshot, { label: 'second', create });
		expect(view.find('span').textContent).toBe(`${makeValue('first')}:second`);
		expect(create).toHaveBeenCalledExactlyOnceWith('first');
		view.unmount();

		const remount = mount(Snapshot, { label: 'new', create });
		expect(remount.find('span').textContent).toBe(`${makeValue('new')}:new`);
		expect(create.mock.calls).toEqual([['first'], ['new']]);
		remount.unmount();
	});

	it('initializes independently on the server and during hydration', () => {
		const server = loadCompiledFixtureSource(source, { id, mode: 'server', compileOptions });
		const client = loadCompiledFixtureSource(source, { id, mode: 'client', compileOptions });
		const create = vi.fn((label: string) => label);
		const props = { label: 'same', create };
		const container = document.createElement('div');
		document.body.append(container);
		container.innerHTML = renderToString(server.Snapshot, props).html;
		const span = container.querySelector('span');
		expect(span?.textContent).toBe('same:same');
		const root = hydrateRoot(container, client.Snapshot, props);
		try {
			flushSync(() => {});
			expect(container.querySelector('span')).toBe(span);
			expect(span?.textContent).toBe('same:same');
			expect(create.mock.calls).toEqual([['same'], ['same']]);
		} finally {
			root.unmount();
			container.remove();
		}
	});

	it('keeps the snapshot across a server render-phase update from a plain module', () => {
		const { Snapshot } = loadPlainHookFixtureSource(
			`import { createElement, useSnapshot, useState } from 'octane';
			export function Snapshot({ create }) {
				const [pass, setPass] = useState(0);
				const initial = useSnapshot(...[() => create(pass)]);
				if (pass === 0) setPass(1);
				return createElement('span', null, initial + ':' + pass);
			}`,
			{ id: '/src/snapshot.ts', mode: 'server', inlineHookMemo: false },
		);
		const create = vi.fn((pass: number) => pass);
		expect(renderToString(Snapshot, { create }).html).toContain('0:1');
		expect(create).toHaveBeenCalledExactlyOnceWith(0);
	});

	it('discards a snapshot created by an aborted universal render', () => {
		const renderer = {
			id: 'object',
			module: 'octane/universal',
			target: 'universal',
			text: 'host',
		} as const;
		const { Scene } = loadCompiledFixtureSource(
			`import { useSnapshot as capture } from 'octane';
			export function Scene(props) @{
				const first = capture(() => props.label);
				<view first={first} current={props.label} />
			}`,
			{
				id: '/src/snapshot.object.tsrx',
				mode: 'client',
				compileOptions: { ...compileOptions, renderer },
				runtimeModules: { 'octane/universal': Universal },
			},
		);
		const container = Universal.createObjectContainer();
		const root = Universal.createUniversalRoot(container, Universal.createObjectDriver());
		try {
			const attempt = root.prepare(Scene, { label: 'aborted' });
			expect(attempt.status).toBe('prepared');
			attempt.abort();
			root.render(Scene, { label: 'first' });
			root.render(Scene, { label: 'later' });
			expect(container.children[0].props).toMatchObject({ first: 'first', current: 'later' });
		} finally {
			root.unmount();
		}
	});
});
