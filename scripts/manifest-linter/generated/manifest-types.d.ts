/* oxlint-disable -- generated file */
type JSONPrimitive = boolean | null | number | string;
type JSONValue = JSONPrimitive | JSONValue[] | {
    [key: string]: JSONValue;
};
/**
 * InstallerManifestV1_9_0
 *
 * A representation of a single-file manifest representing an app installers in the OWC. v1.9.0
 */
export type InstallerManifestV1_9_0 = {
    PackageIdentifier: PackageIdentifier;
    PackageVersion: (PackageVersion & JSONValue);
    Channel?: Channel;
    InstallerLocale?: Locale;
    Platform?: Platform;
    MinimumOSVersion?: MinimumOSVersion;
    InstallerType?: InstallerType;
    NestedInstallerType?: NestedInstallerType;
    NestedInstallerFiles?: NestedInstallerFiles;
    Scope?: Scope;
    InstallModes?: InstallModes;
    InstallerSwitches?: InstallerSwitches;
    InstallerSuccessCodes?: InstallerSuccessCodes;
    ExpectedReturnCodes?: ExpectedReturnCodes;
    UpgradeBehavior?: UpgradeBehavior;
    Commands?: Commands;
    Protocols?: Protocols;
    FileExtensions?: FileExtensions;
    Dependencies?: Dependencies;
    PackageFamilyName?: PackageFamilyName;
    ProductCode?: ProductCode;
    Capabilities?: Capabilities;
    RestrictedCapabilities?: RestrictedCapabilities;
    Markets?: Markets;
    InstallerAbortsTerminal?: InstallerAbortsTerminal;
    ReleaseDate?: ReleaseDate;
    InstallLocationRequired?: InstallLocationRequired;
    RequireExplicitUpgrade?: RequireExplicitUpgrade;
    DisplayInstallWarnings?: DisplayInstallWarnings;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures;
    UnsupportedArguments?: UnsupportedArguments;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries;
    ElevationRequirement?: ElevationRequirement;
    InstallationMetadata?: InstallationMetadata;
    DownloadCommandProhibited?: DownloadCommandProhibited;
    RepairBehavior?: RepairBehavior;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath;
    Installers: (Installer)[];
    /** The manifest type */
    ManifestType: ("installer" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.9.0" & string);
};
/**
 * VersionManifestV1_9_0
 *
 * A representation of a multi-file manifest representing an app version in the OWC. v1.9.0
 */
export type VersionManifestV1_9_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The default package meta-data locale */
    DefaultLocale: string;
    /** The manifest type */
    ManifestType: ("version" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.9.0" & string);
};
/**
 * LocaleManifestV1_9_0
 *
 * A representation of a multiple-file manifest representing app metadata in other locale in the OWC. v1.9.0
 */
export type LocaleManifestV1_9_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher?: (string | null);
    /** The publisher home page */
    PublisherUrl?: Url;
    /** The publisher support page */
    PublisherSupportUrl?: Url;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName?: (string | null);
    /** The package home page */
    PackageUrl?: Url;
    /** The package license */
    License?: (string | null);
    /** The license page */
    LicenseUrl?: Url;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url;
    /** The short package description */
    ShortDescription?: (string | null);
    /** The full package description */
    Description?: (string | null);
    /** List of additional package search terms */
    Tags?: ((Tag)[] | null);
    Agreements?: ((Agreement)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation)[] | null);
    Icons?: ((Icon)[] | null);
    /** The manifest type */
    ManifestType: ("locale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.9.0" & string);
};
/**
 * DefaultLocaleManifestV1_9_0
 *
 * A representation of a multiple-file manifest representing a default app metadata in the OWC. v1.9.0
 */
export type DefaultLocaleManifestV1_9_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher: string;
    /** The publisher home page */
    PublisherUrl?: Url0;
    /** The publisher support page */
    PublisherSupportUrl?: Url0;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url0;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName: string;
    /** The package home page */
    PackageUrl?: Url0;
    /** The package license */
    License: string;
    /** The license page */
    LicenseUrl?: Url0;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url0;
    /** The short package description */
    ShortDescription: string;
    /** The full package description */
    Description?: (string | null);
    /** The most common package term */
    Moniker: Tag0;
    /** List of additional package search terms */
    Tags?: ((Tag0)[] | null);
    Agreements?: ((Agreement0)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url0;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url0;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation0)[] | null);
    Icons?: ((Icon0)[] | null);
    /** The manifest type */
    ManifestType: ("defaultLocale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.9.0" & string);
};
/**
 * InstallerManifestV1_10_0
 *
 * A representation of a single-file manifest representing an app installers in the OWC. v1.10.0
 */
export type InstallerManifestV1_10_0 = {
    PackageIdentifier: PackageIdentifier0;
    PackageVersion: (PackageVersion0 & JSONValue);
    Channel?: Channel0;
    InstallerLocale?: Locale0;
    Platform?: Platform0;
    MinimumOSVersion?: MinimumOSVersion0;
    InstallerType?: InstallerType0;
    NestedInstallerType?: NestedInstallerType0;
    NestedInstallerFiles?: NestedInstallerFiles0;
    Scope?: Scope0;
    InstallModes?: InstallModes0;
    InstallerSwitches?: InstallerSwitches0;
    InstallerSuccessCodes?: InstallerSuccessCodes0;
    ExpectedReturnCodes?: ExpectedReturnCodes0;
    UpgradeBehavior?: UpgradeBehavior0;
    Commands?: Commands0;
    Protocols?: Protocols0;
    FileExtensions?: FileExtensions0;
    Dependencies?: Dependencies0;
    PackageFamilyName?: PackageFamilyName0;
    ProductCode?: ProductCode0;
    Capabilities?: Capabilities0;
    RestrictedCapabilities?: RestrictedCapabilities0;
    Markets?: Markets0;
    InstallerAbortsTerminal?: InstallerAbortsTerminal0;
    ReleaseDate?: ReleaseDate0;
    InstallLocationRequired?: InstallLocationRequired0;
    RequireExplicitUpgrade?: RequireExplicitUpgrade0;
    DisplayInstallWarnings?: DisplayInstallWarnings0;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures0;
    UnsupportedArguments?: UnsupportedArguments0;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries0;
    ElevationRequirement?: ElevationRequirement0;
    InstallationMetadata?: InstallationMetadata0;
    DownloadCommandProhibited?: DownloadCommandProhibited0;
    RepairBehavior?: RepairBehavior0;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath0;
    Authentication?: Authentication;
    Installers: (Installer0)[];
    /** The manifest type */
    ManifestType: ("installer" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.10.0" & string);
};
/**
 * VersionManifestV1_10_0
 *
 * A representation of a multi-file manifest representing an app version in the OWC. v1.10.0
 */
export type VersionManifestV1_10_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The default package meta-data locale */
    DefaultLocale: string;
    /** The manifest type */
    ManifestType: ("version" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.10.0" & string);
};
/**
 * LocaleManifestV1_10_0
 *
 * A representation of a multiple-file manifest representing app metadata in other locale in the OWC. v1.10.0
 */
export type LocaleManifestV1_10_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher?: (string | null);
    /** The publisher home page */
    PublisherUrl?: Url1;
    /** The publisher support page */
    PublisherSupportUrl?: Url1;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url1;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName?: (string | null);
    /** The package home page */
    PackageUrl?: Url1;
    /** The package license */
    License?: (string | null);
    /** The license page */
    LicenseUrl?: Url1;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url1;
    /** The short package description */
    ShortDescription?: (string | null);
    /** The full package description */
    Description?: (string | null);
    /** List of additional package search terms */
    Tags?: ((Tag1)[] | null);
    Agreements?: ((Agreement1)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url1;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url1;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation1)[] | null);
    Icons?: ((Icon1)[] | null);
    /** The manifest type */
    ManifestType: ("locale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.10.0" & string);
};
/**
 * DefaultLocaleManifestV1_10_0
 *
 * A representation of a multiple-file manifest representing a default app metadata in the OWC. v1.10.0
 */
