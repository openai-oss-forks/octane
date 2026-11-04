import { useSnapshot } from 'octane';
import { useSnapshot as useServerSnapshot } from 'octane/server';
import { useSnapshot as useUniversalSnapshot } from 'octane/universal';

const snapshot: { label: string } = useSnapshot(() => ({ label: 'first' }));
const callback: () => number = useSnapshot(() => () => 1);
const missing: undefined = useSnapshot(() => undefined, Symbol('slot'));
const server: string = useServerSnapshot(() => 'value');
const universal: number = useUniversalSnapshot(() => 1, { slot: 'snapshot' });

// @ts-expect-error A snapshot takes an initializer.
useSnapshot(1);
// @ts-expect-error Numeric slots belong to the compiler.
useSnapshot(() => 1, 0);

void [snapshot, callback, missing, server, universal];
