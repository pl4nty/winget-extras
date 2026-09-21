import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

interface DownloadResponse {
	data: {
		FPlatform: string;
		FUrl: string;
		FVersions: string;
	}[];
}

// qidian.qq.com/download.html carries no version itself - it renders its download
// buttons from this endpoint. FVersions is only the three-part release (6.9.11),
// so the four-part build comes from the installer filename instead.
export default defineShard(async () => {
	const { data } = await ky(
		'https://qidian.qq.com/store/qd_interface/Download.php?FType=0',
	).json<DownloadResponse>();

	// FPlatform 1 is Windows; 2, 3 and 4 are iOS, Android and macOS. Match on the
	// field rather than an array index, which upstream is free to reorder.
	const windows = data.find((entry) => entry.FPlatform === '1')!;
	const {
		groups: [version],
	} = match(windows.FUrl, /\/QiDian(\d+(?:\.\d+)+)\.exe$/);

	const urls = () => [windows.FUrl];

	return { version, urls };
});