export type DefaultLocaleManifestV1_10_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher: string;
    /** The publisher home page */
    PublisherUrl?: Url2;
    /** The publisher support page */
    PublisherSupportUrl?: Url2;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url2;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName: string;
    /** The package home page */
    PackageUrl?: Url2;
    /** The package license */
    License: string;
    /** The license page */
    LicenseUrl?: Url2;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url2;
    /** The short package description */
    ShortDescription: string;
    /** The full package description */
    Description?: (string | null);
    /** The most common package term */
    Moniker: Tag2;
    /** List of additional package search terms */
    Tags?: ((Tag2)[] | null);
    Agreements?: ((Agreement2)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url2;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url2;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation2)[] | null);
    Icons?: ((Icon2)[] | null);
    /** The manifest type */
    ManifestType: ("defaultLocale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.10.0" & string);
};
/**
 * InstallerManifestV1_12_0
 *
 * A representation of a single-file manifest representing an app installers in the OWC. v1.12.0
 */
export type InstallerManifestV1_12_0 = {
    PackageIdentifier: PackageIdentifier1;
    PackageVersion: (PackageVersion1 & JSONValue);
    Channel?: Channel1;
    InstallerLocale?: Locale1;
    Platform?: Platform1;
    MinimumOSVersion?: MinimumOSVersion1;
    InstallerType?: InstallerType1;
    NestedInstallerType?: NestedInstallerType1;
    NestedInstallerFiles?: NestedInstallerFiles1;
    Scope?: Scope1;
    InstallModes?: InstallModes1;
    InstallerSwitches?: InstallerSwitches1;
    InstallerSuccessCodes?: InstallerSuccessCodes1;
    ExpectedReturnCodes?: ExpectedReturnCodes1;
    UpgradeBehavior?: UpgradeBehavior1;
    Commands?: Commands1;
    Protocols?: Protocols1;
    FileExtensions?: FileExtensions1;
    Dependencies?: Dependencies1;
    PackageFamilyName?: PackageFamilyName1;
    ProductCode?: ProductCode1;
    Capabilities?: Capabilities1;
    RestrictedCapabilities?: RestrictedCapabilities1;
    Markets?: Markets1;
    InstallerAbortsTerminal?: InstallerAbortsTerminal1;
    ReleaseDate?: ReleaseDate1;
    InstallLocationRequired?: InstallLocationRequired1;
    RequireExplicitUpgrade?: RequireExplicitUpgrade1;
    DisplayInstallWarnings?: DisplayInstallWarnings1;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures1;
    UnsupportedArguments?: UnsupportedArguments1;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries1;
    ElevationRequirement?: ElevationRequirement1;
    InstallationMetadata?: InstallationMetadata1;
    DownloadCommandProhibited?: DownloadCommandProhibited1;
    RepairBehavior?: RepairBehavior1;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath1;
    Authentication?: Authentication0;
    Installers: (Installer1)[];
    /** The manifest type */
    ManifestType: ("installer" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.12.0" & string);
};
/**
 * VersionManifestV1_12_0
 *
 * A representation of a multi-file manifest representing an app version in the OWC. v1.12.0
 */
export type VersionManifestV1_12_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The default package meta-data locale */
    DefaultLocale: string;
    /** The manifest type */
    ManifestType: ("version" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.12.0" & string);
};
/**
 * LocaleManifestV1_12_0
 *
 * A representation of a multiple-file manifest representing app metadata in other locale in the OWC. v1.12.0
 */
export type LocaleManifestV1_12_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher?: (string | null);
    /** The publisher home page */
    PublisherUrl?: Url3;
    /** The publisher support page */
    PublisherSupportUrl?: Url3;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url3;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName?: (string | null);
    /** The package home page */
    PackageUrl?: Url3;
    /** The package license */
    License?: (string | null);
    /** The license page */
    LicenseUrl?: Url3;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url3;
    /** The short package description */
    ShortDescription?: (string | null);
    /** The full package description */
    Description?: (string | null);
    /** List of additional package search terms */
    Tags?: ((Tag3)[] | null);
    Agreements?: ((Agreement3)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url3;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url3;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation3)[] | null);
    Icons?: ((Icon3)[] | null);
    /** The manifest type */
    ManifestType: ("locale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.12.0" & string);
};
/**
 * DefaultLocaleManifestV1_12_0
 *
 * A representation of a multiple-file manifest representing a default app metadata in the OWC. v1.12.0
 */
export type DefaultLocaleManifestV1_12_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher: string;
    /** The publisher home page */
    PublisherUrl?: Url4;
    /** The publisher support page */
    PublisherSupportUrl?: Url4;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url4;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName: string;
    /** The package home page */
    PackageUrl?: Url4;
    /** The package license */
    License: string;
    /** The license page */
    LicenseUrl?: Url4;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url4;
    /** The short package description */
    ShortDescription: string;
    /** The full package description */
    Description?: (string | null);
    /** The most common package term */
    Moniker: Tag4;
    /** List of additional package search terms */
    Tags?: ((Tag4)[] | null);
    Agreements?: ((Agreement4)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url4;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url4;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation4)[] | null);
    Icons?: ((Icon4)[] | null);
    /** The manifest type */
    ManifestType: ("defaultLocale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.12.0" & string);
};
/**
 * InstallerManifestV1_28_0
 *
 * A representation of a single-file manifest representing an app installers in the OWC. v1.28.0
 */
export type InstallerManifestV1_28_0 = {
    PackageIdentifier: PackageIdentifier2;
    PackageVersion: (PackageVersion2 & JSONValue);
    Channel?: Channel2;
    InstallerLocale?: Locale2;
    Platform?: Platform2;
    MinimumOSVersion?: MinimumOSVersion2;
    InstallerType?: InstallerType2;
    NestedInstallerType?: NestedInstallerType2;
    NestedInstallerFiles?: NestedInstallerFiles2;
    Scope?: Scope2;
    InstallModes?: InstallModes2;
    InstallerSwitches?: InstallerSwitches2;
    InstallerSuccessCodes?: InstallerSuccessCodes2;
    ExpectedReturnCodes?: ExpectedReturnCodes2;
    UpgradeBehavior?: UpgradeBehavior2;
    Commands?: Commands2;
    Protocols?: Protocols2;
    FileExtensions?: FileExtensions2;
    Dependencies?: Dependencies2;
    PackageFamilyName?: PackageFamilyName2;
    ProductCode?: ProductCode2;
    Capabilities?: Capabilities2;
    RestrictedCapabilities?: RestrictedCapabilities2;
    Markets?: Markets2;
    InstallerAbortsTerminal?: InstallerAbortsTerminal2;
    ReleaseDate?: ReleaseDate2;
    InstallLocationRequired?: InstallLocationRequired2;
    RequireExplicitUpgrade?: RequireExplicitUpgrade2;
    DisplayInstallWarnings?: DisplayInstallWarnings2;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures2;
    UnsupportedArguments?: UnsupportedArguments2;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries2;
    ElevationRequirement?: ElevationRequirement2;
    InstallationMetadata?: InstallationMetadata2;
    DownloadCommandProhibited?: DownloadCommandProhibited2;
    RepairBehavior?: RepairBehavior2;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath2;
    Authentication?: Authentication1;
    DesiredStateConfiguration?: DesiredStateConfiguration;
    Installers: (Installer2)[];
    /** The manifest type */
    ManifestType: ("installer" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.28.0" & string);
};
/**
 * VersionManifestV1_28_0
 *
 * A representation of a multi-file manifest representing an app version in the OWC. v1.28.0
 */
export type VersionManifestV1_28_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The default package meta-data locale */
    DefaultLocale: string;
    /** The manifest type */
    ManifestType: ("version" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.28.0" & string);
};
/**
 * LocaleManifestV1_28_0
 *
 * A representation of a multiple-file manifest representing app metadata in other locale in the OWC. v1.28.0
 */
export type LocaleManifestV1_28_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher?: (string | null);
    /** The publisher home page */
    PublisherUrl?: Url5;
    /** The publisher support page */
    PublisherSupportUrl?: Url5;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url5;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName?: (string | null);
    /** The package home page */
    PackageUrl?: Url5;
    /** The package license */
    License?: (string | null);
    /** The license page */
    LicenseUrl?: Url5;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url5;
    /** The short package description */
    ShortDescription?: (string | null);
    /** The full package description */
    Description?: (string | null);
    /** List of additional package search terms */
    Tags?: ((Tag5)[] | null);
    Agreements?: ((Agreement5)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url5;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url5;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation5)[] | null);
    Icons?: ((Icon5)[] | null);
    /** The manifest type */
    ManifestType: ("locale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.28.0" & string);
};
/**
 * DefaultLocaleManifestV1_28_0
 *
 * A representation of a multiple-file manifest representing a default app metadata in the OWC. v1.28.0
 */
