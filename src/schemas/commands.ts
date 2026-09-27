import { z } from 'zod';

/**
 * The Tool ids a command acts on, as bare positionals
 * (`0xshell install neovim docker`). Empty means "no name filter", which
 * `install` reads as the whole Catalog and `uninstall` refuses.
 */
const toolIds = z.array(z.string().min(1)).default([]).meta({ positional: true });

export const InstallInputSchema = z.object({
  tools: toolIds.describe('ids of the tools to install (e.g. neovim docker); when omitted, installs the whole Catalog'),
  tag: z.string().min(1).optional().describe('installs only the Tools with this Tag'),
  interactive: z.boolean().default(false).describe('opens a multiselect to pick the Tools to install'),
  dryRun: z.boolean().default(false).describe('shows what would run, without running anything'),
});

export type InstallInput = z.infer<typeof InstallInputSchema>;

export const UninstallInputSchema = z.object({
  tools: toolIds.describe('ids of the tools to uninstall (e.g. neovim docker)'),
  tag: z.string().min(1).optional().describe('uninstalls only the Tools with this Tag'),
  all: z.boolean().default(false).describe('uninstalls the whole Catalog; asks for interactive confirmation before running'),
  yes: z.boolean().default(false).describe('confirms --all without asking, for scripts'),
  dryRun: z.boolean().default(false).describe('shows what would be removed, without running anything'),
});

export type UninstallInput = z.infer<typeof UninstallInputSchema>;

export const RestoreInputSchema = z.object({
  version: z
    .string()
    .min(1)
    .optional()
    .meta({ positional: true })
    .describe('backup version in ~/.0xshell/backups (e.g. 20260926-143012); when omitted, lists the available ones'),
  dryRun: z.boolean().default(false).describe('shows what would be restored, without running anything'),
});

export type RestoreInput = z.infer<typeof RestoreInputSchema>;

/**
 * `list` and `doctor` read the Catalog and the machine and take nothing
 * from the user. The empty schemas are here so every command has one and is
 * called the same way.
 */
export const ListInputSchema = z.object({});

export type ListInput = z.infer<typeof ListInputSchema>;

export const DoctorInputSchema = z.object({});

export type DoctorInput = z.infer<typeof DoctorInputSchema>;
