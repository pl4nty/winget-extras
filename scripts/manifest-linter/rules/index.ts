import { encodingRule } from '@/scripts/manifest-linter/rules/file/encoding';
import { fileModeRule } from '@/scripts/manifest-linter/rules/file/mode';
import { archiveRule } from '@/scripts/manifest-linter/rules/installer/archive';
import { githubHostRule } from '@/scripts/manifest-linter/rules/installer/github-host';
import { githubPinningRule } from '@/scripts/manifest-linter/rules/installer/github-pinning';
import { installerMetadataRule } from '@/scripts/manifest-linter/rules/installer/metadata';
import { returnCodesRule } from '@/scripts/manifest-linter/rules/installer/return-codes';
import { switchesRule } from '@/scripts/manifest-linter/rules/installer/switches';
import { repositoryContentsRule } from '@/scripts/manifest-linter/rules/repository/contents';
import { identifierCasingRule } from '@/scripts/manifest-linter/rules/repository/identifier-casing';
import { licenseSpdxRule } from '@/scripts/manifest-linter/rules/repository/license-spdx';
import { manifestPathRule } from '@/scripts/manifest-linter/rules/repository/manifest-path';
import { manifestSetRule } from '@/scripts/manifest-linter/rules/repository/manifest-set';
import { packageKindRule } from '@/scripts/manifest-linter/rules/repository/package-kind';
import { schemaHeaderRule } from '@/scripts/manifest-linter/rules/repository/schema-header';
import { shardCoverageRule } from '@/scripts/manifest-linter/rules/repository/shard-coverage';
import { upstreamVersionsRule } from '@/scripts/manifest-linter/rules/repository/upstream-versions';
import { yamlFilesRule } from '@/scripts/manifest-linter/rules/repository/yaml-files';
import type { Rule } from '@/scripts/manifest-linter/types';

/**
 * The complete policy is composed here. Adding a rule means creating one file,
 * testing it beside that file, and registering it in this list.
 */
export const defaultRules: readonly Rule[] = [
	encodingRule,
	fileModeRule,
	yamlFilesRule,
	schemaHeaderRule,
	identifierCasingRule,
	manifestSetRule,
	manifestPathRule,
	packageKindRule,
	repositoryContentsRule,
	shardCoverageRule,
	licenseSpdxRule,
	upstreamVersionsRule,
	installerMetadataRule,
	archiveRule,
	returnCodesRule,
	switchesRule,
	githubHostRule,
	githubPinningRule,
];