export type DefaultLocaleManifestV1_28_0 = {
    /** The package unique identifier */
    PackageIdentifier: string;
    /** The package version */
    PackageVersion: string;
    /** The package meta-data locale */
    PackageLocale: string;
    /** The publisher name */
    Publisher: string;
    /** The publisher home page */
    PublisherUrl?: Url6;
    /** The publisher support page */
    PublisherSupportUrl?: Url6;
    /** The publisher privacy page or the package privacy page */
    PrivacyUrl?: Url6;
    /** The package author */
    Author?: (string | null);
    /** The package name */
    PackageName: string;
    /** The package home page */
    PackageUrl?: Url6;
    /** The package license */
    License: string;
    /** The license page */
    LicenseUrl?: Url6;
    /** The package copyright */
    Copyright?: (string | null);
    /** The package copyright page */
    CopyrightUrl?: Url6;
    /** The short package description */
    ShortDescription: string;
    /** The full package description */
    Description?: (string | null);
    /** The most common package term */
    Moniker: Tag6;
    /** List of additional package search terms */
    Tags?: ((Tag6)[] | null);
    Agreements?: ((Agreement6)[] | null);
    /** The package release notes */
    ReleaseNotes?: (string | null);
    /** The package release notes url */
    ReleaseNotesUrl?: Url6;
    /** The purchase url for acquiring entitlement for the package. */
    PurchaseUrl?: Url6;
    /** The notes displayed to the user upon completion of a package installation. */
    InstallationNotes?: (string | null);
    Documentations?: ((Documentation6)[] | null);
    Icons?: ((Icon6)[] | null);
    /** The manifest type */
    ManifestType: ("defaultLocale" & string);
    /** The manifest syntax version */
    ManifestVersion: ("1.28.0" & string);
};
/** WingetManifest */
export type WingetManifest = (InstallerManifestV1_9_0 | VersionManifestV1_9_0 | LocaleManifestV1_9_0 | DefaultLocaleManifestV1_9_0 | InstallerManifestV1_10_0 | VersionManifestV1_10_0 | LocaleManifestV1_10_0 | DefaultLocaleManifestV1_10_0 | InstallerManifestV1_12_0 | VersionManifestV1_12_0 | LocaleManifestV1_12_0 | DefaultLocaleManifestV1_12_0 | InstallerManifestV1_28_0 | VersionManifestV1_28_0 | LocaleManifestV1_28_0 | DefaultLocaleManifestV1_28_0);
/** InstallerManifest */
export type InstallerManifest = (InstallerManifestV1_9_0 | InstallerManifestV1_10_0 | InstallerManifestV1_12_0 | InstallerManifestV1_28_0);
/** LocalizationManifest */
export type LocalizationManifest = (LocaleManifestV1_9_0 | DefaultLocaleManifestV1_9_0 | LocaleManifestV1_10_0 | DefaultLocaleManifestV1_10_0 | LocaleManifestV1_12_0 | DefaultLocaleManifestV1_12_0 | LocaleManifestV1_28_0 | DefaultLocaleManifestV1_28_0);
/** The package unique identifier */
export type PackageIdentifier = string;
/** The package version */
export type PackageVersion = string;
/** The distribution channel */
export type Channel = (null & (string | null));
/** The installer meta-data locale */
export type Locale = (string | null);
/** The installer supported operating system */
export type Platform = (((("Windows.Desktop" | "Windows.Universal") & string))[] | null);
/** The installer minimum operating system version */
export type MinimumOSVersion = (string | null);
/** Enumeration of supported installer types. InstallerType is required in either root level or individual Installer level */
export type InstallerType = (("msix" | "msi" | "appx" | "exe" | "zip" | "inno" | "nullsoft" | "wix" | "burn" | "pwa" | "portable") & (string | null));
/** Enumeration of supported nested installer types contained inside an archive file */
export type NestedInstallerType = (("msix" | "msi" | "appx" | "exe" | "inno" | "nullsoft" | "wix" | "burn" | "portable") & (string | null));
/** List of nested installer files contained inside an archive */
export type NestedInstallerFiles = (({
    /** The relative path to the nested installer file */
    RelativeFilePath: string;
    /** The command alias to be used for calling the package. Only applies to the nested portable package */
    PortableCommandAlias?: (string | null);
})[] | null);
/** Scope indicates if the installer is per user or per machine */
export type Scope = (("user" | "machine") & (string | null));
/** List of supported installer modes */
export type InstallModes = (((("interactive" | "silent" | "silentWithProgress") & string))[] | null);
export type InstallerSwitches = {
    /** Silent is the value that should be passed to the installer when user chooses a silent or quiet install */
    Silent?: (string | null);
    /** SilentWithProgress is the value that should be passed to the installer when user chooses a non-interactive install */
    SilentWithProgress?: (string | null);
    /** Interactive is the value that should be passed to the installer when user chooses an interactive install */
    Interactive?: (string | null);
    /** InstallLocation is the value passed to the installer for custom install location. <INSTALLPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    InstallLocation?: (string | null);
    /** Log is the value passed to the installer for custom log file path. <LOGPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    Log?: (string | null);
    /** Upgrade is the value that should be passed to the installer when user chooses an upgrade */
    Upgrade?: (string | null);
    /** Custom switches will be passed directly to the installer by winget */
    Custom?: (string | null);
    /** The 'Repair' value must be passed to the installer, ModifyPath ARP command, or uninstaller ARP command when the user opts for a repair. */
    Repair?: (string | null);
};
/** List of additional non-zero installer success exit codes other than known default values by winget */
export type InstallerSuccessCodes = ((InstallerReturnCode)[] | null);
/** Installer exit codes for common errors */
export type ExpectedReturnCodes = (({
    InstallerReturnCode: InstallerReturnCode;
    ReturnResponse: (("packageInUse" | "packageInUseByApplication" | "installInProgress" | "fileInUse" | "missingDependency" | "diskFull" | "insufficientMemory" | "invalidParameter" | "noNetwork" | "contactSupport" | "rebootRequiredToFinish" | "rebootRequiredForInstall" | "rebootInitiated" | "cancelledByUser" | "alreadyInstalled" | "downgrade" | "blockedByPolicy" | "systemNotSupported" | "custom") & string);
    /** The return response url to provide additional guidance for expected return codes */
    ReturnResponseUrl?: Url7;
})[] | null);
/** The upgrade method */
export type UpgradeBehavior = (("install" | "uninstallPrevious" | "deny") & (string | null));
/** List of commands or aliases to run the package */
export type Commands = ((string)[] | null);
/** List of protocols the package provides a handler for */
export type Protocols = ((string)[] | null);
/** List of file extensions the package could support */
export type FileExtensions = ((string)[] | null);
export type Dependencies = ({
    /** List of Windows feature dependencies */
    WindowsFeatures?: ((string)[] | null);
    /** List of Windows library dependencies */
    WindowsLibraries?: ((string)[] | null);
    /** List of package dependencies from current source */
    PackageDependencies?: (({
        PackageIdentifier: PackageIdentifier;
        MinimumVersion?: PackageVersion;
    })[] | null);
    /** List of external package dependencies */
    ExternalDependencies?: ((string)[] | null);
} | null);
/** PackageFamilyName for appx or msix installer. Could be used for correlation of packages across sources */
export type PackageFamilyName = (string | null);
/** ProductCode could be used for correlation of packages across sources */
export type ProductCode = (string | null);
/** List of appx or msix installer capabilities */
export type Capabilities = ((string)[] | null);
/** List of appx or msix installer restricted capabilities */
export type RestrictedCapabilities = ((string)[] | null);
/** The installer markets */
export type Markets = ((JSONValue | JSONValue) & ({
    [property: string]: JSONValue;
} | null));
/** Indicates whether the installer will abort terminal. Default is false */
export type InstallerAbortsTerminal = (boolean | null);
/** The installer release date */
export type ReleaseDate = (string | null);
/** Indicates whether the installer requires an install location provided */
export type InstallLocationRequired = (boolean | null);
/** Indicates whether the installer should be pinned by default from upgrade */
export type RequireExplicitUpgrade = (boolean | null);
/** Indicates whether winget should display a warning message if the install or upgrade is known to interfere with running applications. */
export type DisplayInstallWarnings = (boolean | null);
/** List of OS architectures the installer does not support */
export type UnsupportedOSArchitectures = (((("x86" | "x64" | "arm" | "arm64") & string))[] | null);
/** List of winget arguments the installer does not support */
export type UnsupportedArguments = (((("log" | "location") & string))[] | null);
/** List of ARP entries. */
export type AppsAndFeaturesEntries = ((AppsAndFeaturesEntry)[] | null);
/** The installer's elevation requirement */
export type ElevationRequirement = (("elevationRequired" | "elevationProhibited" | "elevatesSelf") & (string | null));
/**
 * InstallationMetadata
 *
 * Details about the installation. Used for deeper installation detection.
 */
