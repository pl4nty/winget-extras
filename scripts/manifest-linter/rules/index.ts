import { encodingRule } from '@/scripts/manifest-linter/rules/file/encoding';
import { fileModeRule } from '@/scripts/manifest-linter/rules/file/mode';
import { archiveRule } from '@/scripts/manifest-linter/rules/installer/archive';
import { installerMetadataRule } from '@/scripts/manifest-linter/rules/installer/metadata';
import { returnCodesRule } from '@/scripts/manifest-linter/rules/installer/return-codes';
import { switchesRule } from '@/scripts/manifest-linter/rules/installer/switches';
import { repositoryContentsRule } from '@/scripts/manifest-linter/rules/repository/contents';
import { identifierCasingRule } from '@/scripts/manifest-linter/rules/repository/identifier-casing';
import { manifestPathRule } from '@/scripts/manifest-linter/rules/repository/manifest-path';
import { manifestSetRule } from '@/scripts/manifest-linter/rules/repository/manifest-set';
import { packageKindRule } from '@/scripts/manifest-linter/rules/repository/package-kind';
import { schemaHeaderRule } from '@/scripts/manifest-linter/rules/repository/schema-header';
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
	installerMetadataRule,
	archiveRule,
	returnCodesRule,
	switchesRule,
];
