import { z } from 'zod';

/**
 * The Tool ids a command acts on, as bare positionals
 * (`0xshell install neovim docker`). Empty means "no name filter", which
 * `install` reads as the whole Catalog and `uninstall` refuses.
 */
const toolIds = z.array(z.string().min(1)).default([]).meta({ positional: true });

export const InstallInputSchema = z.object({
  tools: toolIds.describe('ids das ferramentas a instalar (ex.: neovim docker); se omitido, instala o catálogo inteiro'),
  tag: z.string().min(1).optional().describe('instala apenas os Tools com esta Tag'),
  interactive: z.boolean().default(false).describe('abre um multiselect para escolher os Tools a instalar'),
  dryRun: z.boolean().default(false).describe('mostra o que seria executado, sem executar nada'),
});

export type InstallInput = z.infer<typeof InstallInputSchema>;

export const UninstallInputSchema = z.object({
  tools: toolIds.describe('ids das ferramentas a desinstalar (ex.: neovim docker)'),
  tag: z.string().min(1).optional().describe('desinstala apenas os Tools com esta Tag'),
  all: z.boolean().default(false).describe('desinstala o catálogo inteiro; pede confirmação interativa antes de executar'),
  dryRun: z.boolean().default(false).describe('mostra o que seria removido, sem executar nada'),
});

export type UninstallInput = z.infer<typeof UninstallInputSchema>;

export const RestoreInputSchema = z.object({
  version: z
    .string()
    .min(1)
    .optional()
    .meta({ positional: true })
    .describe('versão do backup em ~/.0xshell/backups (ex.: 20260926-143012); se omitida, lista as disponíveis'),
  dryRun: z.boolean().default(false).describe('mostra o que seria restaurado, sem executar nada'),
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