export type InstallationMetadata = {
    /** Represents the default installed package location. Used for deeper installation detection. */
    DefaultInstallLocation?: (string | null);
    /** List of installed files. */
    Files?: (({
        /** The relative path to the installed file. */
        RelativeFilePath: string;
        /** Optional Sha256 of the installed file. */
        FileSha256?: (string | null);
        /** The optional installed file type. If not specified, the file is treated as other. */
        FileType?: (("launch" | "uninstall" | "other") & (string | null));
        /** Optional parameter for invocable files. */
        InvocationParameter?: (string | null);
        /** Optional display name for invocable files. */
        DisplayName?: (string | null);
    })[] | null);
};
/** Indicates whether the installer is prohibited from being downloaded for offline installation. */
export type DownloadCommandProhibited = (boolean | null);
/** The repair method */
export type RepairBehavior = (("modify" | "uninstaller" | "installer") & (string | null));
/** Indicates whether the install location should be added directly to the PATH environment variable. Only applies to an archive containing portable packages. */
export type ArchiveBinariesDependOnPath = (boolean | null);
export type Installer = {
    InstallerLocale?: Locale;
    Platform?: Platform;
    MinimumOSVersion?: MinimumOSVersion;
    Architecture: Architecture;
    InstallerType?: InstallerType;
    NestedInstallerType?: NestedInstallerType;
    NestedInstallerFiles?: NestedInstallerFiles;
    Scope?: Scope;
    /** The installer Url */
    InstallerUrl: string;
    /** Sha256 is required. Sha256 of the installer */
    InstallerSha256: string;
    /** SignatureSha256 is recommended for appx or msix. It is the sha256 of signature file inside appx or msix. Could be used during streaming install if applicable */
    SignatureSha256?: (string | null);
    InstallModes?: InstallModes;
    InstallerSwitches?: InstallerSwitches;
    InstallerSuccessCodes?: InstallerSuccessCodes;
    ExpectedReturnCodes?: ExpectedReturnCodes;
    UpgradeBehavior?: UpgradeBehavior;
    Commands?: Commands;
    Protocols?: Protocols;
    FileExtensions?: FileExtensions;
    Dependencies?: Dependencies;
    PackageFamilyName?: PackageFamilyName;
    ProductCode?: ProductCode;
    Capabilities?: Capabilities;
    RestrictedCapabilities?: RestrictedCapabilities;
    Markets?: Markets;
    InstallerAbortsTerminal?: InstallerAbortsTerminal;
    ReleaseDate?: ReleaseDate;
    InstallLocationRequired?: InstallLocationRequired;
    RequireExplicitUpgrade?: RequireExplicitUpgrade;
    DisplayInstallWarnings?: DisplayInstallWarnings;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures;
    UnsupportedArguments?: UnsupportedArguments;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries;
    ElevationRequirement?: ElevationRequirement;
    InstallationMetadata?: InstallationMetadata;
    DownloadCommandProhibited?: DownloadCommandProhibited;
    RepairBehavior?: RepairBehavior;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath;
};
/** Optional Url type */
export type Url = (string | null);
/** Package tag */
export type Tag = (string | null);
export type Agreement = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url;
});
export type Documentation = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url;
};
export type Icon = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** Optional Url type */
export type Url0 = (string | null);
/** Package moniker or tag */
export type Tag0 = (string | null);
export type Agreement0 = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url0;
});
export type Documentation0 = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url0;
};
export type Icon0 = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** The package unique identifier */
export type PackageIdentifier0 = string;
/** The package version */
export type PackageVersion0 = string;
/** The distribution channel */
export type Channel0 = (null & (string | null));
/** The installer meta-data locale */
export type Locale0 = (string | null);
/** The installer supported operating system */
export type Platform0 = (((("Windows.Desktop" | "Windows.Universal") & string))[] | null);
/** The installer minimum operating system version */
export type MinimumOSVersion0 = (string | null);
/** Enumeration of supported installer types. InstallerType is required in either root level or individual Installer level */
export type InstallerType0 = (("msix" | "msi" | "appx" | "exe" | "zip" | "inno" | "nullsoft" | "wix" | "burn" | "pwa" | "portable") & (string | null));
/** Enumeration of supported nested installer types contained inside an archive file */
export type NestedInstallerType0 = (("msix" | "msi" | "appx" | "exe" | "inno" | "nullsoft" | "wix" | "burn" | "portable") & (string | null));
/** List of nested installer files contained inside an archive */
export type NestedInstallerFiles0 = (({
    /** The relative path to the nested installer file */
    RelativeFilePath: string;
    /** The command alias to be used for calling the package. Only applies to the nested portable package */
    PortableCommandAlias?: (string | null);
})[] | null);
/** Scope indicates if the installer is per user or per machine */
export type Scope0 = (("user" | "machine") & (string | null));
/** List of supported installer modes */
export type InstallModes0 = (((("interactive" | "silent" | "silentWithProgress") & string))[] | null);
export type InstallerSwitches0 = {
    /** Silent is the value that should be passed to the installer when user chooses a silent or quiet install */
    Silent?: (string | null);
    /** SilentWithProgress is the value that should be passed to the installer when user chooses a non-interactive install */
    SilentWithProgress?: (string | null);
    /** Interactive is the value that should be passed to the installer when user chooses an interactive install */
    Interactive?: (string | null);
    /** InstallLocation is the value passed to the installer for custom install location. <INSTALLPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    InstallLocation?: (string | null);
    /** Log is the value passed to the installer for custom log file path. <LOGPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    Log?: (string | null);
    /** Upgrade is the value that should be passed to the installer when user chooses an upgrade */
    Upgrade?: (string | null);
    /** Custom switches will be passed directly to the installer by winget */
    Custom?: (string | null);
    /** The 'Repair' value must be passed to the installer, ModifyPath ARP command, or uninstaller ARP command when the user opts for a repair. */
    Repair?: (string | null);
};
/** List of additional non-zero installer success exit codes other than known default values by winget */
export type InstallerSuccessCodes0 = ((InstallerReturnCode0)[] | null);
/** Installer exit codes for common errors */
export type ExpectedReturnCodes0 = (({
    InstallerReturnCode: InstallerReturnCode0;
    ReturnResponse: (("packageInUse" | "packageInUseByApplication" | "installInProgress" | "fileInUse" | "missingDependency" | "diskFull" | "insufficientMemory" | "invalidParameter" | "noNetwork" | "contactSupport" | "rebootRequiredToFinish" | "rebootRequiredForInstall" | "rebootInitiated" | "cancelledByUser" | "alreadyInstalled" | "downgrade" | "blockedByPolicy" | "systemNotSupported" | "custom") & string);
    /** The return response url to provide additional guidance for expected return codes */
    ReturnResponseUrl?: Url8;
})[] | null);
/** The upgrade method */
export type UpgradeBehavior0 = (("install" | "uninstallPrevious" | "deny") & (string | null));
/** List of commands or aliases to run the package */
export type Commands0 = ((string)[] | null);
/** List of protocols the package provides a handler for */
export type Protocols0 = ((string)[] | null);
/** List of file extensions the package could support */
export type FileExtensions0 = ((string)[] | null);
export type Dependencies0 = ({
    /** List of Windows feature dependencies */
    WindowsFeatures?: ((string)[] | null);
    /** List of Windows library dependencies */
    WindowsLibraries?: ((string)[] | null);
    /** List of package dependencies from current source */
    PackageDependencies?: (({
        PackageIdentifier: PackageIdentifier0;
        MinimumVersion?: PackageVersion0;
    })[] | null);
    /** List of external package dependencies */
    ExternalDependencies?: ((string)[] | null);
} | null);
/** PackageFamilyName for appx or msix installer. Could be used for correlation of packages across sources */
export type PackageFamilyName0 = (string | null);
/** ProductCode could be used for correlation of packages across sources */
export type ProductCode0 = (string | null);
/** List of appx or msix installer capabilities */
export type Capabilities0 = ((string)[] | null);
/** List of appx or msix installer restricted capabilities */
export type RestrictedCapabilities0 = ((string)[] | null);
/** The installer markets */
export type Markets0 = ((JSONValue | JSONValue) & ({
    [property: string]: JSONValue;
} | null));
/** Indicates whether the installer will abort terminal. Default is false */
export type InstallerAbortsTerminal0 = (boolean | null);
/** The installer release date */
export type ReleaseDate0 = (string | null);
/** Indicates whether the installer requires an install location provided */
export type InstallLocationRequired0 = (boolean | null);
/** Indicates whether the installer should be pinned by default from upgrade */
export type RequireExplicitUpgrade0 = (boolean | null);
/** Indicates whether winget should display a warning message if the install or upgrade is known to interfere with running applications. */
export type DisplayInstallWarnings0 = (boolean | null);
/** List of OS architectures the installer does not support */
export type UnsupportedOSArchitectures0 = (((("x86" | "x64" | "arm" | "arm64") & string))[] | null);
/** List of winget arguments the installer does not support */
export type UnsupportedArguments0 = (((("log" | "location") & string))[] | null);
/** List of ARP entries. */
export type AppsAndFeaturesEntries0 = ((AppsAndFeaturesEntry0)[] | null);
/** The installer's elevation requirement */
export type ElevationRequirement0 = (("elevationRequired" | "elevationProhibited" | "elevatesSelf") & (string | null));
/**
 * InstallationMetadata
 *
 * Details about the installation. Used for deeper installation detection.
 */
