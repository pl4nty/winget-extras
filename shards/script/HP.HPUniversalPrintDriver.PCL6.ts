import { defineShard } from 'anthelion';
import ky from 'ky';

// HP's support site lists the UPD packages per OS through this endpoint. The WHQL build
// covers Windows 10 x86/x64 and Windows 11 ARM64 with one version number.
const OS = {
	x64: { id: '792898937266030878164166465223921', name: 'Windows 10 (64-bit)', arch: '64-bit' },
	x86: { id: '41696735586967302609327735059400', name: 'Windows 10 (32-bit)', arch: '32-bit' },
	arm64: {
		id: '16144137901514415411821122407512213166102',
		name: 'Windows 11 on ARM (64-bit)',
		arch: 'ARM64-bit',
	},
};

type DriverDetails = {
	data: {
		softwareTypes?: {
			softwareDriversList: {
				latestVersionDriver: { title: string; version: string; fileUrl: string };
			}[];
		}[];
	};
};

async function getDriver({ id, name, arch }: (typeof OS)[keyof typeof OS]) {
	const { data } = await ky
		.post('https://support.hp.com/wcc-services/swd-v2/driverDetails', {
			headers: { Referer: 'https://support.hp.com/' },
			json: {
				productLineCode: '',
				lc: 'en',
				cc: 'us',
				osTMSId: id,
				osName: name,
				productSeriesOid: 503548,
				platformId: id,
			},
		})
		.json<DriverDetails>();

	const driver = (data.softwareTypes ?? [])
		.flatMap((type) => type.softwareDriversList)
		.map((entry) => entry.latestVersionDriver)
		.find((entry) => entry.title === `HP Universal Print Driver for Windows PCL6 (${arch})`);
	if (!driver) throw new Error(`No UPD PCL6 ${arch} driver listed for ${name}`);

	return { version: driver.version.replace(/^v/i, ''), url: driver.fileUrl };
}

export default defineShard(async () => {
	const [x64, x86, arm64] = await Promise.all([
		getDriver(OS.x64),
		getDriver(OS.x86),
		getDriver(OS.arm64),
	]);
	if (x86.version !== x64.version || arm64.version !== x64.version) {
		throw new Error(
			`UPD PCL6 versions differ: x64 ${x64.version}, x86 ${x86.version}, arm64 ${arm64.version}`,
		);
	}

	return {
		version: x64.version,
		urls: () => [x86.url, x64.url, arm64.url],
	};
});
