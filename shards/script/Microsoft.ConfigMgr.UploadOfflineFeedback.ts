import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.UploadOfflineFeedback', 'UploadOfflineFeedback.zip', [
		'UploadOfflineFeedback/CommandLine.dll',
		'UploadOfflineFeedback/Microsoft.ConfigurationManagement.Feedback.Common.dll',
		'UploadOfflineFeedback/Microsoft.ConfigurationManagement.ManagementProvider.dll',
		'UploadOfflineFeedback/Microsoft.ConfigurationManager.CabinetUtils.dll',
		'UploadOfflineFeedback/Microsoft.Diagnostics.Tracing.EventSource.dll',
		'UploadOfflineFeedback/Microsoft.Identity.Client.dll',
		'UploadOfflineFeedback/Microsoft.Identity.Client.Extensions.Msal.dll',
		'UploadOfflineFeedback/Microsoft.IdentityModel.Abstractions.dll',
		'UploadOfflineFeedback/Microsoft.WindowsAzure.Storage.dll',
		'UploadOfflineFeedback/NewtonSoft.Json.dll',
		'UploadOfflineFeedback/System.ValueTuple.dll',
		'UploadOfflineFeedback/UploadOfflineFeedback.exe',
	]),
);
