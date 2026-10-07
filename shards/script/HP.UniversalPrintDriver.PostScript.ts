import { defineShard } from 'anthelion';
import ky from 'ky';

// HP's support site lists the UPD packages per OS through this endpoint. HP publishes the
// PostScript driver for Windows 10 x86/x64 only (no ARM64 build).
const OS = {
	x64: { id: '792898937266030878164166465223921', name: 'Windows 10 (64-bit)', arch: '64-bit' },
	x86: { id: '41696735586967302609327735059400', name: 'Windows 10 (32-bit)', arch: '32-bit' },
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
		.find((entry) => entry.title === `HP Universal Print Driver for Windows PostScript (${arch})`);
	if (!driver) throw new Error(`No UPD PostScript ${arch} driver listed for ${name}`);

	return { version: driver.version.replace(/^v/i, ''), url: driver.fileUrl };
}

export default defineShard(async () => {
	const [x64, x86] = await Promise.all([getDriver(OS.x64), getDriver(OS.x86)]);
	if (x86.version !== x64.version) {
		throw new Error(`UPD PostScript versions differ: x64 ${x64.version}, x86 ${x86.version}`);
	}

	return {
		version: x64.version,
		urls: () => [x86.url, x64.url],
	};
});