export type InstallationMetadata0 = {
    /** Represents the default installed package location. Used for deeper installation detection. */
    DefaultInstallLocation?: (string | null);
    /** List of installed files. */
    Files?: (({
        /** The relative path to the installed file. */
        RelativeFilePath: string;
        /** Optional Sha256 of the installed file. */
        FileSha256?: (string | null);
        /** The optional installed file type. If not specified, the file is treated as other. */
        FileType?: (("launch" | "uninstall" | "other") & (string | null));
        /** Optional parameter for invocable files. */
        InvocationParameter?: (string | null);
        /** Optional display name for invocable files. */
        DisplayName?: (string | null);
    })[] | null);
};
/** Indicates whether the installer is prohibited from being downloaded for offline installation. */
export type DownloadCommandProhibited0 = (boolean | null);
/** The repair method */
export type RepairBehavior0 = (("modify" | "uninstaller" | "installer") & (string | null));
/** Indicates whether the install location should be added directly to the PATH environment variable. Only applies to an archive containing portable packages. */
export type ArchiveBinariesDependOnPath0 = (boolean | null);
/** The authentication requirement for downloading the installer. */
export type Authentication = ({
    /** The authentication type */
    AuthenticationType: ("none" & ("none" | "microsoftEntraId" | "microsoftEntraIdForAzureBlobStorage") & string);
    /** The Microsoft Entra Id authentication info */
    MicrosoftEntraIdAuthenticationInfo?: ({
        /** The resource value for Microsoft Entra Id authentication. */
        Resource?: (string | null);
        /** The scope value for Microsoft Entra Id authentication. */
        Scope?: (string | null);
    } | null);
} | null);
export type Installer0 = {
    InstallerLocale?: Locale0;
    Platform?: Platform0;
    MinimumOSVersion?: MinimumOSVersion0;
    Architecture: Architecture0;
    InstallerType?: InstallerType0;
    NestedInstallerType?: NestedInstallerType0;
    NestedInstallerFiles?: NestedInstallerFiles0;
    Scope?: Scope0;
    /** The installer Url */
    InstallerUrl: string;
    /** Sha256 is required. Sha256 of the installer */
    InstallerSha256: string;
    /** SignatureSha256 is recommended for appx or msix. It is the sha256 of signature file inside appx or msix. Could be used during streaming install if applicable */
    SignatureSha256?: (string | null);
    InstallModes?: InstallModes0;
    InstallerSwitches?: InstallerSwitches0;
    InstallerSuccessCodes?: InstallerSuccessCodes0;
    ExpectedReturnCodes?: ExpectedReturnCodes0;
    UpgradeBehavior?: UpgradeBehavior0;
    Commands?: Commands0;
    Protocols?: Protocols0;
    FileExtensions?: FileExtensions0;
    Dependencies?: Dependencies0;
    PackageFamilyName?: PackageFamilyName0;
    ProductCode?: ProductCode0;
    Capabilities?: Capabilities0;
    RestrictedCapabilities?: RestrictedCapabilities0;
    Markets?: Markets0;
    InstallerAbortsTerminal?: InstallerAbortsTerminal0;
    ReleaseDate?: ReleaseDate0;
    InstallLocationRequired?: InstallLocationRequired0;
    RequireExplicitUpgrade?: RequireExplicitUpgrade0;
    DisplayInstallWarnings?: DisplayInstallWarnings0;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures0;
    UnsupportedArguments?: UnsupportedArguments0;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries0;
    ElevationRequirement?: ElevationRequirement0;
    InstallationMetadata?: InstallationMetadata0;
    DownloadCommandProhibited?: DownloadCommandProhibited0;
    RepairBehavior?: RepairBehavior0;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath0;
    Authentication?: Authentication;
};
/** Optional Url type */
export type Url1 = (string | null);
/** Package tag */
export type Tag1 = (string | null);
export type Agreement1 = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url1;
});
export type Documentation1 = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url1;
};
export type Icon1 = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** Optional Url type */
export type Url2 = (string | null);
/** Package moniker or tag */
export type Tag2 = (string | null);
export type Agreement2 = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url2;
});
export type Documentation2 = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url2;
};
export type Icon2 = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** The package unique identifier */
export type PackageIdentifier1 = string;
/** The package version */
export type PackageVersion1 = string;
/** The distribution channel */
export type Channel1 = (null & (string | null));
/** The installer meta-data locale */
export type Locale1 = (string | null);
/** The installer supported operating system */
export type Platform1 = (((("Windows.Desktop" | "Windows.Universal") & string))[] | null);
/** The installer minimum operating system version */
export type MinimumOSVersion1 = (string | null);
/** Enumeration of supported installer types. InstallerType is required in either root level or individual Installer level */
export type InstallerType1 = (("msix" | "msi" | "appx" | "exe" | "zip" | "inno" | "nullsoft" | "wix" | "burn" | "pwa" | "portable" | "font") & (string | null));
/** Enumeration of supported nested installer types contained inside an archive file */
export type NestedInstallerType1 = (("msix" | "msi" | "appx" | "exe" | "inno" | "nullsoft" | "wix" | "burn" | "portable" | "font") & (string | null));
/** List of nested installer files contained inside an archive */
export type NestedInstallerFiles1 = (({
    /** The relative path to the nested installer file */
    RelativeFilePath: string;
    /** The command alias to be used for calling the package. Only applies to the nested portable package */
    PortableCommandAlias?: (string | null);
})[] | null);
/** Scope indicates if the installer is per user or per machine */
export type Scope1 = (("user" | "machine") & (string | null));
/** List of supported installer modes */
export type InstallModes1 = (((("interactive" | "silent" | "silentWithProgress") & string))[] | null);
export type InstallerSwitches1 = {
    /** Silent is the value that should be passed to the installer when user chooses a silent or quiet install */
    Silent?: (string | null);
    /** SilentWithProgress is the value that should be passed to the installer when user chooses a non-interactive install */
    SilentWithProgress?: (string | null);
    /** Interactive is the value that should be passed to the installer when user chooses an interactive install */
    Interactive?: (string | null);
    /** InstallLocation is the value passed to the installer for custom install location. <INSTALLPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    InstallLocation?: (string | null);
    /** Log is the value passed to the installer for custom log file path. <LOGPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    Log?: (string | null);
    /** Upgrade is the value that should be passed to the installer when user chooses an upgrade */
    Upgrade?: (string | null);
    /** Custom switches will be passed directly to the installer by winget */
    Custom?: (string | null);
    /** The 'Repair' value must be passed to the installer, ModifyPath ARP command, or uninstaller ARP command when the user opts for a repair. */
    Repair?: (string | null);
};
/** List of additional non-zero installer success exit codes other than known default values by winget */
export type InstallerSuccessCodes1 = ((InstallerReturnCode1)[] | null);
/** Installer exit codes for common errors */
export type ExpectedReturnCodes1 = (({
    InstallerReturnCode: InstallerReturnCode1;
    ReturnResponse: (("packageInUse" | "packageInUseByApplication" | "installInProgress" | "fileInUse" | "missingDependency" | "diskFull" | "insufficientMemory" | "invalidParameter" | "noNetwork" | "contactSupport" | "rebootRequiredToFinish" | "rebootRequiredForInstall" | "rebootInitiated" | "cancelledByUser" | "alreadyInstalled" | "downgrade" | "blockedByPolicy" | "systemNotSupported" | "custom") & string);
    /** The return response url to provide additional guidance for expected return codes */
    ReturnResponseUrl?: Url9;
})[] | null);
/** The upgrade method */
export type UpgradeBehavior1 = (("install" | "uninstallPrevious" | "deny") & (string | null));
/** List of commands or aliases to run the package */
export type Commands1 = ((string)[] | null);
/** List of protocols the package provides a handler for */
export type Protocols1 = ((string)[] | null);
/** List of file extensions the package could support */
export type FileExtensions1 = ((string)[] | null);
export type Dependencies1 = ({
    /** List of Windows feature dependencies */
    WindowsFeatures?: ((string)[] | null);
    /** List of Windows library dependencies */
    WindowsLibraries?: ((string)[] | null);
    /** List of package dependencies from current source */
    PackageDependencies?: (({
        PackageIdentifier: PackageIdentifier1;
        MinimumVersion?: PackageVersion1;
    })[] | null);
    /** List of external package dependencies */
    ExternalDependencies?: ((string)[] | null);
} | null);
/** PackageFamilyName for appx or msix installer. Could be used for correlation of packages across sources */
export type PackageFamilyName1 = (string | null);
/** ProductCode could be used for correlation of packages across sources */
export type ProductCode1 = (string | null);
/** List of appx or msix installer capabilities */
export type Capabilities1 = ((string)[] | null);
/** List of appx or msix installer restricted capabilities */
export type RestrictedCapabilities1 = ((string)[] | null);
/** The installer markets */
export type Markets1 = ((JSONValue | JSONValue) & ({
    [property: string]: JSONValue;
} | null));
/** Indicates whether the installer will abort terminal. Default is false */
export type InstallerAbortsTerminal1 = (boolean | null);
/** The installer release date */
export type ReleaseDate1 = (string | null);
/** Indicates whether the installer requires an install location provided */
export type InstallLocationRequired1 = (boolean | null);
/** Indicates whether the installer should be pinned by default from upgrade */
export type RequireExplicitUpgrade1 = (boolean | null);
/** Indicates whether winget should display a warning message if the install or upgrade is known to interfere with running applications. */
export type DisplayInstallWarnings1 = (boolean | null);
/** List of OS architectures the installer does not support */
export type UnsupportedOSArchitectures1 = (((("x86" | "x64" | "arm" | "arm64") & string))[] | null);
/** List of winget arguments the installer does not support */
export type UnsupportedArguments1 = (((("log" | "location") & string))[] | null);
/** List of ARP entries. */
export type AppsAndFeaturesEntries1 = ((AppsAndFeaturesEntry1)[] | null);
/** The installer's elevation requirement */
export type ElevationRequirement1 = (("elevationRequired" | "elevationProhibited" | "elevatesSelf") & (string | null));
/**
 * InstallationMetadata
 *
 * Details about the installation. Used for deeper installation detection.
 */
