import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The pages site serves the TTF as font/ttf, a content type komac rejects, so
// the installer is the pages job's artifact instead. Its ref URL floats with
// the latest main pipeline, and GitLab drops a job's artifacts once a newer
// pipeline supersedes them, so resolve that URL and pin the job it lands on.
// The artifact carries no ETag or Last-Modified, so the job id is the state.
export default defineShard(async () => {
	const response = await ky.head(
		'https://gitlab.com/gitlab-org/frontend/fonts/-/jobs/artifacts/main/raw/public/fonts/GitLabMono.ttf?job=pages',
	);
	const {
		groups: [job],
	} = match(response.url, /\/-\/jobs\/(\d+)\/artifacts\//);

	const version = { source: 'fontVersion' };
	const urls = () => [response.url];

	return {
		version,
		urls,
		state: job!,
		replace: true,
	};
});
