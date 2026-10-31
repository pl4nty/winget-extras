import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

import { $ } from 'bun';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

// AMD Ryzen Master 2.x setups are InstallShield launchers around a wrapper MSI that only works
// when C:\AMD exists. The real installer is a file inside that MSI.

const seed = [0x13, 0x35, 0x86, 0x07];

/** A file from an InstallShield setup's ISSetupStream (type 4: obfuscated with its name, zlib). */
function readSetupStream(setup: Uint8Array, fileName: string) {
	const view = new DataView(setup.buffer, setup.byteOffset, setup.byteLength);
	let offset = Buffer.from(setup).lastIndexOf('ISSetupStream\0');
	if (offset < 0 || view.getUint32(offset + 16, true) !== 4) {
		throw new Error('Not an InstallShield type 4 setup stream');
	}
	const count = view.getUint16(offset + 14, true);
	offset += 46;
	for (let i = 0; i < count; i++) {
		const nameLength = view.getUint32(offset, true);
		const size = view.getUint32(offset + 10, true);
		offset += 48;
		const name = Buffer.from(setup.subarray(offset, offset + nameLength)).toString('utf16le');
		offset += nameLength;
		if (name === fileName) {
			const key = Buffer.from(name).map((byte, j) => byte ^ seed[j % 4]!);
			const data = setup.slice(offset, offset + size);
			for (let j = 0; j < data.length; j++) {
				const byte = data[j]!;
				data[j] = ~(key[(j % 1024) % key.length]! ^ ((byte << 4) | (byte >> 4))) & 0xff;
			}
			return inflateSync(data);
		}
		offset += size;
	}
	throw new Error(`${fileName} is missing from the setup stream`);
}

/** The inner installer from a Ryzen Master 2.x setup. Uses the runner's 7-Zip for MSI and CAB. */
export async function extractRyzenMasterInstaller(setup: Uint8Array) {
	const dir = await mkdtemp(join(tmpdir(), 'ryzen-master-'));
	await Bun.write(join(dir, 'wrapper.msi'), readSetupStream(setup, 'AMD Ryzen Master.msi'));
	const exe = Bun.file(join(dir, 'amd_ryzen_master_ui.exe'));
	// 7-Zip lists the files inside 2.14's Data1.cab, but only the cab itself for 2.13
	await $`7z e ${join(dir, 'wrapper.msi')} -o${dir} amd_ryzen_master_ui.exe Data1.cab`.quiet();
	const cab = Bun.file(join(dir, 'Data1.cab'));
	if (await cab.exists()) {
		await $`7z e ${cab.name} -o${dir} -y amd_ryzen_master_ui.exe`.quiet();
	}
	return exe;
}

export const headers = { 'User-Agent': 'winget-extras' };
export const driverHeaders = { ...headers, Referer: 'https://www.amd.com/' };

/** URL of a winget.tplant.com.au copy of a drivers.amd.com file, uploaded if missing. */
export function mirrorDriver(packageIdentifier: string, version: string, url: string) {
	return mirrorFile(packageIdentifier, version, url.split('/').at(-1)!, () =>
		ky(url, { headers: driverHeaders, timeout: 300_000, retry: 3 }),
	);
}