export type InstallationMetadata1 = {
    /** Represents the default installed package location. Used for deeper installation detection. */
    DefaultInstallLocation?: (string | null);
    /** List of installed files. */
    Files?: (({
        /** The relative path to the installed file. */
        RelativeFilePath: string;
        /** Optional Sha256 of the installed file. */
        FileSha256?: (string | null);
        /** The optional installed file type. If not specified, the file is treated as other. */
        FileType?: (("launch" | "uninstall" | "other") & (string | null));
        /** Optional parameter for invocable files. */
        InvocationParameter?: (string | null);
        /** Optional display name for invocable files. */
        DisplayName?: (string | null);
    })[] | null);
};
/** Indicates whether the installer is prohibited from being downloaded for offline installation. */
export type DownloadCommandProhibited1 = (boolean | null);
/** The repair method */
export type RepairBehavior1 = (("modify" | "uninstaller" | "installer") & (string | null));
/** Indicates whether the install location should be added directly to the PATH environment variable. Only applies to an archive containing portable packages. */
export type ArchiveBinariesDependOnPath1 = (boolean | null);
/** The authentication requirement for downloading the installer. */
export type Authentication0 = ({
    /** The authentication type */
    AuthenticationType: ("none" & ("none" | "microsoftEntraId" | "microsoftEntraIdForAzureBlobStorage") & string);
    /** The Microsoft Entra Id authentication info */
    MicrosoftEntraIdAuthenticationInfo?: ({
        /** The resource value for Microsoft Entra Id authentication. */
        Resource?: (string | null);
        /** The scope value for Microsoft Entra Id authentication. */
        Scope?: (string | null);
    } | null);
} | null);
export type Installer1 = {
    InstallerLocale?: Locale1;
    Platform?: Platform1;
    MinimumOSVersion?: MinimumOSVersion1;
    Architecture: Architecture1;
    InstallerType?: InstallerType1;
    NestedInstallerType?: NestedInstallerType1;
    NestedInstallerFiles?: NestedInstallerFiles1;
    Scope?: Scope1;
    /** The installer Url */
    InstallerUrl: string;
    /** Sha256 is required. Sha256 of the installer */
    InstallerSha256: string;
    /** SignatureSha256 is recommended for appx or msix. It is the sha256 of signature file inside appx or msix. Could be used during streaming install if applicable */
    SignatureSha256?: (string | null);
    InstallModes?: InstallModes1;
    InstallerSwitches?: InstallerSwitches1;
    InstallerSuccessCodes?: InstallerSuccessCodes1;
    ExpectedReturnCodes?: ExpectedReturnCodes1;
    UpgradeBehavior?: UpgradeBehavior1;
    Commands?: Commands1;
    Protocols?: Protocols1;
    FileExtensions?: FileExtensions1;
    Dependencies?: Dependencies1;
    PackageFamilyName?: PackageFamilyName1;
    ProductCode?: ProductCode1;
    Capabilities?: Capabilities1;
    RestrictedCapabilities?: RestrictedCapabilities1;
    Markets?: Markets1;
    InstallerAbortsTerminal?: InstallerAbortsTerminal1;
    ReleaseDate?: ReleaseDate1;
    InstallLocationRequired?: InstallLocationRequired1;
    RequireExplicitUpgrade?: RequireExplicitUpgrade1;
    DisplayInstallWarnings?: DisplayInstallWarnings1;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures1;
    UnsupportedArguments?: UnsupportedArguments1;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries1;
    ElevationRequirement?: ElevationRequirement1;
    InstallationMetadata?: InstallationMetadata1;
    DownloadCommandProhibited?: DownloadCommandProhibited1;
    RepairBehavior?: RepairBehavior1;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath1;
    Authentication?: Authentication0;
};
/** Optional Url type */
export type Url3 = (string | null);
/** Package tag */
export type Tag3 = (string | null);
export type Agreement3 = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url3;
});
export type Documentation3 = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url3;
};
export type Icon3 = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** Optional Url type */
export type Url4 = (string | null);
/** Package moniker or tag */
export type Tag4 = (string | null);
export type Agreement4 = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url4;
});
export type Documentation4 = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url4;
};
export type Icon4 = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** The package unique identifier */
export type PackageIdentifier2 = string;
/** The package version */
export type PackageVersion2 = string;
/** The distribution channel */
export type Channel2 = (null & (string | null));
/** The installer meta-data locale */
export type Locale2 = (string | null);
/** The installer supported operating system */
export type Platform2 = (((("Windows.Desktop" | "Windows.Universal") & string))[] | null);
/** The installer minimum operating system version */
export type MinimumOSVersion2 = (string | null);
/** Enumeration of supported installer types. InstallerType is required in either root level or individual Installer level */
export type InstallerType2 = (("msix" | "msi" | "appx" | "exe" | "zip" | "inno" | "nullsoft" | "wix" | "burn" | "pwa" | "portable" | "font") & (string | null));
/** Enumeration of supported nested installer types contained inside an archive file */
export type NestedInstallerType2 = (("msix" | "msi" | "appx" | "exe" | "inno" | "nullsoft" | "wix" | "burn" | "portable" | "font") & (string | null));
/** List of nested installer files contained inside an archive */
export type NestedInstallerFiles2 = (({
    /** The relative path to the nested installer file */
    RelativeFilePath: string;
    /** The command alias to be used for calling the package. Only applies to the nested portable package */
    PortableCommandAlias?: (string | null);
})[] | null);
/** Scope indicates if the installer is per user or per machine */
export type Scope2 = (("user" | "machine") & (string | null));
/** List of supported installer modes */
export type InstallModes2 = (((("interactive" | "silent" | "silentWithProgress") & string))[] | null);
export type InstallerSwitches2 = {
    /** Silent is the value that should be passed to the installer when user chooses a silent or quiet install */
    Silent?: (string | null);
    /** SilentWithProgress is the value that should be passed to the installer when user chooses a non-interactive install */
    SilentWithProgress?: (string | null);
    /** Interactive is the value that should be passed to the installer when user chooses an interactive install */
    Interactive?: (string | null);
    /** InstallLocation is the value passed to the installer for custom install location. <INSTALLPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    InstallLocation?: (string | null);
    /** Log is the value passed to the installer for custom log file path. <LOGPATH> token can be included in the switch value so that winget will replace the token with user provided path */
    Log?: (string | null);
    /** Upgrade is the value that should be passed to the installer when user chooses an upgrade */
    Upgrade?: (string | null);
    /** Custom switches will be passed directly to the installer by winget */
    Custom?: (string | null);
    /** The 'Repair' value must be passed to the installer, ModifyPath ARP command, or uninstaller ARP command when the user opts for a repair. */
    Repair?: (string | null);
};
/** List of additional non-zero installer success exit codes other than known default values by winget */
export type InstallerSuccessCodes2 = ((InstallerReturnCode2)[] | null);
/** Installer exit codes for common errors */
export type ExpectedReturnCodes2 = (({
    InstallerReturnCode: InstallerReturnCode2;
    ReturnResponse: (("packageInUse" | "packageInUseByApplication" | "installInProgress" | "fileInUse" | "missingDependency" | "diskFull" | "insufficientMemory" | "invalidParameter" | "noNetwork" | "contactSupport" | "rebootRequiredToFinish" | "rebootRequiredForInstall" | "rebootInitiated" | "cancelledByUser" | "alreadyInstalled" | "downgrade" | "blockedByPolicy" | "systemNotSupported" | "custom") & string);
    /** The return response url to provide additional guidance for expected return codes */
    ReturnResponseUrl?: Url10;
})[] | null);
/** The upgrade method */
export type UpgradeBehavior2 = (("install" | "uninstallPrevious" | "deny") & (string | null));
/** List of commands or aliases to run the package */
export type Commands2 = ((string)[] | null);
/** List of protocols the package provides a handler for */
export type Protocols2 = ((string)[] | null);
/** List of file extensions the package could support */
export type FileExtensions2 = ((string)[] | null);
export type Dependencies2 = ({
    /** List of Windows feature dependencies */
    WindowsFeatures?: ((string)[] | null);
    /** List of Windows library dependencies */
    WindowsLibraries?: ((string)[] | null);
    /** List of package dependencies from current source */
    PackageDependencies?: (({
        PackageIdentifier: PackageIdentifier2;
        MinimumVersion?: PackageVersion2;
    })[] | null);
    /** List of external package dependencies */
    ExternalDependencies?: ((string)[] | null);
} | null);
/** PackageFamilyName for appx or msix installer. Could be used for correlation of packages across sources */
export type PackageFamilyName2 = (string | null);
/** ProductCode could be used for correlation of packages across sources */
export type ProductCode2 = (string | null);
/** List of appx or msix installer capabilities */
export type Capabilities2 = ((string)[] | null);
/** List of appx or msix installer restricted capabilities */
export type RestrictedCapabilities2 = ((string)[] | null);
/** The installer markets */
export type Markets2 = ((JSONValue | JSONValue) & ({
    [property: string]: JSONValue;
} | null));
/** Indicates whether the installer will abort terminal. Default is false */
export type InstallerAbortsTerminal2 = (boolean | null);
/** The installer release date */
export type ReleaseDate2 = (string | null);
/** Indicates whether the installer requires an install location provided */
export type InstallLocationRequired2 = (boolean | null);
/** Indicates whether the installer should be pinned by default from upgrade */
export type RequireExplicitUpgrade2 = (boolean | null);
/** Indicates whether winget should display a warning message if the install or upgrade is known to interfere with running applications. */
export type DisplayInstallWarnings2 = (boolean | null);
/** List of OS architectures the installer does not support */
export type UnsupportedOSArchitectures2 = (((("x86" | "x64" | "arm" | "arm64") & string))[] | null);
/** List of winget arguments the installer does not support */
export type UnsupportedArguments2 = (((("log" | "location") & string))[] | null);
/** List of ARP entries. */
export type AppsAndFeaturesEntries2 = ((AppsAndFeaturesEntry2)[] | null);
/** The installer's elevation requirement */
export type ElevationRequirement2 = (("elevationRequired" | "elevationProhibited" | "elevatesSelf") & (string | null));
/**
 * InstallationMetadata
 *
 * Details about the installation. Used for deeper installation detection.
 */
