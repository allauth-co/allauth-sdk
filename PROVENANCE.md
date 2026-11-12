# Source provenance

This repository was reconstructed on 2026-10-30 from the already-public AllAuth React SDK archives listed in `releases/integrity.json`. Import commits and annotated tags were created during this reconstruction; their Git dates are not original SDK publication dates.

Each `vVERSION` tag preserves the exact archive file bytes under `packages/react`, including the original package manifest and packaged README. Historical publication dates remain unknown where the release catalog records `null`. Archive timestamps and local file modification times were not used as release dates. Some packaged READMEs describe working candidates; those statements are preserved unchanged.

The public archive allowlist is https://allauth.co/sdk/integrity.json. The supplementary v1.0.0 tag was imported after live URL and checksum verification confirmed that the archive had already been public. It is an orphan import commit so the first 15 reconstructed tags remain unchanged. This repository contains SDK distribution files and release tooling, not the hosted AllAuth platform source or its configuration.

SDK 1.4.4 is a new release prepared through this repository's checked publication pathway, rather than a reconstruction. Its catalog retains the exact new archive and source hashes; GitHub release metadata supplies the actual publication time without substituting a preparation timestamp.

SDK 1.4.5 is a new opt-in support integration release. Its archive was copied only through the reviewed packaged-file allowlist; current source and the version tag are checked byte-for-byte against it. The added public regression uses synthetic data and fetch stubs, without hosted-platform source or private fixtures.

SDK 2.0.0 carries the first-party React client and UI. The release catalog records the exact archive digest and hashes of the packaged source. Earlier archives and tag snapshots keep their original contents.

The archives do not declare an SDK license and contain no SDK LICENSE file. Reconstruction adds no license or new rights. Dependency licenses and third-party terms remain separate. The package manifests retain `private: true`; npm publication is not configured.