export type InstallationMetadata2 = {
    /** Represents the default installed package location. Used for deeper installation detection. */
    DefaultInstallLocation?: (string | null);
    /** List of installed files. */
    Files?: (({
        /** The relative path to the installed file. */
        RelativeFilePath: string;
        /** Optional Sha256 of the installed file. */
        FileSha256?: (string | null);
        /** The optional installed file type. If not specified, the file is treated as other. */
        FileType?: (("launch" | "uninstall" | "other") & (string | null));
        /** Optional parameter for invocable files. */
        InvocationParameter?: (string | null);
        /** Optional display name for invocable files. */
        DisplayName?: (string | null);
    })[] | null);
};
/** Indicates whether the installer is prohibited from being downloaded for offline installation. */
export type DownloadCommandProhibited2 = (boolean | null);
/** The repair method */
export type RepairBehavior2 = (("modify" | "uninstaller" | "installer") & (string | null));
/** Indicates whether the install location should be added directly to the PATH environment variable. Only applies to an archive containing portable packages. */
export type ArchiveBinariesDependOnPath2 = (boolean | null);
/** The authentication requirement for downloading the installer. */
export type Authentication1 = ({
    /** The authentication type */
    AuthenticationType: ("none" & ("none" | "microsoftEntraId" | "microsoftEntraIdForAzureBlobStorage") & string);
    /** The Microsoft Entra Id authentication info */
    MicrosoftEntraIdAuthenticationInfo?: ({
        /** The resource value for Microsoft Entra Id authentication. */
        Resource?: (string | null);
        /** The scope value for Microsoft Entra Id authentication. */
        Scope?: (string | null);
    } | null);
} | null);
/** References to desired state configuration (DSC) resources that are related to the package. */
export type DesiredStateConfiguration = ({
    /** Contains data about DSC resources that are contained in PowerShell modules. */
    PowerShell?: (({
        RepositoryUrl: Url10;
        /** The name of the module containing resources. */
        ModuleName: string;
        /** The resources contained within the module. */
        Resources: ({
            /** The name of the resource. */
            Name?: string;
        })[];
    })[] | null);
    /** Contains data about DSC resources that are contained in the package using the DSC v3 specification. */
    DSCv3?: ({
        /** The resources contained within the package. */
        Resources: ({
            /** The name of the resource. */
            Type?: string;
        })[];
    } | null);
} | null);
export type Installer2 = {
    InstallerLocale?: Locale2;
    Platform?: Platform2;
    MinimumOSVersion?: MinimumOSVersion2;
    Architecture: Architecture2;
    InstallerType?: InstallerType2;
    NestedInstallerType?: NestedInstallerType2;
    NestedInstallerFiles?: NestedInstallerFiles2;
    Scope?: Scope2;
    /** The installer Url */
    InstallerUrl: string;
    /** Sha256 is required. Sha256 of the installer */
    InstallerSha256: string;
    /** SignatureSha256 is recommended for appx or msix. It is the sha256 of signature file inside appx or msix. Could be used during streaming install if applicable */
    SignatureSha256?: (string | null);
    InstallModes?: InstallModes2;
    InstallerSwitches?: InstallerSwitches2;
    InstallerSuccessCodes?: InstallerSuccessCodes2;
    ExpectedReturnCodes?: ExpectedReturnCodes2;
    UpgradeBehavior?: UpgradeBehavior2;
    Commands?: Commands2;
    Protocols?: Protocols2;
    FileExtensions?: FileExtensions2;
    Dependencies?: Dependencies2;
    PackageFamilyName?: PackageFamilyName2;
    ProductCode?: ProductCode2;
    Capabilities?: Capabilities2;
    RestrictedCapabilities?: RestrictedCapabilities2;
    Markets?: Markets2;
    InstallerAbortsTerminal?: InstallerAbortsTerminal2;
    ReleaseDate?: ReleaseDate2;
    InstallLocationRequired?: InstallLocationRequired2;
    RequireExplicitUpgrade?: RequireExplicitUpgrade2;
    DisplayInstallWarnings?: DisplayInstallWarnings2;
    UnsupportedOSArchitectures?: UnsupportedOSArchitectures2;
    UnsupportedArguments?: UnsupportedArguments2;
    AppsAndFeaturesEntries?: AppsAndFeaturesEntries2;
    ElevationRequirement?: ElevationRequirement2;
    InstallationMetadata?: InstallationMetadata2;
    DownloadCommandProhibited?: DownloadCommandProhibited2;
    RepairBehavior?: RepairBehavior2;
    ArchiveBinariesDependOnPath?: ArchiveBinariesDependOnPath2;
    Authentication?: Authentication1;
    DesiredStateConfiguration?: DesiredStateConfiguration;
};
/** Optional Url type */
export type Url5 = (string | null);
/** Package tag */
export type Tag5 = (string | null);
export type Agreement5 = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url5;
});
export type Documentation5 = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url5;
};
export type Icon5 = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** Optional Url type */
export type Url6 = (string | null);
/** Package moniker or tag */
export type Tag6 = (string | null);
export type Agreement6 = (({
    AgreementLabel: string;
} | {
    Agreement: string;
} | {
    AgreementUrl: string;
}) & {
    /** The label of the Agreement. i.e. EULA, AgeRating, etc. This field should be localized. Either Agreement or AgreementUrl is required. When we show the agreements, we would Bold the AgreementLabel */
    AgreementLabel?: (string | null);
    /** The agreement text content. */
    Agreement?: (string | null);
    /** The agreement URL. */
    AgreementUrl?: Url6;
});
export type Documentation6 = {
    /** The label of the documentation for providing software guides such as manuals and troubleshooting URLs. */
    DocumentLabel?: (string | null);
    /** The documentation URL. */
    DocumentUrl?: Url6;
};
export type Icon6 = {
    /** The url of the hosted icon file */
    IconUrl: string;
    /** The icon file type */
    IconFileType: (("png" | "jpeg" | "ico") & string);
    /** Optional icon resolution */
    IconResolution?: (("custom" | "16x16" | "20x20" | "24x24" | "30x30" | "32x32" | "36x36" | "40x40" | "48x48" | "60x60" | "64x64" | "72x72" | "80x80" | "96x96" | "256x256") & (string | null));
    /** Optional icon theme */
    IconTheme?: (("default" | "light" | "dark" | "highContrast") & (string | null));
    /** Optional Sha256 of the icon file */
    IconSha256?: (string | null);
};
/** An exit code that can be returned by the installer after execution */
export type InstallerReturnCode = number;
/** Url type */
export type Url7 = (string | null);
/** Various key values under installer's ARP entry */
export type AppsAndFeaturesEntry = {
    /** The DisplayName registry value */
    DisplayName?: (string | null);
    /** The Publisher registry value */
    Publisher?: (string | null);
    /** The DisplayVersion registry value */
    DisplayVersion?: (string | null);
    ProductCode?: ProductCode;
    UpgradeCode?: ProductCode;
    InstallerType?: InstallerType;
};
/** The installer target architecture */
export type Architecture = (("x86" | "x64" | "arm" | "arm64" | "neutral") & string);
/** An exit code that can be returned by the installer after execution */
export type InstallerReturnCode0 = number;
/** Url type */
export type Url8 = (string | null);
/** Various key values under installer's ARP entry */
export type AppsAndFeaturesEntry0 = {
    /** The DisplayName registry value */
    DisplayName?: (string | null);
    /** The Publisher registry value */
    Publisher?: (string | null);
    /** The DisplayVersion registry value */
    DisplayVersion?: (string | null);
    ProductCode?: ProductCode0;
    UpgradeCode?: ProductCode0;
    InstallerType?: InstallerType0;
};
/** The installer target architecture */
export type Architecture0 = (("x86" | "x64" | "arm" | "arm64" | "neutral") & string);
/** An exit code that can be returned by the installer after execution */
export type InstallerReturnCode1 = number;
/** Url type */
export type Url9 = (string | null);
/** Various key values under installer's ARP entry */
export type AppsAndFeaturesEntry1 = {
    /** The DisplayName registry value */
    DisplayName?: (string | null);
    /** The Publisher registry value */
    Publisher?: (string | null);
    /** The DisplayVersion registry value */
    DisplayVersion?: (string | null);
    ProductCode?: ProductCode1;
    UpgradeCode?: ProductCode1;
    InstallerType?: InstallerType1;
};
/** The installer target architecture */
export type Architecture1 = (("x86" | "x64" | "arm" | "arm64" | "neutral") & string);
/** An exit code that can be returned by the installer after execution */
export type InstallerReturnCode2 = number;
/** Url type */
export type Url10 = (string | null);
/** Various key values under installer's ARP entry */
export type AppsAndFeaturesEntry2 = {
    /** The DisplayName registry value */
    DisplayName?: (string | null);
    /** The Publisher registry value */
    Publisher?: (string | null);
    /** The DisplayVersion registry value */
    DisplayVersion?: (string | null);
    ProductCode?: ProductCode2;
    UpgradeCode?: ProductCode2;
    InstallerType?: InstallerType2;
};
/** The installer target architecture */
export type Architecture2 = (("x86" | "x64" | "arm" | "arm64" | "neutral") & string);
